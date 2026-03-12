// CytoSurvivor - Evolution Lab UI (Balatro-style full-screen)
import { GameState } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PIXEL_FONT,
  FONT_SIZE_SMALL,
  FONT_SIZE_MEDIUM,
  FONT_SIZE_LARGE,
  FONT_SIZE_TITLE,
  COLORS,
} from '../constants';
import { MUTATIONS } from '../data/mutations';
import { GENE_TREE } from '../data/geneTree';
import { purchaseGeneNode, equipMutation, unequipMutation } from '../meta/MetaProgression';
import { saveProgress } from '../meta/SaveSystem';

// ─── Layout Constants ────────────────────────────────────────────────────────

const HEADER_HEIGHT = 70;
const FOOTER_HEIGHT = 70;
const CONTENT_Y = HEADER_HEIGHT;

function getContentH() { return CANVAS_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT; }
function getLeftPanelW() { return CANVAS_WIDTH * 0.52 - 30; }
function getRightPanelX() { return CANVAS_WIDTH * 0.52 + 10; }
function getRightPanelW() { return CANVAS_WIDTH - getRightPanelX() - 20; }

const LEFT_PANEL_X = 20;

const PANEL_PAD = 14;
const NODE_RADIUS = 14;
const BRANCH_COLORS: Record<string, string> = {
  metabolic: '#c7b84b',
  structural: '#4b7bc7',
  adaptive: '#7b4bc7',
  efficiency: '#c7944b',
  survival: '#4bc774',
};

// ─── Hit-test rects (rebuilt every frame) ───────────────────────────────────

interface ClickRect {
  x: number; y: number; w: number; h: number;
  action: 'buy_node' | 'equip_mutation' | 'unequip_mutation' | 'start_run';
  id?: string;
  slot?: number;
}

let _clickRects: ClickRect[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, stroke: string, lw = 1): void {
  roundedRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? text.slice(0, maxChars - 1) + '…' : text;
}

// ─── Header ──────────────────────────────────────────────────────────────────

