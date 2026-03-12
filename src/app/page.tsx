"use client";

import { useState } from "react";

export default function Home() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      {!gameStarted ? (
        <div className="flex flex-col items-center gap-8">
          <h1 className="text-6xl font-bold tracking-tight">WebGame</h1>
          <p className="text-xl text-zinc-400">Ready to play?</p>
          <button
            onClick={() => setGameStarted(true)}
            className="rounded-lg bg-white px-8 py-3 text-lg font-semibold text-black transition-transform hover:scale-105 active:scale-95"
          >
            Start Game
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <canvas
            id="gameCanvas"
            width={800}
            height={600}
            className="rounded-lg border border-zinc-800 bg-zinc-950"
          />
          <button
            onClick={() => setGameStarted(false)}
            className="text-sm text-zinc-500 hover:text-white transition-colors"
          >
            Back to Menu
          </button>
        </div>
      )}
    </div>
  );
}
