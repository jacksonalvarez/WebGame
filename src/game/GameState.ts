// CytoSurvivor - Game State Factory
import {
  GameState,
  OrganelleId,
} from './types';
import {
  MAP_SIZE,
  MAP_CENTER,
  BASE_MAX_ATP,
  BASE_DRAIN_RATE,
  PLAYER_BASE_RADIUS,
  PLAYER_BASE_SPEED,
  CAMERA_SMOOTHING,
} from './constants';

export function createGameState(): GameState {
  const playerPos = { x: MAP_CENTER, y: MAP_CENTER };

  return {
    phase: 'menu',

    player: {
      pos: { x: playerPos.x, y: playerPos.y },
      vel: { x: 0, y: 0 },
      radius: PLAYER_BASE_RADIUS,
      baseSpeed: PLAYER_BASE_SPEED,
      wobblePhase: 0,
    },

    atp: {
      current: BASE_MAX_ATP,
      max: BASE_MAX_ATP,
      baseMax: BASE_MAX_ATP,
      drainRate: BASE_DRAIN_RATE,
      level: 1,
      xp: 0,
      xpToNextLevel: 20,
    },

    food: [],
    enemies: [],
    particles: [],

    camera: {
      x: playerPos.x,
      y: playerPos.y,
      targetX: playerPos.x,
      targetY: playerPos.y,
      smoothing: CAMERA_SMOOTHING,
    },

    map: {
      width: MAP_SIZE,
      height: MAP_SIZE,
      centerX: MAP_CENTER,
      centerY: MAP_CENTER,
      seed: Math.random() * 0xffffffff >>> 0,
    },

    input: {
      mouseX: 0,
      mouseY: 0,
      mouseWorldX: MAP_CENTER,
      mouseWorldY: MAP_CENTER,
      spacePressed: false,
      spaceJustPressed: false,
    },

    organelles: new Map<OrganelleId, number>(),
    upgradePoints: 0,
    currentZone: 1,

    meta: {
      dnaPoints: 0,
      totalDnaEarned: 0,
      unlockedMutations: [],
      equippedMutations: [],
      geneTreePurchases: [],
      highScore: 0,
      bestZone: 1,
      totalRuns: 0,
    },

    runStats: {
      foodCollected: 0,
      furthestZone: 1,
      organellesInstalled: [],
      dnaEarned: 0,
      mutationDiscovered: null,
      timeSurvived: 0,
      score: 0,
    },

    toxicPockets: [],
    membraneWalls: [],

    deltaTime: 0,
    totalTime: 0,
    isPaused: false,
  };
}

/**
 * Resets all in-run state while preserving meta progression.
 * Call this at the start of a new run.
 */
export function resetForNewRun(state: GameState): void {
  const playerPos = { x: MAP_CENTER, y: MAP_CENTER };

  state.phase = 'playing';

  state.player.pos = { x: playerPos.x, y: playerPos.y };
  state.player.vel = { x: 0, y: 0 };
  state.player.radius = PLAYER_BASE_RADIUS;
  state.player.baseSpeed = PLAYER_BASE_SPEED;
  state.player.wobblePhase = 0;

  state.atp.current = BASE_MAX_ATP;
  state.atp.max = BASE_MAX_ATP;
  state.atp.baseMax = BASE_MAX_ATP;
  state.atp.drainRate = BASE_DRAIN_RATE;
  state.atp.level = 1;
  state.atp.xp = 0;
  state.atp.xpToNextLevel = 20;

  state.food = [];
  state.enemies = [];
  state.particles = [];
  state.toxicPockets = [];
  state.membraneWalls = [];

  state.camera.x = playerPos.x;
  state.camera.y = playerPos.y;
  state.camera.targetX = playerPos.x;
  state.camera.targetY = playerPos.y;

  state.map.seed = Math.random() * 0xffffffff >>> 0;

  state.input.mouseX = 0;
  state.input.mouseY = 0;
  state.input.mouseWorldX = MAP_CENTER;
  state.input.mouseWorldY = MAP_CENTER;
  state.input.spacePressed = false;
  state.input.spaceJustPressed = false;

  state.organelles = new Map<OrganelleId, number>();
  state.upgradePoints = 0;
  state.currentZone = 1;

  state.runStats = {
    foodCollected: 0,
    furthestZone: 1,
    organellesInstalled: [],
    dnaEarned: 0,
    mutationDiscovered: null,
    timeSurvived: 0,
    score: 0,
  };

  state.deltaTime = 0;
  state.totalTime = 0;
  state.isPaused = false;

  // meta is intentionally preserved
}
