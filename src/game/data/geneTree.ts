// CytoSurvivor - Gene Tree Node Definitions
import { GeneTreeNode } from '../types';

export const GENE_TREE: GeneTreeNode[] = [
  // === Metabolic Branch ===
  {
    id: 'metabolic_1',
    name: '+10 Base ATP',
    description: 'Increases maximum ATP capacity by 10',
    cost: 5,
    branch: 'metabolic',
    prerequisites: [],
    effect: 'base_atp_plus_10',
  },
  {
    id: 'metabolic_2',
    name: 'Slow Burn',
    description: '+5 starting ATP and reduces base drain rate slightly',
    cost: 15,
    branch: 'metabolic',
    prerequisites: ['metabolic_1'],
    effect: 'start_atp_drain_reduce',
  },
  {
    id: 'metabolic_3',
    name: '+20 Base ATP',
    description: 'Increases maximum ATP capacity by an additional 20',
    cost: 30,
    branch: 'metabolic',
    prerequisites: ['metabolic_2'],
    effect: 'base_atp_plus_20',
  },

  // === Structural Branch ===
  {
    id: 'structural_1',
    name: 'Born Swimmer',
    description: 'Start each run with a Level 1 Flagellum installed',
    cost: 5,
    branch: 'structural',
    prerequisites: [],
    effect: 'start_flagellum_lv1',
  },
  {
    id: 'structural_2',
    name: 'Cilia Growth',
    description: 'Start each run with a Level 1 Cilia installed',
    cost: 15,
    branch: 'structural',
    prerequisites: ['structural_1'],
    effect: 'start_cilia_lv1',
  },
  {
    id: 'structural_3',
    name: 'Fortified Wall',
    description: 'Start each run with a Level 1 Cell Membrane installed',
    cost: 30,
    branch: 'structural',
    prerequisites: ['structural_2'],
    effect: 'start_membrane_lv1',
  },

  // === Adaptive Branch ===
  {
    id: 'adaptive_1',
    name: 'Pseudopod Gene',
    description: 'Unlocks the Pseudopods organelle for purchase during runs',
    cost: 5,
    branch: 'adaptive',
    prerequisites: [],
    effect: 'unlock_pseudopods',
  },
  {
    id: 'adaptive_2',
    name: 'Lysosomal Boost',
    description: 'Lysosomes gain contact damage bonus when installed',
    cost: 15,
    branch: 'adaptive',
    prerequisites: ['adaptive_1'],
    effect: 'lysosomes_contact_boost',
  },
  {
    id: 'adaptive_3',
    name: 'Advanced Mutations',
    description: 'Unlocks access to rare advanced mutation rolls',
    cost: 30,
    branch: 'adaptive',
    prerequisites: ['adaptive_2'],
    effect: 'unlock_advanced_mutations',
  },

  // === Efficiency Branch ===
  {
    id: 'efficiency_1',
    name: 'Lean Organelles',
    description: 'All organelle ATP costs reduced by 5%',
    cost: 5,
    branch: 'efficiency',
    prerequisites: [],
    effect: 'organelle_cost_minus_5',
  },
  {
    id: 'efficiency_2',
    name: 'Optimised Pathways',
    description: 'All organelle ATP costs reduced by 10%',
    cost: 15,
    branch: 'efficiency',
    prerequisites: ['efficiency_1'],
    effect: 'organelle_cost_minus_10',
  },
  {
    id: 'efficiency_3',
    name: 'Peak Efficiency',
    description: 'All organelle ATP costs reduced by 15%',
    cost: 30,
    branch: 'efficiency',
    prerequisites: ['efficiency_2'],
    effect: 'organelle_cost_minus_15',
  },

  // === Survival Branch ===
  {
    id: 'survival_1',
    name: 'Second Wind',
    description: 'Once per run, revive automatically at 25% ATP when depleted',
    cost: 5,
    branch: 'survival',
    prerequisites: [],
    effect: 'second_wind_revive',
  },
  {
    id: 'survival_2',
    name: 'DNA Scavenger',
    description: 'Earn +3 bonus DNA at the end of every run',
    cost: 15,
    branch: 'survival',
    prerequisites: ['survival_1'],
    effect: 'dna_bonus_per_run_3',
  },
  {
    id: 'survival_3',
    name: 'Head Start',
    description: 'Begin each run with +2 extra upgrade points',
    cost: 30,
    branch: 'survival',
    prerequisites: ['survival_2'],
    effect: 'start_upgrade_points_2',
  },
];
