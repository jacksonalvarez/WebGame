// CytoSurvivor - Upgrade Screen UI (Balatro-style, responsive)
import { GameState, OrganelleId } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  PIXEL_FONT,
  FONT_SIZE_SMALL,
  FONT_SIZE_MEDIUM,
  FONT_SIZE_LARGE,
} from '../constants';
import { ORGANELLE_DEFINITIONS } from '../data/organelles';

// === Layout Constants ===
const OVERLAY_BG = 'rgba(0,0,0,0.85)';
const TILE_COLS = 5;
const TILE_ROWS = 2;
const TILE_GAP = 12;

// === Hover state (module-level, updated each frame) ===
let hoveredOrganelleId: string | null = null;

// === Dynamic layout helpers ===

function getLayout() {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  // 3-panel layout: left stats, center grid, right detail
  const margin = Math.max(20, W * 0.03);
  const leftW = Math.max(160, W * 0.15);
  const rightW = Math.max(180, W * 0.18);
  const centerW = W - leftW - rightW - margin * 4;

  const leftX = margin;
  const centerX = leftX + leftW + margin;
  const rightX = centerX + centerW + margin;

  // Tile sizing based on available center space
  const tileW = Math.floor((centerW - (TILE_COLS - 1) * TILE_GAP) / TILE_COLS);
  const tileH = Math.floor(tileW * 1.2);

  const gridH = TILE_ROWS * tileH + (TILE_ROWS - 1) * TILE_GAP;
  const gridY = Math.floor((H - gridH) / 2);

  return { W, H, margin, leftX, leftW, centerX, centerW, rightX, rightW, tileW, tileH, gridY };
}

function getTileRect(col: number, row: number) {
  const L = getLayout();
  return {
    x: L.centerX + col * (L.tileW + TILE_GAP),
    y: L.gridY + row * (L.tileH + TILE_GAP),
    w: L.tileW,
    h: L.tileH,
  };
}

