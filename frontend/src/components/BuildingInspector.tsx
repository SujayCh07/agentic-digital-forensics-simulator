"use client";

import type { InvestigationState } from "@/types/investigation";

interface BuildingInspectorProps {
  state: InvestigationState;
}

export function BuildingInspector({ state }: BuildingInspectorProps) {
  const selectedSystem = state.systems.find(
    (system) => system.id === state.selectedSystemId,
  );
  const relatedEvidence = state.evidence.filter(
    (artifact) => artifact.systemId === selectedSystem?.id,
  );

  return (
    <section className="rpg-panel space-y-4 p-4">
      <div>
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
          Building Inspector
        </p>
        <h2 className="mt-2 text-lg font-pixel text-[var(--foreground)]">
          {selectedSystem?.name || "No system selected"}
        </h2>
      </div>

      {selectedSystem ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--muted)]">
                District
              </p>
              <p className="mt-2 text-[12px] font-mono text-[var(--foreground)]">
                {selectedSystem.district}
              </p>
            </div>
            <div className="rounded border border-white/10 bg-black/20 p-3">
              <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--muted)]">
                Status
              </p>
              <p className="mt-2 text-[12px] font-mono uppercase text-[var(--accent-amber)]">
                {selectedSystem.status}
              </p>
            </div>
          </div>

          <div className="rounded border border-white/10 bg-black/20 p-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-[var(--muted)]">
              Attached Evidence
            </p>
            <div className="mt-2 space-y-2">
              {relatedEvidence.length > 0 ? (
                relatedEvidence.map((artifact) => (
                  <article key={artifact.id}>
                    <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-[var(--foreground)]">
                      {artifact.name}
                    </p>
                    <p className="mt-1 text-[11px] font-mono leading-6 text-[var(--muted)]">
                      {artifact.summary}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-[11px] font-mono text-[var(--muted)]">
                  TODO: bind live building evidence once backend system-node data is ready.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-[11px] font-mono text-[var(--muted)]">
          Hover or select a city node to inspect the mapped machine.
        </p>
      )}
    </section>
  );
}
