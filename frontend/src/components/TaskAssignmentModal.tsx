"use client";

import type { AgentDefinition, AgentId, CaseSystemNode, TaskType } from "@/types/investigation";

interface TaskAssignmentModalProps {
  node: CaseSystemNode;
  agents: AgentDefinition[];
  onAssign: (agentId: AgentId, taskType: TaskType) => void;
  onClose: () => void;
}

const TASK_LABEL: Record<TaskType, string> = {
  analyze_logs:           "Analyze Logs",
  detect_anomalies:       "Detect Anomalies",
  trace_connections:      "Trace Connections",
  trace_lateral_movement: "Trace Lateral Movement",
  recover_files:          "Recover Files",
  inspect_artifacts:      "Inspect Artifacts",
  reconstruct_timeline:   "Reconstruct Timeline",
  correlate_events:       "Correlate Events",
};

const NODE_TYPE_ICON: Record<CaseSystemNode["type"], string> = {
  server:      "▣",
  workstation: "◈",
  router:      "~",
  database:    "◆",
  archive:     "□",
  external:    "○",
};

const STATUS_COLOR: Record<CaseSystemNode["status"], string> = {
  clean:       "#00ff88",
  suspicious:  "#f59e0b",
  compromised: "#ff3a3a",
  offline:     "#4a6580",
  recovered:   "#00d4ff",
};

const AGENT_COLOR: Record<AgentId, string> = {
  logis:  "#c9d8e8",
  nexus:  "#00d4ff",
  filer:  "#f59e0b",
  chrono: "#b06fff",
};

export function TaskAssignmentModal({
  node,
  agents,
  onAssign,
  onClose,
}: TaskAssignmentModalProps) {
  const statusColor = STATUS_COLOR[node.status];
  const nodeIcon = NODE_TYPE_ICON[node.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
    >
      <div
        className="rpg-panel flex flex-col"
        style={{ width: 440, maxHeight: "80vh" }}
        data-testid="task-assignment-modal"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: "#4a6580" }}>
              {nodeIcon}
            </span>
            <span
              className="text-[11px] font-mono font-bold"
              style={{ color: "#c9d8e8" }}
            >
              {node.name}
            </span>
            <span
              className="text-[8px] font-mono px-1.5 py-0.5 rounded"
              style={{
                color: statusColor,
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}40`,
              }}
            >
              {node.status.toUpperCase()}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[9px] font-mono transition-opacity hover:opacity-60"
            style={{ color: "#4a6580" }}
          >
            [ESC]
          </button>
        </div>

        {/* Node info */}
        <div
          className="px-4 py-2 shrink-0"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div className="flex gap-4 text-[8px] font-mono mb-1.5">
            <span style={{ color: "#2a5070" }}>
              ID: <span style={{ color: "#4a6580" }}>{node.id}</span>
            </span>
            <span style={{ color: "#2a5070" }}>
              Type: <span style={{ color: "#4a6580" }}>{node.type}</span>
            </span>
            <span style={{ color: "#2a5070" }}>
              Findings: <span style={{ color: "#4a6580" }}>{node.knownFindings.length}</span>
            </span>
          </div>
          {/* Threat bar */}
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>
              Threat
            </span>
            <div className="flex-1 h-1 rounded-sm overflow-hidden" style={{ background: "#1e3d5a" }}>
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${node.threatLevel * 100}%`,
                  background: node.threatLevel > 0.7 ? "#ff3a3a" : node.threatLevel > 0.4 ? "#f59e0b" : "#00ff88",
                }}
              />
            </div>
            <span className="text-[7px] font-mono tabular-nums" style={{ color: "#4a6580" }}>
              {Math.round(node.threatLevel * 100)}%
            </span>
          </div>
        </div>

        {/* Assign section */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {agents.map((agent) => {
            const isBusy = agent.status !== "idle";
            const agentColor = AGENT_COLOR[agent.id];

            return (
              <div
                key={agent.id}
                style={{ borderBottom: "1px solid #0d1520" }}
              >
                {/* Agent header row */}
                <div
                  className="flex items-center gap-2 px-4 py-2"
                  style={{ background: "#080c12" }}
                >
                  <span
                    className="text-[9px] font-mono font-bold"
                    style={{ color: isBusy ? "#2a5070" : agentColor }}
                  >
                    {agent.name}
                  </span>
                  <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
                    {agent.specialty}
                  </span>
                  {isBusy && (
                    <span className="text-[7px] font-mono ml-auto" style={{ color: "#f59e0b" }}>
                      {agent.status.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Task buttons */}
                <div className="flex flex-wrap gap-1.5 px-4 py-2">
                  {agent.capabilities.map((taskType) => (
                    <button
                      key={taskType}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (!isBusy) {
                          onAssign(agent.id, taskType);
                          onClose();
                        }
                      }}
                      className="text-[8px] font-mono px-2 py-1 rounded transition-all"
                      style={{
                        background: isBusy ? "#0d1520" : `${agentColor}10`,
                        border: `1px solid ${isBusy ? "#1e3d5a" : `${agentColor}40`}`,
                        color: isBusy ? "#2a5070" : agentColor,
                        cursor: isBusy ? "not-allowed" : "pointer",
                        opacity: isBusy ? 0.5 : 1,
                      }}
                    >
                      {TASK_LABEL[taskType]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div
          className="px-4 py-2 shrink-0 text-[7px] font-mono"
          style={{ borderTop: "1px solid #1e3d5a", color: "#1e3d5a" }}
        >
          Select an agent + task to deploy. Busy agents cannot be reassigned.
        </div>
      </div>
    </div>
  );
}
