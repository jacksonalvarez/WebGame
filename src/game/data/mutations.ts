// CytoSurvivor - Mutation Definitions
import { MutationDefinition } from '../types';

export const MUTATIONS: MutationDefinition[] = [
  {
    id: 'thermophilic',
    name: 'Thermophilic',
    description: 'ATP drain reduced in Zone 4-5, increased in Zone 1-2',
    effect: 'drain_zone_modifier',
    isDoubleEdged: true,
  },
  {
    id: 'hyper-flagella',
    name: 'Hyper-flagella',
    description: '30% faster, 20% more movement cost',
    effect: 'speed_cost_tradeoff',
    isDoubleEdged: true,
  },
  {
    id: 'photosynthetic',
    name: 'Photosynthetic',
    description: 'Slowly regen ATP when stationary',
    effect: 'stationary_regen',
    isDoubleEdged: false,
  },
  {
    id: 'endosymbiont',
    name: 'Endosymbiont',
    description: 'Start with Lv1 Mitochondria, -15 max ATP',
    effect: 'start_mito',
    isDoubleEdged: true,
  },
  {
    id: 'bioluminescent',
    name: 'Bioluminescent',
    description: 'Enemies avoid you, but smaller collection radius',
    effect: 'enemy_repel',
    isDoubleEdged: true,
  },
];