// === Helpers ===

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number,
  fillStyle?: string,
  strokeStyle?: string,
  lineWidth = 1,
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
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function pixelText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'left',
): void {
  ctx.font = `${size}px ${PIXEL_FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// === Organelle icons (simple geometric shapes) ===
function drawOrganelleIcon(
  ctx: CanvasRenderingContext2D,
  organelleId: OrganelleId,
  cx: number, cy: number,
  color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;

  switch (organelleId) {
    case 'mitochondria': {
      ctx.beginPath();
      ctx.ellipse(cx, cy, 14, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy);
      ctx.bezierCurveTo(cx - 4, cy - 5, cx + 4, cy + 5, cx + 8, cy);
      ctx.stroke();
      break;
    }
    case 'flagellum': {
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy);
      ctx.bezierCurveTo(cx - 7, cy - 8, cx, cy + 8, cx + 7, cy - 4);
      ctx.bezierCurveTo(cx + 11, cy - 8, cx + 14, cy - 2, cx + 14, cy + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - 14, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cilia': {
      ctx.beginPath();
      ctx.rect(cx - 10, cy + 2, 20, 5);
      ctx.fill();
      for (let i = -9; i <= 9; i += 4) {
        ctx.beginPath();
        ctx.moveTo(cx + i, cy + 2);
        ctx.lineTo(cx + i + 1, cy - 8);
        ctx.stroke();
      }
      break;
    }
    case 'ribosomes': {
      const positions = [[-6, -6], [0, -8], [6, -5], [-8, 0], [-2, 0], [5, 1], [-5, 6], [2, 7], [8, 4]];
      positions.forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + dy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case 'endoplasmicReticulum': {
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy + i * 5);
        ctx.bezierCurveTo(cx - 6, cy + i * 5 - 3, cx + 6, cy + i * 5 + 3, cx + 13, cy + i * 5);
        ctx.stroke();
      }
      break;
    }
    case 'cellMembrane': {
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = COLORS.cardBg;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'nucleus': {
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 9, cy - 9);
      ctx.lineTo(cx + 9, cy + 9);
      ctx.moveTo(cx + 9, cy - 9);
      ctx.lineTo(cx - 9, cy + 9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'vacuole': {
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 11, 0, Math.PI * 2);
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + 2);
      ctx.bezierCurveTo(cx - 2, cy - 1, cx + 2, cy + 5, cx + 5, cy + 2);
      ctx.stroke();
      break;
    }
    case 'lysosomes': {
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 6);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.moveTo(cx + 6, cy - 6);
      ctx.lineTo(cx - 6, cy + 6);
      ctx.stroke();
      break;
    }
    case 'pseudopods': {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.bezierCurveTo(cx + 8, cy - 10, cx + 14, cy - 4, cx + 10, cy + 2);
      ctx.bezierCurveTo(cx + 8, cy + 10, cx + 2, cy + 14, cx - 4, cy + 10);
      ctx.bezierCurveTo(cx - 12, cy + 8, cx - 14, cy, cx - 10, cy - 6);
      ctx.bezierCurveTo(cx - 8, cy - 12, cx - 4, cy - 14, cx, cy - 12);
      ctx.closePath();
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// === Left Panel: Player Stats ===
function renderLeftPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
  const L = getLayout();
  const boxH = 56;
  const boxGap = 10;

  const stats = [
    { label: 'ATP', value: `${Math.floor(state.atp.current)}/${state.atp.max}`, color: '#4bc774' },
    { label: 'SPD', value: `${Math.round(state.player.baseSpeed)}px/s`, color: '#4b7bc7' },
    { label: 'COL', value: `+${Math.round((state.organelles.get('cilia') ?? 0) * 30)}px`, color: '#c7944b' },
    { label: 'PTS', value: `${state.upgradePoints}`, color: '#c7b84b' },
    { label: 'LVL', value: `${state.atp.level}`, color: '#7b4bc7', isXp: true, xpCurrent: state.atp.xp, xpMax: state.atp.xpToNextLevel },
  ];

  const totalH = stats.length * boxH + (stats.length - 1) * boxGap;
  const panelY = Math.floor((L.H - totalH) / 2);

  stats.forEach((stat, i) => {
    const bx = L.leftX;
    const by = panelY + i * (boxH + boxGap);
    drawRoundRect(ctx, bx, by, L.leftW, boxH, 6, stat.color + '22', stat.color, 1.5);

    pixelText(ctx, stat.label, bx + 12, by + (stat.isXp ? 18 : boxH / 2), FONT_SIZE_SMALL, stat.color, 'left');
    pixelText(ctx, stat.value, bx + L.leftW - 12, by + (stat.isXp ? 18 : boxH / 2), FONT_SIZE_SMALL, COLORS.textPrimary, 'right');

    if (stat.isXp) {
      const barX = bx + 10;
      const barY = by + 34;
      const barW = L.leftW - 20;
      const barH = 10;
      const ratio = stat.xpMax! > 0 ? Math.min(1, stat.xpCurrent! / stat.xpMax!) : 0;
      drawRoundRect(ctx, barX, barY, barW, barH, 3, '#1c2333', '#7b4bc7', 1);
      if (ratio > 0) {
        drawRoundRect(ctx, barX + 1, barY + 1, Math.max(4, (barW - 2) * ratio), barH - 2, 2, '#7b4bc7');
      }
      pixelText(ctx, `${stat.xpCurrent}/${stat.xpMax} XP`, barX + barW / 2, barY + barH / 2, FONT_SIZE_SMALL - 2, COLORS.textSecondary, 'center');
    }
  });
}

// === Center Panel: Organelle Grid ===
function renderOrganelleGrid(ctx: CanvasRenderingContext2D, state: GameState): void {
  const nucleusLevel = state.organelles.get('nucleus') ?? 0;

  ORGANELLE_DEFINITIONS.forEach((def, idx) => {
    const col = idx % TILE_COLS;
    const row = Math.floor(idx / TILE_COLS);
    const rect = getTileRect(col, row);

    const currentLevel = state.organelles.get(def.id) ?? 0;
    const isMaxed = currentLevel >= 3;
    const nextLevelIdx = currentLevel;
    const ptCost = !isMaxed ? def.upgradePointCost[nextLevelIdx] : 0;
    const requiresNucleus = def.requiresNucleusLevel !== undefined && nucleusLevel < def.requiresNucleusLevel;
    const canAfford = !isMaxed && state.upgradePoints >= ptCost && !requiresNucleus;

    const isHovered = hoveredOrganelleId === def.id;

    let bgColor: string = COLORS.cardBg;
    let borderColor: string = COLORS.cardBorder;
    let borderWidth = 1.5;

    if (isHovered && !isMaxed) {
      borderColor = '#c7b84b';
      borderWidth = 2.5;
      bgColor = '#1f2a40';
    } else if (isMaxed) {
      borderColor = '#4bc774';
    } else if (!canAfford) {
      bgColor = '#141a28';
      borderColor = '#1f2a35';
    }

    drawRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6, bgColor, borderColor, borderWidth);

    if (isHovered && !isMaxed) {
      ctx.save();
      ctx.shadowColor = '#c7b84b';
      ctx.shadowBlur = 12;
      drawRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6, undefined, '#c7b84b44', 1);
      ctx.restore();
    }

    const iconAlpha = canAfford || isMaxed ? 1 : 0.4;
    ctx.save();
    ctx.globalAlpha = iconAlpha;

    const iconColor = canAfford ? COLORS.textPrimary : (isMaxed ? '#4bc774' : '#555');
    drawOrganelleIcon(ctx, def.id as OrganelleId, rect.x + rect.w / 2, rect.y + rect.h * 0.3, iconColor);

    ctx.restore();

    // Name
    const displayName = def.name.length > 10 ? def.name.substring(0, 9) + '.' : def.name;
    pixelText(ctx, displayName, rect.x + rect.w / 2, rect.y + rect.h * 0.58, FONT_SIZE_SMALL, canAfford || isMaxed ? COLORS.textSecondary : '#444', 'center');

    // Level indicator
    const lvlColor = isMaxed ? '#4bc774' : (currentLevel > 0 ? '#c7b84b' : '#555');
    pixelText(ctx, isMaxed ? 'MAX' : `Lv${currentLevel}`, rect.x + rect.w / 2, rect.y + rect.h * 0.72, FONT_SIZE_SMALL, lvlColor, 'center');

    // Cost
    if (!isMaxed) {
      if (requiresNucleus) {
        pixelText(ctx, `NUKE Lv${def.requiresNucleusLevel}`, rect.x + rect.w / 2, rect.y + rect.h * 0.87, FONT_SIZE_SMALL - 2, '#555', 'center');
      } else {
        const ptColor = state.upgradePoints >= ptCost ? COLORS.upgradeGold : '#c74b4b';
        pixelText(ctx, `${ptCost}pt`, rect.x + rect.w / 2, rect.y + rect.h * 0.87, FONT_SIZE_SMALL, ptColor, 'center');
      }
    }
  });
}

// === Right Panel: Detail View ===
function renderDetailPanel(ctx: CanvasRenderingContext2D, state: GameState): void {
  const L = getLayout();
  const panelX = L.rightX;
  const panelY = 50;
  const panelH = L.H - 100;

  drawRoundRect(ctx, panelX, panelY, L.rightW, panelH, 8, COLORS.cardBg, COLORS.cardBorder, 1.5);

  if (!hoveredOrganelleId) {
    pixelText(ctx, 'Hover an', panelX + L.rightW / 2, panelY + panelH / 2 - 16, FONT_SIZE_SMALL, '#555', 'center');
    pixelText(ctx, 'organelle', panelX + L.rightW / 2, panelY + panelH / 2 + 8, FONT_SIZE_SMALL, '#555', 'center');
    return;
  }

  const def = ORGANELLE_DEFINITIONS.find(d => d.id === hoveredOrganelleId);
  if (!def) return;

  const currentLevel = state.organelles.get(def.id as OrganelleId) ?? 0;
  const isMaxed = currentLevel >= 3;
  const nextLevelIdx = currentLevel;
  const ptCost = !isMaxed ? def.upgradePointCost[nextLevelIdx] : 0;
  const nucleusLevel = state.organelles.get('nucleus') ?? 0;
  const requiresNucleus = def.requiresNucleusLevel !== undefined && nucleusLevel < def.requiresNucleusLevel;
  const canAfford = !isMaxed && state.upgradePoints >= ptCost && !requiresNucleus;

  let y = panelY + 24;

  // Name
  const words = def.name.split(' ');
  words.forEach(word => {
    pixelText(ctx, word, panelX + L.rightW / 2, y, FONT_SIZE_MEDIUM, COLORS.textPrimary, 'center');
    y += 22;
  });
  y += 6;

  // Divider
  ctx.strokeStyle = COLORS.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 12, y);
  ctx.lineTo(panelX + L.rightW - 12, y);
  ctx.stroke();
  y += 14;

  // Description (word-wrap)
  const desc = def.description;
  const charsPerLine = Math.max(12, Math.floor(L.rightW / 9));
  const lines: string[] = [];
  let remaining = desc;
  while (remaining.length > 0) {
    if (remaining.length <= charsPerLine) {
      lines.push(remaining);
      break;
    }
    let cut = charsPerLine;
    while (cut > 0 && remaining[cut] !== ' ') cut--;
    if (cut === 0) cut = charsPerLine;
    lines.push(remaining.substring(0, cut).trim());
    remaining = remaining.substring(cut).trim();
  }
  lines.forEach(line => {
    pixelText(ctx, line, panelX + 12, y, FONT_SIZE_SMALL, COLORS.textSecondary, 'left');
    y += 18;
  });
  y += 8;

  // Current effect
  if (currentLevel > 0) {
    const effVal = def.effectPerLevel[currentLevel - 1];
    const effStr = def.effectUnit.includes('bonus') || def.effectUnit.includes('reduction') || def.effectUnit.includes('discount')
      ? `${Math.round(effVal * 100)}%`
      : `${effVal}`;
    pixelText(ctx, 'CURRENT:', panelX + 12, y, FONT_SIZE_SMALL, '#888', 'left');
    y += 18;
    pixelText(ctx, `${effStr} ${def.effectUnit}`, panelX + 12, y, FONT_SIZE_SMALL, '#4bc774', 'left');
    y += 22;
  }

  // Next level effect
  if (!isMaxed) {
    const nextEffVal = def.effectPerLevel[nextLevelIdx];
    const nextEffStr = def.effectUnit.includes('bonus') || def.effectUnit.includes('reduction') || def.effectUnit.includes('discount')
      ? `${Math.round(nextEffVal * 100)}%`
      : `${nextEffVal}`;
    pixelText(ctx, currentLevel === 0 ? 'INSTALLS:' : 'UPGRADES:', panelX + 12, y, FONT_SIZE_SMALL, '#888', 'left');
    y += 18;
    pixelText(ctx, `${nextEffStr} ${def.effectUnit}`, panelX + 12, y, FONT_SIZE_SMALL, '#c7b84b', 'left');
    y += 22;
  } else {
    pixelText(ctx, 'MAXED OUT!', panelX + L.rightW / 2, y, FONT_SIZE_SMALL, '#4bc774', 'center');
    y += 22;
  }

  // Max ATP reduction warning
  if (!isMaxed) {
    const atpRed = def.maxAtpReductionPerLevel[nextLevelIdx];
    if (atpRed > 0) {
      y += 6;
      pixelText(ctx, 'WARNING:', panelX + 12, y, FONT_SIZE_SMALL, COLORS.negativeRed, 'left');
      y += 18;
      pixelText(ctx, `-${atpRed} max ATP`, panelX + 12, y, FONT_SIZE_SMALL, COLORS.negativeRed, 'left');
      y += 22;
    }
  }

  // Nucleus requirement
  if (requiresNucleus) {
    y += 6;
    pixelText(ctx, 'LOCKED:', panelX + 12, y, FONT_SIZE_SMALL, '#555', 'left');
    y += 18;
    pixelText(ctx, `Needs Nucleus Lv${def.requiresNucleusLevel}`, panelX + 12, y, FONT_SIZE_SMALL, '#555', 'left');
    y += 22;
  }

  // Install/Upgrade button
  if (!isMaxed) {
    const btnY = panelY + panelH - 60;
    const btnColor = canAfford ? '#4bc774' : '#333';
    const btnBorder = canAfford ? '#4bc774' : '#555';
    const btnLabel = currentLevel === 0 ? 'INSTALL' : 'UPGRADE';
    const costLabel = `${ptCost}pt`;

    drawRoundRect(ctx, panelX + 12, btnY, L.rightW - 24, 44, 6, btnColor + (canAfford ? '33' : '22'), btnBorder, 2);
    pixelText(ctx, btnLabel, panelX + L.rightW / 2, btnY + 16, FONT_SIZE_MEDIUM, canAfford ? '#4bc774' : '#555', 'center');
    pixelText(ctx, costLabel, panelX + L.rightW / 2, btnY + 34, FONT_SIZE_SMALL, canAfford ? COLORS.upgradeGold : '#444', 'center');
  }
}

// === Title Bar ===
function renderTitleBar(ctx: CanvasRenderingContext2D): void {
  const W = CANVAS_WIDTH;
  pixelText(ctx, 'ORGANELLE UPGRADE', W / 2, 28, FONT_SIZE_LARGE, COLORS.upgradeGold, 'center');
  pixelText(ctx, '[SPACE] to close', W / 2, 54, FONT_SIZE_SMALL, '#666', 'center');
}

// === Public API ===

export function renderUpgradeScreen(ctx: CanvasRenderingContext2D, state: GameState): void {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;

  // Semi-transparent overlay
  ctx.fillStyle = OVERLAY_BG;
  ctx.fillRect(0, 0, W, H);

  renderTitleBar(ctx);
  renderLeftPanel(ctx, state);
  renderOrganelleGrid(ctx, state);
  renderDetailPanel(ctx, state);
}

export function handleUpgradeInput(
  state: GameState,
  mouseX: number,
  mouseY: number,
  clicked: boolean,
): OrganelleId | null {
  hoveredOrganelleId = null;

  for (let idx = 0; idx < ORGANELLE_DEFINITIONS.length; idx++) {
    const def = ORGANELLE_DEFINITIONS[idx];
    const col = idx % TILE_COLS;
    const row = Math.floor(idx / TILE_COLS);
    const rect = getTileRect(col, row);

    if (
      mouseX >= rect.x && mouseX <= rect.x + rect.w &&
      mouseY >= rect.y && mouseY <= rect.y + rect.h
    ) {
      hoveredOrganelleId = def.id;

      if (clicked) {
        const currentLevel = state.organelles.get(def.id) ?? 0;
        const isMaxed = currentLevel >= 3;
        const nextLevelIdx = currentLevel;
        const ptCost = !isMaxed ? def.upgradePointCost[nextLevelIdx] : 0;
        const nucleusLevel = state.organelles.get('nucleus') ?? 0;
        const requiresNucleus = def.requiresNucleusLevel !== undefined && nucleusLevel < def.requiresNucleusLevel;
        const canAfford = !isMaxed && state.upgradePoints >= ptCost && !requiresNucleus;

        if (canAfford) {
          return def.id as OrganelleId;
        }
      }
      break;
    }
  }

  return null;
}

export function getHoveredOrganelle(mouseX: number, mouseY: number): OrganelleId | null {
  for (let idx = 0; idx < ORGANELLE_DEFINITIONS.length; idx++) {
    const def = ORGANELLE_DEFINITIONS[idx];
    const col = idx % TILE_COLS;
    const row = Math.floor(idx / TILE_COLS);
    const rect = getTileRect(col, row);

    if (
      mouseX >= rect.x && mouseX <= rect.x + rect.w &&
      mouseY >= rect.y && mouseY <= rect.y + rect.h
    ) {
      return def.id as OrganelleId;
    }
  }

  return null;
}
