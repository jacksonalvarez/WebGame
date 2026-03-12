import { EnemyState, EnemyType, FoodItem, ZoneId } from '../../types';
import { ENEMY_STATS, ENEMY_COLORS, MAP_SIZE } from '../../constants';

// Per-type extra state defaults
const TYPE_DEFAULTS: Record<EnemyType, Partial<EnemyState>> = {
  bacteriophage: { knockbackResistance: ENEMY_STATS.bacteriophage.knockbackResistance },
  amoeba: { knockbackResistance: ENEMY_STATS.amoeba.knockbackResistance, chasingPlayer: false },
  paramecium: { knockbackResistance: ENEMY_STATS.paramecium.knockbackResistance },
  whiteBloodCell: {
    knockbackResistance: ENEMY_STATS.whiteBloodCell.knockbackResistance,
    patrolTimer: 0,
    chasingPlayer: false,
  },
  toxoplasma: {
    knockbackResistance: ENEMY_STATS.toxoplasma.knockbackResistance,
    camouflaged: true,
  },
  tardigrade: { knockbackResistance: ENEMY_STATS.tardigrade.knockbackResistance },
};

export function createEnemy(
  id: number,
  type: EnemyType,
  x: number,
  y: number,
  zone: ZoneId
): EnemyState {
  const stats = ENEMY_STATS[type];
  return {
    id,
    type,
    pos: { x, y },
    vel: { x: 0, y: 0 },
    radius: stats.radius,
    speed: stats.speed,
    health: stats.health,
    maxHealth: stats.health,
    senseRadius: stats.senseRadius,
    damage: stats.damage,
    color: ENEMY_COLORS[type],
    active: true,
    zone,
    ...TYPE_DEFAULTS[type],
  };
}

// Wobble state per enemy (keyed by enemy id)
const wobbleTimers: Map<number, number> = new Map();
const wobbleDirections: Map<number, number> = new Map();

export function chemotaxisMove(
  enemy: EnemyState,
  food: FoodItem[],
  dt: number,
  rng: () => number = Math.random
): void {
  // Refresh wobble direction every 0.5-1s
  let wobbleTimer = wobbleTimers.get(enemy.id) ?? 0;
  wobbleTimer -= dt;
  if (wobbleTimer <= 0) {
    wobbleTimer = 0.5 + rng() * 0.5;
    wobbleTimers.set(enemy.id, wobbleTimer);
    wobbleDirections.set(enemy.id, (rng() - 0.5) * 2); // -1 to 1
  } else {
    wobbleTimers.set(enemy.id, wobbleTimer);
  }
  const wobbleDir = wobbleDirections.get(enemy.id) ?? 0;

  // Find nearest uncollected food within senseRadius
  let nearestFood: FoodItem | null = null;
  let nearestDist = enemy.senseRadius;

  for (const f of food) {
    if (f.collected) continue;
    const dx = f.pos.x - enemy.pos.x;
    const dy = f.pos.y - enemy.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestFood = f;
    }
  }

  let moveX: number;
  let moveY: number;

  if (nearestFood !== null) {
    // Move toward food
    const dx = nearestFood.pos.x - enemy.pos.x;
    const dy = nearestFood.pos.y - enemy.pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0.001) {
      const nx = dx / len;
      const ny = dy / len;
      // Perpendicular wobble: ±10% of speed
      const perpX = -ny;
      const perpY = nx;
      const wobbleMag = enemy.speed * 0.1 * wobbleDir;
      moveX = nx * enemy.speed + perpX * wobbleMag;
      moveY = ny * enemy.speed + perpY * wobbleMag;
    } else {
      moveX = 0;
      moveY = 0;
    }
  } else {
    // Random wandering — drift in current direction with stronger wobble
    const len = Math.sqrt(enemy.vel.x * enemy.vel.x + enemy.vel.y * enemy.vel.y);
    let nx: number;
    let ny: number;
    if (len > 0.001) {
      nx = enemy.vel.x / len;
      ny = enemy.vel.y / len;
    } else {
      const angle = rng() * Math.PI * 2;
      nx = Math.cos(angle);
      ny = Math.sin(angle);
    }
    const perpX = -ny;
    const perpY = nx;
    const wobbleMag = enemy.speed * 0.4 * wobbleDir;
    moveX = nx * enemy.speed + perpX * wobbleMag;
    moveY = ny * enemy.speed + perpY * wobbleMag;
  }

  enemy.vel.x = moveX;
  enemy.vel.y = moveY;

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  // Clamp to map bounds
  const r = enemy.radius;
  enemy.pos.x = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.x));
  enemy.pos.y = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.y));
}

