"use client";

import { useEffect, useState } from "react";
import type {
  AgentId,
  NipsAgentInstance,
  NipsMarketplaceOffer,
} from "@/types/investigation";
import { audioManager } from "@/lib/audioManager";

interface AgentMarketplaceProps {
  offersByRole: Partial<Record<AgentId, NipsMarketplaceOffer>>;
  ownedAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>>;
  funds: number;
  nextRefresh: number;
  lockedAgents: AgentId[];
  ownedAgentCount: number;
  onBuy: (offerId: string) => void;
  onRefresh: () => void;
}

const ROLE_ORDER: AgentId[] = ["logis", "nexus", "filer", "chrono"];

const ARCHETYPE_COLORS: Record<string, string> = {
  LOGIS: "#22d3ee",
  NEXUS: "#a78bfa",
  FILER: "#f59e0b",
  CHRONO: "#34d399",
};

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] font-mono uppercase text-[var(--muted)]">
        {label}
      </span>
      <div className="h-1 w-10 rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            opacity: 0.4 + value * 0.6,
          }}
        />
      </div>
      <span className="text-[7px] font-mono text-[var(--muted)]">{pct}</span>
    </div>
  );
}

function OfferCard({
  roleId,
  offer,
  ownedAgent,
  funds,
  lockedAgents,
  ownedAgentCount,
  onBuy,
}: {
  roleId: AgentId;
  offer: NipsMarketplaceOffer;
  ownedAgent?: NipsAgentInstance;
  funds: number;
  lockedAgents: AgentId[];
  ownedAgentCount: number;
  onBuy: (id: string) => void;
}) {
  const a = ownedAgent ?? offer.agent;
  const color = ARCHETYPE_COLORS[a.archetype] || "#888";
  const isLockedRole = lockedAgents.includes(roleId);
  const isOwnedRole = Boolean(ownedAgent);
  const isRosterFull = ownedAgentCount >= 4;
  const canAfford = funds >= a.cost;
  const canRecruit = !isOwnedRole && !isRosterFull && canAfford && Boolean(offer.offer_id);
  const statusLabel = isOwnedRole
    ? "DEPLOYED"
    : isLockedRole
      ? "LOCKED ROLE"
      : "RECRUITABLE";
  const statusColor = isOwnedRole
    ? "#34d399"
    : isLockedRole
      ? "#b06fff"
      : "#6f87a1";

  return (
    <div
      className="rpg-panel flex flex-col rounded border border-white/10 p-3"
      style={{
        background: isLockedRole ? "rgba(23, 14, 35, 0.82)" : undefined,
        boxShadow: isLockedRole ? "inset 0 0 0 1px rgba(176,111,255,0.14)" : undefined,
      }}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="min-w-0">
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {a.archetype}
          </span>
          <p className="truncate text-[11px] font-pixel">{a.display_name}</p>
          <p className="text-[9px] font-mono text-[var(--muted)]">
            {a.codename} &middot; {a.role_level}
          </p>
        </div>
        <span className="shrink-0 text-[12px] font-mono font-bold text-amber-300">
          {a.cost}¢
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-1 text-[8px] font-mono uppercase tracking-[0.12em]"
          style={{
            background: "rgba(8,12,18,0.76)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: statusColor,
          }}
        >
          {statusLabel}
        </span>
        {isOwnedRole ? (
          <span className="text-[8px] font-mono uppercase tracking-[0.12em]" style={{ color: "#34d399" }}>
            Active Slot
          </span>
        ) : isLockedRole ? (
          <span className="text-[8px] font-mono uppercase tracking-[0.12em]" style={{ color: "#b06fff" }}>
            Unlock path
          </span>
        ) : null}
      </div>

      <p className="mb-2 text-[9px] font-mono leading-relaxed text-[var(--muted)]">
        {a.years_experience}yr exp &middot; {a.personality_type} &middot;{" "}
        {a.primary_specialties.slice(0, 2).join(", ")}
      </p>

      <div className="mb-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
        <StatMini label="THR" value={a.thoroughness} color={color} />
        <StatMini label="SPD" value={a.speed} color={color} />
        <StatMini label="REL" value={a.reliability} color={color} />
        <StatMini label="CRE" value={a.creativity} color={color} />
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        {a.profile_tags.slice(0, 4).map((t) => (
          <span
            key={t}
            className="rounded bg-white/5 px-1 py-0.5 text-[7px] font-mono uppercase text-[var(--muted)]"
          >
            {t}
          </span>
        ))}
      </div>

      <button
        type="button"
        disabled={!canRecruit}
        onClick={() => {
          if (canRecruit) {
            audioManager.playButtonClick();
            onBuy(offer.offer_id);
          } else {
            audioManager.playLockedClick();
          }
        }}
        className={`mt-auto rounded border px-3 py-1.5 text-[10px] font-mono uppercase ${
          canRecruit
            ? "border-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10"
            : "border-white/10 text-[var(--muted)] opacity-50"
        }`}
      >
        {canAfford
          ? isOwnedRole
            ? "Deployed"
            : isRosterFull
              ? "Roster Full"
              : isLockedRole
                ? "Recruit + Unlock"
                : "Recruit"
          : "Insufficient ¢"}
      </button>
    </div>
  );
}

export function AgentMarketplace({
  offersByRole,
  ownedAgentsByRole,
  funds,
  nextRefresh,
  lockedAgents,
  ownedAgentCount,
  onBuy,
  onRefresh,
}: AgentMarketplaceProps) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(nextRefresh - Date.now() / 1000));
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);

      if (remaining <= 0) {
        onRefresh();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextRefresh, onRefresh]);

  if (ROLE_ORDER.every((roleId) => !offersByRole[roleId] && !ownedAgentsByRole[roleId])) {
    return (
      <div className="text-center text-[10px] font-mono text-[var(--muted)] py-4">
        No marketplace offers available. Refreshing...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
          Agent Marketplace
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-[var(--muted)]">
            Refresh in {countdown}
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-300">
            {funds}¢
          </span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {ROLE_ORDER.map((roleId) => {
          const offer = offersByRole[roleId];
          const ownedAgent = ownedAgentsByRole[roleId];
          if (!offer && !ownedAgent) return null;

          return (
          <OfferCard
            key={ownedAgent?.instance_id ?? offer?.offer_id ?? roleId}
            roleId={roleId}
            offer={offer ?? ({
              offer_id: `empty-${roleId}`,
              agent: ownedAgent!,
              expires_at: 0,
            })}
            ownedAgent={ownedAgent}
            funds={funds}
            lockedAgents={lockedAgents}
            ownedAgentCount={ownedAgentCount}
            onBuy={onBuy}
          />
          );
        })}
      </div>
    </div>
  );
}
