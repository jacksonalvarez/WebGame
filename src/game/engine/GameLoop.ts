// CytoSurvivor - Core Game Loop (Integrated)
import { GameState, GamePhase, OrganelleId } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, setCanvasSize } from '../constants';
import { createGameState, resetForNewRun } from '../GameState';

// Engine
import { initInput, updateInput, updateMouseWorld } from './Input';
import { updateCamera } from './Camera';

// Systems
import { updateATP } from '../systems/ATPSystem';
import { updateFood, renderFood } from '../systems/FoodSystem';
import { updateEnemies, renderEnemies } from '../systems/EnemySystem';
import { updateCollisions } from '../systems/CollisionSystem';
import { updateParticles, renderParticles, initParticles } from '../systems/ParticleSystem';
import { updateZones, renderZones, renderMembraneWalls } from '../systems/ZoneSystem';
import { generateMap } from '../systems/MapGenerator';
import { installOrganelle } from '../systems/UpgradeSystem';

// Entities
import { updatePlayer, renderPlayer } from '../entities/Player';

// UI
import { renderHUD, setUpgradeScreenVisited } from '../ui/HUD';
import { renderMinimap } from '../ui/Minimap';
import { renderUpgradeScreen, handleUpgradeInput } from '../ui/UpgradeScreen';
import { renderMainMenu, handleMainMenuClick } from '../ui/MainMenu';
import { renderDeathScreen, handleDeathScreenClick } from '../ui/DeathScreen';
import { renderEvolutionLab, handleEvolutionLabClick } from '../ui/EvolutionLab';

// Meta
import { processRunEnd, applyGeneTreeEffects, applyMutationEffects } from '../meta/MetaProgression';
import { saveProgress, loadProgress } from '../meta/SaveSystem';

