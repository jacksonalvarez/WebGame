import { GameState } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  PIXEL_FONT,
  FONT_SIZE_HUGE,
  FONT_SIZE_LARGE,
  FONT_SIZE_MEDIUM,
  FONT_SIZE_SMALL,
  ZONE_DEFINITIONS,
} from '../constants';

function getLabBtn() {
  return { x: CANVAS_WIDTH / 2 - 220, y: CANVAS_HEIGHT - 110, w: 200, h: 48 };
}
function getRestartBtn() {
  return { x: CANVAS_WIDTH / 2 + 20, y: CANVAS_HEIGHT - 110, w: 200, h: 48 };
}

// Stat card layout
const CARD_W = 190;
const CARD_H = 64;
const CARD_GAP = 12;
const CARDS_PER_ROW = 3;
const CARD_START_Y = 290;

export function renderDeathScreen(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const { runStats, meta, input } = state;

  // --- Semi-transparent dark overlay ---
  ctx.save();
  ctx.fillStyle = 'rgba(5, 12, 12, 0.82)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();

  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const centerY = H / 2 - 60;

  // --- YOU DIED header with pulse ---
  const pulse = 0.85 + 0.15 * Math.sin(time * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.font = `${FONT_SIZE_HUGE}px ${PIXEL_FONT}`;
  ctx.fillStyle = COLORS.negativeRed;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YOU DIED', W / 2, centerY - 100);
  ctx.restore();

  // --- Run subtitle ---
  ctx.save();
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.7;
  ctx.fillText('RUN COMPLETE', W / 2, centerY - 55);
  ctx.restore();

  // --- Stat cards ---
  const cards = _buildCards(runStats, time);
  const totalRowWidth = CARDS_PER_ROW * CARD_W + (CARDS_PER_ROW - 1) * CARD_GAP;
  const cardStartX = W / 2 - totalRowWidth / 2;
  const cardStartY = centerY - 20;

  for (let i = 0; i < cards.length; i++) {
    const col = i % CARDS_PER_ROW;
    const row = Math.floor(i / CARDS_PER_ROW);
    const cx = cardStartX + col * (CARD_W + CARD_GAP);
    const cy = cardStartY + row * (CARD_H + CARD_GAP);
    _renderStatCard(ctx, cards[i], cx, cy, CARD_W, CARD_H, time);
  }

  // --- Personal Best banner ---
  const isNewBest = runStats.score > 0 && runStats.score >= meta.highScore;
  if (isNewBest) {
    const glow = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.save();
    ctx.shadowColor = COLORS.upgradeGold;
    ctx.shadowBlur = 20 * glow;
    ctx.font = `${FONT_SIZE_MEDIUM}px ${PIXEL_FONT}`;
    ctx.fillStyle = COLORS.upgradeGold;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('** NEW BEST! **', W / 2, cardStartY + 2 * (CARD_H + CARD_GAP) + CARD_H + 22);
    ctx.restore();
  }

  // --- Buttons ---
  const labBtn = getLabBtn();
  const restartBtn = getRestartBtn();
  const labHovered = _isInside(input.mouseX, input.mouseY, labBtn);
  const restartHovered = _isInside(input.mouseX, input.mouseY, restartBtn);

  _renderButton(ctx, labBtn, 'EVOLUTION LAB', labHovered, COLORS.xpPurple, '#5a2fa0');
  _renderButton(ctx, restartBtn, 'TRY AGAIN', restartHovered, COLORS.positiveGreen, '#2a8a44');
}

export function handleDeathScreenClick(
  state: GameState,
  mouseX: number,
  mouseY: number,
): 'evolution-lab' | 'restart' | null {
  if (_isInside(mouseX, mouseY, getLabBtn())) return 'evolution-lab';
  if (_isInside(mouseX, mouseY, getRestartBtn())) return 'restart';
  return null;
}

// ---------------------------------------------------------------------------
// Stat card definitions
// ---------------------------------------------------------------------------

interface StatCard {
  label: string;
  value: string;
  color: string;
  flash?: boolean;
  animatedPrefix?: string; // e.g. "+" shown with animation
}

function _buildCards(runStats: GameState['runStats'], time: number): StatCard[] {
  const zoneDef = ZONE_DEFINITIONS[runStats.furthestZone - 1];
  const zoneName = zoneDef?.name ?? `Zone ${runStats.furthestZone}`;

  const minutes = Math.floor(runStats.timeSurvived / 60);
  const seconds = Math.floor(runStats.timeSurvived % 60);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return [
    {
      label: 'Food Collected',
      value: String(runStats.foodCollected),
      color: COLORS.foodGreen,
    },
    {
      label: 'Furthest Zone',
      value: zoneName,
      color: COLORS.speedBlue,
    },
    {
      label: 'Time Survived',
      value: timeStr,
      color: COLORS.atpBarMed,
    },
    {
      label: 'Organelles',
      value: String(runStats.organellesInstalled.length),
      color: COLORS.efficiencyOrange,
    },
    {
      label: 'DNA Earned',
      value: String(runStats.dnaEarned),
      color: COLORS.upgradeGold,
      animatedPrefix: '+',
    },
    {
      label: 'Mutation',
      value: runStats.mutationDiscovered ?? 'None',
      color: COLORS.xpPurple,
      flash: runStats.mutationDiscovered !== null,
    },
  ];
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function _renderStatCard(
  ctx: CanvasRenderingContext2D,
  card: StatCard,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
): void {
  ctx.save();

  // Flash effect for mutation card
  if (card.flash) {
    const flashAlpha = 0.15 + 0.1 * Math.sin(time * 6);
    ctx.fillStyle = card.color;
    ctx.globalAlpha = flashAlpha;
    _roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Card background
  ctx.fillStyle = COLORS.cardBg;
  _roundRect(ctx, x, y, w, h, 6);
  ctx.fill();

  // Card border
  ctx.strokeStyle = card.color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  _roundRect(ctx, x, y, w, h, 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Label
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.globalAlpha = 0.65;
  ctx.fillText(card.label.toUpperCase(), x + w / 2, y + 8);
  ctx.globalAlpha = 1;

  // Value
  ctx.font = `${FONT_SIZE_MEDIUM}px ${PIXEL_FONT}`;
  ctx.fillStyle = card.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // Animated DNA prefix with slide-in effect
  let displayValue = card.value;
  if (card.animatedPrefix) {
    const animProgress = Math.min(1, time * 0.5); // fade in over 2s
    ctx.globalAlpha = animProgress;
    displayValue = card.animatedPrefix + card.value;
  }

  ctx.fillText(displayValue, x + w / 2, y + h - 8);
  ctx.globalAlpha = 1;

  ctx.restore();
}

function _renderButton(
  ctx: CanvasRenderingContext2D,
  btn: { x: number; y: number; w: number; h: number },
  label: string,
  hovered: boolean,
  baseColor: string,
  borderColor: string,
): void {
  ctx.save();

  const bgColor = hovered ? _lighten(baseColor, 20) : baseColor;
  ctx.fillStyle = bgColor;
  _roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fill();

  ctx.strokeStyle = hovered ? _lighten(borderColor, 40) : borderColor;
  ctx.lineWidth = 2;
  _roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.stroke();

  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2);

  ctx.restore();
}

function _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function _isInside(mouseX: number, mouseY: number, btn: { x: number; y: number; w: number; h: number }): boolean {
  return mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h;
}

function _lighten(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
