// CytoSurvivor - Collision System
// Handles all collision detection and response for a single frame.

import { GameState, EnemyState, FoodItem } from '../types';
import { FOOD_COLLECTION_BASE_RADIUS, GOLDEN_FOOD_DNA_BONUS, MAP_CENTER } from '../constants';

// === Utility Functions ===

export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function circlesOverlap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radSum = r1 + r2;
  return distSq < radSum * radSum;
}

// === ATP Gain Multiplier (Endoplasmic Reticulum bonus) ===
function getATPGainMultiplier(erLevel: number): number {
  if (erLevel >= 3) return 1.5;
  if (erLevel >= 2) return 1.3;
  if (erLevel >= 1) return 1.15;
  return 1.0;
}

// === Damage Reduction Multiplier (Cell Membrane) ===
function getDamageMultiplier(membraneLevel: number): number {
  if (membraneLevel >= 3) return 0.5;
  if (membraneLevel >= 2) return 0.7;
  if (membraneLevel >= 1) return 0.85;
  return 1.0;
}

// === Collection Radius (Cilia bonus) ===
function getCollectionRadius(ciliaLevel: number): number {
  // Cilia organelle expands collection radius
  const bonus = ciliaLevel > 0 ? ciliaLevel * 10 : 0;
  return FOOD_COLLECTION_BASE_RADIUS + bonus;
}

// === Lysosomes Contact Damage ===
function getLysosomesATPGain(lysosomesLevel: number, enemyMaxHealth: number): number {
  if (lysosomesLevel >= 3) return enemyMaxHealth * 0.40;
  if (lysosomesLevel >= 2) return enemyMaxHealth * 0.25;
  if (lysosomesLevel >= 1) return enemyMaxHealth * 0.10;
  return 0;
}

// === Determine current zone from player distance to center ===
function getZoneFromDistance(distFromCenter: number): import('../types').ZoneId {
  const ratio = distFromCenter / (MAP_CENTER);
  if (ratio < 0.15) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.55) return 3;
  if (ratio < 0.75) return 4;
  return 5;
}

// === Apply knockback to player away from enemy ===
function applyPlayerKnockback(state: GameState, enemy: EnemyState): void {
  const dx = state.player.pos.x - enemy.pos.x;
  const dy = state.player.pos.y - enemy.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const resistance = enemy.knockbackResistance ?? 0;
  const force = 200 * (1 - resistance);
  state.player.vel.x += (dx / dist) * force;
  state.player.vel.y += (dy / dist) * force;
}

// === Player velocity change magnitude tracker for Bacteriophage shake-off ===
// We compute a simple "erratic movement" score by magnitude of vel change each frame.
function getVelChangeMagnitude(state: GameState): number {
  // Use current velocity magnitude as a proxy (no prev-frame storage here)
  const vx = state.player.vel.x;
  const vy = state.player.vel.y;
  return Math.sqrt(vx * vx + vy * vy);
}

// === Main Collision Update ===

