/**
 * useTutorial — Tutorial step engine.
 *
 * Accepts a snapshot of game state and advances tutorial steps when
 * completion conditions are met. Plays TTS on each step change.
 *
 * Returns:
 *   step         — the current TutorialStep object (or null when dismissed)
 *   stepIndex    — 0-based index into TUTORIAL_STEPS
 *   isWaiting    — true when waiting for a game-state condition to be met
 *   advance()    — manually advance to the next step (for manualAdvance steps)
 *   skip()       — exit tutorial immediately
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TUTORIAL_STEPS,
  type TutorialCompletionKey,
  type TutorialStep,
} from "@/lib/tutorialSteps";
import { stopTutorialSpeech, tutorialSpeak } from "@/lib/tutorialTTS";

// ---------------------------------------------------------------------------
// Game state shape passed in from the simulate page
// ---------------------------------------------------------------------------

export interface TutorialGameState {
  sectorActive: boolean;
  agentOpen: boolean;
  hasEvidence: boolean;
  reportSubmitted: boolean;
  hasRemediation: boolean;
  at75: boolean;
  finalizing: boolean;
  won: boolean;
}

// ---------------------------------------------------------------------------
// Completion condition checker
// ---------------------------------------------------------------------------

function isComplete(
  key: TutorialCompletionKey,
  state: TutorialGameState,
): boolean {
  return state[key] === true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseTutorialReturn {
  step: TutorialStep | null;
  stepIndex: number;
  isWaiting: boolean;
  advance: () => void;
  skip: () => void;
  dismissed: boolean;
}

export function useTutorial(gameState: TutorialGameState): UseTutorialReturn {
  const [stepIndex, setStepIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = TUTORIAL_STEPS.length;
  const step =
    dismissed || stepIndex >= totalSteps ? null : TUTORIAL_STEPS[stepIndex];

  // ── Play TTS whenever step changes ─────────────────────────────────────────
  useEffect(() => {
    if (!step) {
      stopTutorialSpeech();
      return;
    }
    tutorialSpeak(step.tts);
    return () => {
      // don't cancel on cleanup — let the speech finish naturally
    };
  }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-advance by timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!step || step.manualAdvance || !step.autoAdvanceMs) return;
    const tid = setTimeout(() => {
      setStepIndex((i) => i + 1);
    }, step.autoAdvanceMs);
    return () => clearTimeout(tid);
  }, [step?.id, step?.autoAdvanceMs, step?.manualAdvance]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-advance by game-state completion key ───────────────────────────────
  useEffect(() => {
    if (!step || !step.completionKey) return;
    if (isComplete(step.completionKey, gameState)) {
      // Brief pause so player sees the state change before advancing
      const tid = setTimeout(() => {
        setStepIndex((i) => i + 1);
      }, 900);
      return () => clearTimeout(tid);
    }
  }, [
    step?.id,
    step?.completionKey,
    gameState.sectorActive,
    gameState.agentOpen,
    gameState.hasEvidence,
    gameState.reportSubmitted,
    gameState.hasRemediation,
    gameState.at75,
    gameState.finalizing,
    gameState.won,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clean up auto-advance timer on unmount ──────────────────────────────────
  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
      stopTutorialSpeech();
    };
  }, []);

  const advance = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  }, [totalSteps]);

  const skip = useCallback(() => {
    stopTutorialSpeech();
    setDismissed(true);
  }, []);

  const isWaiting =
    !!step?.completionKey && !isComplete(step.completionKey, gameState);

  return {
    step,
    stepIndex,
    isWaiting,
    advance,
    skip,
    dismissed,
  };
}
