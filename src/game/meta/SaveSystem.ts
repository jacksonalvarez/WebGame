// CytoSurvivor - Save System (localStorage)
import { MetaState } from '../types';

const SAVE_KEY = 'cytosurvivor_save';

const DEFAULT_META: MetaState = {
  dnaPoints: 0,
  totalDnaEarned: 0,
  unlockedMutations: [],
  equippedMutations: [],
  geneTreePurchases: [],
  highScore: 0,
  bestZone: 1,
  totalRuns: 0,
};

export function saveProgress(meta: MetaState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(meta));
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota full)
  }
}

export function loadProgress(): MetaState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<MetaState>;

    // Validate and hydrate — fill missing fields with defaults
    const meta: MetaState = {
      dnaPoints: typeof parsed.dnaPoints === 'number' ? parsed.dnaPoints : DEFAULT_META.dnaPoints,
      totalDnaEarned: typeof parsed.totalDnaEarned === 'number' ? parsed.totalDnaEarned : DEFAULT_META.totalDnaEarned,
      unlockedMutations: Array.isArray(parsed.unlockedMutations) ? parsed.unlockedMutations : [],
      equippedMutations: Array.isArray(parsed.equippedMutations) ? parsed.equippedMutations : [],
      geneTreePurchases: Array.isArray(parsed.geneTreePurchases) ? parsed.geneTreePurchases : [],
      highScore: typeof parsed.highScore === 'number' ? parsed.highScore : DEFAULT_META.highScore,
      bestZone: (parsed.bestZone === 1 || parsed.bestZone === 2 || parsed.bestZone === 3 || parsed.bestZone === 4 || parsed.bestZone === 5)
        ? parsed.bestZone
        : DEFAULT_META.bestZone,
      totalRuns: typeof parsed.totalRuns === 'number' ? parsed.totalRuns : DEFAULT_META.totalRuns,
    };

    // Cap equipped mutations to max 3
    if (meta.equippedMutations.length > 3) {
      meta.equippedMutations = meta.equippedMutations.slice(0, 3);
    }

    return meta;
  } catch {
    // Corrupted save — return null so caller uses defaults
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