export function updateCollisions(state: GameState): void {
  const dt = state.deltaTime;
  const player = state.player;

  const ciliaLevel = state.organelles.get('cilia') ?? 0;
  const erLevel = state.organelles.get('endoplasmicReticulum') ?? 0;
  const membraneLevel = state.organelles.get('cellMembrane') ?? 0;
  const lysosomesLevel = state.organelles.get('lysosomes') ?? 0;

  const collectionRadius = getCollectionRadius(ciliaLevel);
  const atpMultiplier = getATPGainMultiplier(erLevel);
  const damageMultiplier = getDamageMultiplier(membraneLevel);

  // --- 1. Player <-> Food ---
  for (const food of state.food) {
    if (food.collected) continue;

    if (circlesOverlap(
      player.pos.x, player.pos.y, collectionRadius,
      food.pos.x, food.pos.y, food.radius
    )) {
      food.collected = true;
      state.runStats.foodCollected += 1;

      // ATP gain
      const atpGain = food.value * atpMultiplier;
      state.atp.current = Math.min(state.atp.max, state.atp.current + atpGain);

      // XP gain
      state.atp.xp += food.value;

      // Upgrade points
      state.upgradePoints += Math.floor(food.value / 5);

      // Golden food DNA bonus
      if (food.type === 'golden') {
        state.runStats.dnaEarned += GOLDEN_FOOD_DNA_BONUS;
        state.meta.dnaPoints += GOLDEN_FOOD_DNA_BONUS;
        state.meta.totalDnaEarned += GOLDEN_FOOD_DNA_BONUS;
      }

      // Update furthest zone
      if (food.zone > state.runStats.furthestZone) {
        state.runStats.furthestZone = food.zone;
      }
    }
  }

  // Update furthest zone based on player position too
  const playerDistFromCenter = distance(player.pos.x, player.pos.y, MAP_CENTER, MAP_CENTER);
  const playerZone = getZoneFromDistance(playerDistFromCenter);
  if (playerZone > state.runStats.furthestZone) {
    state.runStats.furthestZone = playerZone;
  }

  // --- 2. Player <-> Enemies ---
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;

    const overlapping = circlesOverlap(
      player.pos.x, player.pos.y, player.radius,
      enemy.pos.x, enemy.pos.y, enemy.radius
    );

    if (overlapping) {
      // --- Bacteriophage ---
      if (enemy.type === 'bacteriophage') {
        if (!enemy.attachedToPlayer) {
          // Attach to player
          enemy.attachedToPlayer = true;
        } else {
          // Drain ATP at attachDrainRate/sec
          const drainRate = enemy.attachDrainRate ?? enemy.damage;
          const rawDamage = drainRate * dt;
          const actualDamage = rawDamage * damageMultiplier;
          state.atp.current = Math.max(0, state.atp.current - actualDamage);
        }

        // Shake-off: if player is moving erratically (high velocity), detach
        const velMag = getVelChangeMagnitude(state);
        const SHAKE_THRESHOLD = 200;
        if (enemy.attachedToPlayer && velMag > SHAKE_THRESHOLD) {
          enemy.attachedToPlayer = false;
          // Knockback the phage away
          applyPlayerKnockback(state, enemy);
        }
      }

      // --- White Blood Cell ---
      else if (enemy.type === 'whiteBloodCell') {
        const rawDamage = enemy.damage * dt;
        const actualDamage = rawDamage * damageMultiplier;
        state.atp.current = Math.max(0, state.atp.current - actualDamage);

        // Disable a random organelle for 10 seconds
        // Store disabled organelle on state via a side-channel on meta if needed
        // We use a custom property pattern: store on the state object
        const installedOrganelles: import('../types').OrganelleId[] = [];
        for (const [orgId, level] of state.organelles.entries()) {
          if (level > 0) installedOrganelles.push(orgId);
        }
        if (installedOrganelles.length > 0) {
          // Only apply the disable effect occasionally (once per contact, not every frame)
          // Use a cooldown tracked on the enemy itself via patrolTimer repurposed as disableCooldown
          const disableCooldown = (enemy as EnemyState & { disableCooldown?: number }).disableCooldown ?? 0;
          if (disableCooldown <= 0) {
            const idx = Math.floor(Math.random() * installedOrganelles.length);
            const targetOrganelle = installedOrganelles[idx];
            // Store disabled organelle info on state meta as a workaround
            // (GameState doesn't have a dedicated disabledOrganelles field, so we use a best-effort approach)
            (state as GameState & { disabledOrganelle?: import('../types').OrganelleId; disabledOrganelleTimer?: number }).disabledOrganelle = targetOrganelle;
            (state as GameState & { disabledOrganelle?: import('../types').OrganelleId; disabledOrganelleTimer?: number }).disabledOrganelleTimer = 10;
            (enemy as EnemyState & { disableCooldown?: number }).disableCooldown = 10;
          }
        }

        applyPlayerKnockback(state, enemy);
      }

      // --- Toxoplasma ---
      else if (enemy.type === 'toxoplasma') {
        const rawDamage = enemy.damage * dt;
        const actualDamage = rawDamage * damageMultiplier;
        state.atp.current = Math.max(0, state.atp.current - actualDamage);

        // Reverse controls for 5 seconds
        if (!enemy.hijackActive) {
          enemy.hijackActive = true;
          enemy.hijackTimer = 5;
        }

        applyPlayerKnockback(state, enemy);
      }

      // --- Default continuous damage ---
      else {
        const rawDamage = enemy.damage * dt;
        const actualDamage = rawDamage * damageMultiplier;
        state.atp.current = Math.max(0, state.atp.current - actualDamage);
        applyPlayerKnockback(state, enemy);
      }

      // --- Lysosomes: deal contact damage to enemy ---
      if (lysosomesLevel > 0) {
        const lysoDamage = enemy.maxHealth * 0.1 * lysosomesLevel * dt;
        enemy.health -= lysoDamage;

        if (enemy.health <= 0) {
          enemy.active = false;
          const atpGain = getLysosomesATPGain(lysosomesLevel, enemy.maxHealth);
          state.atp.current = Math.min(state.atp.max, state.atp.current + atpGain);
        }
      }
    }

    // Toxoplasma camouflage lunge: close but not yet overlapping
    if (enemy.type === 'toxoplasma' && enemy.camouflaged && !overlapping) {
      const dist = distance(player.pos.x, player.pos.y, enemy.pos.x, enemy.pos.y);
      if (dist < enemy.senseRadius * 0.5) {
        // Lunge toward player: apply burst velocity to enemy
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const d = dist || 1;
        enemy.vel.x = (dx / d) * enemy.speed * 4;
        enemy.vel.y = (dy / d) * enemy.speed * 4;
        enemy.camouflaged = false;
      }
    }

    // Tick WBC disable cooldown
    const wbcEnemy = enemy as EnemyState & { disableCooldown?: number };
    if (wbcEnemy.disableCooldown !== undefined && wbcEnemy.disableCooldown > 0) {
      wbcEnemy.disableCooldown -= dt;
    }

    // Tick toxoplasma hijack timer
    if (enemy.type === 'toxoplasma' && enemy.hijackActive && enemy.hijackTimer !== undefined) {
      enemy.hijackTimer -= dt;
      if (enemy.hijackTimer <= 0) {
        enemy.hijackActive = false;
        enemy.hijackTimer = 0;
      }
    }
  }

  // Tick disabled organelle timer (WBC effect)
  const stateExt = state as GameState & { disabledOrganelleTimer?: number; disabledOrganelle?: import('../types').OrganelleId };
  if (stateExt.disabledOrganelleTimer !== undefined && stateExt.disabledOrganelleTimer > 0) {
    stateExt.disabledOrganelleTimer -= dt;
    if (stateExt.disabledOrganelleTimer <= 0) {
      stateExt.disabledOrganelleTimer = 0;
      stateExt.disabledOrganelle = undefined;
    }
  }

  // --- 3. Enemy <-> Food ---
  for (const enemy of state.enemies) {
    if (!enemy.active) continue;
    for (const food of state.food) {
      if (food.collected) continue;
      const dist = distance(enemy.pos.x, enemy.pos.y, food.pos.x, food.pos.y);
      // Enemy must be within senseRadius and overlapping the food
      if (dist < enemy.senseRadius && circlesOverlap(
        enemy.pos.x, enemy.pos.y, enemy.radius,
        food.pos.x, food.pos.y, food.radius
      )) {
        food.collected = true;
      }
    }
  }

  // --- 4. Player <-> Toxic Pockets ---
  // Mark which toxic pocket the player is currently in (for visual effects)
  // ATP drain is handled by the ATP system; we just tag the player's current pocket
  const stateWithPocket = state as GameState & { currentToxicPocketIndex?: number };
  stateWithPocket.currentToxicPocketIndex = -1;
  for (let i = 0; i < state.toxicPockets.length; i++) {
    const pocket = state.toxicPockets[i];
    if (circlesOverlap(
      player.pos.x, player.pos.y, player.radius,
      pocket.pos.x, pocket.pos.y, pocket.radius
    )) {
      stateWithPocket.currentToxicPocketIndex = i;
      break;
    }
  }
}
