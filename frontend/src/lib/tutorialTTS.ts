/**
 * Tutorial TTS — Web Speech API wrapper with music ducking.
 *
 * Usage:
 *   tutorialSpeak("Your text here");
 *   stopTutorialSpeech();
 *
 * Ducks background music to 15% while speaking and restores it on end.
 */

import { audioManager } from "@/lib/audioManager";

const DUCK_FRACTION = 0.15; // music volume while TTS plays (fraction of MUSIC_VOLUME)

export function tutorialSpeak(text: string, onEnd?: () => void): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // Cancel any current speech
  window.speechSynthesis.cancel();

  // Duck background music
  audioManager.setMusicVolume(DUCK_FRACTION);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.88;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onend = () => {
    audioManager.restoreMusicVolume();
    onEnd?.();
  };

  utterance.onerror = () => {
    audioManager.restoreMusicVolume();
  };

  // Slight delay so the step renders before speech begins
  window.setTimeout(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak(utterance);
    }
  }, 300);
}

export function stopTutorialSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  audioManager.restoreMusicVolume();
}