function drawHeader(ctx: CanvasRenderingContext2D, time: number): void {
  // Dark gradient background
  const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);
  grad.addColorStop(0, '#0d2626');
  grad.addColorStop(0.5, '#163232');
  grad.addColorStop(1, '#0d2626');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, HEADER_HEIGHT);

  // Border bottom
  ctx.fillStyle = '#2a5050';
  ctx.fillRect(0, HEADER_HEIGHT - 2, CANVAS_WIDTH, 2);

  // Pulsing title
  const pulse = 0.85 + 0.15 * Math.sin(time * 1.8);
  ctx.font = `${FONT_SIZE_LARGE}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(196,184,75,${pulse})`;
  ctx.fillText('EVOLUTION LAB', CANVAS_WIDTH / 2, HEADER_HEIGHT / 2 - 4);

  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.fillStyle = '#4a8080';
  ctx.fillText('GENE TREE & MUTATIONS', CANVAS_WIDTH / 2, HEADER_HEIGHT / 2 + 14);
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function drawFooter(ctx: CanvasRenderingContext2D, state: GameState, time: number): ClickRect[] {
  const rects: ClickRect[] = [];
  const fy = CANVAS_HEIGHT - FOOTER_HEIGHT;

  ctx.fillStyle = '#0d2626';
  ctx.fillRect(0, fy, CANVAS_WIDTH, FOOTER_HEIGHT);
  ctx.fillStyle = '#2a5050';
  ctx.fillRect(0, fy, CANVAS_WIDTH, 2);

  // DNA display
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(`DNA: ${state.meta.dnaPoints}`, LEFT_PANEL_X + PANEL_PAD, fy + FOOTER_HEIGHT / 2 - 6);
  ctx.fillStyle = '#4a8080';
  ctx.fillText(`Total: ${state.meta.totalDnaEarned}  Runs: ${state.meta.totalRuns}`, LEFT_PANEL_X + PANEL_PAD, fy + FOOTER_HEIGHT / 2 + 10);

  // START RUN button
  const btnW = 160;
  const btnH = 38;
  const btnX = CANVAS_WIDTH - btnW - 20;
  const btnY = fy + (FOOTER_HEIGHT - btnH) / 2;
  const pulse = 0.8 + 0.2 * Math.sin(time * 2.5);

  fillRoundedRect(ctx, btnX, btnY, btnW, btnH, 6, `rgba(30,80,40,${0.6 + 0.3 * pulse})`);
  strokeRoundedRect(ctx, btnX, btnY, btnW, btnH, 6, `rgba(75,199,116,${pulse})`, 2);
  ctx.font = `${FONT_SIZE_MEDIUM}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = `rgba(75,199,116,${pulse})`;
  ctx.fillText('START RUN', btnX + btnW / 2, btnY + btnH / 2);

  rects.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'start_run' });
  return rects;
}

// ─── Gene Tree Panel (Left) ───────────────────────────────────────────────────

function drawGeneTree(ctx: CanvasRenderingContext2D, state: GameState): ClickRect[] {
  const rects: ClickRect[] = [];
  const px = LEFT_PANEL_X;
  const py = CONTENT_Y + 8;
  const pw = getLeftPanelW();
  const ph = getContentH() - 16;

  // Panel background
  fillRoundedRect(ctx, px, py, pw, ph, 8, '#0f1e2e');
  strokeRoundedRect(ctx, px, py, pw, ph, 8, '#1e3a4a', 1);

  // Panel title
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4a8080';
  ctx.fillText('GENE TREE', px + PANEL_PAD, py + 14);

  const purchases = state.meta.geneTreePurchases;
  const branches = ['metabolic', 'structural', 'adaptive', 'efficiency', 'survival'] as const;
  const branchCount = branches.length;
  const branchSpacing = (pw - PANEL_PAD * 2) / branchCount;

  // Layout: 5 columns (one per branch), 3 rows (one per tier)
  const gridX = px + PANEL_PAD;
  const gridY = py + 34;
  const rowH = (ph - 44) / 3;
  const colW = branchSpacing;

  for (let bi = 0; bi < branchCount; bi++) {
    const branch = branches[bi];
    const color = BRANCH_COLORS[branch];
    const nodes = GENE_TREE.filter(n => n.branch === branch);
    const cx = gridX + bi * colW + colW / 2;

    // Branch label
    ctx.save();
    ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    const label = branch.toUpperCase().slice(0, 4);
    ctx.fillText(label, cx, gridY + 10);
    ctx.restore();

    for (let ni = 0; ni < nodes.length; ni++) {
      const node = nodes[ni];
      const ny = gridY + 28 + ni * rowH + rowH / 2 - NODE_RADIUS;
      const ncx = cx;
      const ncy = ny + NODE_RADIUS;

      const purchased = purchases.includes(node.id);
      const prereqsMet = node.prerequisites.every(p => purchases.includes(p));
      const canAfford = state.meta.dnaPoints >= node.cost;
      const available = prereqsMet && !purchased;

      // Connector line to previous node
      if (ni > 0) {
        const prevNy = gridY + 28 + (ni - 1) * rowH + rowH / 2 - NODE_RADIUS + NODE_RADIUS;
        ctx.beginPath();
        ctx.moveTo(ncx, prevNy);
        ctx.lineTo(ncx, ncy - NODE_RADIUS);
        ctx.strokeStyle = purchased ? color : '#2a4a4a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(ncx, ncy, NODE_RADIUS, 0, Math.PI * 2);
      if (purchased) {
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff44';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (available) {
        ctx.fillStyle = canAfford ? '#1a2a3a' : '#111820';
        ctx.fill();
        ctx.strokeStyle = canAfford ? color : '#334444';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Locked
        ctx.fillStyle = '#0d1a1a';
        ctx.fill();
        ctx.strokeStyle = '#1a2a2a';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Node tier number or check
      ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (purchased) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText('✓', ncx, ncy);
      } else if (available) {
        ctx.fillStyle = canAfford ? color : '#334444';
        ctx.fillText(`${node.cost}`, ncx, ncy);
      } else {
        ctx.fillStyle = '#2a3a3a';
        ctx.fillText('?', ncx, ncy);
      }

      // Node name (truncated below)
      if (available || purchased) {
        ctx.font = `5px ${PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = purchased ? '#aaaaaa' : (canAfford ? '#c0c0c0' : '#556666');
        const nameShort = truncate(node.name, 10);
        ctx.fillText(nameShort, ncx, ncy + NODE_RADIUS + 2);
      }

      // Click rect (only if available and can afford)
      if (available && canAfford) {
        const rectX = ncx - NODE_RADIUS;
        const rectY = ncy - NODE_RADIUS;
        rects.push({ x: rectX, y: rectY, w: NODE_RADIUS * 2, h: NODE_RADIUS * 2, action: 'buy_node', id: node.id });
      }
    }
  }

  return rects;
}

