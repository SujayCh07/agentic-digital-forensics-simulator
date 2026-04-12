"use client";

import type { AgentDefinition, AgentId, Task } from "@/types/investigation";
import { audioManager } from "@/lib/audioManager";

interface AgentStatusBarProps {
  agents: AgentDefinition[];
  activeTasks: Task[];
  /** IDs of agents that haven't been unlocked yet */
  lockedAgents?: AgentId[];
  /** Called when an agent card is clicked (for opening chat) */
  onAgentClick?: (agentId: AgentId) => void;
}

const STATUS_LABEL: Record<AgentDefinition["status"], string> = {
  idle: "IDLE",
  moving: "MOVING",
  executing: "EXECUTING",
  reporting: "REPORTING",
  standby: "STANDBY",
};

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
  onAgentClick,
}: AgentStatusBarProps) {
  return (
    <div className="flex gap-2 h-full items-stretch">
      {agents.map((agent) => {
        const isLocked = lockedAgents.includes(agent.id);
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
            onClick={() => {
              if (isLocked) { audioManager.playLockedClick(); return; }
              audioManager.playButtonClick();
              onAgentClick?.(agent.id);
            }}
            className="rpg-panel flex flex-col justify-between px-2.5 py-1.5 min-w-[130px] text-left transition-all hover:brightness-110"
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
              cursor: isLocked ? "default" : "pointer",
            }}
          >
            {/* Agent name + indicator */}
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span
                className="text-[10px] font-mono font-bold tracking-wider"
                style={{ color: isLocked ? "#2a5070" : agent.color }}
              >
                {agent.name}
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
              className="text-[7px] font-mono uppercase tracking-widest mb-1.5 truncate"
              style={{ color: "#2a5070" }}
            >
              {isLocked ? "LOCKED" : agent.specialty}
            </div>

            {/* Status + current task */}
            <div>
              <span
                className="text-[8px] font-mono"
                style={{ color: statusColor }}
              >
                {isLocked ? "—" : STATUS_LABEL[agent.status]}
              </span>
              {!isLocked && task && (
                <p
                  className="mt-0.5 text-[7px] font-mono truncate"
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
