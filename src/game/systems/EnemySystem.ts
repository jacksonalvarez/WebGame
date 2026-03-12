import { GameState, CameraState, EnemyState } from '../types';
import { MAP_SIZE, MAP_CENTER, MAP_RADIUS, ZONE_BOUNDARIES } from '../constants';
import { createEnemy, chemotaxisMove, renderEnemy } from '../entities/enemies/EnemyBase';

// White blood cell zone-patrol timer is per enemy (use patrolTimer field on EnemyState)
const WBC_HUNT_ZONE_DURATION = 10; // seconds before WBC switches to hunt mode

// Paramecium S-curve: track phase per enemy id
const parameciumPhase: Map<number, number> = new Map();
// Bacteriophage: ensure initial velocity is set
const bacteriophageInitialized: Set<number> = new Set();

// Simple seeded-ish rng using Math.random (no persistent seed needed for wobble)
function rng(): number {
  return Math.random();
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function updateBacteriophage(enemy: EnemyState, dt: number): void {
  // Float in straight line, bounce off map edges
  if (!bacteriophageInitialized.has(enemy.id)) {
    bacteriophageInitialized.add(enemy.id);
    const angle = rng() * Math.PI * 2;
    enemy.vel.x = Math.cos(angle) * enemy.speed;
    enemy.vel.y = Math.sin(angle) * enemy.speed;
  }

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  const r = enemy.radius;
  if (enemy.pos.x < r) { enemy.pos.x = r; enemy.vel.x = Math.abs(enemy.vel.x); }
  if (enemy.pos.x > MAP_SIZE - r) { enemy.pos.x = MAP_SIZE - r; enemy.vel.x = -Math.abs(enemy.vel.x); }
  if (enemy.pos.y < r) { enemy.pos.y = r; enemy.vel.y = Math.abs(enemy.vel.y); }
  if (enemy.pos.y > MAP_SIZE - r) { enemy.pos.y = MAP_SIZE - r; enemy.vel.y = -Math.abs(enemy.vel.y); }
}

function updateAmoeba(enemy: EnemyState, state: GameState, dt: number): void {
  const { player } = state;
  const dSq = distSq(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y);
  const senseSq = enemy.senseRadius * enemy.senseRadius;

  // Chase player if player is smaller and within sense radius
  if (dSq < senseSq && player.radius < enemy.radius) {
    enemy.chasingPlayer = true;
    const dist = Math.sqrt(dSq);
    if (dist > 0.001) {
      enemy.vel.x = ((player.pos.x - enemy.pos.x) / dist) * enemy.speed;
      enemy.vel.y = ((player.pos.y - enemy.pos.y) / dist) * enemy.speed;
    }
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;
    const r = enemy.radius;
    enemy.pos.x = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.x));
    enemy.pos.y = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.y));
  } else {
    enemy.chasingPlayer = false;
    chemotaxisMove(enemy, state.food, dt, rng);
  }
}

function updateParamecium(enemy: EnemyState, state: GameState, dt: number): void {
  // S-curve: sine wave on perpendicular axis while chemotaxing
  let phase = parameciumPhase.get(enemy.id) ?? 0;
  phase += dt * 2.5; // oscillation speed
  parameciumPhase.set(enemy.id, phase);

  // Do base chemotaxis first to get direction
  const prevVelX = enemy.vel.x;
  const prevVelY = enemy.vel.y;
  chemotaxisMove(enemy, state.food, dt, rng);

  // Add S-curve: perpendicular sine displacement on velocity
  const moveLen = Math.sqrt(enemy.vel.x * enemy.vel.x + enemy.vel.y * enemy.vel.y);
  if (moveLen > 0.001) {
    const nx = enemy.vel.x / moveLen;
    const ny = enemy.vel.y / moveLen;
    const perpX = -ny;
    const perpY = nx;
    const sineOffset = Math.sin(phase) * enemy.speed * 0.5;
    // Apply perpendicular offset to position (on top of what chemotaxis already moved)
    enemy.pos.x += perpX * sineOffset * dt;
    enemy.pos.y += perpY * sineOffset * dt;
    const r = enemy.radius;
    enemy.pos.x = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.x));
    enemy.pos.y = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.y));
  } else {
    // Restore velocity if chemotaxis zeroed it out
    enemy.vel.x = prevVelX;
    enemy.vel.y = prevVelY;
  }
}

function getZoneRadiusBounds(zone: number): { min: number; max: number } {
  const b = ZONE_BOUNDARIES;
  const minFrac = b[zone - 1] ?? 0;
  const maxFrac = b[zone] ?? 1;
  return { min: minFrac * MAP_RADIUS, max: maxFrac * MAP_RADIUS };
}

