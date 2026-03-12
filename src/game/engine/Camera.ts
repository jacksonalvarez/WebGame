import { CameraState } from '../types';
import { CAMERA_SMOOTHING } from '../constants';

export function initCamera(centerX: number, centerY: number): CameraState {
  return {
    x: centerX,
    y: centerY,
    targetX: centerX,
    targetY: centerY,
    smoothing: CAMERA_SMOOTHING,
  };
}

export function updateCamera(
  camera: CameraState,
  targetX: number,
  targetY: number,
  dt: number
): void {
  camera.targetX = targetX;
  camera.targetY = targetY;
  camera.x += (targetX - camera.x) * camera.smoothing * dt * 60;
  camera.y += (targetY - camera.y) * camera.smoothing * dt * 60;
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: worldX - camera.x + canvasWidth / 2,
    y: worldY - camera.y + canvasHeight / 2,
  };
}

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  return {
    x: screenX + camera.x - canvasWidth / 2,
    y: screenY + camera.y - canvasHeight / 2,
  };
}

export function isVisible(
  worldX: number,
  worldY: number,
  radius: number,
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const halfW = canvasWidth / 2;
  const halfH = canvasHeight / 2;
  const dx = worldX - camera.x;
  const dy = worldY - camera.y;
  return (
    dx + radius >= -halfW &&
    dx - radius <= halfW &&
    dy + radius >= -halfH &&
    dy - radius <= halfH
  );
}

export function getViewport(
  camera: CameraState,
  canvasWidth: number,
  canvasHeight: number
): { left: number; top: number; right: number; bottom: number } {
  const halfW = canvasWidth / 2;
  const halfH = canvasHeight / 2;
  return {
    left: camera.x - halfW,
    top: camera.y - halfH,
    right: camera.x + halfW,
    bottom: camera.y + halfH,
  };
}
