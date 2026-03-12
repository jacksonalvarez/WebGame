import { GameState, CameraState } from '../types';
import {
  PLAYER_BASE_RADIUS,
  PLAYER_BASE_SPEED,
  PLAYER_FOLLOW_SMOOTHING,
  PLAYER_WOBBLE_SPEED,
  PLAYER_WOBBLE_AMOUNT,
  MAP_SIZE,
  FOOD_COLLECTION_BASE_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
} from '../constants';

// Speed multipliers for flagellum organelle
const FLAGELLUM_SPEED_MULTIPLIER: [number, number, number] = [1.25, 1.5, 1.8];

// Collection radius multipliers for cilia organelle
const CILIA_RADIUS_MULTIPLIER: [number, number, number] = [1.3, 1.6, 2.0];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getPlayerSpeed(state: GameState): number {
  const flagellumLevel = state.organelles.get('flagellum') ?? 0;
  const multiplier =
    flagellumLevel > 0 ? FLAGELLUM_SPEED_MULTIPLIER[flagellumLevel - 1] : 1.0;
  return PLAYER_BASE_SPEED * multiplier;
}

export function getPlayerCollectionRadius(state: GameState): number {
  const ciliaLevel = state.organelles.get('cilia') ?? 0;
  const multiplier =
    ciliaLevel > 0 ? CILIA_RADIUS_MULTIPLIER[ciliaLevel - 1] : 1.0;
  return FOOD_COLLECTION_BASE_RADIUS * multiplier;
}

export function updatePlayer(state: GameState): void {
  const { player, input } = state;
  const dt = state.deltaTime;

  // Direction from player to mouse world pos
  const dx = input.mouseWorldX - player.pos.x;
  const dy = input.mouseWorldY - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const speed = getPlayerSpeed(state);

  let targetVelX = 0;
  let targetVelY = 0;

  if (dist > 5) {
    const nx = dx / dist;
    const ny = dy / dist;
    targetVelX = nx * speed;
    targetVelY = ny * speed;
  }

  // Smooth velocity toward target
  player.vel.x = lerp(player.vel.x, targetVelX, PLAYER_FOLLOW_SMOOTHING);
  player.vel.y = lerp(player.vel.y, targetVelY, PLAYER_FOLLOW_SMOOTHING);

  // Apply velocity
  player.pos.x += player.vel.x * dt;
  player.pos.y += player.vel.y * dt;

  // Clamp to map bounds
  const r = player.radius;
  player.pos.x = Math.max(r, Math.min(MAP_SIZE - r, player.pos.x));
  player.pos.y = Math.max(r, Math.min(MAP_SIZE - r, player.pos.y));

  // Update wobble phase
  player.wobblePhase += PLAYER_WOBBLE_SPEED * dt;
}

export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: CameraState
): void {
  const { player, atp } = state;

  // World pos to screen pos
  const screenX = player.pos.x - camera.x + CANVAS_WIDTH / 2;
  const screenY = player.pos.y - camera.y + CANVAS_HEIGHT / 2;

  // Cell radius grows slightly with level: +1px per 2 levels
  const level = atp.level;
  const radius = PLAYER_BASE_RADIUS + Math.floor(level / 2);

  const wobble = player.wobblePhase;
  const segments = 32;

  // Draw wobbly cell body
  ctx.save();
  ctx.beginPath();

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const wobbleOffset =
      Math.sin(angle * 3 + wobble) * PLAYER_WOBBLE_AMOUNT +
      Math.sin(angle * 5 - wobble * 0.7) * (PLAYER_WOBBLE_AMOUNT * 0.5);
    const r = radius + wobbleOffset;
    const x = screenX + Math.cos(angle) * r;
    const y = screenY + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();

  // Inner glow gradient
  const gradient = ctx.createRadialGradient(
    screenX, screenY, radius * 0.1,
    screenX, screenY, radius
  );
  gradient.addColorStop(0, COLORS.playerCellInner);
  gradient.addColorStop(1, COLORS.playerCell);

  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = COLORS.playerCellInner;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  // Nucleus
  const nucleusRadius = radius * 0.35;
  ctx.beginPath();
  ctx.arc(screenX, screenY, nucleusRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(100, 180, 140, 0.5)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 220, 180, 0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw installed organelle indicators as small colored dots
  const organelleColors: Record<string, string> = {
    mitochondria: '#c74b4b',
    flagellum: '#4b7bc7',
    cilia: '#4bc774',
    ribosomes: '#c7944b',
    endoplasmicReticulum: '#9b59b6',
    cellMembrane: '#ecf0f1',
    nucleus: '#c7b84b',
    vacuole: '#27ae60',
    lysosomes: '#e74c3c',
    pseudopods: '#8b6914',
  };

  // Fixed positions inside the cell for each organelle slot
  const organelleOffsets = [
    { x: 0.5, y: -0.5 },
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: 0.5 },
    { x: 0.7, y: 0 },
    { x: -0.7, y: 0 },
    { x: 0, y: 0.7 },
    { x: 0, y: -0.7 },
    { x: 0.55, y: 0.55 },
    { x: -0.55, y: 0.55 },
  ];

  const organelleKeys = Object.keys(organelleColors);
  let slotIndex = 0;

  for (const key of organelleKeys) {
    const level = state.organelles.get(key as import('../types').OrganelleId) ?? 0;
    if (level > 0 && slotIndex < organelleOffsets.length) {
      const offset = organelleOffsets[slotIndex];
      const dotX = screenX + offset.x * radius * 0.55;
      const dotY = screenY + offset.y * radius * 0.55;
      const dotRadius = 2 + level * 0.5;

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = organelleColors[key];
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      slotIndex++;
    }
  }

  ctx.restore();
}