// ─── Mutation Panel (Right) ───────────────────────────────────────────────────

function drawMutationPanel(ctx: CanvasRenderingContext2D, state: GameState): ClickRect[] {
  const rects: ClickRect[] = [];
  const px = getRightPanelX();
  const py = CONTENT_Y + 8;
  const pw = getRightPanelW();
  const ph = getContentH() - 16;

  fillRoundedRect(ctx, px, py, pw, ph, 8, '#0f1e2e');
  strokeRoundedRect(ctx, px, py, pw, ph, 8, '#1e3a4a', 1);

  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4a8080';
  ctx.fillText('MUTATIONS', px + PANEL_PAD, py + 14);

  const equipped = state.meta.equippedMutations;
  const unlocked = state.meta.unlockedMutations;

  // --- Equip slots (top 3) ---
  const slotW = (pw - PANEL_PAD * 2 - 8) / 3;
  const slotH = 52;
  const slotsY = py + 28;

  for (let si = 0; si < 3; si++) {
    const sx = px + PANEL_PAD + si * (slotW + 4);
    const sy = slotsY;
    const mutId = equipped[si] ?? null;

    fillRoundedRect(ctx, sx, sy, slotW, slotH, 5, '#0d1a2a');
    strokeRoundedRect(ctx, sx, sy, slotW, slotH, 5, mutId ? '#7b4bc7' : '#2a3a4a', mutId ? 2 : 1);

    ctx.font = `5px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (mutId) {
      const mut = MUTATIONS.find(m => m.id === mutId);
      ctx.fillStyle = '#c0a0ff';
      ctx.fillText(truncate(mut?.name ?? mutId, 12), sx + slotW / 2, sy + slotH / 2 - 7);
      ctx.fillStyle = mut?.isDoubleEdged ? '#f0c040' : '#aaaaaa';
      ctx.fillText(mut?.isDoubleEdged ? '[±]' : '[+]', sx + slotW / 2, sy + slotH / 2 + 7);
      rects.push({ x: sx, y: sy, w: slotW, h: slotH, action: 'unequip_mutation', id: mutId, slot: si });
    } else {
      ctx.fillStyle = '#2a4a4a';
      ctx.fillText(`SLOT ${si + 1}`, sx + slotW / 2, sy + slotH / 2 - 5);
      ctx.fillStyle = '#1a3a3a';
      ctx.fillText('EMPTY', sx + slotW / 2, sy + slotH / 2 + 7);
    }
  }

  // --- Slot label ---
  ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4a6060';
  ctx.fillText('EQUIPPED  (click to unequip)', px + PANEL_PAD, slotsY + slotH + 12);

  // --- Unlocked mutations list ---
  const listY = slotsY + slotH + 26;
  const listH = ph - (listY - py) - PANEL_PAD;
  const itemH = 40;
  const maxVisible = Math.floor(listH / itemH);

  if (unlocked.length === 0) {
    ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2a4a4a';
    ctx.fillText('No mutations discovered yet', px + pw / 2, listY + 24);
  } else {
    for (let mi = 0; mi < Math.min(unlocked.length, maxVisible); mi++) {
      const mutId = unlocked[mi];
      const mut = MUTATIONS.find(m => m.id === mutId);
      if (!mut) continue;

      const my = listY + mi * itemH;
      const isEquipped = equipped.includes(mutId);
      const canEquip = !isEquipped && equipped.length < 3;

      fillRoundedRect(ctx, px + PANEL_PAD, my, pw - PANEL_PAD * 2, itemH - 4, 4, isEquipped ? '#1a1040' : '#0d1a2a');
      strokeRoundedRect(ctx, px + PANEL_PAD, my, pw - PANEL_PAD * 2, itemH - 4, 4,
        isEquipped ? '#7b4bc7' : (canEquip ? '#2a4a5a' : '#1a2a2a'), isEquipped ? 2 : 1);

      ctx.font = `${FONT_SIZE_SMALL}px ${PIXEL_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isEquipped ? '#c0a0ff' : (canEquip ? '#8888cc' : '#556666');
      ctx.fillText(mut.name, px + PANEL_PAD + 8, my + 6);

      ctx.font = `5px ${PIXEL_FONT}`;
      ctx.fillStyle = mut.isDoubleEdged ? '#c7944b' : '#4a8080';
      ctx.fillText(truncate(mut.description, 38), px + PANEL_PAD + 8, my + 20);

      // Equip label
      if (!isEquipped && canEquip) {
        ctx.font = `5px ${PIXEL_FONT}`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4bc774';
        ctx.fillText('EQUIP', px + pw - PANEL_PAD - 4, my + 6);
        rects.push({ x: px + PANEL_PAD, y: my, w: pw - PANEL_PAD * 2, h: itemH - 4, action: 'equip_mutation', id: mutId });
      } else if (isEquipped) {
        ctx.font = `5px ${PIXEL_FONT}`;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#7b4bc7';
        ctx.fillText('ON', px + pw - PANEL_PAD - 4, my + 6);
      }
    }
  }

  return rects;
}

