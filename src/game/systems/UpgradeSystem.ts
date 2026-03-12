import { GameState, OrganelleId, OrganelleDefinition } from '../types';
import { ORGANELLE_DEFINITIONS } from '../data/organelles';

export function getOrganelleDefinition(organelleId: OrganelleId): OrganelleDefinition {
  const def = ORGANELLE_DEFINITIONS.find(d => d.id === organelleId);
  if (!def) throw new Error(`Unknown organelle: ${organelleId}`);
  return def;
}

export function getAllOrganelles(): OrganelleDefinition[] {
  return ORGANELLE_DEFINITIONS;
}

export function getOrganelleLevel(state: GameState, organelleId: OrganelleId): number {
  return state.organelles.get(organelleId) ?? 0;
}

export function getOrganelleEffect(state: GameState, organelleId: OrganelleId): number {
  const level = getOrganelleLevel(state, organelleId);
  if (level === 0) return 0;
  const def = getOrganelleDefinition(organelleId);
  return def.effectPerLevel[level - 1];
}

export function getTotalMaxAtpReduction(state: GameState): number {
  let total = 0;
  for (const [id, level] of state.organelles) {
    if (level === 0) continue;
    const def = getOrganelleDefinition(id);
    total += def.maxAtpReductionPerLevel[level - 1];
  }
  return total;
}

export function getDiscountedAtpCost(state: GameState, baseCost: number): number {
  const discount = getOrganelleEffect(state, 'ribosomes');
  return Math.floor(baseCost * (1 - discount));
}

export function canAfford(
  state: GameState,
  organelleId: OrganelleId
): { canAfford: boolean; reason?: string } {
  const currentLevel = getOrganelleLevel(state, organelleId);

  if (currentLevel >= 3) {
    return { canAfford: false, reason: 'Already at max level' };
  }

  const nextLevel = currentLevel + 1;
  const def = getOrganelleDefinition(organelleId);

  // Check nucleus requirement for lv3
  if (nextLevel === 3 && def.requiresNucleusLevel !== undefined) {
    const nucleusLevel = getOrganelleLevel(state, 'nucleus');
    if (nucleusLevel < def.requiresNucleusLevel) {
      return { canAfford: false, reason: `Requires Nucleus Lv${def.requiresNucleusLevel}` };
    }
  }

  const upgradePointCost = def.upgradePointCost[nextLevel - 1];
  const baseAtpCost = def.atpCostPerLevel[nextLevel - 1];
  const atpCost = getDiscountedAtpCost(state, baseAtpCost);

  if (state.upgradePoints < upgradePointCost) {
    return { canAfford: false, reason: `Need ${upgradePointCost} upgrade points (have ${state.upgradePoints})` };
  }

  if (state.atp.current < atpCost) {
    return { canAfford: false, reason: `Need ${atpCost} ATP (have ${Math.floor(state.atp.current)})` };
  }

  return { canAfford: true };
}

export function installOrganelle(state: GameState, organelleId: OrganelleId): boolean {
  const check = canAfford(state, organelleId);
  if (!check.canAfford) return false;

  const currentLevel = getOrganelleLevel(state, organelleId);
  const nextLevel = currentLevel + 1;
  const def = getOrganelleDefinition(organelleId);

  const upgradePointCost = def.upgradePointCost[nextLevel - 1];
  const baseAtpCost = def.atpCostPerLevel[nextLevel - 1];
  const atpCost = getDiscountedAtpCost(state, baseAtpCost);

  // Deduct costs
  state.upgradePoints -= upgradePointCost;
  state.atp.current -= atpCost;

  // Set organelle level
  state.organelles.set(organelleId, nextLevel);

  // Reduce max ATP
  const atpReduction = def.maxAtpReductionPerLevel[nextLevel - 1];
  // Remove previous level's reduction if upgrading (cumulative reduction)
  let prevReduction = 0;
  if (currentLevel > 0) {
    prevReduction = def.maxAtpReductionPerLevel[currentLevel - 1];
  }
  const netReduction = atpReduction - prevReduction;
  state.atp.baseMax = Math.max(0, state.atp.baseMax - netReduction);

  // Recalculate effective max ATP
  state.atp.max = state.atp.baseMax;
  state.atp.current = Math.min(state.atp.current, state.atp.max);

  // Track in run stats
  if (!state.runStats.organellesInstalled.includes(organelleId)) {
    state.runStats.organellesInstalled.push(organelleId);
  }

  return true;
}
