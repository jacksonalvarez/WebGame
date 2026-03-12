"use client";

import { useEffect, useRef } from "react";
import { GameLoop } from "@/game/engine/GameLoop";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameLoop | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = new GameLoop(canvas);
    gameRef.current = game;
    game.start();

    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100vw",
        height: "100vh",
        cursor: "crosshair",
        imageRendering: "pixelated",
      }}
    />
  );
}
