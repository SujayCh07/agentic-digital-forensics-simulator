"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface TutorialNarrationState {
  supported: boolean;
  unlocked: boolean;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  replay: () => void;
}

function canNarrate() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useTutorialNarration(
  enabled: boolean,
  speechKey: string,
  speechText: string,
): TutorialNarrationState {
  const [unlocked, setUnlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const lastSpokenKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !canNarrate()) return;

    const unlock = () => setUnlocked(true);
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [enabled]);

  const speak = useCallback(() => {
    if (!enabled || muted || !unlocked || !canNarrate()) return;
    const text = speechText.trim();
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.98;
    utterance.volume = 0.95;
    window.speechSynthesis.speak(utterance);
  }, [enabled, muted, speechText, unlocked]);

  useEffect(() => {
    if (!enabled || muted || !unlocked) return;
    if (lastSpokenKeyRef.current === speechKey) return;
    lastSpokenKeyRef.current = speechKey;
    speak();
  }, [enabled, muted, speak, speechKey, unlocked]);

  useEffect(() => {
    if (enabled) return;
    lastSpokenKeyRef.current = null;
    if (canNarrate()) {
      window.speechSynthesis.cancel();
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (canNarrate()) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    supported: canNarrate(),
    unlocked,
    muted,
    setMuted,
    replay: speak,
  };
}
