import { EnemyState, GameState } from '../../types';

const CHEMOTAXIS_RANGE = 300; // range at which amoeba drifts toward food
const BURST_DAMAGE_MIN = 30;
const BURST_DAMAGE_MAX = 50;
const DAMAGE_COOLDOWN = 1.5; // seconds between damage applications

// We store damage cooldown in patrolTimer (repurposed for amoeba)
export function updateAmoeba(enemy: EnemyState, state: GameState): void {
  const dt = state.deltaTime;
  const { player, food } = state;

  // Decrement damage cooldown
  if (enemy.patrolTimer !== undefined && enemy.patrolTimer > 0) {
    enemy.patrolTimer -= dt;
  }

  const toDx = player.pos.x - enemy.pos.x;
  const toDy = player.pos.y - enemy.pos.y;
  const distToPlayer = Math.sqrt(toDx * toDx + toDy * toDy);

  // Chase player if nearby AND amoeba is larger
  const playerInRange = distToPlayer < enemy.senseRadius;
  const amoebaLarger = enemy.radius > player.radius;

  if (playerInRange && amoebaLarger) {
    enemy.chasingPlayer = true;
    // Move toward player
    if (distToPlayer > 0) {
      enemy.vel.x = (toDx / distToPlayer) * enemy.speed;
      enemy.vel.y = (toDy / distToPlayer) * enemy.speed;
    }
  } else {
    enemy.chasingPlayer = false;

    // Chemotaxis: drift toward nearest food
    let nearestFoodDist = Infinity;
    let nearestFoodDx = 0;
    let nearestFoodDy = 0;

    for (const item of food) {
      if (item.collected) continue;
      const fdx = item.pos.x - enemy.pos.x;
      const fdy = item.pos.y - enemy.pos.y;
      const fd = Math.sqrt(fdx * fdx + fdy * fdy);
      if (fd < nearestFoodDist && fd < CHEMOTAXIS_RANGE) {
        nearestFoodDist = fd;
        nearestFoodDx = fdx;
        nearestFoodDy = fdy;
      }
    }

    if (nearestFoodDist < CHEMOTAXIS_RANGE) {
      // Drift toward food (chemotaxis, slower than chasing)
      const len = Math.sqrt(nearestFoodDx * nearestFoodDx + nearestFoodDy * nearestFoodDy);
      enemy.vel.x = (nearestFoodDx / len) * enemy.speed * 0.6;
      enemy.vel.y = (nearestFoodDy / len) * enemy.speed * 0.6;
    } else {
      // Slow random drift
      enemy.vel.x += (Math.random() - 0.5) * 10;
      enemy.vel.y += (Math.random() - 0.5) * 10;
      // Dampen velocity
      enemy.vel.x *= 0.95;
      enemy.vel.y *= 0.95;
      // Clamp to half speed
      const speed = Math.sqrt(enemy.vel.x * enemy.vel.x + enemy.vel.y * enemy.vel.y);
      const maxDrift = enemy.speed * 0.4;
      if (speed > maxDrift) {
        enemy.vel.x = (enemy.vel.x / speed) * maxDrift;
        enemy.vel.y = (enemy.vel.y / speed) * maxDrift;
      }
    }
  }

  // Move
  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  // Player contact: burst damage
  if (distToPlayer < player.radius + enemy.radius) {
    const cooldownDone = enemy.patrolTimer === undefined || enemy.patrolTimer <= 0;
    if (cooldownDone) {
      const damage = BURST_DAMAGE_MIN + Math.random() * (BURST_DAMAGE_MAX - BURST_DAMAGE_MIN);
      state.atp.current = Math.max(0, state.atp.current - damage);
      enemy.patrolTimer = DAMAGE_COOLDOWN;
    }
  }

  // Map boundary
  const dx = enemy.pos.x - state.map.centerX;
  const dy = enemy.pos.y - state.map.centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const boundary = state.map.width / 2 - enemy.radius;
  if (dist > boundary) {
    const nx = dx / dist;
    const ny = dy / dist;
    enemy.pos.x = state.map.centerX + nx * boundary;
    enemy.pos.y = state.map.centerY + ny * boundary;
    enemy.vel.x = -nx * enemy.speed * 0.5;
    enemy.vel.y = -ny * enemy.speed * 0.5;
  }
}

export function renderAmoeba(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  screenX: number,
  screenY: number
): void {
  const r = enemy.radius;
  const time = performance.now() / 1000;
  const segments = 8;

  ctx.save();
  ctx.translate(screenX, screenY);

  // Wobbly circle: each segment radius offset by sin(time + segmentIndex)
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
    const wobble = Math.sin(time * 2 + (i / segments) * Math.PI * 2) * r * 0.22;
    const radius = r + wobble;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  // Outer fill: dark green
  ctx.fillStyle = '#27ae60';
  ctx.fill();

  // Inner darker fill
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2 - Math.PI / 2;
    const wobble = Math.sin(time * 2.5 + (i / segments) * Math.PI * 2 + 1) * r * 0.15;
    const radius = r * 0.55 + wobble;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#1e8449';
  ctx.fill();

  // Nucleus dot
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = '#145a32';
  ctx.fill();

  ctx.restore();
}
