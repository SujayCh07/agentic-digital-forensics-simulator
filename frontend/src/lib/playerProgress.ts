/**
 * NIPS — Player progress
 *
 * Persisted to localStorage. Tracks credits (cross-case currency) and
 * which helpers have been unlocked. Credits are earned by completing cases
 * and spent here to unlock level-2 helpers before the next case.
 */

import { ALL_HELPERS } from "@/data/helpers";
import type { Helper } from "@/types/investigation";

export interface PlayerProgress {
  credits: number;
  reputation: number;
  unlockedHelperIds: string[];
}

const STORAGE_KEY = "nips_player_progress_v1";

const DEFAULT: PlayerProgress = {
  credits: 0,
  reputation: 0,
  unlockedHelperIds: ALL_HELPERS.filter((h) => h.cost === 0).map((h) => h.id),
};

export function loadProgress(): PlayerProgress {
  if (typeof window === "undefined") return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT };
    return JSON.parse(raw) as PlayerProgress;
  } catch {
    return { ...DEFAULT };
  }
}

export function saveProgress(p: PlayerProgress): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

/** Returns ALL_HELPERS with `unlocked` field reflecting player progress */
export function getHelperRoster(progress: PlayerProgress): Helper[] {
  return ALL_HELPERS.map((h) => ({
    ...h,
    unlocked: progress.unlockedHelperIds.includes(h.id),
  }));
}

/** Attempt to unlock a helper. Returns updated progress or null if insufficient credits. */
export function purchaseHelper(
  progress: PlayerProgress,
  helperId: string,
): PlayerProgress | null {
  const helper = ALL_HELPERS.find((h) => h.id === helperId);
  if (!helper) return null;
  if (progress.unlockedHelperIds.includes(helperId)) return progress;
  if (progress.credits < helper.cost) return null;
  return {
    ...progress,
    credits: progress.credits - helper.cost,
    unlockedHelperIds: [...progress.unlockedHelperIds, helperId],
  };
}

/** Credits and rep earned at the end of a case, based on findings count + severity mix. */
export function computeCaseRewards(
  findingsCount: number,
  criticalCount: number,
  highCount: number,
): { credits: number; reputation: number } {
  const credits = findingsCount * 80 + criticalCount * 120 + highCount * 60;
  const reputation = Math.floor(credits / 100);
  return { credits, reputation };
}

export function applyCaseRewards(
  progress: PlayerProgress,
  credits: number,
  reputation: number,
): PlayerProgress {
  return {
    ...progress,
    credits: progress.credits + credits,
    reputation: progress.reputation + reputation,
  };
}
