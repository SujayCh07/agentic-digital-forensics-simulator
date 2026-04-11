"use client";

import { useEffect, useState } from "react";
import type { EchoScenario } from "@/types/echo";

export function EchoScenarioPanel() {
  const [scenario, setScenario] = useState<EchoScenario | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("http://localhost:8000/echo/scenario")
      .then((r) => r.json())
      .then((data) => {
        if (alive) setScenario(data as EchoScenario);
      })
      .catch(() => {
        if (alive) setScenario(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!scenario) {
    return (
      <div className="rounded border border-cyan-400/30 bg-slate-950/80 p-4 text-xs text-cyan-100">
        Loading ECHO scenario…
      </div>
    );
  }

  return (
    <div className="rounded border border-cyan-300/40 bg-slate-950/90 p-4 text-cyan-50 shadow-lg shadow-cyan-900/20">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">
            ECHO Scenario
          </p>
          <h2 className="text-xl font-semibold">{scenario.name}</h2>
        </div>
        <div className="text-right text-[10px] uppercase tracking-[0.25em] text-cyan-200/70">
          {scenario.agents.length} agents
        </div>
      </div>

      <p className="max-w-3xl text-sm leading-6 text-cyan-100/80">
        {scenario.incident}
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {scenario.evidence_nodes.map((node) => (
          <div
            key={node.id}
            className="rounded border border-cyan-500/20 bg-cyan-950/50 p-3"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
              {node.name}
            </p>
            <p className="mt-1 text-[11px] text-cyan-100/70">{node.building_type}</p>
            <p className="mt-2 text-[11px] text-cyan-100/90">
              {node.clues[0]?.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
