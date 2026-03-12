import { EnemyState, GameState } from '../../types';

const SINE_WAVE_FREQUENCY = 2.5; // cycles per second for lateral oscillation
const SINE_WAVE_AMPLITUDE = 60; // pixels of lateral oscillation
const DAMAGE_COOLDOWN = 1.0; // seconds between damage applications
const KNOCKBACK_FORCE = 200; // px/sec knockback applied to player

// patrolTimer reused for damage cooldown
// hijackTimer reused to store the sine wave phase offset (assigned at spawn)
export function updateParamecium(enemy: EnemyState, state: GameState): void {
  const dt = state.deltaTime;
  const { player, totalTime } = state;

  // Decrement damage cooldown
  if (enemy.patrolTimer !== undefined && enemy.patrolTimer > 0) {
    enemy.patrolTimer -= dt;
  }

  // Initialize phase offset if not set
  if (enemy.hijackTimer === undefined) {
    enemy.hijackTimer = Math.random() * Math.PI * 2;
  }

  // Paramecium moves in a fixed primary direction with sine wave perpendicular oscillation
  // Primary direction is derived from initial velocity
  const speed = Math.sqrt(enemy.vel.x * enemy.vel.x + enemy.vel.y * enemy.vel.y);

  // Get/maintain primary direction unit vector
  let primaryDx: number;
  let primaryDy: number;

  if (speed > 0) {
    primaryDx = enemy.vel.x / speed;
    primaryDy = enemy.vel.y / speed;
  } else {
    // Pick a random direction if somehow stopped
    const angle = Math.random() * Math.PI * 2;
    primaryDx = Math.cos(angle);
    primaryDy = Math.sin(angle);
  }

  // Perpendicular direction (rotated 90 degrees)
  const perpDx = -primaryDy;
  const perpDy = primaryDx;

  // Sine wave lateral offset
  const sineOffset = Math.sin(totalTime * SINE_WAVE_FREQUENCY + enemy.hijackTimer) * SINE_WAVE_AMPLITUDE;

  // Final velocity: primary direction at full speed + lateral sine oscillation
  // Use derivative of sine for velocity contribution: cos(t) * amplitude * frequency
  const lateralSpeed = Math.cos(totalTime * SINE_WAVE_FREQUENCY + enemy.hijackTimer)
    * SINE_WAVE_AMPLITUDE * SINE_WAVE_FREQUENCY;

  enemy.vel.x = primaryDx * enemy.speed + perpDx * lateralSpeed;
  enemy.vel.y = primaryDy * enemy.speed + perpDy * lateralSpeed;

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  // Bounce off map edges
  const dx = enemy.pos.x - state.map.centerX;
  const dy = enemy.pos.y - state.map.centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const boundary = state.map.width / 2 - enemy.radius;

  if (dist > boundary) {
    // Reflect primary direction
    const nx = dx / dist;
    const ny = dy / dist;
    const dot = primaryDx * nx + primaryDy * ny;
    primaryDx -= 2 * dot * nx;
    primaryDy -= 2 * dot * ny;
    // Update velocity to new reflected direction
    enemy.vel.x = primaryDx * enemy.speed;
    enemy.vel.y = primaryDy * enemy.speed;
    // Push inside
    enemy.pos.x = state.map.centerX + nx * boundary;
    enemy.pos.y = state.map.centerY + ny * boundary;
  }

  // Player contact: moderate damage + knockback
  const toDx = player.pos.x - enemy.pos.x;
  const toDy = player.pos.y - enemy.pos.y;
  const distToPlayer = Math.sqrt(toDx * toDx + toDy * toDy);

  if (distToPlayer < player.radius + enemy.radius) {
    const cooldownDone = enemy.patrolTimer === undefined || enemy.patrolTimer <= 0;
    if (cooldownDone) {
      // Damage
      const damage = enemy.damage;
      state.atp.current = Math.max(0, state.atp.current - damage);
      enemy.patrolTimer = DAMAGE_COOLDOWN;

      // Knockback: push player away from paramecium
      if (distToPlayer > 0) {
        const kbDir_x = toDx / distToPlayer;
        const kbDir_y = toDy / distToPlayer;
        player.vel.x += kbDir_x * KNOCKBACK_FORCE;
        player.vel.y += kbDir_y * KNOCKBACK_FORCE;
      }
    }
  }
}

export function renderParamecium(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  screenX: number,
  screenY: number
): void {
  const r = enemy.radius;
  const time = performance.now() / 1000;

  // Determine orientation from velocity
  const speed = Math.sqrt(enemy.vel.x * enemy.vel.x + enemy.vel.y * enemy.vel.y);
  const angle = speed > 0 ? Math.atan2(enemy.vel.y, enemy.vel.x) : 0;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(angle);

  // Draw oval (ellipse) body
  const halfW = r * 1.7;
  const halfH = r;

  ctx.beginPath();
  ctx.ellipse(0, 0, halfW, halfH, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f1c40f';
  ctx.fill();
  ctx.strokeStyle = '#f9e79f';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cilia: small lines around the ellipse perimeter
  const ciliaCount = 16;
  const ciliaBaseLength = r * 0.35;

  for (let i = 0; i < ciliaCount; i++) {
    const t = (i / ciliaCount) * Math.PI * 2;
    // Point on ellipse perimeter
    const ex = Math.cos(t) * halfW;
    const ey = Math.sin(t) * halfH;

    // Normal direction (approximate outward)
    const nx = Math.cos(t) / halfW;
    const ny = Math.sin(t) / halfH;
    const nlen = Math.sqrt(nx * nx + ny * ny);
    const normalX = nx / nlen;
    const normalY = ny / nlen;

    // Cilia wave: sine offset perpendicular to normal
    const wavePhase = time * 4 + (i / ciliaCount) * Math.PI * 2;
    const wave = Math.sin(wavePhase) * 0.4;
    const perpX = -normalY;
    const perpY = normalX;

    const ciliaLength = ciliaBaseLength;
    const tipX = ex + (normalX + perpX * wave) * ciliaLength;
    const tipY = ey + (normalY + perpY * wave) * ciliaLength;

    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(tipX, tipY);
    ctx.strokeStyle = '#f9e79f';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // Inner highlight
  ctx.beginPath();
  ctx.ellipse(-halfW * 0.2, -halfH * 0.2, halfW * 0.4, halfH * 0.35, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fill();

  ctx.restore();
}
