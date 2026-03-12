// CytoSurvivor - Map Generator
// Procedurally generates food, enemies, and toxic pockets from a seed.

import { FoodItem, EnemyState, ToxicPocket, ZoneId, EnemyType } from '../types';
import {
  MAP_CENTER,
  MAP_RADIUS,
  ZONE_DEFINITIONS,
  FOOD_RADIUS,
  GOLDEN_FOOD_CHANCE,
  ENEMY_STATS,
  ENEMY_COLORS,
} from '../constants';

// Mulberry32 seeded PRNG
export function createRNG(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Generate all food items for a run
export function generateFood(seed: number): FoodItem[] {
  const rng = createRNG(seed ^ 0xF00D1234);
  const food: FoodItem[] = [];
  let id = 1;

  for (const zone of ZONE_DEFINITIONS) {
    const minR = zone.minRadius * MAP_RADIUS;
    const maxR = zone.maxRadius * MAP_RADIUS;
    const [minVal, maxVal] = zone.foodValueRange;

    for (let i = 0; i < zone.foodDensity; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = minR + rng() * (maxR - minR);
      const x = MAP_CENTER + Math.cos(angle) * dist;
      const y = MAP_CENTER + Math.sin(angle) * dist;

      const isGolden = rng() < GOLDEN_FOOD_CHANCE;
      const value = Math.floor(minVal + rng() * (maxVal - minVal + 1));

      food.push({
        id: id++,
        pos: { x, y },
        type: isGolden ? 'golden' : 'standard',
        value,
        radius: FOOD_RADIUS,
        collected: false,
        pulsePhase: rng() * Math.PI * 2,
        zone: zone.id as ZoneId,
      });
    }
  }

  return food;
}

// Enemy counts per zone (zone id -> [min, max])
const ZONE_ENEMY_COUNTS: Record<number, [number, number]> = {
  1: [0, 0],
  2: [8, 12],
  3: [15, 20],
  4: [20, 25],
  5: [10, 15],
};

// Generate enemy spawn data for a run
export function generateEnemies(seed: number): EnemyState[] {
  const rng = createRNG(seed ^ 0xE3E7A000);
  const enemies: EnemyState[] = [];
  let id = 1;

  for (const zone of ZONE_DEFINITIONS) {
    const [minCount, maxCount] = ZONE_ENEMY_COUNTS[zone.id];
    if (maxCount === 0 || zone.enemyTypes.length === 0) continue;

    const count = minCount + Math.floor(rng() * (maxCount - minCount + 1));
    const minR = zone.minRadius * MAP_RADIUS;
    const maxR = zone.maxRadius * MAP_RADIUS;

    for (let i = 0; i < count; i++) {
      const typeIndex = Math.floor(rng() * zone.enemyTypes.length);
      const type: EnemyType = zone.enemyTypes[typeIndex];
      const stats = ENEMY_STATS[type];

      const angle = rng() * Math.PI * 2;
      const dist = minR + rng() * (maxR - minR);
      const x = MAP_CENTER + Math.cos(angle) * dist;
      const y = MAP_CENTER + Math.sin(angle) * dist;

      const enemy: EnemyState = {
        id: id++,
        type,
        pos: { x, y },
        vel: { x: 0, y: 0 },
        radius: stats.radius,
        speed: stats.speed,
        health: stats.health,
        maxHealth: stats.health,
        senseRadius: stats.senseRadius,
        damage: stats.damage,
        color: ENEMY_COLORS[type],
        active: true,
        zone: zone.id as ZoneId,
        knockbackResistance: stats.knockbackResistance,
        chasingPlayer: false,
        patrolTimer: rng() * 3,
      };

      // Type-specific state
      if (type === 'toxoplasma') {
        enemy.camouflaged = true;
        enemy.hijackTimer = 0;
        enemy.hijackActive = false;
      }

      enemies.push(enemy);
    }
  }

  return enemies;
}

// Generate toxic pockets (zones 3-5 only)
export function generateToxicPockets(seed: number): ToxicPocket[] {
  const rng = createRNG(seed ^ 0x70C1C000);
  const pockets: ToxicPocket[] = [];

  const eligibleZones = ZONE_DEFINITIONS.filter(z => z.id >= 3);
  const count = 5 + Math.floor(rng() * 6); // 5-10

  for (let i = 0; i < count; i++) {
    const zoneIndex = Math.floor(rng() * eligibleZones.length);
    const zone = eligibleZones[zoneIndex];
    const minR = zone.minRadius * MAP_RADIUS;
    const maxR = zone.maxRadius * MAP_RADIUS;

    const angle = rng() * Math.PI * 2;
    const dist = minR + rng() * (maxR - minR);
    const x = MAP_CENTER + Math.cos(angle) * dist;
    const y = MAP_CENTER + Math.sin(angle) * dist;

    const radius = 40 + rng() * 40; // 40-80
    const drainMultiplier = 1.5 + rng() * 1.0; // 1.5-2.5

    pockets.push({
      pos: { x, y },
      radius,
      drainMultiplier,
      zone: zone.id as ZoneId,
    });
  }

  return pockets;
}

// Generate full map data for a new run
export function generateMap(seed?: number): {
  food: FoodItem[];
  enemies: EnemyState[];
  toxicPockets: ToxicPocket[];
  seed: number;
} {
  const resolvedSeed = seed ?? Math.floor(Math.random() * 2147483647);

  return {
    food: generateFood(resolvedSeed),
    enemies: generateEnemies(resolvedSeed),
    toxicPockets: generateToxicPockets(resolvedSeed),
    seed: resolvedSeed,
  };
}
