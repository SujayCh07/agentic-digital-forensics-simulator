"use client";

import type { AgentDefinition, Task } from "@/types/investigation";

interface AgentStatusBarProps {
  agents: AgentDefinition[];
  activeTasks: Task[];
}

const STATUS_LABEL: Record<AgentDefinition["status"], string> = {
  idle:      "IDLE",
  moving:    "MOVING",
  executing: "EXECUTING",
  reporting: "REPORTING",
  standby:   "STANDBY",
};

const STATUS_COLOR: Record<AgentDefinition["status"], string> = {
  idle:      "#2a5070",
  moving:    "#f59e0b",
  executing: "#ff3a3a",
  reporting: "#b06fff",
  standby:   "#1e3d5a",
};

const STATUS_DOT_GLOW: Record<AgentDefinition["status"], string> = {
  idle:      "#2a5070",
  moving:    "#f59e0b88",
  executing: "#ff3a3a88",
  reporting: "#b06fff88",
  standby:   "#1e3d5a",
};

export function AgentStatusBar({ agents, activeTasks }: AgentStatusBarProps) {
  return (
    <div className="flex gap-2 h-full items-stretch">
      {agents.map((agent) => {
        const task = activeTasks.find((t) => t.agentId === agent.id && t.status !== "complete");
        const statusColor = STATUS_COLOR[agent.status];
        const dotGlow = STATUS_DOT_GLOW[agent.status];
        const isActive = agent.status !== "idle" && agent.status !== "standby";

        return (
          <div
            key={agent.id}
            className="rpg-panel flex flex-col justify-between px-2.5 py-1.5 min-w-[140px]"
            style={{
              borderColor: isActive ? `${agent.color}40` : "#1e3d5a",
              boxShadow: isActive
                ? `0 0 8px ${agent.color}20, inset 0 1px 0 ${agent.color}10`
                : undefined,
            }}
          >
            {/* Agent name + indicator */}
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span
                className="text-[10px] font-mono font-bold tracking-wider"
                style={{ color: agent.color }}
              >
                {agent.name}
              </span>
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: statusColor,
                  boxShadow: isActive ? `0 0 4px ${dotGlow}` : undefined,
                }}
              />
            </div>

            {/* Specialty */}
            <div
              className="text-[7px] font-mono uppercase tracking-widest mb-1.5 truncate"
              style={{ color: "#2a5070" }}
            >
              {agent.specialty}
            </div>

            {/* Status + current task */}
            <div>
              <span
                className="text-[8px] font-mono"
                style={{ color: statusColor }}
              >
                {STATUS_LABEL[agent.status]}
              </span>
              {task && (
                <p
                  className="mt-0.5 text-[7px] font-mono truncate"
                  style={{ color: "#4a6580" }}
                  title={task.type.replace(/_/g, " ")}
                >
                  {task.type.replace(/_/g, " ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
