"use client";

import type {
  AgentDefinition,
  SystemNode,
  TaskType,
} from "@/types/investigation";

const LABELS: Record<TaskType, string> = {
  analyze_logs: "Analyze Logs",
  detect_anomalies: "Detect Anomalies",
  trace_connections: "Trace Connections",
  identify_lateral_movement: "Identify Lateral Movement",
  recover_files: "Recover Files",
  inspect_artifacts: "Inspect Artifacts",
  reconstruct_timeline: "Reconstruct Timeline",
  correlate_events: "Correlate Events",
};

interface Props {
  node: SystemNode | null;
  agents: AgentDefinition[];
  onAssign: (agentId: string, taskType: TaskType) => void;
}

export function TaskAssignmentPanel({ node, agents, onAssign }: Props) {
  if (!node) {
    return (
      <div className="rpg-panel p-3 text-[10px] font-mono text-[var(--muted)]">
        Select a building/system on the map to assign a task.
      </div>
    );
  }

  return (
    <div className="rpg-panel p-3">
      <div className="mb-2 text-[10px] font-mono uppercase tracking-widest text-[var(--accent-cyan)]">
        Task Assignment
      </div>
      <div className="mb-2 text-[12px] font-mono text-[var(--foreground)]">
        {node.name} ({node.type})
      </div>
      <div className="space-y-2">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded border border-white/10 p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-mono text-[var(--foreground)]">
                {agent.name}
              </span>
              <span className="text-[9px] font-mono uppercase text-[var(--muted)]">
                {agent.currentStatus}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {agent.capabilities.map((capability) => (
                <button
                  key={`${agent.id}-${capability}`}
                  type="button"
                  disabled={agent.currentStatus !== "idle"}
                  onClick={() => onAssign(agent.id, capability)}
                  className="rounded border border-[var(--accent-cyan)] px-2 py-1 text-[9px] font-mono text-[var(--foreground)] disabled:opacity-40"
                >
                  {LABELS[capability]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
