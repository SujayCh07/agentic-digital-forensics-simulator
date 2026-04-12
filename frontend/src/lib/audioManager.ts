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
 * Music (ordered by escalating urgency — tracks never revert to a lower level):
 *   startSelectionMusic()  → b423b42.mp3           (landing / agent selection screen)
 *   startGameplayMusic()   → Lost and Faltering.mp3 (regular gameplay, starts on Deploy)
 *   switchToIncidentMusic()→ the_last_parsec_mix2.mp3 (incident/compromise warning)
 *   switchToCorruptMusic() → Caves.mp3              (high pressure / severe corruption)
 *   stopMusic()
 *
 * Call audioManager.unlock() once on the first user gesture to unblock
 * the browser's autoplay policy.
 */

const SFX_VOLUME = 0.55;
const MUSIC_VOLUME = 0.3;

// Priority order: higher index = higher urgency, never downgrade
const TRACK_PRIORITY = {
  none:      0,
  selection: 1,
  gameplay:  2,
  incident:  3,
  corrupt:   4,
} as const;

type MusicTrack = keyof typeof TRACK_PRIORITY;

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
    if (this.musicEl && this.musicEl.paused) {
      this.musicEl.play().catch(() => {});
    }
  }

  // ── SFX ────────────────────────────────────────────────────────────────────

  private playSfx(file: string) {
    if (typeof window === "undefined") return;
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

  /**
   * Attempt to switch to a track. Silently ignored if the requested track has
   * lower priority than whatever is currently playing (tracks never revert).
   *
   * @param autoplay - Use the muted-then-unmute trick to bypass browser
   *   autoplay restrictions (safe for title/selection screens).
   */
  private startMusic(file: string, track: MusicTrack, autoplay = false) {
    if (typeof window === "undefined") return;
    if (this.currentTrack === track) return;
    if (TRACK_PRIORITY[track] < TRACK_PRIORITY[this.currentTrack]) return; // no downgrade

    const prev = this.musicEl;
    if (prev) {
      prev.pause();
      prev.currentTime = 0;
    }

    const el = new Audio(`/audio/${encodeURIComponent(file)}`);
    el.loop = true;
    this.musicEl = el;
    this.currentTrack = track;

    if (autoplay) {
      // Muted autoplay is permitted by browsers; unmute immediately after
      // the play promise resolves to produce audible sound with no gesture.
      el.muted = true;
      el.volume = MUSIC_VOLUME;
      el.play().then(() => { el.muted = false; }).catch(() => {});
    } else {
      el.volume = MUSIC_VOLUME;
      if (this.unlocked) {
        el.play().catch(() => {});
      }
      // else: play() fires when unlock() is called after the first gesture
    }
  }

  /** Starts immediately without requiring a prior user gesture. */
  startSelectionMusic()  { this.startMusic("b423b42.mp3", "selection", true); }
  startGameplayMusic()   { this.startMusic("Lost and Faltering.mp3", "gameplay"); }
  switchToIncidentMusic(){ this.startMusic("the_last_parsec_mix2.mp3", "incident"); }
  switchToCorruptMusic() { this.startMusic("Caves.mp3", "corrupt"); }

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
