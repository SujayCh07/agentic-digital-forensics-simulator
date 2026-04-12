"use client";

import type {
  AgentDefinition,
  AgentId,
  NipsAgentInstance,
  Task,
} from "@/types/investigation";

interface AgentStatusBarProps {
  agents: AgentDefinition[];
  activeTasks: Task[];
  /** IDs of agents that haven't been unlocked yet */
  lockedAgents?: AgentId[];
  slotAgentsByRole?: Partial<Record<AgentId, NipsAgentInstance>>;
  /** Called when an agent card is clicked (for opening chat) */
  onAgentClick?: (agentId: AgentId) => void;
}

const STATUS_COLOR: Record<AgentDefinition["status"], string> = {
  idle: "#2a5070",
  moving: "#f59e0b",
  executing: "#ff3a3a",
  reporting: "#b06fff",
  standby: "#1e3d5a",
};

const STATUS_DOT_GLOW: Record<AgentDefinition["status"], string> = {
  idle: "#2a5070",
  moving: "#f59e0b88",
  executing: "#ff3a3a88",
  reporting: "#b06fff88",
  standby: "#1e3d5a",
};

export function AgentStatusBar({
  agents,
  activeTasks,
  lockedAgents = [],
  slotAgentsByRole = {},
  onAgentClick,
}: AgentStatusBarProps) {
  return (
    <div className="flex gap-2 h-full items-stretch">
      {agents.map((agent) => {
        const isLocked = lockedAgents.includes(agent.id);
        const slotAgent = slotAgentsByRole[agent.id];
        const task = activeTasks.find(
          (t) => t.agentId === agent.id && t.status !== "complete",
        );
        const statusColor = isLocked ? "#1e3d5a" : STATUS_COLOR[agent.status];
        const dotGlow = STATUS_DOT_GLOW[agent.status];
        const isActive =
          !isLocked && agent.status !== "idle" && agent.status !== "standby";

        return (
          <button
            type="button"
            key={agent.id}
            onClick={() => onAgentClick?.(agent.id)}
            className="rpg-panel flex min-w-[156px] flex-col justify-between px-3 py-2 text-left transition-all hover:brightness-110"
            style={{
              borderColor: isLocked
                ? "#1e3d5a"
                : isActive
                  ? `${agent.color}40`
                  : "#1e3d5a",
              opacity: isLocked ? 0.45 : 1,
              boxShadow: isActive
                ? `0 0 8px ${agent.color}20, inset 0 1px 0 ${agent.color}10`
                : undefined,
              cursor: onAgentClick && slotAgent ? "pointer" : "default",
            }}
          >
            {/* Agent name + indicator */}
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span
                className="text-[11px] font-mono font-bold tracking-[0.08em] truncate"
                style={{ color: isLocked ? "#2a5070" : agent.color }}
                title={slotAgent?.display_name ?? agent.name}
              >
                {slotAgent?.display_name ?? agent.name}
              </span>
              {isLocked ? (
                <span className="text-[8px]" style={{ color: "#2a5070" }}>
                  🔒
                </span>
              ) : (
                <div
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: statusColor,
                    boxShadow: isActive ? `0 0 4px ${dotGlow}` : undefined,
                  }}
                />
              )}
            </div>

            {/* Specialty */}
            <div
              className="mb-2 truncate text-[9px] font-mono uppercase tracking-[0.16em]"
              style={{ color: "#2a5070" }}
            >
              {slotAgent
                ? `${slotAgent.archetype} • ${isLocked ? "LOCKED" : slotAgent.role_level}`
                : "LOCKED • MARKET"}
            </div>

            {/* Task only when active */}
            <div className="min-h-[18px]">
              {!isLocked && task && (
                <p
                  className="text-[9px] font-mono truncate"
                  style={{ color: "#4a6580" }}
                  title={task.type.replace(/_/g, " ")}
                >
                  {task.type.replace(/_/g, " ")}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
