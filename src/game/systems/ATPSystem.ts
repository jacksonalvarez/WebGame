// CytoSurvivor - ATP System
// Manages ATP (health/currency), drain, leveling, and organelle effects.

import { GameState } from '../types';
import {
  BASE_DRAIN_RATE,
  MOVEMENT_DRAIN_MULTIPLIER,
  FOOD_XP_PER_UNIT,
  LEVEL_THRESHOLDS,
  ATP_PER_LEVEL,
} from '../constants';

// Mitochondria drain reduction by level (0 = not installed)
const MITOCHONDRIA_EFFECT = [0, 0.20, 0.35, 0.50];

// Vacuole flat ATP bonus by level (0 = not installed)
const VACUOLE_ATP_BONUS = [0, 30, 50, 75];

/**
 * Calculate the effective ATP drain rate for this frame.
 * Accounts for mitochondria, toxic pockets, movement, and mutations.
 */
export function getEffectiveDrainRate(state: GameState): number {
  const mitoLevel = state.organelles.get('mitochondria') ?? 0;
  let rate = BASE_DRAIN_RATE * (1 - MITOCHONDRIA_EFFECT[mitoLevel]);

  // Check if player is inside a toxic pocket
  for (const pocket of state.toxicPockets) {
    const dx = state.player.pos.x - pocket.pos.x;
    const dy = state.player.pos.y - pocket.pos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= pocket.radius * pocket.radius) {
      rate *= pocket.drainMultiplier;
      break; // apply only the first pocket overlapped
    }
  }

  // Mutation: thermophilic — drain changes based on zone
  if (state.meta.equippedMutations.includes('thermophilic')) {
    const zone = state.currentZone;
    if (zone >= 4) {
      rate *= 0.80; // -20% in zones 4-5
    } else if (zone <= 2) {
      rate *= 1.20; // +20% in zones 1-2
    }
  }

  // Extra drain while moving
  const vel = state.player.vel;
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  if (speed > 5) {
    rate += MOVEMENT_DRAIN_MULTIPLIER;
  }

  return rate;
}

/**
 * Calculate ATP gain multiplier from Endoplasmic Reticulum organelle.
 */
export function getATPGainMultiplier(state: GameState): number {
  const erLevel = state.organelles.get('endoplasmicReticulum') ?? 0;
  // ER effectPerLevel from organelle definitions: [0.10, 0.20, 0.30] (10%/20%/30% bonus)
  const ER_BONUS = [0, 0.10, 0.20, 0.30];
  return 1 + ER_BONUS[erLevel];
}

/**
 * Recalculate max ATP from baseMax, organelle reductions, and vacuole bonus.
 */
function recalculateMaxATP(state: GameState): void {
  let max = state.atp.baseMax;

  // Subtract max ATP cost for each installed organelle (sum of reductions up to current level)
  // The organelle definitions store maxAtpReductionPerLevel as cost-per-upgrade, so we sum them.
  // We use a known reduction table per organelle rather than importing all definitions to avoid coupling.
  // Reductions are applied as stored in state by spendATP / reduceMaxATP calls, so we just need
  // the vacuole bonus on top of whatever baseMax already accounts for.

  // Vacuole adds flat ATP
  const vacuoleLevel = state.organelles.get('vacuole') ?? 0;
  max += VACUOLE_ATP_BONUS[vacuoleLevel];

  state.atp.max = Math.max(max, 1);
}

/**
 * Update ATP state each frame: apply drain, mutations (photosynthetic), clamp, and check death.
 */
export function updateATP(state: GameState): void {
  const effectiveDrain = getEffectiveDrainRate(state);
  state.atp.current -= effectiveDrain * state.deltaTime;

  // Mutation: photosynthetic — regen ATP when nearly stationary
  if (state.meta.equippedMutations.includes('photosynthetic')) {
    const vel = state.player.vel;
    const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    if (speed < 5) {
      state.atp.current += 0.5 * state.deltaTime;
    }
  }

  // Clamp to [0, max]
  state.atp.current = Math.max(0, Math.min(state.atp.current, state.atp.max));

  // Death check
  if (state.atp.current <= 0) {
    state.phase = 'dead';
  }
}

/**
 * Add ATP from food collection, respecting the gain multiplier.
 */
export function addATP(state: GameState, amount: number): void {
  const gained = amount * getATPGainMultiplier(state);
  state.atp.current = Math.min(state.atp.current + gained, state.atp.max);
}

/**
 * Spend ATP for an organelle upgrade.
 * Returns true if successful, false if not enough ATP.
 */
export function spendATP(state: GameState, amount: number): boolean {
  if (state.atp.current < amount) return false;
  state.atp.current -= amount;
  return true;
}

/**
 * Reduce max ATP when installing an organelle (called at upgrade time).
 * Also adjusts baseMax so that recalculation works correctly.
 */
export function reduceMaxATP(state: GameState, amount: number): void {
  state.atp.baseMax -= amount;
  recalculateMaxATP(state);
  // Clamp current ATP in case max dropped below it
  state.atp.current = Math.min(state.atp.current, state.atp.max);
}

/**
 * Add XP from food collection and check for level up.
 * 1 food value = FOOD_XP_PER_UNIT XP.
 */
export function addXP(state: GameState, amount: number): void {
  state.atp.xp += amount * FOOD_XP_PER_UNIT;

  // Check for level ups (can level up multiple times in one call)
  while (
    state.atp.level < LEVEL_THRESHOLDS.length - 1 &&
    state.atp.xp >= LEVEL_THRESHOLDS[state.atp.level + 1]
  ) {
    state.atp.level += 1;
    state.atp.baseMax += ATP_PER_LEVEL;
    recalculateMaxATP(state);
  }

  // Update xpToNextLevel for HUD display
  const nextLevelIndex = state.atp.level + 1;
  if (nextLevelIndex < LEVEL_THRESHOLDS.length) {
    state.atp.xpToNextLevel = LEVEL_THRESHOLDS[nextLevelIndex];
  } else {
    state.atp.xpToNextLevel = Infinity;
  }
}
