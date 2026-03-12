import { GameState } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  PIXEL_FONT,
  FONT_SIZE_HUGE,
  FONT_SIZE_MEDIUM,
  FONT_SIZE_SMALL,
  ZONE_DEFINITIONS,
} from '../constants';

function getStartBtn() {
  return {
    x: CANVAS_WIDTH / 2 - 120,
    y: CANVAS_HEIGHT / 2 + 20,
    w: 240,
    h: 56,
  };
}

export function renderMainMenu(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const { meta, input } = state;

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  _renderFloatingCells(ctx, time, W, H);

  // Title
  ctx.save();
  ctx.font = `${FONT_SIZE_HUGE + 8}px ${PIXEL_FONT}`;
  ctx.fillStyle = COLORS.textPrimary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CYTOSURVIVOR', W / 2, H / 2 - 100);
  ctx.restore();

  // Tagline
  ctx.save();
  ctx.font = `${FONT_SIZE_MEDIUM + 2}px ${PIXEL_FONT}`;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Feed. Evolve. Die. Mutate. Repeat.', W / 2, H / 2 - 50);
  ctx.restore();

  // Start Button
  const btn = getStartBtn();
  const isHovered = _isInsideBtn(input.mouseX, input.mouseY, btn);
  const btnColor = isHovered ? '#6dd98a' : COLORS.positiveGreen;

  ctx.save();
  ctx.fillStyle = btnColor;
  _roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fill();
  ctx.strokeStyle = isHovered ? '#9fffb8' : '#2a8a44';
  ctx.lineWidth = 2;
  _roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.stroke();
  ctx.font = `${FONT_SIZE_MEDIUM + 4}px ${PIXEL_FONT}`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('START RUN', W / 2, btn.y + btn.h / 2);
  ctx.restore();

  if (meta.totalRuns > 0) {
    const bestZoneName = ZONE_DEFINITIONS[meta.bestZone - 1]?.name ?? `Zone ${meta.bestZone}`;
    const statsText = `Runs: ${meta.totalRuns}  |  Best: ${bestZoneName}  |  Score: ${meta.highScore}`;
    ctx.save();
    ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
    ctx.fillStyle = COLORS.textSecondary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.globalAlpha = 0.7;
    ctx.fillText(statsText, W / 2, H - 28);
    ctx.restore();
  }

  ctx.save();
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.fillStyle = COLORS.textSecondary;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 0.5;
  ctx.fillText('v0.1', W - 10, H - 8);
  ctx.restore();
}

export function handleMainMenuClick(state: GameState, mouseX: number, mouseY: number): boolean {
  return _isInsideBtn(mouseX, mouseY, getStartBtn());
}

function _renderFloatingCells(ctx: CanvasRenderingContext2D, time: number, W: number, H: number): void {
  ctx.save();
  const count = 18;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const baseX = (t * W * 1.4) % W;
    const baseY = (i * 137.5) % H;
    const radius = 8 + (i % 5) * 6;
    const speedX = 0.3 + (i % 3) * 0.15;
    const speedY = 0.2 + (i % 4) * 0.1;
    const phase = i * 0.7;
    const alpha = 0.06 + (i % 4) * 0.03;

    const x = (baseX + Math.cos(time * speedX + phase) * 40 + W) % W;
    const y = (baseY + Math.sin(time * speedY + phase) * 30 + H) % H;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = COLORS.playerCell;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
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

function _isInsideBtn(mouseX: number, mouseY: number, btn: { x: number; y: number; w: number; h: number }): boolean {
  return mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h;
}