function updateWhiteBloodCell(enemy: EnemyState, state: GameState, dt: number): void {
  const { player } = state;

  // Track time player stays in WBC's zone
  const playerDx = player.pos.x - MAP_CENTER;
  const playerDy = player.pos.y - MAP_CENTER;
  const playerDist = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
  const zoneBounds = getZoneRadiusBounds(enemy.zone);
  const playerInZone = playerDist >= zoneBounds.min && playerDist < zoneBounds.max;

  if (playerInZone) {
    enemy.patrolTimer = (enemy.patrolTimer ?? 0) + dt;
  } else {
    // Reset patrol timer when player leaves zone
    enemy.patrolTimer = 0;
    enemy.chasingPlayer = false;
  }

  const huntMode = (enemy.patrolTimer ?? 0) >= WBC_HUNT_ZONE_DURATION;

  if (huntMode) {
    enemy.chasingPlayer = true;
    const dist = Math.sqrt(distSq(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y));
    if (dist > 0.001) {
      enemy.vel.x = ((player.pos.x - enemy.pos.x) / dist) * enemy.speed;
      enemy.vel.y = ((player.pos.y - enemy.pos.y) / dist) * enemy.speed;
    }
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;
    const r = enemy.radius;
    enemy.pos.x = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.x));
    enemy.pos.y = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.y));
  } else {
    // Patrol zone borders: move in arc around map center at zone boundary midpoint
    enemy.chasingPlayer = false;
    const midRadius = (zoneBounds.min + zoneBounds.max) / 2;
    const myDx = enemy.pos.x - MAP_CENTER;
    const myDy = enemy.pos.y - MAP_CENTER;
    const myDist = Math.sqrt(myDx * myDx + myDy * myDy) || 1;

    // Target point: same angle but at midRadius
    const angle = Math.atan2(myDy, myDx);
    const targetX = MAP_CENTER + Math.cos(angle + enemy.speed * dt / midRadius) * midRadius;
    const targetY = MAP_CENTER + Math.sin(angle + enemy.speed * dt / midRadius) * midRadius;

    const toTX = targetX - enemy.pos.x;
    const toTY = targetY - enemy.pos.y;
    const toTLen = Math.sqrt(toTX * toTX + toTY * toTY) || 1;
    enemy.vel.x = (toTX / toTLen) * enemy.speed;
    enemy.vel.y = (toTY / toTLen) * enemy.speed;
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;
    const r = enemy.radius;
    enemy.pos.x = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.x));
    enemy.pos.y = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.y));
  }
}

function updateToxoplasma(enemy: EnemyState, state: GameState, dt: number): void {
  const { player } = state;
  const dSq = distSq(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y);
  const LUNGE_DIST = 40;

  if (dSq < LUNGE_DIST * LUNGE_DIST) {
    // Lunge at player
    enemy.camouflaged = false;
    const dist = Math.sqrt(dSq);
    if (dist > 0.001) {
      enemy.vel.x = ((player.pos.x - enemy.pos.x) / dist) * enemy.speed * 2.5;
      enemy.vel.y = ((player.pos.y - enemy.pos.y) / dist) * enemy.speed * 2.5;
    }
    enemy.pos.x += enemy.vel.x * dt;
    enemy.pos.y += enemy.vel.y * dt;
    const r = enemy.radius;
    enemy.pos.x = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.x));
    enemy.pos.y = Math.max(r, Math.min(MAP_SIZE - r, enemy.pos.y));
  } else {
    // Stay camouflaged near food — use chemotaxis but stay still once near food
    let nearFood = false;
    for (const f of state.food) {
      if (f.collected) continue;
      const dx = f.pos.x - enemy.pos.x;
      const dy = f.pos.y - enemy.pos.y;
      if (dx * dx + dy * dy < (enemy.senseRadius * 0.3) * (enemy.senseRadius * 0.3)) {
        nearFood = true;
        break;
      }
    }
    if (nearFood) {
      // Stay still, remain camouflaged
      enemy.camouflaged = true;
      enemy.vel.x = 0;
      enemy.vel.y = 0;
    } else {
      enemy.camouflaged = false;
      chemotaxisMove(enemy, state.food, dt, rng);
      enemy.camouflaged = true; // re-enable after move
    }
  }
}

function updateTardigrade(enemy: EnemyState, dt: number): void {
  // Slow random wander, ignores food
  // Change direction occasionally (use a wobble-like timer tied to id)
  const key = enemy.id;
  // Reuse wobble direction mechanism via vel — give initial vel if zero
  const speed = enemy.speed;
  if (enemy.vel.x === 0 && enemy.vel.y === 0) {
    const angle = rng() * Math.PI * 2;
    enemy.vel.x = Math.cos(angle) * speed;
    enemy.vel.y = Math.sin(angle) * speed;
  }

  // Randomly nudge direction ~every update with small probability
  if (rng() < dt * 0.5) {
    const angle = Math.atan2(enemy.vel.y, enemy.vel.x) + (rng() - 0.5) * Math.PI * 0.5;
    enemy.vel.x = Math.cos(angle) * speed;
    enemy.vel.y = Math.sin(angle) * speed;
  }

  enemy.pos.x += enemy.vel.x * dt;
  enemy.pos.y += enemy.vel.y * dt;

  const r = enemy.radius;
  if (enemy.pos.x < r) { enemy.pos.x = r; enemy.vel.x = Math.abs(enemy.vel.x); }
  if (enemy.pos.x > MAP_SIZE - r) { enemy.pos.x = MAP_SIZE - r; enemy.vel.x = -Math.abs(enemy.vel.x); }
  if (enemy.pos.y < r) { enemy.pos.y = r; enemy.vel.y = Math.abs(enemy.vel.y); }
  if (enemy.pos.y > MAP_SIZE - r) { enemy.pos.y = MAP_SIZE - r; enemy.vel.y = -Math.abs(enemy.vel.y); }
}

export function updateEnemies(state: GameState): void {
  const dt = state.deltaTime;

  for (const enemy of state.enemies) {
    if (!enemy.active) continue;

    switch (enemy.type) {
      case 'bacteriophage':
        updateBacteriophage(enemy, dt);
        break;
      case 'amoeba':
        updateAmoeba(enemy, state, dt);
        break;
      case 'paramecium':
        updateParamecium(enemy, state, dt);
        break;
      case 'whiteBloodCell':
        updateWhiteBloodCell(enemy, state, dt);
        break;
      case 'toxoplasma':
        updateToxoplasma(enemy, state, dt);
        break;
      case 'tardigrade':
        updateTardigrade(enemy, dt);
        break;
    }
  }
}

export function renderEnemies(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: CameraState
): void {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    renderEnemy(ctx, enemy, camera.x, camera.y, cw, ch);
  }
}
