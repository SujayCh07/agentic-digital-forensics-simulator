/**
 * AudioManager — singleton for all in-game audio.
 *
 * SFX:
 *   playPauseMenu()      → PM_SD_UI_MAGIC_CONFIRM_2  (pause/overlay open, locked click)
 *   playPlayerChat()     → PM_SD_UI_MAGIC_CONFIRM_14 (player sends chat to agent)
 *   playAgentResponse()  → PM_SD_UI_MAGIC_CONFIRM_11 (agent finishes responding)
 *   playEvidenceAdded()  → PM_SD_UI_MAGIC_CONFIRM_10 (new evidence in feed)
 *   playButtonClick()    → PM_SD_UI_MAGIC_CONFIRM_15 (any interactable button click)
 *   playLockedClick()    → PM_SD_UI_MAGIC_CONFIRM_2  (locked / non-interactable click)
 *
 * Music:
 *   startGameplayMusic()  → "Lost and Faltering" looping
 *   switchToCorruptMusic()→ "Caves" looping (when pressure is high)
 *   stopMusic()
 *
 * Call audioManager.unlock() once on the first user gesture to unblock
 * the browser's autoplay policy.
 */

const SFX_VOLUME = 0.55;
const MUSIC_VOLUME = 0.3;

type MusicTrack = "gameplay" | "corrupt" | "none";

class AudioManager {
  private static _instance: AudioManager;

  private sfxCache = new Map<string, HTMLAudioElement>();
  private musicEl: HTMLAudioElement | null = null;
  private currentTrack: MusicTrack = "none";
  private unlocked = false;

  private constructor() {}

  static getInstance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  /** Call on first user click/keydown to satisfy browser autoplay policy. */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    // Resume any suspended AudioContext and kick off music if queued
    if (this.musicEl && this.musicEl.paused) {
      this.musicEl.play().catch(() => {});
    }
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  private playSfx(file: string) {
    if (typeof window === "undefined") return;
    // Reuse a cached element but clone for overlapping plays
    let src = this.sfxCache.get(file);
    if (!src) {
      src = new Audio(`/audio/${file}`);
      src.volume = SFX_VOLUME;
      this.sfxCache.set(file, src);
    }
    // Clone so the same SFX can overlap itself
    const clone = src.cloneNode() as HTMLAudioElement;
    clone.volume = SFX_VOLUME;
    clone.play().catch(() => {});
  }

  playPauseMenu()     { this.playSfx("PM_SD_UI_MAGIC_CONFIRM_2.wav"); }
  playPlayerChat()    { this.playSfx("PM_SD_UI_MAGIC_CONFIRM_14.wav"); }
  playAgentResponse() { this.playSfx("PM_SD_UI_MAGIC_CONFIRM_11.wav"); }
  playEvidenceAdded() { this.playSfx("PM_SD_UI_MAGIC_CONFIRM_10.wav"); }
  playButtonClick()   { this.playSfx("PM_SD_UI_MAGIC_CONFIRM_15.wav"); }
  playLockedClick()   { this.playSfx("PM_SD_UI_MAGIC_CONFIRM_2.wav"); }

  // ── Music ───────────────────────────────────────────────────────────────────

  private startMusic(file: string, track: MusicTrack) {
    if (typeof window === "undefined") return;
    if (this.currentTrack === track) return; // already playing this track

    const prev = this.musicEl;
    if (prev) {
      prev.pause();
      prev.currentTime = 0;
    }

    const el = new Audio(`/audio/${encodeURIComponent(file)}`);
    el.loop = true;
    el.volume = MUSIC_VOLUME;
    this.musicEl = el;
    this.currentTrack = track;

    if (this.unlocked) {
      el.play().catch(() => {});
    }
    // else: play() will be called when unlock() is called
  }

  startGameplayMusic()  { this.startMusic("Lost and Faltering.mp3", "gameplay"); }
  switchToCorruptMusic(){ this.startMusic("Caves.mp3", "corrupt"); }

  stopMusic() {
    if (this.musicEl) {
      this.musicEl.pause();
      this.musicEl.currentTime = 0;
      this.musicEl = null;
    }
    this.currentTrack = "none";
  }

  getCurrentTrack() { return this.currentTrack; }
}

export const audioManager = AudioManager.getInstance();
