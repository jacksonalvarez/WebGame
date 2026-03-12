import { GameState } from '../types';
import {
  MAP_SIZE,
  MINIMAP_SIZE,
  MINIMAP_PADDING,
  ZONE_BOUNDARIES,
  ZONE_DEFINITIONS,
  CANVAS_HEIGHT,
  COLORS,
} from '../constants';

export function renderMinimap(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { camera } = state;

  // Minimap origin (top-left corner of the minimap square)
  const originX = MINIMAP_PADDING;
  const originY = CANVAS_HEIGHT - MINIMAP_PADDING - MINIMAP_SIZE;

  // Center of the minimap circle
  const centerX = originX + MINIMAP_SIZE / 2;
  const centerY = originY + MINIMAP_SIZE / 2;
  const radius = MINIMAP_SIZE / 2;

  ctx.save();

  // Clip everything to the circular minimap area
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  // 1. Background circle
  ctx.fillStyle = COLORS.minimapBg;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Zone rings — concentric circles at each zone boundary
  for (let i = 1; i < ZONE_BOUNDARIES.length - 1; i++) {
    const boundaryFraction = ZONE_BOUNDARIES[i];
    const ringRadius = boundaryFraction * radius;
    const zoneDef = ZONE_DEFINITIONS[i - 1];

    // Slightly lighter version of the zone background color
    ctx.strokeStyle = lightenColor(zoneDef.backgroundColor, 30);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Helper: convert world coords to minimap canvas coords
  const toMinimapX = (worldX: number) =>
    MINIMAP_PADDING + (worldX / MAP_SIZE) * MINIMAP_SIZE;
  const toMinimapY = (worldY: number) =>
    (CANVAS_HEIGHT - MINIMAP_PADDING - MINIMAP_SIZE) + (worldY / MAP_SIZE) * MINIMAP_SIZE;

  // 3. Food dots
  for (const food of state.food) {
    if (food.collected) continue;
    const mx = toMinimapX(food.pos.x);
    const my = toMinimapY(food.pos.y);
    ctx.fillStyle = food.type === 'golden' ? '#ffd700' : '#4bc774';
    ctx.beginPath();
    ctx.arc(mx, my, food.type === 'golden' ? 1.5 : 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Enemy dots
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    const mx = toMinimapX(enemy.pos.x);
    const my = toMinimapY(enemy.pos.y);
    ctx.fillStyle = '#c74b4b';
    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Player dot — blinking white dot
  const blinkAlpha = 0.5 + 0.5 * Math.sin(state.totalTime * 4);
  const px = toMinimapX(state.player.pos.x);
  const py = toMinimapY(state.player.pos.y);
  ctx.globalAlpha = blinkAlpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 6. Viewport rectangle
  // Camera position is the world-space top-left of the visible area
  const vpLeft = toMinimapX(camera.x);
  const vpTop = toMinimapY(camera.y);
  // Viewport world dimensions (canvas size)
  const vpWidth = (960 / MAP_SIZE) * MINIMAP_SIZE;
  const vpHeight = (640 / MAP_SIZE) * MINIMAP_SIZE;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(vpLeft, vpTop, vpWidth, vpHeight);

  ctx.restore();

  // Border drawn outside clip so it sits on top of the filled circle edge
  ctx.save();
  ctx.strokeStyle = COLORS.minimapBorder;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Lighten a hex color by adding `amount` to each RGB channel. */
function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
