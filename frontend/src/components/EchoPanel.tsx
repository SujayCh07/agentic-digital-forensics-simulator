"use client";

import type { InvestigationState } from "@/types/investigation";

interface EchoPanelProps {
  state: InvestigationState;
}

function statusColor(status: InvestigationState["agents"][number]["status"]) {
  switch (status) {
    case "reporting":
      return "#78d7ff";
    case "investigating":
      return "#ffb347";
    default:
      return "#94a6b8";
  }
}

export function EchoPanel({ state }: EchoPanelProps) {
  return (
    <section className="rpg-panel space-y-4 p-4">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
          ECHO
        </p>
        <h2 className="mt-2 text-lg font-pixel text-[var(--foreground)]">
          Running Hypothesis
        </h2>
      </div>

      <div className="rounded border border-white/10 bg-black/20 p-3">
        <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--muted)]">
          Suspected Payload
        </p>
        <p className="mt-2 text-[12px] font-mono text-[var(--foreground)]">
          {state.hypothesis.payloadType || "Undetermined"}
        </p>
        <p className="mt-3 text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--muted)]">
          Confidence
        </p>
        <p className="mt-1 text-[12px] font-mono text-[var(--accent-amber)]">
          {(state.hypothesis.confidence * 100).toFixed(0)}%
        </p>
      </div>

      <div className="space-y-2">
        {state.agents.map((agent) => (
          <article
            key={agent.id}
            className="rounded border border-white/10 bg-black/20 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--foreground)]">
                  {agent.name}
                </p>
                <p className="text-[10px] font-mono text-[var(--muted)]">
                  {agent.role}
                </p>
              </div>
              <span
                className="text-[9px] font-mono uppercase tracking-[0.2em]"
                style={{ color: statusColor(agent.status) }}
              >
                {agent.status}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-mono leading-6 text-[var(--muted)]">
              {agent.currentLead}
            </p>
          </article>
        ))}
      </div>

      <div className="rounded border border-white/10 bg-black/20 p-3">
        <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--muted)]">
          Open Questions
        </p>
        <div className="mt-2 space-y-2">
          {state.hypothesis.openQuestions.map((question) => (
            <p
              key={question}
              className="text-[11px] font-mono leading-6 text-[var(--foreground)]"
            >
              {question}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
