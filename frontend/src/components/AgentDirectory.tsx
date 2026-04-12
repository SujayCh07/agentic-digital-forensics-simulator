"use client";

import type { NipsAgentInstance } from "@/types/investigation";

interface AgentDirectoryProps {
  agents: NipsAgentInstance[];
  lockedAgents?: string[];
  onOpenChat: (agent: NipsAgentInstance) => void;
  onLockedClick?: (agent: NipsAgentInstance) => void;
  onClose: () => void;
}

const ARCHETYPE_COLORS: Record<string, string> = {
  LOGIS: "#22d3ee",
  NEXUS: "#a78bfa",
  FILER: "#f59e0b",
  CHRONO: "#34d399",
};

export function AgentDirectory({
  agents,
  lockedAgents = [],
  onOpenChat,
  onLockedClick,
  onClose,
}: AgentDirectoryProps) {
  if (agents.length === 0) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4">
        <button
          type="button"
          className="absolute inset-0"
          tabIndex={-1}
          onClick={onClose}
        />
        <div className="rpg-panel relative w-full max-w-lg p-6 text-center">
          <p className="text-[11px] font-mono text-[var(--muted)]">
            No agents deployed yet. Visit the marketplace to recruit agents.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded border border-white/15 px-4 py-2 text-[10px] font-mono uppercase"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 px-4">
      <button
        type="button"
        className="absolute inset-0"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="rpg-panel relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
            Deployed Agents — {agents.length} active
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/15 px-3 py-1.5 text-[10px] font-mono uppercase hover:bg-white/5"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {agents.map((agent) => {
              const color = ARCHETYPE_COLORS[agent.archetype] || "#888";
              const isLocked = lockedAgents.includes(agent.archetype.toLowerCase());

              return (
                <div
                  key={agent.instance_id}
                  className={`flex items-center gap-3 rounded border px-3 py-2.5 transition-opacity ${
                    isLocked ? "border-white/5 bg-white/1 opacity-50" : "border-white/10 bg-white/2"
                  }`}
                >
                  <div
                    className="h-8 w-8 shrink-0 rounded-full"
                    style={{
                      backgroundColor: isLocked ? "#1e3d5a20" : `${color}20`,
                      border: `1px solid ${isLocked ? "#1e3d5a60" : `${color}60`}`,
                    }}
                  >
                    <div
                      className="flex h-full items-center justify-center text-[10px] font-mono font-bold"
                      style={{ color: isLocked ? "#2a5070" : color }}
                    >
                      {isLocked ? "🔒" : agent.archetype[0]}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-[11px] font-pixel truncate ${isLocked ? "text-[#2a5070]" : ""}`}>
                        {agent.display_name}
                      </span>
                      <span
                        className="text-[8px] font-mono uppercase"
                        style={{ color: isLocked ? "#1e3d5a" : color }}
                      >
                        {agent.archetype} {isLocked ? "(LOCKED)" : ""}
                      </span>
                    </div>
                    <p className="text-[9px] font-mono text-[var(--muted)] opacity-60">
                      {agent.codename} &middot; {agent.role_level} &middot;{" "}
                      {agent.years_experience}yr
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-[8px] font-mono uppercase text-[var(--muted)] opacity-60">
                        THR {Math.round(agent.thoroughness * 100)} &middot; SPD{" "}
                        {Math.round(agent.speed * 100)} &middot; REL{" "}
                        {Math.round(agent.reliability * 100)}
                      </p>
                    </div>
                    {isLocked ? (
                      <button
                        type="button"
                        onClick={() => onLockedClick?.(agent)}
                        className="rounded border border-[#1e3d5a] px-3 py-1.5 text-[9px] font-mono uppercase text-[#2a5070] hover:bg-white/5"
                      >
                        Unlock
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onOpenChat(agent)}
                        className="rounded border px-3 py-1.5 text-[9px] font-mono uppercase hover:bg-white/5"
                        style={{ borderColor: `${color}80`, color }}
                      >
                        Chat
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
