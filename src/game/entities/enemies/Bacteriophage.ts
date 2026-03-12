import { EnemyState, GameState } from '../../types';

const ATTACH_DRAIN_RATE = 5; // ATP/sec when attached
const DETACH_SPEED_THRESHOLD = 150; // px/sec player speed needed for detach chance
const DETACH_CHANCE_PER_FRAME = 0.02; // probability per frame when moving fast

export function updateBacteriophage(enemy: EnemyState, state: GameState): void {
  const dt = state.deltaTime;
  const { player, map } = state;

  // Handle attached state
  if (enemy.attachedToPlayer) {
    // Follow player position with an offset
    enemy.pos.x = player.pos.x + (enemy.pos.x - player.pos.x) * 0.5;
    enemy.pos.y = player.pos.y + (enemy.pos.y - player.pos.y) * 0.5;

    // Drain ATP
    state.atp.current = Math.max(0, state.atp.current - ATTACH_DRAIN_RATE * dt);

    // Check if player is moving fast (shaking it off)
    const playerSpeed = Math.sqrt(player.vel.x * player.vel.x + player.vel.y * player.vel.y);
    if (playerSpeed > DETACH_SPEED_THRESHOLD) {
      if (Math.random() < DETACH_CHANCE_PER_FRAME) {
        enemy.attachedToPlayer = false;
        // Fling the phage away
        const angle = Math.random() * Math.PI * 2;
        enemy.vel.x = Math.cos(angle) * enemy.speed * 2;
        enemy.vel.y = Math.sin(angle) * enemy.speed * 2;
      }
    }
    return;
  }

  // Move in straight line
  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  // Bounce off map edges (circular map boundary)
  const dx = enemy.pos.x - map.centerX;
  const dy = enemy.pos.y - map.centerY;
  const distFromCenter = Math.sqrt(dx * dx + dy * dy);
  const mapBoundary = map.width / 2 - enemy.radius;

  if (distFromCenter > mapBoundary) {
    // Reflect velocity away from center
    const nx = dx / distFromCenter;
    const ny = dy / distFromCenter;
    const dot = enemy.vel.x * nx + enemy.vel.y * ny;
    enemy.vel.x -= 2 * dot * nx;
    enemy.vel.y -= 2 * dot * ny;
    // Push back inside boundary
    enemy.pos.x = map.centerX + nx * mapBoundary;
    enemy.pos.y = map.centerY + ny * mapBoundary;
  }

  // Check player contact for attachment
  const toDx = player.pos.x - enemy.pos.x;
  const toDy = player.pos.y - enemy.pos.y;
  const distToPlayer = Math.sqrt(toDx * toDx + toDy * toDy);

  if (distToPlayer < player.radius + enemy.radius) {
    enemy.attachedToPlayer = true;
    enemy.attachDrainRate = ATTACH_DRAIN_RATE;
    enemy.vel.x = 0;
    enemy.vel.y = 0;
  }
}

export function renderBacteriophage(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  screenX: number,
  screenY: number
): void {
  const r = enemy.radius;
  const time = performance.now() / 1000;
  const rotation = time * 0.8; // slow rotation

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(rotation);

  // Draw 6-pointed star
  const outerR = r;
  const innerR = r * 0.4;
  const points = 6;

  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outerR : innerR;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Fill with purple
  ctx.fillStyle = enemy.attachedToPlayer ? '#c39bd3' : '#9b59b6';
  ctx.fill();

  // Spiky border
  ctx.strokeStyle = '#d7bde2';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Small center dot
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#d7bde2';
  ctx.fill();

  ctx.restore();
}
