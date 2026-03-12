import { EnemyState, GameState } from '../../types';

const DIRECTION_CHANGE_MIN = 3; // seconds
const DIRECTION_CHANGE_MAX = 5; // seconds

// Per-enemy wander state
const wanderDirections = new Map<number, { angle: number; nextChangeAt: number }>();

// Leg animation phase per enemy
const legPhases = new Map<number, number>();

export function updateTardigrade(enemy: EnemyState, state: GameState): void {
  const dt = state.deltaTime;

  // Tardigrade cannot die
  enemy.health = Math.max(enemy.health, 999);
  enemy.active = true;

  // Get or initialize wander state
  let wander = wanderDirections.get(enemy.id);
  if (!wander) {
    const initialAngle = Math.random() * Math.PI * 2;
    wander = { angle: initialAngle, nextChangeAt: state.totalTime + DIRECTION_CHANGE_MIN };
    wanderDirections.set(enemy.id, wander);
  }

  // Randomly change direction every 3-5 seconds
  if (state.totalTime >= wander.nextChangeAt) {
    wander.angle = Math.random() * Math.PI * 2;
    const interval = DIRECTION_CHANGE_MIN + Math.random() * (DIRECTION_CHANGE_MAX - DIRECTION_CHANGE_MIN);
    wander.nextChangeAt = state.totalTime + interval;
    wanderDirections.set(enemy.id, wander);
  }

  // Move in current wander direction
  enemy.vel.x = Math.cos(wander.angle) * enemy.speed;
  enemy.vel.y = Math.sin(wander.angle) * enemy.speed;

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  // Bounce off map edges (simple boundary)
  const mapHalfSize = 3000; // MAP_SIZE / 2
  const mapCX = state.map.centerX;
  const mapCY = state.map.centerY;

  if (enemy.pos.x < mapCX - mapHalfSize + enemy.radius) {
    enemy.pos.x = mapCX - mapHalfSize + enemy.radius;
    wander.angle = Math.PI - wander.angle;
  } else if (enemy.pos.x > mapCX + mapHalfSize - enemy.radius) {
    enemy.pos.x = mapCX + mapHalfSize - enemy.radius;
    wander.angle = Math.PI - wander.angle;
  }

  if (enemy.pos.y < mapCY - mapHalfSize + enemy.radius) {
    enemy.pos.y = mapCY - mapHalfSize + enemy.radius;
    wander.angle = -wander.angle;
  } else if (enemy.pos.y > mapCY + mapHalfSize - enemy.radius) {
    enemy.pos.y = mapCY + mapHalfSize - enemy.radius;
    wander.angle = -wander.angle;
  }

  // Update leg animation phase
  const speed = Math.sqrt(enemy.vel.x ** 2 + enemy.vel.y ** 2);
  const phase = (legPhases.get(enemy.id) ?? 0) + speed * dt * 0.05;
  legPhases.set(enemy.id, phase % (Math.PI * 2));
}

export function renderTardigrade(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  screenX: number,
  screenY: number
): void {
  const r = enemy.radius;
  const legPhase = legPhases.get(enemy.id) ?? 0;

  ctx.save();

  // Draw 8 stubby legs first (behind body)
  // Positions: 4 cardinal + 4 diagonal
  const legAngles = [
    0,                  // right
    Math.PI / 4,        // down-right
    Math.PI / 2,        // down
    (3 * Math.PI) / 4,  // down-left
    Math.PI,            // left
    (5 * Math.PI) / 4,  // up-left
    (3 * Math.PI) / 2,  // up
    (7 * Math.PI) / 4,  // up-right
  ];

  const legLength = r * 0.55;
  const legStartRadius = r * 0.7; // where leg attaches to body

  ctx.strokeStyle = '#6b5010';
  ctx.lineWidth = r * 0.18;
  ctx.lineCap = 'round';

  for (let i = 0; i < legAngles.length; i++) {
    const baseAngle = legAngles[i];
    // Animate legs with a slight wiggle
    const wiggle = Math.sin(legPhase * 2 + i * 0.8) * 0.15;
    const angle = baseAngle + wiggle;

    const startX = screenX + Math.cos(angle) * legStartRadius;
    const startY = screenY + Math.sin(angle) * legStartRadius;

    // Leg bends slightly downward at the tip
    const bendAngle = angle + Math.sin(legPhase + i) * 0.2;
    const endX = startX + Math.cos(bendAngle) * legLength;
    const endY = startY + Math.sin(bendAngle) * legLength;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }

  // Main body — large oval (slightly wider than tall)
  ctx.beginPath();
  ctx.ellipse(screenX, screenY, r, r * 0.75, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8b6914';
  ctx.fill();
  ctx.strokeStyle = '#5a4210';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Lighter underbelly — lower ellipse
  ctx.beginPath();
  ctx.ellipse(screenX, screenY + r * 0.15, r * 0.7, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c49a28';
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Segmentation lines across the body
  ctx.strokeStyle = '#5a4210';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.4;
  for (let seg = -1; seg <= 1; seg++) {
    const segX = screenX + seg * r * 0.3;
    ctx.beginPath();
    ctx.moveTo(segX, screenY - r * 0.6);
    ctx.lineTo(segX, screenY + r * 0.6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  // Two small dark eyes
  ctx.fillStyle = '#1a0f00';
  ctx.beginPath();
  ctx.arc(screenX - r * 0.25, screenY - r * 0.2, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(screenX + r * 0.25, screenY - r * 0.2, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