export function isEnemyVisible(
  enemy: EnemyState,
  cameraX: number,
  cameraY: number,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const margin = enemy.radius + 50;
  const screenX = enemy.pos.x - cameraX + canvasWidth / 2;
  const screenY = enemy.pos.y - cameraY + canvasHeight / 2;
  return (
    screenX > -margin &&
    screenX < canvasWidth + margin &&
    screenY > -margin &&
    screenY < canvasHeight + margin
  );
}

// ---- Rendering helpers ----

function drawStarPolygon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points: number,
  rotation: number = 0
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points + rotation;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function renderEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  cameraX: number,
  cameraY: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!isEnemyVisible(enemy, cameraX, cameraY, canvasWidth, canvasHeight)) return;

  const sx = enemy.pos.x - cameraX + canvasWidth / 2;
  const sy = enemy.pos.y - cameraY + canvasHeight / 2;
  const r = enemy.radius;

  ctx.save();

  switch (enemy.type) {
    case 'bacteriophage': {
      // Spiky star polygon (6 points), purple
      ctx.fillStyle = '#9b59b6';
      ctx.strokeStyle = '#c39bd3';
      ctx.lineWidth = 1;
      drawStarPolygon(ctx, sx, sy, r, r * 0.45, 6);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'amoeba': {
      // Wobbly blob using sin-modulated radius, dark green
      const segments = 24;
      const phase = (enemy.pos.x + enemy.pos.y) * 0.01; // pseudo-time from position
      ctx.beginPath();
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const wobble =
          Math.sin(angle * 3 + phase) * r * 0.18 +
          Math.sin(angle * 5 - phase * 1.3) * r * 0.1;
        const rx = sx + Math.cos(angle) * (r + wobble);
        const ry = sy + Math.sin(angle) * (r + wobble);
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fillStyle = '#27ae60';
      ctx.fill();
      ctx.strokeStyle = '#2ecc71';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Nucleus blob inside
      ctx.beginPath();
      ctx.arc(sx + r * 0.15, sy - r * 0.1, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();
      break;
    }

    case 'paramecium': {
      // Oval with cilia fringe, yellow
      ctx.save();
      const angle = enemy.vel.x === 0 && enemy.vel.y === 0
        ? 0
        : Math.atan2(enemy.vel.y, enemy.vel.x);
      ctx.translate(sx, sy);
      ctx.rotate(angle);

      // Body oval
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.6, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f1c40f';
      ctx.fill();
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cilia fringe — tiny lines around oval edge
      const ciliaCount = 14;
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < ciliaCount; i++) {
        const a = (i / ciliaCount) * Math.PI * 2;
        const ex = Math.cos(a) * r * 1.6;
        const ey = Math.sin(a) * r * 0.7;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + nx * 4, ey + ny * 4);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'whiteBloodCell': {
      // Large white circle with nucleus, off-white
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(sx - r * 0.2, sy - r * 0.2, r * 0.1, sx, sy, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#ecf0f1');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#bdc3c7';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Multi-lobed nucleus (2 overlapping blobs)
      ctx.fillStyle = 'rgba(100, 110, 130, 0.55)';
      ctx.beginPath();
      ctx.arc(sx - r * 0.15, sy, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + r * 0.18, sy - r * 0.1, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'toxoplasma': {
      // Small dot, semi-transparent when camouflaged, gray
      const alpha = enemy.camouflaged ? 0.35 : 0.9;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#7f8c8d';
      ctx.fill();
      ctx.strokeStyle = '#95a5a6';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Small inner highlight
      ctx.beginPath();
      ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      break;
    }

    case 'tardigrade': {
      // Massive oval with stubby legs, brown
      const moveAngle = enemy.vel.x === 0 && enemy.vel.y === 0
        ? 0
        : Math.atan2(enemy.vel.y, enemy.vel.x);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(moveAngle);

      // Body
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.65, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8b6914';
      ctx.fill();
      ctx.strokeStyle = '#a0791e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4 pairs of stubby legs
      ctx.strokeStyle = '#6b4f10';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const legOffsets = [-0.55, -0.2, 0.2, 0.55];
      for (const ox of legOffsets) {
        const lx = ox * r;
        // top leg
        ctx.beginPath();
        ctx.moveTo(lx, -r * 0.55);
        ctx.lineTo(lx + ox * r * 0.25, -r * 0.9);
        ctx.stroke();
        // bottom leg
        ctx.beginPath();
        ctx.moveTo(lx, r * 0.55);
        ctx.lineTo(lx + ox * r * 0.25, r * 0.9);
        ctx.stroke();
      }

      // Eyes
      ctx.fillStyle = '#1a0f00';
      ctx.beginPath();
      ctx.arc(r * 0.5, -r * 0.2, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.5, r * 0.2, r * 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }
  }

  ctx.restore();
}
