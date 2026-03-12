// CytoSurvivor - HUD Renderer
// Draws all heads-up display elements in screen space (not affected by camera).

import { GameState } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HUD_PADDING,
  HUD_BAR_WIDTH,
  HUD_BAR_HEIGHT,
  STAT_BOX_WIDTH,
  STAT_BOX_HEIGHT,
  PIXEL_FONT,
  FONT_SIZE_SMALL,
  FONT_SIZE_MEDIUM,
  COLORS,
  ZONE_DEFINITIONS,
} from '../constants';

// Module-level flag: fades out upgrade prompt after first visit
let hasVisitedUpgradeScreen = false;

// Track if space prompt should still be shown
export function setUpgradeScreenVisited(): void {
  hasVisitedUpgradeScreen = true;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function brightenHex(hex: string, amount: number): string {
  // Parse hex color and brighten each channel
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

// ─── ATP Bar (Top-Left) ──────────────────────────────────────────────────────

function drawATPBar(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { atp, totalTime } = state;
  const x = HUD_PADDING;
  // Leave space for label above
  const labelH = FONT_SIZE_SMALL + 4;
  const y = HUD_PADDING + labelH;

  const pct = atp.max > 0 ? atp.current / atp.max : 0;
  const fillW = Math.max(0, Math.floor(HUD_BAR_WIDTH * pct));

  // Determine bar color
  let barColor: string;
  if (pct > 0.6) {
    barColor = '#4bc774';
  } else if (pct >= 0.3) {
    barColor = '#c7b84b';
  } else {
    // Low ATP: pulse red
    const pulse = 0.7 + 0.3 * Math.sin(totalTime * 6);
    const rVal = Math.round(199 * pulse + 56 * (1 - pulse));
    barColor = `rgb(${rVal},75,75)`;
  }

  // Background rect
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  drawRoundedRect(ctx, x, y, HUD_BAR_WIDTH, HUD_BAR_HEIGHT, 4);
  ctx.fill();

  // Fill bar (clipped to rounded rect shape)
  if (fillW > 0) {
    ctx.save();
    drawRoundedRect(ctx, x, y, HUD_BAR_WIDTH, HUD_BAR_HEIGHT, 4);
    ctx.clip();
    ctx.fillStyle = barColor;
    ctx.fillRect(x, y, fillW, HUD_BAR_HEIGHT);
    ctx.restore();
  }

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, x, y, HUD_BAR_WIDTH, HUD_BAR_HEIGHT, 4);
  ctx.stroke();

  // Text overlay: "ATP: 75/100"
  ctx.fillStyle = '#ffffff';
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = `ATP: ${Math.floor(atp.current)}/${atp.max}`;
  ctx.fillText(label, x + HUD_BAR_WIDTH / 2, y + HUD_BAR_HEIGHT / 2);

  // "ATP" label above the bar
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('ATP', x, y - 3);

  ctx.restore();
}

// ─── Zone Indicator (Top-Right) ──────────────────────────────────────────────

function drawZoneIndicator(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { currentZone } = state;
  const zoneDef = ZONE_DEFINITIONS.find((z) => z.id === currentZone);
  if (!zoneDef) return;

  const zoneName = `ZONE ${zoneDef.id}: ${zoneDef.name.toUpperCase()}`;
  const boxColor = brightenHex(zoneDef.backgroundColor, 60);

  ctx.save();
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textBaseline = 'middle';

  const textW = ctx.measureText(zoneName).width;
  const padH = 10;
  const padV = 6;
  const boxW = textW + padH * 2;
  const boxH = HUD_BAR_HEIGHT;
  const x = CANVAS_WIDTH - HUD_PADDING - boxW;
  const y = HUD_PADDING;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  drawRoundedRect(ctx, x, y, boxW, boxH, 4);
  ctx.fill();

  // Colored accent fill (slightly transparent)
  ctx.fillStyle = boxColor;
  ctx.globalAlpha = 0.25;
  drawRoundedRect(ctx, x, y, boxW, boxH, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Border
  ctx.strokeStyle = boxColor;
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x, y, boxW, boxH, 4);
  ctx.stroke();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(zoneName, x + boxW / 2, y + boxH / 2);

  ctx.restore();
}

// ─── Level / XP Bar (Top-Center) ─────────────────────────────────────────────

function drawLevelXP(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { atp } = state;
  const level = atp.level;
  const xpPct = atp.xpToNextLevel > 0 ? Math.min(1, atp.xp / atp.xpToNextLevel) : 1;

  const barW = 100;
  const barH = 6;
  const cx = CANVAS_WIDTH / 2;
  const y = HUD_PADDING;

  ctx.save();

  // "LVL X" text
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.textPrimary;
  ctx.fillText(`LVL ${level}`, cx, y);

  const labelH = FONT_SIZE_SMALL + 4;
  const bx = cx - barW / 2;
  const by = y + labelH;

  // XP bar background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  drawRoundedRect(ctx, bx, by, barW, barH, 3);
  ctx.fill();

  // XP fill
  if (xpPct > 0) {
    ctx.save();
    drawRoundedRect(ctx, bx, by, barW, barH, 3);
    ctx.clip();
    ctx.fillStyle = COLORS.xpPurple;
    ctx.fillRect(bx, by, barW * xpPct, barH);
    ctx.restore();
  }

  // Border
  ctx.strokeStyle = 'rgba(123,75,199,0.5)';
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, bx, by, barW, barH, 3);
  ctx.stroke();

  ctx.restore();
}

