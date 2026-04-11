"use client";

import type { ForensicEvent } from "@/types/investigation";

interface EvidenceFeedProps {
  events: ForensicEvent[];
}

function severityColor(severity: ForensicEvent["severity"]) {
  switch (severity) {
    case "critical":
      return "#ff5c6c";
    case "high":
      return "#ffb347";
    case "medium":
      return "#78d7ff";
    default:
      return "#94a6b8";
  }
}

export function EvidenceFeed({ events }: EvidenceFeedProps) {
  return (
    <section className="rpg-panel flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
          Evidence Feed
        </p>
        <p className="mt-1 text-[11px] font-mono text-[var(--muted)]">
          Live clues from LOGIS, NEXUS, FILER, and CHRONO.
        </p>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        {events.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
            Awaiting field evidence
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <article
                key={event.id}
                className="rounded border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.2em]"
                    style={{
                      color: severityColor(event.severity),
                      border: "1px solid currentColor",
                    }}
                  >
                    {event.severity}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
                    {event.agentName}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-[var(--muted)]">
                    {event.timestamp}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.14em] text-[var(--foreground)]">
                  {event.title}
                </p>
                <p className="mt-1 text-[12px] font-mono leading-6 text-[var(--muted)]">
                  {event.description}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
