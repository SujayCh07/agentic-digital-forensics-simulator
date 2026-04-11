"use client";

import type { InvestigationState } from "@/types/investigation";

interface IncidentReportPanelProps {
  state: InvestigationState;
  connectionState: "connected" | "connecting" | "reconnecting";
}

function connectionLabel(
  connectionState: IncidentReportPanelProps["connectionState"],
) {
  switch (connectionState) {
    case "connected":
      return { text: "Stream linked", color: "#7ef9c6" };
    case "reconnecting":
      return { text: "Re-linking stream", color: "#ffb347" };
    default:
      return { text: "Awaiting link", color: "#78d7ff" };
  }
}

export function IncidentReportPanel({
  state,
  connectionState,
}: IncidentReportPanelProps) {
  const suspicious = state.systems.filter((system) =>
    ["suspicious", "compromised"].includes(system.status),
  ).length;
  const link = connectionLabel(connectionState);

  return (
    <section className="rpg-panel space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
            Incident Report
          </p>
          <h2 className="mt-2 text-lg font-pixel text-[var(--foreground)]">
            {state.title}
          </h2>
        </div>
        <div
          className="rounded px-2 py-1 text-[9px] font-mono uppercase tracking-[0.25em]"
          style={{ color: link.color, border: "1px solid currentColor" }}
        >
          {link.text}
        </div>
      </div>

      <p className="text-[11px] font-mono leading-6 text-[var(--muted)]">
        {state.summary}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--muted)]">
            Case ID
          </p>
          <p className="mt-2 text-[12px] font-mono text-[var(--foreground)]">
            {state.caseId}
          </p>
        </div>
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--muted)]">
            Suspicious Systems
          </p>
          <p className="mt-2 text-[12px] font-mono text-[var(--accent-red)]">
            {suspicious}/{state.systems.length}
          </p>
        </div>
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--muted)]">
            Active Leads
          </p>
          <p className="mt-2 text-[12px] font-mono text-[var(--accent-amber)]">
            {state.clueFeed.length}
          </p>
        </div>
        <div className="rounded border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.24em] text-[var(--muted)]">
            Evidence Artifacts
          </p>
          <p className="mt-2 text-[12px] font-mono text-[var(--accent-cyan)]">
            {state.evidence.length}
          </p>
        </div>
      </div>
    </section>
  );
}
