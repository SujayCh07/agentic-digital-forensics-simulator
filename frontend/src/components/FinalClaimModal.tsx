"use client";

import { useState } from "react";
import { submitProposal } from "@/lib/investigationAgentClient";
import type { BossEvaluation } from "@/types/investigation";

interface FinalClaimModalProps {
  /** Set by parent when nips_proposal_evaluated fires for the final claim; null while waiting. */
  evaluation: BossEvaluation | null;
  timerSeconds: number;
  onClose: () => void;
}

export function FinalClaimModal({
  evaluation,
  timerSeconds,
  onClose,
}: FinalClaimModalProps) {
  const [rootCause, setRootCause] = useState("");
  const [systemsInvolved, setSystemsInvolved] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!rootCause.trim()) return;
    setSubmitted(true);
    submitProposal(rootCause.trim(), systemsInvolved.trim());
  };

  const confidencePct = evaluation
    ? Math.round(evaluation.confidence_rating * 100)
    : 0;
  const passed = confidencePct >= 75;
  const confColor = passed
    ? "#34d399"
    : confidencePct >= 40
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="rpg-panel flex flex-col"
        style={{ width: 540, maxHeight: "88vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div
          className="shrink-0 px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div>
            <div
              className="text-[11px] font-mono font-bold"
              style={{ color: "#34d399" }}
            >
              ◈ FINAL CLAIM REPORT
            </div>
            <div
              className="mt-0.5 text-[8px] font-mono uppercase tracking-widest"
              style={{ color: "#2a5070" }}
            >
              Summarise the full investigation — root cause + all systems
              involved
            </div>
          </div>
          {!submitted && (
            <button
              type="button"
              onClick={onClose}
              className="text-[14px] font-mono text-slate-600 hover:text-slate-400"
            >
              ×
            </button>
          )}
        </div>

        {evaluation ? (
          /* ── Evaluation result ─────────────────────────────────────────── */
          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Pass / fail banner */}
            <div
              className="rounded px-4 py-3 text-center"
              style={{
                background: passed
                  ? "rgba(52,211,153,0.08)"
                  : "rgba(239,68,68,0.08)",
                border: `1px solid ${passed ? "#34d39966" : "#ef444466"}`,
              }}
            >
              <div
                className="text-[13px] font-mono font-bold tracking-widest"
                style={{ color: passed ? "#34d399" : "#ef4444" }}
              >
                {passed
                  ? "◈ CLAIM ACCEPTED — INCIDENT CONTAINED"
                  : "✗ CLAIM REJECTED — INSUFFICIENT ACCURACY"}
              </div>
              {!passed && (
                <div
                  className="mt-1 text-[8px] font-mono"
                  style={{ color: "#4a6580" }}
                >
                  {timerSeconds > 0
                    ? "Continue gathering evidence and resubmit."
                    : "Time expired. Investigation failed."}
                </div>
              )}
            </div>

            {/* Commentary */}
            <div
              className="rounded p-4 text-[10px] font-mono leading-6"
              style={{
                background: "#0a1320",
                border: "1px solid #1e3d5a",
                color: "#c9d8e8",
              }}
            >
              {evaluation.commentary}
            </div>

            {/* Confidence bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span
                  className="text-[8px] font-mono uppercase tracking-widest"
                  style={{ color: "#2a5070" }}
                >
                  Claim accuracy
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums font-bold"
                  style={{ color: confColor }}
                >
                  {confidencePct}% {passed ? "— PASS" : `— need 75%`}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ background: "#0f1927", border: "1px solid #1e3d5a" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${confidencePct}%`, background: confColor }}
                />
              </div>
              {/* 75% threshold marker */}
              <div className="relative h-0">
                <div
                  className="absolute top-[-10px] flex flex-col items-center"
                  style={{ left: "75%", transform: "translateX(-50%)" }}
                >
                  <div
                    className="h-3 w-px"
                    style={{ background: "#ffffff44" }}
                  />
                </div>
              </div>
            </div>

            {/* Funds released */}
            {evaluation.funds_awarded > 0 && (
              <div
                className="flex items-center justify-between rounded px-3 py-2"
                style={{
                  background: "rgba(0,255,136,0.05)",
                  border: "1px solid rgba(0,255,136,0.15)",
                }}
              >
                <span
                  className="text-[9px] font-mono"
                  style={{ color: "#4a6580" }}
                >
                  Operational funds released
                </span>
                <span
                  className="text-[11px] font-mono font-bold tabular-nums"
                  style={{ color: "#00ff88" }}
                >
                  +{evaluation.funds_awarded.toLocaleString()}₡
                </span>
              </div>
            )}

            {/* Action button */}
            {passed ? (
              <div
                className="rounded px-4 py-3 text-center text-[9px] font-mono"
                style={{ color: "#2a5070" }}
              >
                Investigation closed. Awaiting debrief...
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded py-2.5 text-[10px] font-mono uppercase tracking-widest transition-opacity hover:opacity-80"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid #f59e0b66",
                  color: "#f59e0b",
                }}
              >
                Continue Investigation →
              </button>
            )}
          </div>
        ) : (
          /* ── Submission form ───────────────────────────────────────────── */
          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Context */}
            <div
              className="rounded p-3 text-[9px] font-mono leading-6"
              style={{
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.2)",
                color: "#6f87a1",
              }}
            >
              You have reached 75% recovery. Submit a comprehensive final report
              covering the complete attack chain. If accuracy is ≥ 75%, the
              investigation closes immediately. Below that, you continue with
              whatever time remains.
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="final-root-cause"
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "#34d399" }}
              >
                Root cause &amp; attack chain
              </label>
              <textarea
                id="final-root-cause"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Describe the full attack — initial access vector, lateral movement, exfiltration method, threat actor TTPs..."
                rows={5}
                className="w-full resize-none rounded px-3 py-2 text-[10px] font-mono leading-6 outline-none"
                style={{
                  background: "#0a1320",
                  border: "1px solid #1e3d5a",
                  color: "#c9d8e8",
                }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="final-systems"
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "#34d399" }}
              >
                All systems &amp; nodes involved
              </label>
              <textarea
                id="final-systems"
                value={systemsInvolved}
                onChange={(e) => setSystemsInvolved(e.target.value)}
                placeholder="List every affected node and describe each role in the breach — e.g. MAIL-01 (initial foothold), DB-02 (exfiltration target), GW-01 (egress point)..."
                rows={4}
                className="w-full resize-none rounded px-3 py-2 text-[10px] font-mono leading-6 outline-none"
                style={{
                  background: "#0a1320",
                  border: "1px solid #1e3d5a",
                  color: "#c9d8e8",
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitted || !rootCause.trim()}
              className="w-full rounded py-2.5 text-[10px] font-mono uppercase tracking-widest transition-opacity"
              style={{
                background:
                  submitted || !rootCause.trim()
                    ? "rgba(52,211,153,0.04)"
                    : "rgba(52,211,153,0.14)",
                border: `1px solid ${submitted || !rootCause.trim() ? "#1e3d5a" : "#34d399"}`,
                color: submitted || !rootCause.trim() ? "#2a5070" : "#34d399",
                cursor:
                  submitted || !rootCause.trim() ? "not-allowed" : "pointer",
              }}
            >
              {submitted
                ? "Transmitting final claim..."
                : "◈ Submit Final Claim →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
