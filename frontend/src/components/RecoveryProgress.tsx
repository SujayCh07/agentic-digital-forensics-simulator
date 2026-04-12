"use client";

/**
 * RecoveryProgress — the investigation progress bar shown in the top bar.
 *
 * Progress is NOT "percent of clues found". It is a composite of:
 *   • Finding quality (severity × confidence, minus red herrings)
 *   • Proposal evaluation delta (from boss agent)
 *   • Remediation deltas (from fix actions)
 *   • Pressure penalty (rising pressure slowly degrades progress)
 *
 * The bar never tells the player they are right or wrong.
 * Good diagnosis + good fixes push it toward 100. Bad diagnosis barely moves it.
 */

import type { AgentResult } from "@/types/investigation";

interface RecoveryProgressProps {
  completedFindings: AgentResult[];
  externalDelta: number;    // accumulated from proposal + remediations
  pressureLevel: number;    // 0–10
  proposalSubmitted: boolean;
}

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 6,
  high:     4,
  medium:   2.5,
  low:      1,
};

/** Compute the finding-quality contribution (0–40 points). */
function findingScore(findings: AgentResult[]): number {
  if (findings.length === 0) return 0;
  let raw = 0;
  for (const f of findings) {
    const weight = SEVERITY_WEIGHT[f.severity] ?? 1;
    const multiplier = f.isRedHerring ? -0.5 : f.confidence;
    raw += weight * multiplier;
  }
  // Normalise: 40 pts = "all critical + high, high confidence, no red herrings"
  const ceiling = findings.length * 6; // theoretical max if all were critical
  return Math.max(0, Math.min(40, (raw / Math.max(ceiling, 1)) * 40));
}

/** Compute total progress 0–100 */
export function computeRecoveryProgress(
  findings: AgentResult[],
  externalDelta: number,
  pressureLevel: number,
): number {
  const fScore = findingScore(findings);
  // Pressure drains up to 8 pts from the finding contribution
  const pressurePenalty = pressureLevel * 0.8;
  const base = Math.max(0, fScore - pressurePenalty);
  const total = base + Math.min(externalDelta, 60); // cap external at 60
  return Math.min(100, Math.max(0, Math.round(total)));
}

export function RecoveryProgress({
  completedFindings,
  externalDelta,
  pressureLevel,
  proposalSubmitted,
}: RecoveryProgressProps) {
  const progress = computeRecoveryProgress(completedFindings, externalDelta, pressureLevel);

  const barColor =
    progress >= 75 ? "#34d399"
    : progress >= 45 ? "#f59e0b"
    : progress >= 20 ? "#fb923c"
    : "#ef4444";

  const label =
    progress >= 75 ? "RECOVERY IN PROGRESS"
    : progress >= 45 ? "PARTIAL CONTAINMENT"
    : progress >= 20 ? "THREAT ACTIVE"
    : "CRITICAL";

  return (
    <div className="flex items-center gap-2.5 min-w-[200px]">
      <div className="flex flex-col gap-0.5 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono tracking-widest" style={{ color: "#2a5070" }}>
            {proposalSubmitted ? "INCIDENT RECOVERY" : "ANALYSIS DEPTH"}
          </span>
          <span className="text-[8px] font-mono tracking-wider" style={{ color: barColor }}>
            {label}
          </span>
        </div>
        <div
          className="h-1.5 w-full rounded-full overflow-hidden"
          style={{ background: "#0f1927" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: barColor,
              boxShadow: progress >= 45 ? `0 0 8px ${barColor}66` : "none",
            }}
          />
        </div>
      </div>
      <span
        className="text-[10px] font-mono tabular-nums w-8 text-right flex-shrink-0"
        style={{ color: barColor }}
      >
        {progress}%
      </span>
    </div>
  );
}
