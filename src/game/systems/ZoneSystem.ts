// CytoSurvivor - Zone System
import { GameState, ZoneId, ZoneDefinition, CameraState, ToxicPocket } from '../types';
import { MAP_CENTER, MAP_RADIUS, ZONE_BOUNDARIES, ZONE_DEFINITIONS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

export function getZoneDefinition(zoneId: ZoneId): ZoneDefinition {
  return ZONE_DEFINITIONS[zoneId - 1];
}

export function getZone(x: number, y: number): ZoneId {
  const dx = x - MAP_CENTER;
  const dy = y - MAP_CENTER;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const fraction = dist / MAP_RADIUS;

  if (fraction < ZONE_BOUNDARIES[1]) return 1;
  if (fraction < ZONE_BOUNDARIES[2]) return 2;
  if (fraction < ZONE_BOUNDARIES[3]) return 3;
  if (fraction < ZONE_BOUNDARIES[4]) return 4;
  return 5;
}

export function updateZones(state: GameState): void {
  // Update player's current zone
  const playerZone = getZone(state.player.pos.x, state.player.pos.y);
  state.currentZone = playerZone;

  // Update zone on food items
  for (const food of state.food) {
    if (!food.collected) {
      food.zone = getZone(food.pos.x, food.pos.y);
    }
  }

  // Update zone on enemies
  for (const enemy of state.enemies) {
    if (enemy.active) {
      enemy.zone = getZone(enemy.pos.x, enemy.pos.y);
    }
  }

  // Apply toxic pocket effects to player
  for (const pocket of state.toxicPockets) {
    const dx = state.player.pos.x - pocket.pos.x;
    const dy = state.player.pos.y - pocket.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < pocket.radius) {
      // Increase ATP drain while inside a toxic pocket
      state.atp.drainRate = (state.atp.drainRate ?? 2) * pocket.drainMultiplier * state.deltaTime;
    }
  }
}

// Convert world coordinates to screen coordinates
function worldToScreen(
  worldX: number,
  worldY: number,
  camera: CameraState
): { sx: number; sy: number } {
  return {
    sx: worldX - camera.x + CANVAS_WIDTH / 2,
    sy: worldY - camera.y + CANVAS_HEIGHT / 2,
  };
}

export function renderZones(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: CameraState
): void {
  const { sx: centerSX, sy: centerSY } = worldToScreen(MAP_CENTER, MAP_CENTER, camera);

  // Draw from outermost zone inward so inner zones paint over outer
  const zonesOuterToInner = [...ZONE_DEFINITIONS].reverse();

  for (const zone of zonesOuterToInner) {
    const screenRadius = zone.maxRadius * MAP_RADIUS;
    ctx.beginPath();
    ctx.arc(centerSX, centerSY, screenRadius, 0, Math.PI * 2);
    ctx.fillStyle = zone.backgroundColor;
    ctx.fill();
  }

  // Gradient fade between zone boundaries
  for (let i = 1; i < ZONE_BOUNDARIES.length - 1; i++) {
    const innerR = ZONE_BOUNDARIES[i] * MAP_RADIUS;
    const outerR = innerR + 30; // fade width in world px
    const innerColor = ZONE_DEFINITIONS[i - 1]?.backgroundColor ?? '#000';
    const outerColor = ZONE_DEFINITIONS[i]?.backgroundColor ?? '#000';

    const gradient = ctx.createRadialGradient(
      centerSX, centerSY, innerR,
      centerSX, centerSY, outerR
    );
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);

    ctx.beginPath();
    ctx.arc(centerSX, centerSY, outerR, 0, Math.PI * 2);
    ctx.arc(centerSX, centerSY, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  // Microscope slide grid overlay
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = '#88ffcc';
  ctx.lineWidth = 1;

  const gridSpacing = 50;
  // Calculate visible grid range in world coords
  const leftWorld = camera.x - CANVAS_WIDTH / 2;
  const topWorld = camera.y - CANVAS_HEIGHT / 2;
  const rightWorld = camera.x + CANVAS_WIDTH / 2;
  const bottomWorld = camera.y + CANVAS_HEIGHT / 2;

  const startX = Math.floor(leftWorld / gridSpacing) * gridSpacing;
  const startY = Math.floor(topWorld / gridSpacing) * gridSpacing;

  // Vertical lines
  for (let wx = startX; wx <= rightWorld; wx += gridSpacing) {
    const { sx } = worldToScreen(wx, 0, camera);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, CANVAS_HEIGHT);
    ctx.stroke();
  }

  // Horizontal lines
  for (let wy = startY; wy <= bottomWorld; wy += gridSpacing) {
    const { sy } = worldToScreen(0, wy, camera);
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(CANVAS_WIDTH, sy);
    ctx.stroke();
  }

  ctx.restore();

  // Render toxic pockets
  renderToxicPockets(ctx, state, camera);
}