const MAX_DELTA_MS = 100;
const FOG_RADIUS = 220; // how far the player can see (pixels)

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private rafId: number | null = null;
  private lastTimestamp: number | null = null;
  private running = false;
  private inputCleanup: (() => void) | null = null;
  private mouseClicked = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Fullscreen canvas
    this.resizeCanvas();
    window.addEventListener('resize', this.onResize);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context');
    this.ctx = ctx;

    // Initialize game state
    this.state = createGameState();

    // Load saved meta progression
    const savedMeta = loadProgress();
    if (savedMeta) {
      this.state.meta = savedMeta;
    }

    // Initialize input system
    canvas.tabIndex = 1;
    canvas.style.outline = 'none';
    const { state: inputState, cleanup } = initInput(canvas);
    this.state.input = inputState;
    this.inputCleanup = cleanup;

    // Initialize particle pool
    this.state.particles = initParticles();

    // Mouse click detection
    canvas.addEventListener('click', this.onCanvasClick);
  }

  private resizeCanvas = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    setCanvasSize(w, h);
  };

  private onResize = (): void => {
    this.resizeCanvas();
  };

  private onCanvasClick = (): void => {
    this.mouseClicked = true;
  };

  getState(): GameState {
    return this.state;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = null;
    this.canvas.focus();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.lastTimestamp = null;
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    if (this.inputCleanup) {
      this.inputCleanup();
      this.inputCleanup = null;
    }
    this.canvas.removeEventListener('click', this.onCanvasClick);
  }

  private startNewRun(): void {
    resetForNewRun(this.state);

    // Generate map from seed
    const mapData = generateMap(this.state.map.seed);
    this.state.food = mapData.food;
    this.state.enemies = mapData.enemies;
    this.state.toxicPockets = mapData.toxicPockets;
    this.state.map.seed = mapData.seed;

    // Re-init particles
    this.state.particles = initParticles();

    // Apply meta-progression effects
    applyGeneTreeEffects(this.state);
    applyMutationEffects(this.state);

    this.state.phase = 'playing';
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const rawDelta = this.lastTimestamp === null ? 0 : timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    const deltaMs = Math.min(rawDelta, MAX_DELTA_MS);
    const dt = deltaMs / 1000;

    this.state.deltaTime = dt;
    this.state.totalTime += dt;

    this.update(dt);
    this.render();

    // Reset click state after frame
    this.mouseClicked = false;

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const state = this.state;
    const phase = state.phase;

    // Always update input
    updateInput(state.input);
    updateMouseWorld(state.input, state.camera.x, state.camera.y, this.canvas.width, this.canvas.height);

    switch (phase) {
      case 'menu':
        this.handleMenuInput();
        break;

      case 'playing':
        this.handlePlayingInput();
        // Update all game systems
        updateATP(state);
        if (state.phase === 'dead') {
          // Death was triggered by ATP system
          processRunEnd(state);
          saveProgress(state.meta);
          break;
        }
        updatePlayer(state);
        updateFood(state);
        updateEnemies(state);
        updateCollisions(state);
        updateParticles(state.particles, dt);
        updateCamera(state.camera, state.player.pos.x, state.player.pos.y, dt);
        updateZones(state);
        // Track survival time
        state.runStats.timeSurvived += dt;
        break;

      case 'upgrading':
        this.handleUpgradeInput();
        break;

      case 'dead':
        this.handleDeathInput();
        break;

      case 'evolution-lab':
        this.handleEvolutionLabInput();
        break;
    }
  }

  private handleMenuInput(): void {
    if (this.mouseClicked) {
      const clicked = handleMainMenuClick(this.state, this.state.input.mouseX, this.state.input.mouseY);
      if (clicked) {
        this.startNewRun();
      }
    }
  }

  private handlePlayingInput(): void {
    if (this.state.input.spaceJustPressed) {
      this.state.phase = 'upgrading';
      this.state.isPaused = true;
      setUpgradeScreenVisited();
    }
  }

  private handleUpgradeInput(): void {
    // Space to close upgrade screen
    if (this.state.input.spaceJustPressed) {
      this.state.phase = 'playing';
      this.state.isPaused = false;
      return;
    }

    // Click to install/upgrade organelle
    if (this.mouseClicked) {
      const organelleId = handleUpgradeInput(
        this.state,
        this.state.input.mouseX,
        this.state.input.mouseY,
        true
      );
      if (organelleId) {
        installOrganelle(this.state, organelleId as OrganelleId);
      }
    }
  }

  private handleDeathInput(): void {
    if (this.mouseClicked) {
      const result = handleDeathScreenClick(
        this.state,
        this.state.input.mouseX,
        this.state.input.mouseY
      );
      if (result === 'evolution-lab') {
        this.state.phase = 'evolution-lab';
      } else if (result === 'restart') {
        this.startNewRun();
      }
    }
  }

  private handleEvolutionLabInput(): void {
    if (this.mouseClicked) {
      const result = handleEvolutionLabClick(
        this.state,
        this.state.input.mouseX,
        this.state.input.mouseY
      );
      if (result === 'start') {
        this.startNewRun();
      }
    }
  }

  private renderFogOfWar(): void {
    const { ctx, canvas, state } = this;
    const W = canvas.width;
    const H = canvas.height;
    const playerScreenX = state.player.pos.x - state.camera.x + W / 2;
    const playerScreenY = state.player.pos.y - state.camera.y + H / 2;

    const gradient = ctx.createRadialGradient(
      playerScreenX, playerScreenY, FOG_RADIUS * 0.3,
      playerScreenX, playerScreenY, FOG_RADIUS
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.4)');
    gradient.addColorStop(0.8, 'rgba(0,0,0,0.85)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.97)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  private renderGameWorld(): void {
    const { ctx, state } = this;
    renderZones(ctx, state, state.camera);
    renderMembraneWalls(ctx, state, state.camera);
    renderFood(ctx, state, state.camera);
    renderEnemies(ctx, state, state.camera);
    renderPlayer(ctx, state, state.camera);
    renderParticles(ctx, state.particles, state.camera);
    // Fog of war — darkness beyond player's vision
    this.renderFogOfWar();
  }

  private render(): void {
    const { ctx, canvas, state } = this;
    const phase: GamePhase = state.phase;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (phase) {
      case 'menu':
        renderMainMenu(ctx, state, state.totalTime);
        break;

      case 'playing':
        this.renderGameWorld();
        renderHUD(ctx, state);
        renderMinimap(ctx, state);
        break;

      case 'upgrading':
        this.renderGameWorld();
        renderHUD(ctx, state);
        renderMinimap(ctx, state);
        renderUpgradeScreen(ctx, state);
        break;

      case 'dead':
        renderDeathScreen(ctx, state, state.totalTime);
        break;

      case 'evolution-lab':
        renderEvolutionLab(ctx, state, state.totalTime);
        break;

      default: {
        const _exhaustive: never = phase;
        void _exhaustive;
        break;
      }
    }
  }
}
