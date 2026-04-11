"use client";

import type { InvestigationState } from "@/types/investigation";

interface TimelineScrubberProps {
  state: InvestigationState;
}

export function TimelineScrubber({ state }: TimelineScrubberProps) {
  const progress =
    state.maxRounds > 0 ? Math.min(1, state.round / state.maxRounds) : 0;

  return (
    <section className="rpg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
            Timeline Scrubber
          </p>
          <p className="mt-1 text-[11px] font-mono text-[var(--muted)]">
            Incident round {state.round} of {state.maxRounds}
          </p>
        </div>
        <div className="text-[11px] font-mono text-[var(--accent-amber)]">
          {(progress * 100).toFixed(0)}%
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(progress * 100, 4)}%`,
            background:
              "linear-gradient(90deg, var(--accent-cyan), var(--accent-amber), var(--accent-red))",
          }}
        />
      </div>
    </section>
  );
}
