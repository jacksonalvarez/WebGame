// CytoSurvivor - Canvas Renderer Utilities
// Stateless drawing helpers used by all UI systems.

import { PIXEL_FONT, COLORS, FONT_SIZE_MEDIUM } from '../constants';

// --- Rounded Rectangle ---

export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fillColor: string,
  strokeColor?: string,
  strokeWidth?: number
): void {
  const r = Math.min(radius, w / 2, h / 2);
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

  ctx.fillStyle = fillColor;
  ctx.fill();

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth ?? 1;
    ctx.stroke();
  }
}

// --- Stat Box ---

export function drawStatBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string | number,
  bgColor: string,
  textColor?: string
): void {
  const tc = textColor ?? COLORS.textPrimary;

  drawRoundedRect(ctx, x, y, w, h, 6, bgColor, COLORS.cardBorder, 1);

  const labelSize = 6;
  const valueSize = FONT_SIZE_MEDIUM;

  ctx.font = `${labelSize}px ${PIXEL_FONT}`;
  ctx.fillStyle = tc;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x + w / 2, y + 6);

  ctx.font = `${valueSize}px ${PIXEL_FONT}`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(String(value), x + w / 2, y + h - 6);
}

// --- Pixel Text ---

export function drawPixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align?: CanvasTextAlign
): void {
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align ?? 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
}

// --- Horizontal Bar ---

export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fraction: number,
  color: string,
  bgColor?: string,
  borderColor?: string
): void {
  const clampedFraction = Math.max(0, Math.min(1, fraction));

  // Background
  drawRoundedRect(ctx, x, y, w, h, 3, bgColor ?? '#0a1a1a', borderColor ?? COLORS.cardBorder, 1);

  // Fill
  if (clampedFraction > 0) {
    const fillW = clampedFraction * (w - 2);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 1, y + 1, w - 2, h - 2);
    ctx.clip();
    drawRoundedRect(ctx, x + 1, y + 1, fillW, h - 2, 2, color);
    ctx.restore();
  }
}

// --- Circle ---

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillColor: string,
  glowColor?: string,
  glowRadius?: number
): void {
  if (glowColor && glowRadius) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    grd.addColorStop(0, glowColor);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
}

// --- Pulsing Circle ---

export function drawPulsingCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  baseRadius: number,
  pulseAmount: number,
  phase: number,
  color: string,
  glowColor?: string
): void {
  const pulse = Math.sin(phase) * pulseAmount;
  const r = baseRadius + pulse;

  if (glowColor) {
    drawCircle(ctx, x, y, r + 4, color, glowColor, r + 10);
  } else {
    drawCircle(ctx, x, y, r, color);
  }
}

// --- Wobbly Circle ---

export function drawWobblyCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  wobbleAmount: number,
  phase: number,
  fillColor: string,
  strokeColor?: string,
  segments?: number
): void {
  const segs = segments ?? 24;
  ctx.beginPath();
  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    const wobble = Math.sin(angle * 3 + phase) * wobbleAmount;
    const r = radius + wobble;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();

  ctx.fillStyle = fillColor;
  ctx.fill();

  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

// --- Button ---

export function drawButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  isHovered: boolean,
  bgColor?: string,
  textColor?: string
): void {
  const bg = isHovered
    ? bgColor ?? COLORS.upgradeGold
    : bgColor ?? COLORS.cardBg;
  const border = isHovered ? COLORS.upgradeGold : COLORS.cardBorder;
  const tc = textColor ?? COLORS.textPrimary;

  drawRoundedRect(ctx, x, y, w, h, 8, bg, border, isHovered ? 2 : 1);

  const fontSize = FONT_SIZE_MEDIUM;
  ctx.font = `${fontSize}px ${PIXEL_FONT}`;
  ctx.fillStyle = tc;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}

// --- Point In Rect ---

export function pointInRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

// --- Overlay ---

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  alpha?: number
): void {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha ?? 0.6})`;
  ctx.fillRect(0, 0, width, height);
}

// --- Grid Pattern ---

export function drawGridPattern(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  spacing: number,
  color: string,
  alpha: number
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;

  const startX = offsetX % spacing;
  const startY = offsetY % spacing;

  ctx.beginPath();

  // Vertical lines
  for (let x = startX; x < ctx.canvas.width; x += spacing) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
  }

  // Horizontal lines
  for (let y = startY; y < ctx.canvas.height; y += spacing) {
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
  }

  ctx.stroke();
  ctx.restore();
}
