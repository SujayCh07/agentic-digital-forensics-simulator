"use client";

/**
 * RecoveryProgress — investigation progress bar + always-on fixed strip.
 *
 * Progress = evidenceDelta (from findings) + externalDelta (proposal + remediations)
 *            minus a small pressure penalty.
 *
 * A 3px fixed strip is rendered at z-92 so it stays visible above all modals.
 */

interface RecoveryProgressProps {
  evidenceDelta: number;   // accumulated from evidence findings
  externalDelta: number;   // from proposal evaluations + remediations
  pressureLevel: number;   // 0–10
  proposalSubmitted: boolean;
}

/** Compute total progress 0–100 */
export function computeRecoveryProgress(
  evidenceDelta: number,
  externalDelta: number,
  pressureLevel: number,
): number {
  const pressurePenalty = pressureLevel * 0.4; // gentle penalty
  const total = evidenceDelta + externalDelta - pressurePenalty;
  return Math.min(100, Math.max(0, Math.round(total)));
}

function progressColor(progress: number): string {
  if (progress >= 75) return "#34d399";
  if (progress >= 45) return "#f59e0b";
  if (progress >= 20) return "#fb923c";
  return "#ef4444";
}

function progressLabel(progress: number): string {
  if (progress >= 75) return "RECOVERY IN PROGRESS";
  if (progress >= 45) return "PARTIAL CONTAINMENT";
  if (progress >= 20) return "THREAT ACTIVE";
  return "CRITICAL";
}

/** Thin fixed strip always visible at the very top of the viewport. */
export function RecoveryStrip({
  evidenceDelta,
  externalDelta,
  pressureLevel,
}: Omit<RecoveryProgressProps, "proposalSubmitted">) {
  const progress = computeRecoveryProgress(evidenceDelta, externalDelta, pressureLevel);
  const color = progressColor(progress);
  return (
    <div
      className="fixed left-0 right-0 top-0 z-[92]"
      style={{ height: 3, background: "#07111e" }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: color,
          boxShadow: progress >= 45 ? `0 0 6px ${color}` : "none",
          transition: "width 1s ease, background 0.5s ease",
        }}
      />
    </div>
  );
}

/** Full progress bar — shown in the top bar. */
export function RecoveryProgress({
  evidenceDelta,
  externalDelta,
  pressureLevel,
  proposalSubmitted,
}: RecoveryProgressProps) {
  const progress = computeRecoveryProgress(evidenceDelta, externalDelta, pressureLevel);
  const color = progressColor(progress);
  const label = progressLabel(progress);

  return (
    <div className="flex items-center gap-3 min-w-[260px]">
      <div className="flex flex-col gap-1 flex-1">
        <div className="flex items-center justify-between">
          <span
            className="text-[9px] font-mono tracking-widest uppercase"
            style={{ color: "#2a5070" }}
          >
            {proposalSubmitted ? "INCIDENT RECOVERY" : "INVESTIGATION DEPTH"}
          </span>
          <span
            className="text-[9px] font-mono tracking-wider font-bold"
            style={{ color }}
          >
            {label}
          </span>
        </div>
        <div
          className="h-3 w-full rounded-full overflow-hidden"
          style={{ background: "#0f1927", border: "1px solid #1e3d5a" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${color}cc, ${color})`,
              boxShadow: progress >= 20 ? `0 0 10px ${color}88` : "none",
            }}
          />
        </div>
      </div>
      <span
        className="text-[14px] font-mono font-bold tabular-nums w-12 text-right flex-shrink-0"
        style={{ color, textShadow: progress >= 45 ? `0 0 8px ${color}88` : "none" }}
      >
        {progress}%
      </span>
    </div>
  );
}