function renderToxicPockets(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: CameraState
): void {
  const pulseAmt = 0.5 + 0.5 * Math.sin(state.totalTime * 3);

  for (const pocket of state.toxicPockets) {
    const { sx, sy } = worldToScreen(pocket.pos.x, pocket.pos.y, camera);

    // Skip if off screen
    if (
      sx + pocket.radius < 0 ||
      sx - pocket.radius > CANVAS_WIDTH ||
      sy + pocket.radius < 0 ||
      sy - pocket.radius > CANVAS_HEIGHT
    ) {
      continue;
    }

    // Base toxic fill
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, pocket.radius);
    gradient.addColorStop(0, `rgba(200, 60, 60, 0.25)`);
    gradient.addColorStop(0.7, `rgba(180, 40, 40, 0.12)`);
    gradient.addColorStop(1, `rgba(160, 20, 20, 0)`);

    ctx.beginPath();
    ctx.arc(sx, sy, pocket.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Pulsing red ring warning
    ctx.save();
    ctx.globalAlpha = 0.15 + 0.25 * pulseAmt;
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, pocket.radius * (0.9 + 0.1 * pulseAmt), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function renderMembraneWalls(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: CameraState
): void {
  const { sx: centerSX, sy: centerSY } = worldToScreen(MAP_CENTER, MAP_CENTER, camera);

  // Draw a ring at each zone boundary (except 0 and 1.0)
  const boundaryFractions = ZONE_BOUNDARIES.slice(1, ZONE_BOUNDARIES.length - 1); // [0.15, 0.35, 0.55, 0.75]

  const boundaryColors = [
    '#44ccaa', // zone 1/2 boundary
    '#33aacc', // zone 2/3 boundary
    '#cc8833', // zone 3/4 boundary
    '#cc3344', // zone 4/5 boundary
  ];

  for (let i = 0; i < boundaryFractions.length; i++) {
    const worldRadius = boundaryFractions[i] * MAP_RADIUS;

    // Skip if boundary circle is completely off-screen
    const dx = Math.abs(centerSX - CANVAS_WIDTH / 2);
    const dy = Math.abs(centerSY - CANVAS_HEIGHT / 2);
    const screenDist = Math.sqrt(dx * dx + dy * dy);
    if (screenDist - worldRadius > Math.sqrt(CANVAS_WIDTH * CANVAS_WIDTH + CANVAS_HEIGHT * CANVAS_HEIGHT)) {
      continue;
    }

    const color = boundaryColors[i] ?? '#ffffff';

    // Outer glow
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = color;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(centerSX, centerSY, worldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Main dashed membrane line
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 8]);
    ctx.lineDashOffset = -(state.totalTime * 10); // slow animated dash
    ctx.beginPath();
    ctx.arc(centerSX, centerSY, worldRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Inner thin line
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 16]);
    ctx.lineDashOffset = state.totalTime * 8;
    ctx.beginPath();
    ctx.arc(centerSX, centerSY, worldRadius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
