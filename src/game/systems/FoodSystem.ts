import { GameState, CameraState, FoodItem, Vector2 } from '../types';
import { FOOD_PULSE_SPEED } from '../constants';

const VIEWPORT_CULL_MARGIN = 500;

export function updateFood(state: GameState): void {
  const dt = state.deltaTime;
  for (const food of state.food) {
    if (!food.collected) {
      food.pulsePhase += FOOD_PULSE_SPEED * dt;
    }
  }
}

export function renderFood(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: CameraState
): void {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const halfW = cw / 2;
  const halfH = ch / 2;

  for (const food of state.food) {
    if (food.collected) continue;

    const screenX = food.pos.x - camera.x + halfW;
    const screenY = food.pos.y - camera.y + halfH;

    // Viewport culling
    if (
      screenX < -VIEWPORT_CULL_MARGIN ||
      screenX > cw + VIEWPORT_CULL_MARGIN ||
      screenY < -VIEWPORT_CULL_MARGIN ||
      screenY > ch + VIEWPORT_CULL_MARGIN
    ) {
      continue;
    }

    const pulse = Math.sin(food.pulsePhase);
    const r = food.radius + pulse; // ±1px oscillation

    if (food.type === 'golden') {
      // Glow circle (larger, lower alpha)
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(screenX, screenY, r + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Main golden circle
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle effect: 4 small lines at 45-degree angles
      ctx.save();
      ctx.strokeStyle = '#fffaaa';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7 + 0.3 * pulse;
      const sparkleLen = r + 3 + pulse;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + food.pulsePhase * 0.5;
        const x1 = screenX + Math.cos(angle) * (r + 1);
        const y1 = screenY + Math.sin(angle) * (r + 1);
        const x2 = screenX + Math.cos(angle) * sparkleLen;
        const y2 = screenY + Math.sin(angle) * sparkleLen;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Standard food: subtle glow behind
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = '#4bc774';
      ctx.beginPath();
      ctx.arc(screenX, screenY, r + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Main green circle
      ctx.fillStyle = '#4bc774';
      ctx.beginPath();
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function collectFood(
  state: GameState,
  pos: Vector2,
  radius: number
): FoodItem[] {
  const collected: FoodItem[] = [];
  const r2 = radius * radius;

  for (const food of state.food) {
    if (food.collected) continue;
    const dx = food.pos.x - pos.x;
    const dy = food.pos.y - pos.y;
    if (dx * dx + dy * dy < r2) {
      food.collected = true;
      collected.push(food);
    }
  }

  return collected;
}
