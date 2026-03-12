// CytoSurvivor - Game Constants (CONTRACT FILE)
// All game systems use these constants.

import { ZoneDefinition } from './types';

// === Canvas (mutable — updated at runtime to match window size) ===
export let CANVAS_WIDTH = 960;
export let CANVAS_HEIGHT = 640;

export function setCanvasSize(w: number, h: number): void {
  CANVAS_WIDTH = w;
  CANVAS_HEIGHT = h;
}

// === Map ===
export const MAP_SIZE = 6000;
export const MAP_CENTER = MAP_SIZE / 2;
export const MAP_RADIUS = MAP_SIZE / 2;

// === ATP ===
export const BASE_MAX_ATP = 100;
export const BASE_DRAIN_RATE = 2; // ATP/sec
export const MOVEMENT_DRAIN_MULTIPLIER = 0.5; // extra drain while moving
export const FOOD_XP_PER_UNIT = 1;

// === Player ===
export const PLAYER_BASE_RADIUS = 15;
export const PLAYER_BASE_SPEED = 120; // px/sec
export const PLAYER_FOLLOW_SMOOTHING = 0.08;
export const PLAYER_WOBBLE_SPEED = 3;
export const PLAYER_WOBBLE_AMOUNT = 2;

// === Camera ===
export const CAMERA_SMOOTHING = 0.05;

// === Food ===
export const FOOD_RADIUS = 5;
export const GOLDEN_FOOD_CHANCE = 0.05;
export const GOLDEN_FOOD_DNA_BONUS = 3;
export const FOOD_PULSE_SPEED = 2;
export const FOOD_COLLECTION_BASE_RADIUS = 30; // base pickup distance

// === Levels ===
export const LEVEL_THRESHOLDS = [0, 20, 50, 100, 175, 275, 400, 550, 750, 1000];
export const ATP_PER_LEVEL = 10;

// === Zones ===
export const ZONE_BOUNDARIES: [number, number, number, number, number, number] = [0, 0.15, 0.35, 0.55, 0.75, 1.0];

export const ZONE_DEFINITIONS: ZoneDefinition[] = [
  {
    id: 1, name: 'Cytoplasm', subtitle: 'Spawn',
    minRadius: 0, maxRadius: 0.15,
    foodDensity: 80, foodValueRange: [5, 10],
    backgroundColor: '#1a3a3a', enemyTypes: [],
  },
  {
    id: 2, name: 'Inner Membrane', subtitle: '',
    minRadius: 0.15, maxRadius: 0.35,
    foodDensity: 50, foodValueRange: [15, 25],
    backgroundColor: '#163232', enemyTypes: ['bacteriophage', 'paramecium'],
  },
  {
    id: 3, name: 'Outer Membrane', subtitle: '',
    minRadius: 0.35, maxRadius: 0.55,
    foodDensity: 35, foodValueRange: [30, 50],
    backgroundColor: '#122a2a', enemyTypes: ['bacteriophage', 'paramecium', 'amoeba', 'whiteBloodCell'],
  },
  {
    id: 4, name: 'Extracellular Matrix', subtitle: '',
    minRadius: 0.55, maxRadius: 0.75,
    foodDensity: 20, foodValueRange: [60, 100],
    backgroundColor: '#0e2222', enemyTypes: ['amoeba', 'whiteBloodCell', 'paramecium', 'toxoplasma'],
  },
  {
    id: 5, name: 'The Void', subtitle: '',
    minRadius: 0.75, maxRadius: 1.0,
    foodDensity: 10, foodValueRange: [150, 250],
    backgroundColor: '#0a1a1a', enemyTypes: ['whiteBloodCell', 'toxoplasma', 'tardigrade'],
  },
];

// === Colors (Balatro-style palette) ===
export const COLORS = {
  background: '#1a3a3a',
  cardBg: '#1c2333',
  cardBorder: '#2a3a4a',
  atpBar: '#c74b4b',
  atpBarLow: '#ff4444',
  atpBarMed: '#c7b84b',
  atpBarHigh: '#4bc774',
  speedBlue: '#4b7bc7',
  efficiencyOrange: '#c7944b',
  upgradeGold: '#c7b84b',
  xpPurple: '#7b4bc7',
  textPrimary: '#ffffff',
  textSecondary: '#f0e6d0',
  positiveGreen: '#4bc774',
  negativeRed: '#c74b4b',
  foodGreen: '#4bc774',
  foodGold: '#ffd700',
  playerCell: '#66ccaa',
  playerCellInner: '#88eebb',
  minimapBg: '#0a1a1a',
  minimapBorder: '#2a4a4a',
} as const;

// === Enemy Colors ===
export const ENEMY_COLORS: Record<string, string> = {
  bacteriophage: '#9b59b6',
  amoeba: '#27ae60',
  paramecium: '#f1c40f',
  whiteBloodCell: '#ecf0f1',
  toxoplasma: '#7f8c8d',
  tardigrade: '#8b6914',
};

// === Enemy Stats ===
export const ENEMY_STATS = {
  bacteriophage: { radius: 8, speed: 40, health: 10, senseRadius: 100, damage: 5, knockbackResistance: 0.2 },
  amoeba: { radius: 25, speed: 30, health: 50, senseRadius: 150, damage: 35, knockbackResistance: 0.5 },
  paramecium: { radius: 12, speed: 80, health: 20, senseRadius: 120, damage: 18, knockbackResistance: 0.3 },
  whiteBloodCell: { radius: 30, speed: 25, health: 100, senseRadius: 200, damage: 40, knockbackResistance: 0.8 },
  toxoplasma: { radius: 6, speed: 60, health: 15, senseRadius: 80, damage: 8, knockbackResistance: 0.1 },
  tardigrade: { radius: 50, speed: 15, health: 999, senseRadius: 50, damage: 50, knockbackResistance: 1.0 },
} as const;

// === UI Layout ===
export const HUD_PADDING = 12;
export const HUD_BAR_WIDTH = 200;
export const HUD_BAR_HEIGHT = 20;
export const MINIMAP_SIZE = 150;
export const MINIMAP_PADDING = 12;
export const STAT_BOX_WIDTH = 120;
export const STAT_BOX_HEIGHT = 40;

// === Font ===
export const PIXEL_FONT = '"Press Start 2P", monospace';
export const FONT_SIZE_SMALL = 12;
export const FONT_SIZE_MEDIUM = 16;
export const FONT_SIZE_LARGE = 22;
export const FONT_SIZE_TITLE = 32;
export const FONT_SIZE_HUGE = 44;
