"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Screen = "start" | "playing" | "credits";
type TransitionProfile = "hard-cut" | "classic-wipe" | "cinematic-wipe";
type PointCollectPayload = {
  amount: number;
  source?: string;
};

type PointBurst = {
  id: number;
  amount: number;
  source: string;
  lane: number;
};

declare global {
  interface Window {
    webGameUiHooks?: {
      collectPoints: (payload: PointCollectPayload) => void;
    };
  }
}

const AUDIO_ASSETS = {
  music: {
    menu: "/music/start-loop.wav",
    middle: "/music/mid-loop.wav",
  },
  sfx: {
    menuMove: "/sfx/menu-move.wav",
    pointCollect: "/sfx/point-collect.wav",
    death: "/sfx/death-hit.wav",
    upgrade: "/sfx/upgrade.wav",
  },
} as const;

const PLAYER_MUTATIONS = ["Spore Burst", "Membrane Dash", "Iron Cilia", "Catalyst Core"] as const;
const PLAYER_STANCES = ["Aggressive", "Adaptive", "Defensive"] as const;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("start");
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [health, setHealth] = useState(100);
  const [biomass, setBiomass] = useState(0);
  const [tier, setTier] = useState(1);
  const [points, setPoints] = useState(0);
  const [pointBursts, setPointBursts] = useState<PointBurst[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(78);
  const [sfxVolume, setSfxVolume] = useState(85);
  const [transitionProfile, setTransitionProfile] =
    useState<TransitionProfile>("classic-wipe");
  const [visualIntensity, setVisualIntensity] = useState(70);
  const [playerStance, setPlayerStance] = useState<(typeof PLAYER_STANCES)[number]>("Adaptive");
  const [playerMutations, setPlayerMutations] =
    useState<string[]>(["Membrane Dash", "Catalyst Core"]);
  const [musicToast, setMusicToast] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [autoAudioBlocked, setAutoAudioBlocked] = useState(false);

  const menuMusicRef = useRef<HTMLAudioElement | null>(null);
  const middleMusicRef = useRef<HTMLAudioElement | null>(null);
  const deathSfxRef = useRef<HTMLAudioElement | null>(null);
  const pointCollectPoolRef = useRef<HTMLAudioElement[]>([]);
  const pointCollectIndexRef = useRef(0);
  const sfxQueueRef = useRef(Promise.resolve());
  const deathSfxPlayedRef = useRef(false);
  const lastTierRef = useRef(1);
  const transitionSwitchTimerRef = useRef<number | null>(null);
  const transitionEndTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const activeMusicTrackRef = useRef<HTMLAudioElement | null>(null);
  const dead = screen === "playing" && health <= 0;
  const activeSceneForAudio = pendingScreen ?? screen;
  const transitionDurationMs =
    transitionProfile === "hard-cut" ? 300 : transitionProfile === "cinematic-wipe" ? 980 : 760;
  const progressToNextTier = Math.min((biomass / (tier * 220)) * 100, 100);

  const queueSfx = useCallback((src: string, volume = 0.55) => {
    const playQueued = () =>
      new Promise<void>((resolve) => {
        const shot = new Audio(src);
        shot.volume = Math.min(1, volume * (sfxVolume / 100));

        const finish = () => {
          shot.onended = null;
          shot.onerror = null;
          resolve();
        };

        shot.onended = finish;
        shot.onerror = finish;

        void shot.play().catch(() => {
          resolve();
        });
      });

    sfxQueueRef.current = sfxQueueRef.current.then(playQueued);
  }, [sfxVolume]);

  const playMenuMove = () => queueSfx(AUDIO_ASSETS.sfx.menuMove, 0.45);
  const playMenuConfirm = () => queueSfx(AUDIO_ASSETS.sfx.menuMove, 0.58);
  const playPointCollect = useCallback(() => {
    const pool = pointCollectPoolRef.current;
    if (!pool.length) {
      queueSfx(AUDIO_ASSETS.sfx.pointCollect, 0.62);
      return;
    }

    const index = pointCollectIndexRef.current % pool.length;
    const shot = pool[index];
    pointCollectIndexRef.current += 1;

    shot.currentTime = 0;
    shot.volume = Math.min(1, 0.62 * (sfxVolume / 100));
    void shot.play().catch(() => {
      queueSfx(AUDIO_ASSETS.sfx.pointCollect, 0.62);
    });
  }, [queueSfx, sfxVolume]);
  const playUpgrade = useCallback(() => {
    queueSfx(AUDIO_ASSETS.sfx.upgrade, 0.72);
  }, [queueSfx]);

  const unlockAudio = useCallback(() => {
    if (hasInteracted) {
      return;
    }

    setHasInteracted(true);
    setAutoAudioBlocked(false);
    setMusicToast("Audio enabled");
  }, [hasInteracted]);

  const navigateTo = (target: Screen, playTransitionSfx = true) => {
    if (target === screen || isTransitioning) {
      return;
    }

    if (playTransitionSfx) {
      playMenuMove();
    }
    setPendingScreen(target);
    setIsTransitioning(true);

    if (transitionSwitchTimerRef.current) {
      window.clearTimeout(transitionSwitchTimerRef.current);
    }

    if (transitionEndTimerRef.current) {
      window.clearTimeout(transitionEndTimerRef.current);
    }

    transitionSwitchTimerRef.current = window.setTimeout(() => {
      setScreen(target);
      transitionSwitchTimerRef.current = null;
    }, transitionDurationMs / 2);

    transitionEndTimerRef.current = window.setTimeout(() => {
      setPendingScreen(null);
      setIsTransitioning(false);
      transitionEndTimerRef.current = null;
    }, transitionDurationMs);
  };

  useEffect(() => {
    return () => {
      if (transitionSwitchTimerRef.current) {
        window.clearTimeout(transitionSwitchTimerRef.current);
      }

      if (transitionEndTimerRef.current) {
        window.clearTimeout(transitionEndTimerRef.current);
      }

      if (fadeTimerRef.current) {
        window.clearInterval(fadeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const poolSize = 6;
    pointCollectPoolRef.current = Array.from({ length: poolSize }, () => {
      const sound = new Audio(AUDIO_ASSETS.sfx.pointCollect);
      sound.preload = "auto";
      sound.volume = Math.min(1, 0.62 * (sfxVolume / 100));
      return sound;
    });
    pointCollectIndexRef.current = 0;

    return () => {
      pointCollectPoolRef.current.forEach((sound) => {
        sound.pause();
        sound.src = "";
      });
      pointCollectPoolRef.current = [];
    };
  }, [sfxVolume]);

  const collectPoints = useCallback((payload: PointCollectPayload) => {
    const amount = Math.max(0, Math.trunc(payload.amount));
    if (!amount) {
      return;
    }

    const source = payload.source?.trim() || "cell sample";
    const burstId = Date.now() + Math.floor(Math.random() * 10000);

    setPoints((prev) => prev + amount);
    playPointCollect();
    setPointBursts((prev) => {
      const lane = prev.length % 3;
      const next = [...prev, { id: burstId, amount, source, lane }];
      return next.slice(-5);
    });

    window.setTimeout(() => {
      setPointBursts((prev) => prev.filter((entry) => entry.id !== burstId));
    }, 1400);
  }, [playPointCollect]);

  useEffect(() => {
    const onPointsCollected = (event: Event) => {
      const customEvent = event as CustomEvent<PointCollectPayload>;
      if (customEvent.detail) {
        collectPoints(customEvent.detail);
      }
    };

    window.webGameUiHooks = { collectPoints };
    window.addEventListener("ui:collect-points", onPointsCollected);

    return () => {
      window.removeEventListener("ui:collect-points", onPointsCollected);
      if (window.webGameUiHooks?.collectPoints === collectPoints) {
        delete window.webGameUiHooks;
      }
    };
  }, [collectPoints]);

  useEffect(() => {
    if (screen !== "playing" || dead) {
      return;
    }

    const timer = window.setInterval(() => {
      setHealth((prev) => Math.max(prev - 2, 0));
      setBiomass((prev) => {
        const updated = prev + 12;
        if (updated >= tier * 220) {
          setTier((current) => current + 1);
          setHealth((current) => Math.min(current + 35, 100));
          return 0;
        }

        return updated;
      });
    }, 900);

    return () => window.clearInterval(timer);
  }, [screen, dead, tier]);

  useEffect(() => {
    if (tier > lastTierRef.current && hasInteracted) {
      playUpgrade();
    }

    lastTierRef.current = tier;
  }, [tier, hasInteracted, playUpgrade]);

  useEffect(() => {
    const menuTrack = menuMusicRef.current;
    const middleTrack = middleMusicRef.current;

    if (!menuTrack || !middleTrack) {
      return;
    }

    menuTrack.loop = true;
    middleTrack.loop = true;

    if (!musicEnabled) {
      menuTrack.pause();
      middleTrack.pause();
      activeMusicTrackRef.current = null;
      return;
    }

    const activeTrack =
      activeSceneForAudio === "playing" && !dead ? middleTrack : menuTrack;

    const previousTrack = activeMusicTrackRef.current;
    const targetVolume = 0.48 * (musicVolume / 100);

    if (previousTrack === activeTrack) {
      activeTrack.volume = targetVolume;
      return;
    }

    if (fadeTimerRef.current) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }

    const steps = 8;
    const stepMs = 35;

    activeTrack.volume = 0;
    void activeTrack.play()
      .then(() => {
        if (!hasInteracted) {
          setHasInteracted(true);
          setAutoAudioBlocked(false);
        }

        let step = 0;
        fadeTimerRef.current = window.setInterval(() => {
          step += 1;
          const progress = Math.min(step / steps, 1);

          activeTrack.volume = targetVolume * progress;
          if (previousTrack) {
            previousTrack.volume = targetVolume * (1 - progress);
          }

          if (progress >= 1) {
            if (previousTrack) {
              previousTrack.pause();
              previousTrack.currentTime = 0;
            }

            activeMusicTrackRef.current = activeTrack;
            window.clearInterval(fadeTimerRef.current as number);
            fadeTimerRef.current = null;
          }
        }, stepMs);
      })
      .catch(() => {
        if (!hasInteracted) {
          setAutoAudioBlocked(true);
        }
        setMusicToast("Tap anywhere to allow music playback");
      });
  }, [activeSceneForAudio, dead, musicEnabled, hasInteracted, musicVolume]);

  useEffect(() => {
    if (!dead || deathSfxPlayedRef.current || !hasInteracted) {
      return;
    }

    deathSfxPlayedRef.current = true;

    if (!deathSfxRef.current) {
      return;
    }

    deathSfxRef.current.currentTime = 0;
    deathSfxRef.current.volume = 0.72;
    void deathSfxRef.current.play();
  }, [dead, hasInteracted]);

  useEffect(() => {
    if (!musicToast) {
      return;
    }

    const timer = window.setTimeout(() => setMusicToast(null), 1600);
    return () => window.clearTimeout(timer);
  }, [musicToast]);

  const screenTitle = useMemo(() => {
    if (screen === "start") {
      return "Microwake";
    }

    if (screen === "credits") {
      return "Credits";
    }

    return `Cycle ${tier}`;
  }, [screen, tier]);

  const startGame = () => {
    unlockAudio();
    playMenuConfirm();
    deathSfxPlayedRef.current = false;
    lastTierRef.current = 1;
    setHealth(100);
    setBiomass(0);
    setTier(1);
    setPoints(0);
    setPointBursts([]);
    setShowSettings(false);
    navigateTo("playing", false);
  };

  const returnToMenu = () => {
    deathSfxPlayedRef.current = false;
    lastTierRef.current = 1;
    setShowSettings(false);
    navigateTo("start");
  };

  const onToggleMusic = () => {
    playMenuMove();
    const next = !musicEnabled;
    setMusicEnabled(next);
    setMusicToast(next ? "Music enabled" : "Music disabled");
  };

  const toggleMutation = (mutation: string) => {
    setPlayerMutations((prev) => {
      if (prev.includes(mutation)) {
        return prev.filter((entry) => entry !== mutation);
      }

      if (prev.length >= 3) {
        return [...prev.slice(1), mutation];
      }

      return [...prev, mutation];
    });
  };

  const renderScreen = (view: Screen) => {
    if (view === "start") {
      return (
        <section className="panel hero-panel hero-panel-flyin scene-panel">
          <p className="eyebrow">Single-cell survival roguelite</p>
          <h2>Evolve or Dissolve</h2>
          <p className="hero-copy">
            Keep your organism alive, absorb nutrients, and mutate into stronger life forms.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={startGame}>
              Start Run
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                navigateTo("credits");
              }}
            >
              Credits
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                playMenuMove();
                setShowSettings(true);
              }}
            >
              Settings
            </button>
          </div>
        </section>
      );
    }

    if (view === "playing") {
      return (
        <section className="game-layout scene-panel">
          <aside className="panel left-hud">
            <h3>Organism Status</h3>
            <div className="stat-row">
              <span>Health</span>
              <strong>{health}%</strong>
            </div>
            <div className="meter">
              <div className="meter-fill" style={{ width: `${health}%` }} />
            </div>

            <div className="stat-row">
              <span>Tier</span>
              <strong>{tier}</strong>
            </div>

            <div className="stat-row">
              <span>Biomass</span>
              <strong>{biomass}</strong>
            </div>
            <div className="meter meter-alt">
              <div className="meter-fill" style={{ width: `${progressToNextTier}%` }} />
            </div>

            <div className="stat-row">
              <span>Points</span>
              <strong>{points}</strong>
            </div>

            <div className="hud-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  playMenuMove();
                  setShowSettings(true);
                }}
              >
                Settings
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  playMenuConfirm();
                  setHealth(0);
                }}
              >
                Simulate Death
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  collectPoints({ amount: 20, source: "debug orb" });
                }}
              >
                Test +20
              </button>
            </div>

            <div className="player-options">
              <p className="option-title">Player Options</p>
              <div className="option-chip-grid">
                {PLAYER_STANCES.map((stance) => (
                  <button
                    key={stance}
                    className={`option-chip ${playerStance === stance ? "active" : ""}`}
                    onClick={() => {
                      playMenuMove();
                      setPlayerStance(stance);
                    }}
                  >
                    {stance}
                  </button>
                ))}
              </div>

              <p className="option-title">Mutation Loadout</p>
              <div className="option-chip-grid">
                {PLAYER_MUTATIONS.map((mutation) => (
                  <button
                    key={mutation}
                    className={`option-chip ${playerMutations.includes(mutation) ? "active" : ""}`}
                    onClick={() => {
                      playPointCollect();
                      toggleMutation(mutation);
                    }}
                  >
                    {mutation}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <article className="panel arena-panel">
            <p className="arena-label">Primary Gameplay Loop UI</p>
            <div className="arena-grid">
              <div className="arena-node">Nutrient Field</div>
              <div className="arena-node">Mutation Gate</div>
              <div className="arena-node">Predator Zone</div>
              <div className="arena-node">Safe Membrane</div>
            </div>
            <p className="arena-note">
              Survive long enough to mutate. Health drains over time while biomass fuels evolution.
            </p>

            <div className="points-feed" aria-live="polite">
              {pointBursts.map((burst) => (
                <p
                  key={burst.id}
                  className="point-burst"
                  style={{ ["--burst-lane" as string]: burst.lane } as CSSProperties}
                >
                  +{burst.amount} pts <span>({burst.source})</span>
                </p>
              ))}
            </div>
          </article>

        </section>
      );
    }

    return (
      <section className="panel credits-panel scene-panel">
        <h2>Credits</h2>
        <p>Jackson Alvarez</p>
        <p>Thomas Maglietto</p>
        <button className="primary-button" onClick={returnToMenu}>
          Back to Start
        </button>
      </section>
    );
  };

  return (
    <main
      className="game-shell balatro-theme"
      onPointerDownCapture={unlockAudio}
      style={{ ["--visual-intensity" as string]: `${visualIntensity / 100}` } as CSSProperties}
    >
      <audio ref={menuMusicRef} src={AUDIO_ASSETS.music.menu} loop preload="auto" />
      <audio ref={middleMusicRef} src={AUDIO_ASSETS.music.middle} loop preload="auto" />
      <audio ref={deathSfxRef} src={AUDIO_ASSETS.sfx.death} preload="auto" />

      {musicToast ? <div className="music-toast">{musicToast}</div> : null}

      {!hasInteracted && autoAudioBlocked ? (
        <div className="audio-gate" role="dialog" aria-modal="true">
          <section className="panel audio-gate-card">
            <h2>Enable Audio</h2>
            <p>Click once to unlock music and sound effects.</p>
            <button className="primary-button" onClick={unlockAudio}>
              Enable Sound
            </button>
          </section>
        </div>
      ) : null}

      <section className="backdrop" aria-hidden="true">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="blob blob-c" />
      </section>

      <header className="top-bar">
        <h1>{screenTitle}</h1>
        <button className="chip-button" onClick={onToggleMusic}>
          {musicEnabled ? "Music: On" : "Music: Off"}
        </button>
      </header>

      <section className="scene-stage" aria-live="polite">
        <div className="scene-layer scene-current">
          {renderScreen(screen)}
        </div>
      </section>

      {screen === "playing" && dead ? (
        <div className="dead-overlay" role="dialog" aria-modal="true">
          <p className="dead-title">YOU DIED</p>
          <p className="dead-subtitle">The colony has collapsed.</p>
          <div className="dead-actions">
            <button className="primary-button" onClick={startGame}>
              Restart
            </button>
            <button className="secondary-button" onClick={returnToMenu}>
              To Menu
            </button>
          </div>
        </div>
      ) : null}

      {isTransitioning ? (
        <div
          className="black-wipe"
          aria-hidden="true"
          style={{ animationDuration: `${transitionDurationMs}ms` }}
        />
      ) : null}

      {showSettings ? (
        <div className="settings-overlay" role="dialog" aria-modal="true">
          <section className="panel settings-panel">
            <h2>Settings</h2>
            <div className="settings-block">
              <p className="settings-heading">Audio Mixer</p>
              <div className="settings-row">
                <span>Music</span>
                <button className="chip-button" onClick={onToggleMusic}>
                  {musicEnabled ? "Disable" : "Enable"}
                </button>
              </div>
              <div className="settings-row settings-row-slider">
                <span>Music Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={musicVolume}
                  onChange={(event) => setMusicVolume(Number(event.target.value))}
                />
                <strong>{musicVolume}</strong>
              </div>
              <div className="settings-row settings-row-slider">
                <span>SFX Volume</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sfxVolume}
                  onChange={(event) => setSfxVolume(Number(event.target.value))}
                />
                <strong>{sfxVolume}</strong>
              </div>
            </div>

            <div className="settings-block">
              <p className="settings-heading">Motion + Atmosphere</p>
              <div className="settings-row">
                <span>Transition Profile</span>
                <div className="inline-chip-group">
                  <button
                    className={`chip-button ${transitionProfile === "hard-cut" ? "chip-active" : ""}`}
                    onClick={() => setTransitionProfile("hard-cut")}
                  >
                    Hard
                  </button>
                  <button
                    className={`chip-button ${transitionProfile === "classic-wipe" ? "chip-active" : ""}`}
                    onClick={() => setTransitionProfile("classic-wipe")}
                  >
                    Classic
                  </button>
                  <button
                    className={`chip-button ${transitionProfile === "cinematic-wipe" ? "chip-active" : ""}`}
                    onClick={() => setTransitionProfile("cinematic-wipe")}
                  >
                    Cine
                  </button>
                </div>
              </div>
              <div className="settings-row settings-row-slider">
                <span>Visual Intensity</span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={visualIntensity}
                  onChange={(event) => setVisualIntensity(Number(event.target.value))}
                />
                <strong>{visualIntensity}</strong>
              </div>
            </div>

            <div className="settings-block">
              <p className="settings-heading">Developer Hooks</p>
              <div className="settings-row">
                <span>Point Hook</span>
                <code>window.webGameUiHooks.collectPoints({'{'} amount, source {'}'})</code>
              </div>
              <div className="settings-row">
                <span>Point Event</span>
                <code>
                  {'window.dispatchEvent(new CustomEvent("ui:collect-points", { detail }))'}
                </code>
              </div>
            </div>
            <div className="settings-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  playMenuMove();
                  setShowSettings(false);
                }}
              >
                Close
              </button>
              <button className="secondary-button" onClick={returnToMenu}>
                Main Menu
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
