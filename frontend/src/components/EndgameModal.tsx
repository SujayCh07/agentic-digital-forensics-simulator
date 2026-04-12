"use client";

import type { EndgameOutcome } from "@/types/investigation";

interface EndgameModalProps {
  outcome: EndgameOutcome;
  recoveryProgress: number;
  timerSeconds: number;
  nipsFunds: number;
  onRestart: () => void;
  onReturnHome: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function EndgameModal({
  outcome,
  recoveryProgress,
  timerSeconds,
  nipsFunds,
  onRestart,
  onReturnHome,
}: EndgameModalProps) {
  if (!outcome) return null;

  const win = outcome === "win";

  const accentColor = win ? "#34d399" : "#ef4444";
  const titleText = win ? "INCIDENT CONTAINED" : "BREACH UNCONTROLLED";
  const subtitleText = win
    ? "Network integrity restored. Well done, analyst."
    : "Time expired — the threat persists. Regroup and try again.";

  const timeSpent = 300 - timerSeconds;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="rpg-panel flex flex-col"
        style={{
          width: 460,
          border: `1px solid ${accentColor}44`,
          boxShadow: `0 0 48px ${accentColor}18`,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 text-center"
          style={{ borderBottom: `1px solid ${accentColor}22` }}
        >
          <div
            className="text-[18px] font-mono font-bold tracking-widest"
            style={{
              color: accentColor,
              textShadow: `0 0 16px ${accentColor}66`,
            }}
          >
            {win ? "◈" : "✕"} {titleText}
          </div>
          <div
            className="mt-1.5 text-[9px] font-mono uppercase tracking-widest"
            style={{ color: "#4a6580" }}
          >
            {subtitleText}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-2 px-6 py-5">
          {/* Recovery progress bar */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[8px] font-mono uppercase tracking-widest"
                style={{ color: "#2a5070" }}
              >
                Final recovery progress
              </span>
              <span
                className="text-[10px] font-mono font-bold tabular-nums"
                style={{ color: accentColor }}
              >
                {recoveryProgress}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: "#0f1927" }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${recoveryProgress}%`,
                  background: accentColor,
                  boxShadow: `0 0 8px ${accentColor}66`,
                }}
              />
            </div>
          </div>

          {/* Metric rows */}
          {[
            {
              label: "Time remaining",
              value: formatTime(Math.max(0, timerSeconds)),
              color: timerSeconds > 60 ? "#00ff88" : "#ef4444",
            },
            {
              label: "Time elapsed",
              value: formatTime(timeSpent),
              color: "#c9d8e8",
            },
            {
              label: "Final funds",
              value: `${nipsFunds.toLocaleString()}₡`,
              color: "#00ff88",
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span
                className="text-[8px] font-mono"
                style={{ color: "#4a6580" }}
              >
                {label}
              </span>
              <span
                className="text-[9px] font-mono tabular-nums"
                style={{ color }}
              >
                {value}
              </span>
            </div>
          ))}

          {win && (
            <div
              className="mt-2 rounded p-3 text-center text-[9px] font-mono leading-6"
              style={{
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.2)",
                color: "#34d399",
              }}
            >
              Threat neutralized. The network is secure.
            </div>
          )}

          {!win && (
            <div
              className="mt-2 rounded p-3 text-center text-[9px] font-mono leading-6"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#ef4444",
              }}
            >
              The attacker maintained persistence. Review your evidence chain
              and focus remediation on the primary exfiltration path.
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex gap-3 px-6 py-4"
          style={{ borderTop: `1px solid ${accentColor}22` }}
        >
          <button
            type="button"
            onClick={onReturnHome}
            className="flex-1 rounded py-2 text-[9px] font-mono uppercase tracking-widest transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid #1e3d5a",
              color: "#4a6580",
            }}
          >
            Main Menu
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 rounded py-2 text-[9px] font-mono uppercase tracking-widest transition-opacity hover:opacity-80"
            style={{
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}`,
              color: accentColor,
              boxShadow: `0 0 12px ${accentColor}22`,
            }}
          >
            {win ? "New Case →" : "Try Again →"}
          </button>
        </div>
      </div>
    </div>
  );
}