// ─── Background ───────────────────────────────────────────────────────────────

function drawBackground(ctx: CanvasRenderingContext2D, time: number): void {
  const grad = ctx.createRadialGradient(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_HEIGHT * 0.9);
  grad.addColorStop(0, '#0f2020');
  grad.addColorStop(1, '#060d0d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Subtle animated particles
  ctx.save();
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + time * 0.05;
    const r = 200 + Math.sin(time * 0.3 + i) * 80;
    const px = CANVAS_WIDTH / 2 + Math.cos(angle) * r * 1.4;
    const py = CANVAS_HEIGHT / 2 + Math.sin(angle) * r;
    const alpha = 0.03 + 0.02 * Math.sin(time + i);
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(75,199,116,${alpha})`;
    ctx.fill();
  }
  ctx.restore();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function renderEvolutionLab(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  _clickRects = [];

  drawBackground(ctx, time);
  drawHeader(ctx, time);

  const geneRects = drawGeneTree(ctx, state);
  const mutRects = drawMutationPanel(ctx, state);
  const footerRects = drawFooter(ctx, state, time);

  _clickRects = [...geneRects, ...mutRects, ...footerRects];
}

export function handleEvolutionLabClick(state: GameState, mouseX: number, mouseY: number): 'start' | null {
  for (const rect of _clickRects) {
    if (mouseX >= rect.x && mouseX <= rect.x + rect.w && mouseY >= rect.y && mouseY <= rect.y + rect.h) {
      if (rect.action === 'start_run') {
        return 'start';
      }
      if (rect.action === 'buy_node' && rect.id) {
        if (purchaseGeneNode(state.meta, rect.id)) {
          saveProgress(state.meta);
        }
      }
      if (rect.action === 'equip_mutation' && rect.id) {
        equipMutation(state.meta, rect.id);
        saveProgress(state.meta);
      }
      if (rect.action === 'unequip_mutation' && rect.id) {
        unequipMutation(state.meta, rect.id);
        saveProgress(state.meta);
      }
      break;
    }
  }
  return null;
}
