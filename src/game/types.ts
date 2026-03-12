// CytoSurvivor - Shared Type Definitions (CONTRACT FILE)
// All game systems build against these types.

export interface Vector2 {
  x: number;
  y: number;
}

export type GamePhase = 'menu' | 'playing' | 'upgrading' | 'dead' | 'evolution-lab';

// === Player ===
export interface PlayerState {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  baseSpeed: number;
  wobblePhase: number;
}

// === ATP / Energy ===
export interface ATPState {
  current: number;
  max: number;
  baseMax: number;
  drainRate: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
}

// === Food ===
export type FoodType = 'standard' | 'golden';

export interface FoodItem {
  id: number;
  pos: Vector2;
  type: FoodType;
  value: number;
  radius: number;
  collected: boolean;
  pulsePhase: number;
  zone: ZoneId;
}

// === Zones ===
export type ZoneId = 1 | 2 | 3 | 4 | 5;

export interface ZoneDefinition {
  id: ZoneId;
  name: string;
  subtitle: string;
  minRadius: number; // as fraction 0-1
  maxRadius: number;
  foodDensity: number;
  foodValueRange: [number, number];
  backgroundColor: string;
  enemyTypes: EnemyType[];
}

// === Enemies ===
export type EnemyType = 'bacteriophage' | 'amoeba' | 'paramecium' | 'whiteBloodCell' | 'toxoplasma' | 'tardigrade';

export interface EnemyState {
  id: number;
  type: EnemyType;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  speed: number;
  health: number;
  maxHealth: number;
  senseRadius: number;
  damage: number;
  color: string;
  active: boolean;
  zone: ZoneId;
  // Type-specific state
  attachedToPlayer?: boolean;
  attachDrainRate?: number;
  chasingPlayer?: boolean;
  patrolTimer?: number;
  camouflaged?: boolean;
  hijackTimer?: number;
  hijackActive?: boolean;
  knockbackResistance?: number;
}

// === Organelles ===
export type OrganelleId =
  | 'mitochondria' | 'flagellum' | 'cilia' | 'ribosomes'
  | 'endoplasmicReticulum' | 'cellMembrane' | 'nucleus'
  | 'vacuole' | 'lysosomes' | 'pseudopods';

export interface OrganelleDefinition {
  id: OrganelleId;
  name: string;
  description: string;
  maxLevel: 3;
  atpCostPerLevel: [number, number, number];
  maxAtpReductionPerLevel: [number, number, number];
  upgradePointCost: [number, number, number];
  effectPerLevel: [number, number, number];
  effectUnit: string;
  requiresNucleusLevel?: number; // for lv3
}

// === Particles ===
export type ParticleType = 'atp-drain' | 'food-collect' | 'damage' | 'death' | 'levelup';

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  type: ParticleType;
  color: string;
  alpha: number;
  lifetime: number;
  age: number;
  size: number;
}

// === Camera ===
export interface CameraState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  smoothing: number;
}

// === Map ===
export interface MapState {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  seed: number;
}

// === Input ===
export interface InputState {
  mouseX: number;
  mouseY: number;
  mouseWorldX: number;
  mouseWorldY: number;
  spacePressed: boolean;
  spaceJustPressed: boolean;
}

// === Toxic Pocket ===
export interface ToxicPocket {
  pos: Vector2;
  radius: number;
  drainMultiplier: number;
  zone: ZoneId;
}

// === Membrane Wall ===
export interface MembraneWall {
  zone: ZoneId;
  radius: number;
  thickness: number;
}

// === Meta Progression ===
export interface MetaState {
  dnaPoints: number;
  totalDnaEarned: number;
  unlockedMutations: string[];
  equippedMutations: string[]; // max 3
  geneTreePurchases: string[];
  highScore: number;
  bestZone: ZoneId;
  totalRuns: number;
}

export interface RunStats {
  foodCollected: number;
  furthestZone: ZoneId;
  organellesInstalled: OrganelleId[];
  dnaEarned: number;
  mutationDiscovered: string | null;
  timeSurvived: number;
  score: number;
}

export interface MutationDefinition {
  id: string;
  name: string;
  description: string;
  effect: string;
  isDoubleEdged: boolean;
}

export interface GeneTreeNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  branch: 'metabolic' | 'structural' | 'adaptive' | 'efficiency' | 'survival';
  prerequisites: string[];
  effect: string;
}

// === Central Game State ===
export interface GameState {
  phase: GamePhase;
  player: PlayerState;
  atp: ATPState;
  food: FoodItem[];
  enemies: EnemyState[];
  particles: Particle[];
  camera: CameraState;
  map: MapState;
  input: InputState;
  organelles: Map<OrganelleId, number>; // organelleId -> level (0 = not installed)
  upgradePoints: number;
  currentZone: ZoneId;
  meta: MetaState;
  runStats: RunStats;
  toxicPockets: ToxicPocket[];
  membraneWalls: MembraneWall[];
  deltaTime: number;
  totalTime: number;
  isPaused: boolean;
}
