import { EnemyState, GameState } from '../../types';

// Zone linger time threshold before switching to hunt mode (seconds)
const HUNT_TRIGGER_TIME = 10;

// Track per-enemy zone entry time using a WeakMap keyed by enemy id via a Map
const zoneEntryTimes = new Map<number, { zone: number; enteredAt: number }>();
// Hunt mode activated per enemy
const huntModeActive = new Map<number, boolean>();

function getZoneEntryData(enemy: EnemyState, totalTime: number) {
  const existing = zoneEntryTimes.get(enemy.id);
  if (!existing || existing.zone !== enemy.zone) {
    zoneEntryTimes.set(enemy.id, { zone: enemy.zone, enteredAt: totalTime });
    return { zone: enemy.zone, enteredAt: totalTime };
  }
  return existing;
}

export function updateWhiteBloodCell(enemy: EnemyState, state: GameState): void {
  const dt = state.deltaTime;
  const player = state.player;

  // Determine player's zone relative to map center
  const mapCX = state.map.centerX;
  const mapCY = state.map.centerY;
  const playerDistFromCenter = Math.sqrt(
    (player.pos.x - mapCX) ** 2 + (player.pos.y - mapCY) ** 2
  );

  // Get zone radius for patrol (use zone boundaries from constants indirectly via map radius)
  // Zone radius is approximate — use senseRadius as patrol orbit radius fallback
  const patrolRadius = enemy.senseRadius * 1.5;

  // Track zone linger time
  const entryData = getZoneEntryData(enemy, state.totalTime);
  const lingerTime = state.totalTime - entryData.enteredAt;

  // Check if player is in same zone
  const playerInSameZone = state.currentZone === enemy.zone;

  if (playerInSameZone && lingerTime > HUNT_TRIGGER_TIME) {
    huntModeActive.set(enemy.id, true);
  } else if (!playerInSameZone) {
    huntModeActive.set(enemy.id, false);
  }

  const isHunting = huntModeActive.get(enemy.id) ?? false;
  enemy.chasingPlayer = isHunting;

  if (isHunting) {
    // Hunt mode: slowly pursue player
    const dx = player.pos.x - enemy.pos.x;
    const dy = player.pos.y - enemy.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const speed = enemy.speed * 0.8; // slightly slower in hunt mode but relentless
      enemy.vel.x = (dx / dist) * speed;
      enemy.vel.y = (dy / dist) * speed;
    }
  } else {
    // Patrol mode: move along a circular arc around zone center
    if (!enemy.patrolTimer) enemy.patrolTimer = 0;
    enemy.patrolTimer += dt;

    // Orbit around map center at patrolRadius distance
    const orbitAngle = enemy.patrolTimer * 0.3 + enemy.id * 1.2; // offset per enemy
    const targetX = mapCX + Math.cos(orbitAngle) * patrolRadius;
    const targetY = mapCY + Math.sin(orbitAngle) * patrolRadius;

    const dx = targetX - enemy.pos.x;
    const dy = targetY - enemy.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) {
      enemy.vel.x = (dx / dist) * enemy.speed;
      enemy.vel.y = (dy / dist) * enemy.speed;
    } else {
      enemy.vel.x *= 0.9;
      enemy.vel.y *= 0.9;
    }
  }

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;
}

export function renderWhiteBloodCell(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyState,
  screenX: number,
  screenY: number
): void {
  const r = enemy.radius;
  const isHunting = enemy.chasingPlayer ?? false;

  ctx.save();

  // Red glow when hunting
  if (isHunting) {
    ctx.shadowColor = 'rgba(220, 50, 50, 0.6)';
    ctx.shadowBlur = 20;
  }

  // Main cell body — large off-white circle
  ctx.beginPath();
  ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ecf0f1';
  ctx.fill();
  ctx.strokeStyle = isHunting ? '#e74c3c' : '#bdc3c7';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Reset shadow for nucleus lobes
  ctx.shadowBlur = 0;

  // Multi-lobed nucleus: 3-4 overlapping smaller circles
  const nucleusColor = '#7f8c8d';
  const lobeOffsets = [
    { ox: -r * 0.2, oy: -r * 0.1, nr: r * 0.28 },
    { ox: r * 0.18, oy: -r * 0.15, nr: r * 0.25 },
    { ox: r * 0.05, oy: r * 0.2, nr: r * 0.22 },
    { ox: -r * 0.15, oy: r * 0.18, nr: r * 0.2 },
  ];

  for (const lobe of lobeOffsets) {
    ctx.beginPath();
    ctx.arc(screenX + lobe.ox, screenY + lobe.oy, lobe.nr, 0, Math.PI * 2);
    ctx.fillStyle = nucleusColor;
    ctx.globalAlpha = 0.6;
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;

  // Nucleus outline connecting the lobes
  ctx.beginPath();
  ctx.arc(screenX, screenY - r * 0.05, r * 0.38, 0, Math.PI * 2);
  ctx.strokeStyle = '#5d6d7e';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  ctx.restore();
}
