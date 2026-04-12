"use client";

import { useState } from "react";
import { submitProposal } from "@/lib/investigationAgentClient";
import type { BossEvaluation } from "@/types/investigation";

interface ProposalModalProps {
  /** Set by parent when nips_proposal_evaluated fires; null while waiting. */
  evaluation: BossEvaluation | null;
  onClose: () => void;
}

export function ProposalModal({ evaluation, onClose }: ProposalModalProps) {
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
  const confColor =
    confidencePct >= 65
      ? "#34d399"
      : confidencePct >= 30
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(3px)" }}
    >
      <div
        className="rpg-panel flex flex-col"
        style={{ width: 520, maxHeight: "85vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div
          className="shrink-0 px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div>
            <div
              className="text-[11px] font-mono font-bold"
              style={{ color: "#00d4ff" }}
            >
              INCIDENT PROPOSAL
            </div>
            <div
              className="mt-0.5 text-[8px] font-mono uppercase tracking-widest"
              style={{ color: "#2a5070" }}
            >
              Submit your analysis to command for evaluation
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] font-mono text-slate-600 hover:text-slate-400"
          >
            ×
          </button>
        </div>

        {evaluation ? (
          /* ── Evaluation result ─────────────────────────────────────────── */
          <div className="flex flex-col gap-4 px-5 py-4">
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span
                  className="text-[8px] font-mono uppercase tracking-widest"
                  style={{ color: "#2a5070" }}
                >
                  Command confidence
                </span>
                <span
                  className="text-[9px] font-mono tabular-nums"
                  style={{ color: confColor }}
                >
                  {confidencePct}%
                </span>
              </div>
              <div
                className="h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: "#0f1927" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${confidencePct}%`, background: confColor }}
                />
              </div>
            </div>

            {/* Funds awarded */}
            <div
              className="flex items-center justify-between rounded px-3 py-2"
              style={{
                background: "rgba(0,255,136,0.05)",
                border: "1px solid rgba(0,255,136,0.2)",
              }}
            >
              <span
                className="text-[9px] font-mono"
                style={{ color: "#4a6580" }}
              >
                Operational funds released
              </span>
              <span
                className="text-[12px] font-mono font-bold tabular-nums"
                style={{ color: "#00ff88" }}
              >
                +{evaluation.funds_awarded.toLocaleString()}₡
              </span>
            </div>

            {/* Progress delta */}
            {evaluation.progress_delta > 0 && (
              <div
                className="flex items-center justify-between rounded px-3 py-2"
                style={{
                  background: "rgba(52,211,153,0.05)",
                  border: "1px solid rgba(52,211,153,0.15)",
                }}
              >
                <span
                  className="text-[9px] font-mono"
                  style={{ color: "#4a6580" }}
                >
                  Recovery progress
                </span>
                <span
                  className="text-[10px] font-mono tabular-nums"
                  style={{ color: "#34d399" }}
                >
                  +{evaluation.progress_delta.toFixed(1)} pts
                </span>
              </div>
            )}

            <p
              className="text-[8px] font-mono leading-5"
              style={{ color: "#2a5070" }}
            >
              Use the remediation panel to execute containment actions. Recovery
              progress will update as you apply fixes.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-1 w-full rounded py-2 text-[10px] font-mono uppercase tracking-widest transition-opacity hover:opacity-80"
              style={{
                background: "rgba(0,212,255,0.1)",
                border: "1px solid #00d4ff",
                color: "#00d4ff",
              }}
            >
              Begin Remediation →
            </button>
          </div>
        ) : (
          /* ── Submission form ───────────────────────────────────────────── */
          <div className="flex flex-col gap-4 px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="root-cause"
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "#00d4ff" }}
              >
                Root cause analysis
              </label>
              <textarea
                id="root-cause"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Describe the attack vector, initial access method, and primary threat actor behavior..."
                rows={4}
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
                htmlFor="systems-involved"
                className="text-[9px] font-mono uppercase tracking-widest"
                style={{ color: "#00d4ff" }}
              >
                Systems involved
              </label>
              <textarea
                id="systems-involved"
                value={systemsInvolved}
                onChange={(e) => setSystemsInvolved(e.target.value)}
                placeholder="List affected nodes, e.g. MAIL-01, DB-02, GW-01 — and describe the lateral movement path..."
                rows={3}
                className="w-full resize-none rounded px-3 py-2 text-[10px] font-mono leading-6 outline-none"
                style={{
                  background: "#0a1320",
                  border: "1px solid #1e3d5a",
                  color: "#c9d8e8",
                }}
              />
            </div>

            <p
              className="text-[8px] font-mono leading-5"
              style={{ color: "#2a5070" }}
            >
              Command evaluates your proposal against known intelligence. The
              more specific and accurate your analysis, the more operational
              funding you'll receive for remediation.
            </p>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitted || !rootCause.trim()}
              className="w-full rounded py-2.5 text-[10px] font-mono uppercase tracking-widest transition-opacity"
              style={{
                background:
                  submitted || !rootCause.trim()
                    ? "rgba(0,212,255,0.04)"
                    : "rgba(0,212,255,0.14)",
                border: `1px solid ${submitted || !rootCause.trim() ? "#1e3d5a" : "#00d4ff"}`,
                color: submitted || !rootCause.trim() ? "#2a5070" : "#00d4ff",
                cursor:
                  submitted || !rootCause.trim() ? "not-allowed" : "pointer",
              }}
            >
              {submitted ? "Transmitting to command..." : "Submit Proposal →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
