"use client";

import { SocialGraph } from "@/components/SocialGraph";
import type {
  BackendInfluenceEvent,
  BackendNPC,
  BackendRelationship,
} from "@/types/backend";

interface AttackGraphProps {
  npcs: BackendNPC[];
  relationships: BackendRelationship[];
  influenceEvents: BackendInfluenceEvent[];
  version: number;
}

export function AttackGraph(props: AttackGraphProps) {
  const suspiciousLinks = props.relationships.filter(
    (relationship) => relationship.trust < 0.35 || relationship.affinity < -0.25,
  ).length;

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="border-b border-white/10 px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
          Attack Graph
        </p>
        <p className="mt-1 text-[11px] font-mono text-[var(--muted)]">
          Reused from the live D3 social graph. TODO: swap to system/edge labels once backend network artifacts land.
        </p>
        <div className="mt-3 flex gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
          <span>{props.npcs.length} nodes</span>
          <span>{props.relationships.length} edges</span>
          <span className="text-[var(--accent-red)]">{suspiciousLinks} suspicious</span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <SocialGraph {...props} />
      </div>
    </section>
  );
}
