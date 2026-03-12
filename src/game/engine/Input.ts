import type { InputState } from '../types';

// Internal edge-detection state
let _spaceDown = false;
let _pendingSpaceJustPressed = false;

export function initInput(canvas: HTMLCanvasElement): { state: InputState; cleanup: () => void } {
  const state: InputState = {
    mouseX: 0,
    mouseY: 0,
    mouseWorldX: 0,
    mouseWorldY: 0,
    spacePressed: false,
    spaceJustPressed: false,
  };

  function onMouseMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!_spaceDown) {
        _spaceDown = true;
        _pendingSpaceJustPressed = true;
      }
      state.spacePressed = true;
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      _spaceDown = false;
      state.spacePressed = false;
    }
  }

  canvas.addEventListener('mousemove', onMouseMove);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  function cleanup(): void {
    canvas.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  }

  return { state, cleanup };
}

export function updateInput(input: InputState): void {
  input.spaceJustPressed = _pendingSpaceJustPressed;
  _pendingSpaceJustPressed = false;
}

export function updateMouseWorld(
  input: InputState,
  cameraX: number,
  cameraY: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  input.mouseWorldX = input.mouseX - canvasWidth / 2 + cameraX;
  input.mouseWorldY = input.mouseY - canvasHeight / 2 + cameraY;
}