// ─── Quick Stat Boxes (Bottom-Right) ─────────────────────────────────────────

function drawStatBoxes(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { player, organelles } = state;

  // Compute derived stats from organelle levels
  const flagellumLevel = organelles.get('flagellum') ?? 0;
  const ciliaLevel = organelles.get('cilia') ?? 0;
  const vacuoleLevel = organelles.get('vacuole') ?? 0;
  const mitochondriaLevel = organelles.get('mitochondria') ?? 0;

  // Speed multiplier: flagellum adds 20% per level, cilia adds 10% per level
  const speedMult = 1 + flagellumLevel * 0.2 + ciliaLevel * 0.1;

  // Collection radius: vacuole adds 15px per level
  const collectionRadius = 30 + vacuoleLevel * 15;

  // Efficiency: mitochondria reduces drain by 15% per level
  const efficiencyPct = Math.round((mitochondriaLevel * 15));

  const stats = [
    { label: 'SPEED', value: `x${speedMult.toFixed(1)}`, color: '#4b7bc7' },
    { label: 'RADIUS', value: `${collectionRadius}px`, color: '#c7944b' },
    { label: 'EFFIC.', value: `-${efficiencyPct}%`, color: '#4bc774' },
  ];

  const gap = 6;
  const totalH = stats.length * STAT_BOX_HEIGHT + (stats.length - 1) * gap;
  const startX = CANVAS_WIDTH - HUD_PADDING - STAT_BOX_WIDTH;
  const startY = CANVAS_HEIGHT - HUD_PADDING - totalH;

  ctx.save();

  stats.forEach((stat, i) => {
    const bx = startX;
    const by = startY + i * (STAT_BOX_HEIGHT + gap);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    drawRoundedRect(ctx, bx, by, STAT_BOX_WIDTH, STAT_BOX_HEIGHT, 4);
    ctx.fill();

    // Left accent bar
    ctx.fillStyle = stat.color;
    ctx.save();
    drawRoundedRect(ctx, bx, by, STAT_BOX_WIDTH, STAT_BOX_HEIGHT, 4);
    ctx.clip();
    ctx.fillRect(bx, by, 4, STAT_BOX_HEIGHT);
    ctx.restore();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, bx, by, STAT_BOX_WIDTH, STAT_BOX_HEIGHT, 4);
    ctx.stroke();

    // Label (small, dim)
    ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(stat.label, bx + 10, by + 5);

    // Value (slightly bigger, bright)
    ctx.font = `${FONT_SIZE_MEDIUM}px ${PIXEL_FONT}`;
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = stat.color;
    ctx.fillText(stat.value, bx + 10, by + STAT_BOX_HEIGHT - 5);
  });

  ctx.restore();
}

// ─── Upgrade Prompt (Center-Bottom) ──────────────────────────────────────────

function drawUpgradePrompt(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (hasVisitedUpgradeScreen) return;

  const { totalTime } = state;
  const pulse = 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(totalTime * 3));

  const text = 'PRESS [SPACE] FOR UPGRADES';
  ctx.save();
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = pulse;
  ctx.fillStyle = COLORS.upgradeGold;
  ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
  ctx.restore();
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function renderHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  // Track upgrade screen visits
  if (state.phase === 'upgrading' && !hasVisitedUpgradeScreen) {
    hasVisitedUpgradeScreen = true;
  }

  ctx.save();
  // Reset transform to draw in screen space
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  drawATPBar(ctx, state);
  drawZoneIndicator(ctx, state);
  drawLevelXP(ctx, state);
  drawStatBoxes(ctx, state);
  drawUpgradePrompt(ctx, state);

  ctx.restore();
}
