// CytoSurvivor - Particle System
// Object-pooled visual effects for game events.

import { Particle, ParticleType, CameraState } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

const POOL_SIZE = 500;

// Gravity applied to death particles (px/s^2)
const DEATH_GRAVITY = 80;

export function initParticles(): Particle[] {
  const pool: Particle[] = [];
  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({
      id: i,
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      type: 'damage',
      color: '#ffffff',
      alpha: 0,
      lifetime: 1,
      age: 1, // age >= lifetime means dead/reusable
      size: 1,
    });
  }
  return pool;
}

function acquireParticle(particles: Particle[]): Particle | null {
  for (let i = 0; i < particles.length; i++) {
    if (particles[i].age >= particles[i].lifetime) {
      return particles[i];
    }
  }
  return null; // Pool exhausted
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randAngle(): number {
  return Math.random() * Math.PI * 2;
}

export function spawnParticles(
  particles: Particle[],
  type: ParticleType,
  x: number,
  y: number,
  count: number
): void {
  for (let i = 0; i < count; i++) {
    const p = acquireParticle(particles);
    if (!p) return;

    p.type = type;
    p.pos.x = x;
    p.pos.y = y;
    p.age = 0;
    p.alpha = 1;

    switch (type) {
      case 'atp-drain': {
        const angle = randAngle();
        const speed = rand(30, 70);
        p.vel.x = Math.cos(angle) * speed;
        p.vel.y = Math.sin(angle) * speed;
        p.color = '#c74b4b';
        p.size = rand(2, 3);
        p.lifetime = 0.5;
        break;
      }

      case 'food-collect': {
        // Random burst outward then fade
        const angle = randAngle();
        const speed = rand(40, 90);
        p.vel.x = Math.cos(angle) * speed;
        p.vel.y = Math.sin(angle) * speed;
        // Alternate green / gold
        p.color = i % 3 === 0 ? '#ffd700' : '#4bc774';
        p.size = rand(3, 5);
        p.lifetime = 0.4;
        break;
      }

      case 'damage': {
        const angle = randAngle();
        const speed = rand(80, 160);
        p.vel.x = Math.cos(angle) * speed;
        p.vel.y = Math.sin(angle) * speed;
        p.color = '#c74b4b';
        p.size = rand(4, 6);
        p.lifetime = 0.3;
        break;
      }

      case 'death': {
        const angle = randAngle();
        const speed = rand(40, 120);
        p.vel.x = Math.cos(angle) * speed;
        p.vel.y = Math.sin(angle) * speed;
        const roll = Math.random();
        if (roll < 0.4) p.color = '#c74b4b';
        else if (roll < 0.7) p.color = '#c7944b';
        else p.color = '#ffffff';
        p.size = rand(3, 8);
        p.lifetime = 1.0;
        break;
      }

      case 'levelup': {
        // Rise upward with slight horizontal drift
        p.vel.x = rand(-30, 30);
        p.vel.y = rand(-100, -40);
        p.color = i % 2 === 0 ? '#7b4bc7' : '#c7b84b';
        p.size = rand(2, 4);
        p.lifetime = 1.5;
        break;
      }
    }
  }
}

export function updateParticles(particles: Particle[], dt: number): void {
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.age >= p.lifetime) continue;

    p.age += dt;

    if (p.age >= p.lifetime) {
      p.alpha = 0;
      continue;
    }

    // Move
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;

    // Gravity for death particles
    if (p.type === 'death') {
      p.vel.y += DEATH_GRAVITY * dt;
    }

    // Linear fade
    p.alpha = 1 - p.age / p.lifetime;
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  camera: CameraState
): void {
  const savedAlpha = ctx.globalAlpha;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.age >= p.lifetime || p.alpha <= 0) continue;

    // World to screen
    const sx = p.pos.x - camera.x + CANVAS_WIDTH / 2;
    const sy = p.pos.y - camera.y + CANVAS_HEIGHT / 2;

    // Cull off-screen (generous margin for large particles)
    const margin = p.size + 2;
    if (sx < -margin || sx > CANVAS_WIDTH + margin || sy < -margin || sy > CANVAS_HEIGHT + margin) {
      continue;
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = savedAlpha;
}

// === Convenience Spawners ===

export function spawnATPDrainEffect(particles: Particle[], x: number, y: number): void {
  spawnParticles(particles, 'atp-drain', x, y, Math.floor(rand(1, 3)));
}

export function spawnFoodCollectEffect(particles: Particle[], x: number, y: number): void {
  spawnParticles(particles, 'food-collect', x, y, Math.floor(rand(8, 13)));
}

export function spawnDamageEffect(particles: Particle[], x: number, y: number): void {
  spawnParticles(particles, 'damage', x, y, Math.floor(rand(10, 16)));
}

export function spawnDeathEffect(particles: Particle[], x: number, y: number): void {
  spawnParticles(particles, 'death', x, y, Math.floor(rand(30, 51)));
}

export function spawnLevelUpEffect(particles: Particle[], x: number, y: number): void {
  spawnParticles(particles, 'levelup', x, y, Math.floor(rand(20, 31)));
}
