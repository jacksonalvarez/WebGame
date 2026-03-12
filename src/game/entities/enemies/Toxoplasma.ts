import { EnemyState, GameState } from '../../types';

const LUNGE_RANGE = 40;       // px — player proximity to trigger lunge
const LUNGE_SPEED_MULT = 3.5; // speed multiplier during lunge
const LUNGE_DURATION = 0.6;   // seconds lunge lasts
const HIJACK_DURATION = 5;    // seconds movement controls are reversed on hit

// Per-enemy lunge state
const lungeTimers = new Map<number, number>(); // remaining lunge time
const flashTimers = new Map<number, number>(); // brief reveal flash timer

export function updateToxoplasma(enemy: EnemyState, state: GameState): void {
  const dt = state.deltaTime;
  const player = state.player;

  const dx = player.pos.x - enemy.pos.x;
  const dy = player.pos.y - enemy.pos.y;
  const distToPlayer = Math.sqrt(dx * dx + dy * dy);

  // Update hijack timer
  if (enemy.hijackTimer !== undefined && enemy.hijackTimer > 0) {
    enemy.hijackTimer = Math.max(0, enemy.hijackTimer - dt);
    enemy.hijackActive = enemy.hijackTimer > 0;
  }

  // Update flash timer
  const flash = flashTimers.get(enemy.id) ?? 0;
  if (flash > 0) {
    flashTimers.set(enemy.id, Math.max(0, flash - dt));
  }

  let lungeTime = lungeTimers.get(enemy.id) ?? 0;

  if (lungeTime > 0) {
    // Continue lunge toward player
    if (distToPlayer > 1) {
      enemy.vel.x = (dx / distToPlayer) * enemy.speed * LUNGE_SPEED_MULT;
      enemy.vel.y = (dy / distToPlayer) * enemy.speed * LUNGE_SPEED_MULT;
    }
    lungeTime = Math.max(0, lungeTime - dt);
    lungeTimers.set(enemy.id, lungeTime);
    enemy.camouflaged = false;
  } else if (distToPlayer <= LUNGE_RANGE) {
    // Trigger lunge
    lungeTimers.set(enemy.id, LUNGE_DURATION);
    flashTimers.set(enemy.id, 0.3);
    enemy.camouflaged = false;

    if (distToPlayer > 1) {
      enemy.vel.x = (dx / distToPlayer) * enemy.speed * LUNGE_SPEED_MULT;
      enemy.vel.y = (dy / distToPlayer) * enemy.speed * LUNGE_SPEED_MULT;
    }
  } else {
    // Camouflaged — drift slowly near current position
    enemy.camouflaged = true;

    // Wander slowly with minor oscillation
    const wander = Math.sin(state.totalTime * 0.5 + enemy.id) * 0.3;
    enemy.vel.x = enemy.vel.x * 0.95 + Math.cos(state.totalTime * 0.3 + enemy.id * 2.1) * wander;
    enemy.vel.y = enemy.vel.y * 0.95 + Math.sin(state.totalTime * 0.3 + enemy.id * 2.1) * wander;
  }

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;
}

export function getHijackDuration(): number {
  return HIJACK_DURATION;
}

export function renderToxoplasma(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  screenX: number,
  screenY: number
): void {
  const r = enemy.radius;
  const isCamouflaged = enemy.camouflaged ?? true;
  const flash = flashTimers.get(enemy.id) ?? 0;
  const isLunging = (lungeTimers.get(enemy.id) ?? 0) > 0;

  ctx.save();

  // Determine alpha
  let alpha: number;
  if (flash > 0) {
    // Brief bright flash on reveal
    alpha = 1.0;
    ctx.shadowColor = 'rgba(127, 140, 141, 0.9)';
    ctx.shadowBlur = 15;
  } else if (isCamouflaged) {
    alpha = 0.15;
  } else {
    alpha = 1.0;
  }

  ctx.globalAlpha = alpha;

  // Main body — small gray circle
  ctx.beginPath();
  ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
  ctx.fillStyle = '#7f8c8d';
  ctx.fill();

  if (!isCamouflaged || flash > 0) {
    ctx.strokeStyle = isLunging ? '#e74c3c' : '#5d6d7e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Subtle internal pattern — small diagonal lines / dots
  ctx.globalAlpha = alpha * 0.6;
  const dotPositions = [
    { ox: -r * 0.3, oy: 0, dr: r * 0.15 },
    { ox: r * 0.25, oy: -r * 0.2, dr: r * 0.12 },
    { ox: r * 0.1, oy: r * 0.3, dr: r * 0.1 },
  ];
  for (const dot of dotPositions) {
    ctx.beginPath();
    ctx.arc(screenX + dot.ox, screenY + dot.oy, dot.dr, 0, Math.PI * 2);
    ctx.fillStyle = '#95a5a6';
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
  ctx.restore();
}
