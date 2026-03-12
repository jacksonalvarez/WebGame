// CytoSurvivor - Meta Progression Logic
import { GameState, MetaState, RunStats, ZoneId, OrganelleId } from '../types';
import { GOLDEN_FOOD_DNA_BONUS, BASE_MAX_ATP, BASE_DRAIN_RATE, PLAYER_BASE_SPEED } from '../constants';
import { MUTATIONS } from '../data/mutations';
import { GENE_TREE } from '../data/geneTree';
import { saveProgress } from './SaveSystem';

// DNA earned from a run
export function calculateDNAEarned(runStats: RunStats): number {
  const foodDNA = runStats.foodCollected;
  const zoneBonusDNA = (runStats.furthestZone - 1) * 5;
  // golden food bonus counted separately via score field (score includes golden pickups)
  // We derive golden bonus from the score: foodCollected is units, score tracks golden count
  // Use a conservative estimate: 1 DNA per golden piece collected (tracked in score offset)
  const goldenBonus = Math.max(0, runStats.score - runStats.foodCollected) > 0
    ? Math.floor((runStats.score - runStats.foodCollected) / GOLDEN_FOOD_DNA_BONUS)
    : 0;
  return foodDNA + zoneBonusDNA + goldenBonus;
}

// Roll a mutation for the player based on furthest zone and what they haven't unlocked yet
export function rollMutation(furthestZone: ZoneId, unlockedMutations: string[]): string | null {
  const chance = furthestZone * 0.1; // zone 1 = 10%, zone 5 = 50%
  if (Math.random() > chance) return null;

  const available = MUTATIONS.filter(m => !unlockedMutations.includes(m.id));
  if (available.length === 0) return null;

  const idx = Math.floor(Math.random() * available.length);
  return available[idx].id;
}

// Apply gene tree effects to a freshly reset game state
export function applyGeneTreeEffects(state: GameState): void {
  const purchases = state.meta.geneTreePurchases;

  for (const nodeId of purchases) {
    const node = GENE_TREE.find(n => n.id === nodeId);
    if (!node) continue;

    switch (node.effect) {
      case 'base_atp_plus_10':
        state.atp.baseMax += 10;
        state.atp.max += 10;
        state.atp.current = Math.min(state.atp.current + 10, state.atp.max);
        break;

      case 'start_atp_drain_reduce':
        state.atp.current = Math.min(state.atp.current + 5, state.atp.max);
        state.atp.drainRate = Math.max(0, state.atp.drainRate - 0.2);
        break;

      case 'base_atp_plus_20':
        state.atp.baseMax += 20;
        state.atp.max += 20;
        state.atp.current = Math.min(state.atp.current + 20, state.atp.max);
        break;

      case 'start_flagellum_lv1':
        if (!state.organelles.get('flagellum')) {
          state.organelles.set('flagellum', 1);
        }
        break;

      case 'start_cilia_lv1':
        if (!state.organelles.get('cilia')) {
          state.organelles.set('cilia', 1);
        }
        break;

      case 'start_membrane_lv1':
        if (!state.organelles.get('cellMembrane')) {
          state.organelles.set('cellMembrane', 1);
        }
        break;

      case 'unlock_pseudopods':
        // Pseudopods already in organelle list; this just makes them available in upgrades
        // No direct state mutation needed; handled by upgrade screen filtering
        break;

      case 'lysosomes_contact_boost':
        // Handled by combat system reading from meta.geneTreePurchases
        break;

      case 'unlock_advanced_mutations':
        // Handled by rollMutation advanced pool; no direct state change
        break;

      case 'organelle_cost_minus_5':
      case 'organelle_cost_minus_10':
      case 'organelle_cost_minus_15':
        // Handled by upgrade screen when calculating costs
        break;

      case 'second_wind_revive':
        // Handled by ATP system reading from meta.geneTreePurchases
        break;

      case 'dna_bonus_per_run_3':
        // Applied at run end in processRunEnd
        break;

      case 'start_upgrade_points_2':
        state.upgradePoints += 2;
        break;
    }
  }
}

// Apply equipped mutation effects to game state
export function applyMutationEffects(state: GameState): void {
  const equipped = state.meta.equippedMutations;

  for (const mutId of equipped) {
    switch (mutId) {
      case 'thermophilic':
        // Handled by ATP drain system using meta.equippedMutations
        break;

      case 'hyper-flagella':
        state.player.baseSpeed *= 1.3;
        // Extra movement cost handled by ATP drain system
        break;

      case 'photosynthetic':
        // Handled by ATP system: regen when velocity ~= 0
        break;

      case 'endosymbiont':
        if (!state.organelles.get('mitochondria')) {
          state.organelles.set('mitochondria', 1);
        }
        state.atp.baseMax = Math.max(10, state.atp.baseMax - 15);
        state.atp.max = Math.max(10, state.atp.max - 15);
        state.atp.current = Math.min(state.atp.current, state.atp.max);
        break;

      case 'bioluminescent':
        // Enemy repel and reduced collection radius handled by respective systems
        break;
    }
  }
}

// Purchase a gene tree node — returns true if successful
export function purchaseGeneNode(meta: MetaState, nodeId: string): boolean {
  if (meta.geneTreePurchases.includes(nodeId)) return false;

  const node = GENE_TREE.find(n => n.id === nodeId);
  if (!node) return false;

  // Check prerequisites
  for (const prereq of node.prerequisites) {
    if (!meta.geneTreePurchases.includes(prereq)) return false;
  }

  if (meta.dnaPoints < node.cost) return false;

  meta.dnaPoints -= node.cost;
  meta.geneTreePurchases.push(nodeId);
  return true;
}

// Equip a mutation into an available slot — returns true if successful
export function equipMutation(meta: MetaState, mutationId: string): boolean {
  if (!meta.unlockedMutations.includes(mutationId)) return false;
  if (meta.equippedMutations.includes(mutationId)) return false;
  if (meta.equippedMutations.length >= 3) return false;

  meta.equippedMutations.push(mutationId);
  return true;
}

// Remove a mutation from equipped slots
export function unequipMutation(meta: MetaState, mutationId: string): void {
  const idx = meta.equippedMutations.indexOf(mutationId);
  if (idx !== -1) {
    meta.equippedMutations.splice(idx, 1);
  }
}

// Called on death — tallies DNA, discovers mutation, updates meta, saves
export function processRunEnd(state: GameState): void {
  const stats = state.runStats;
  const meta = state.meta;

  // Calculate DNA earned this run
  let dnaEarned = calculateDNAEarned(stats);

  // Apply DNA bonus from gene tree if purchased
  if (meta.geneTreePurchases.includes('survival_2')) {
    dnaEarned += 3;
  }

  stats.dnaEarned = dnaEarned;

  // Roll for a new mutation
  const newMutation = rollMutation(stats.furthestZone, meta.unlockedMutations);
  stats.mutationDiscovered = newMutation;
  if (newMutation && !meta.unlockedMutations.includes(newMutation)) {
    meta.unlockedMutations.push(newMutation);
  }

  // Update meta stats
  meta.dnaPoints += dnaEarned;
  meta.totalDnaEarned += dnaEarned;
  meta.totalRuns += 1;

  if (stats.score > meta.highScore) {
    meta.highScore = stats.score;
  }
  if (stats.furthestZone > meta.bestZone) {
    meta.bestZone = stats.furthestZone;
  }

  // Save to localStorage
  saveProgress(meta);

  // Transition to evolution lab
  state.phase = 'evolution-lab';
}
