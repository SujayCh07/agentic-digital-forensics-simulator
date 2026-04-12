"use client";

interface PauseOverlayProps {
  isVisible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onReturnToLevels: () => void;
  zoomedIn: boolean;
}

export function PauseOverlay({
  isVisible,
  onResume,
  onRestart,
  onReturnToLevels,
  zoomedIn,
}: PauseOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: "rgba(2, 6, 11, 0.72)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="relative w-[440px] overflow-hidden rounded-lg border"
        style={{
          borderColor: "#1e3d5a",
          background:
            "linear-gradient(180deg, rgba(10,16,26,0.96) 0%, rgba(6,10,18,0.98) 100%)",
          boxShadow:
            "0 0 40px rgba(0,212,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{
            background: "linear-gradient(180deg, rgba(0,212,255,0.12), transparent)",
          }}
        />

        <div className="relative z-10 px-8 py-7">
          <div
            className="text-[11px] font-mono uppercase tracking-[0.34em]"
            style={{ color: "#00d4ff" }}
          >
            System Hold
          </div>
          <div
            className="mt-3 text-[36px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "#f0f7ff" }}
          >
            Paused
          </div>
          <div
            className="mt-3 text-[13px] leading-6"
            style={{ color: "#8aa3be" }}
          >
            Mission playback is suspended. Resume the moon-city board, restart the current level, or return to level select.
          </div>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={onResume}
              className="rounded-md border px-4 py-3 text-left text-[12px] font-mono uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
              style={{
                borderColor: "#00d4ff",
                background: "rgba(0,212,255,0.08)",
                color: "#00d4ff",
              }}
            >
              Resume
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="rounded-md border px-4 py-3 text-left text-[12px] font-mono uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
              style={{
                borderColor: "#315271",
                background: "rgba(11,20,31,0.8)",
                color: "#c8d6e5",
              }}
            >
              Restart Level
            </button>
            <button
              type="button"
              onClick={onReturnToLevels}
              className="rounded-md border px-4 py-3 text-left text-[12px] font-mono uppercase tracking-[0.18em] transition-opacity hover:opacity-80"
              style={{
                borderColor: "#315271",
                background: "rgba(11,20,31,0.8)",
                color: "#c8d6e5",
              }}
            >
              Return To Level Select
            </button>
          </div>

          <div
            className="mt-6 border-t pt-4 text-[11px] font-mono uppercase tracking-[0.18em]"
            style={{ borderColor: "#193149", color: "#6f87a1" }}
          >
            `ESC` resume or pause // `Q` {zoomedIn ? "reset view" : "zoom in"}
          </div>
        </div>
      </div>
    </div>
  );
}
