"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AgentDefinition,
  AgentId,
  AgentResult,
  CaseSystemNode,
  SystemNodeModel,
} from "@/types/investigation";

interface FloatingSystemInspectorProps {
  cityNode: SystemNodeModel;
  sourceNode: CaseSystemNode | null;
  findings: AgentResult[];
  agents: AgentDefinition[];
  lockedAgents: AgentId[];
  funds: number;
  position: {
    left: number;
    top: number;
  };
  onSubmitInstruction: (agentId: AgentId, rawInstruction: string) => void;
  onToggleIsolation: () => void;
  onClose: () => void;
}

const STATUS_COLOR: Record<SystemNodeModel["status"], string> = {
  healthy: "#35f7cf",
  suspicious: "#ffb347",
  compromised: "#ff3a3a",
  isolated: "#4aa8ff",
};

const AGENT_COLOR: Record<AgentId, string> = {
  logis: "#c9d8e8",
  nexus: "#00d4ff",
  filer: "#f59e0b",
  chrono: "#b06fff",
};

export function FloatingSystemInspector({
  cityNode,
  sourceNode,
  findings,
  agents,
  lockedAgents,
  funds,
  position,
  onSubmitInstruction,
  onToggleIsolation,
  onClose,
}: FloatingSystemInspectorProps) {
  const [instruction, setInstruction] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId>("logis");

  useEffect(() => {
    const first = agents.find(
      (agent) => !lockedAgents.includes(agent.id) && agent.status === "idle",
    );
    if (first) setSelectedAgentId(first.id);
    setInstruction("");
  }, [cityNode.id, agents, lockedAgents]);

  const statusColor = STATUS_COLOR[cityNode.status];
  const actionable = sourceNode !== null;
  const relatedFindings = useMemo(
    () =>
      findings
        .filter((finding) => finding.nodeId === sourceNode?.id)
        .slice(-3)
        .reverse(),
    [findings, sourceNode?.id],
  );

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const selectedAgentLocked = lockedAgents.includes(selectedAgentId);
  const selectedAgentBusy = selectedAgent ? selectedAgent.status !== "idle" : true;
  const canSubmit =
    actionable &&
    !selectedAgentLocked &&
    !selectedAgentBusy &&
    instruction.trim().length >= 4;

  return (
    <div
      className="absolute z-50 w-[360px] rpg-panel animate-[modalIn_140ms_ease-out]"
      style={{
        left: position.left,
        top: position.top,
        background: "rgba(8, 12, 18, 0.96)",
        border: `1px solid ${statusColor}66`,
        boxShadow: `0 10px 28px rgba(0,0,0,0.75), 0 0 20px ${statusColor}24`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className="flex items-start justify-between px-3 py-2"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <div>
          <div className="text-[10px] font-mono font-bold" style={{ color: "#cfe9ff" }}>
            {cityNode.id}
          </div>
          <div className="text-[8px] font-mono" style={{ color: "#6ca4c4" }}>
            {cityNode.label}
          </div>
          <div className="mt-1 text-[7px] font-mono uppercase tracking-widest" style={{ color: statusColor }}>
            {cityNode.status}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleIsolation}
            className="rpg-panel px-2 py-1 text-[7px] font-mono uppercase tracking-widest hover:opacity-80"
            style={{ color: cityNode.status === "isolated" ? "#35f7cf" : "#ffcf70" }}
          >
            {cityNode.status === "isolated" ? "release" : "isolate"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[8px] font-mono uppercase tracking-widest hover:opacity-70"
            style={{ color: "#6c8ca8" }}
          >
            close
          </button>
        </div>
      </div>

      <div className="px-3 py-2" style={{ borderBottom: "1px solid #1e3d5a" }}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "#6ca4c4" }}>
            Threat
          </span>
          <span className="text-[8px] font-mono tabular-nums" style={{ color: statusColor }}>
            {Math.round(cityNode.threatLevel * 100)}%
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-sm" style={{ background: "#173146" }}>
          <div
            className="h-full rounded-sm"
            style={{
              width: `${Math.round(cityNode.threatLevel * 100)}%`,
              background: statusColor,
            }}
          />
        </div>
      </div>

      <div className="px-3 py-2" style={{ borderBottom: "1px solid #1e3d5a" }}>
        <div className="mb-2 text-[8px] font-mono uppercase tracking-widest" style={{ color: "#6ca4c4" }}>
          Dispatch
        </div>
        <div className="mb-2 grid grid-cols-4 gap-1">
          {agents.map((agent) => {
            const isLocked = lockedAgents.includes(agent.id);
            const isBusy = agent.status !== "idle";
            const isSelected = selectedAgentId === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => {
                  if (isLocked) return;
                  setSelectedAgentId(agent.id);
                }}
                className="px-1 py-1 text-[8px] font-mono uppercase tracking-wide"
                style={{
                  border: `1px solid ${isSelected ? `${AGENT_COLOR[agent.id]}88` : "#1e3d5a"}`,
                  background: isSelected ? `${AGENT_COLOR[agent.id]}1f` : "#0a1320",
                  color: isLocked ? "#38526a" : AGENT_COLOR[agent.id],
                  opacity: isBusy && !isLocked ? 0.7 : 1,
                }}
              >
                {agent.name}
              </button>
            );
          })}
        </div>
        <input
          value={instruction}
          onChange={(event) => setInstruction(event.target.value)}
          placeholder={
            actionable
              ? "e.g. trace lateral movement through this sector"
              : "Telemetry unavailable for this node."
          }
          disabled={!actionable}
          className="w-full rpg-panel px-2 py-1 text-[9px] font-mono outline-none"
          style={{
            color: actionable ? "#d3e9ff" : "#6d8da8",
            background: "#0a1320",
          }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[7px] font-mono" style={{ color: "#4f6f8b" }}>
            funds: {funds.toLocaleString()}₡
          </span>
          <button
            type="button"
            onClick={() => {
              if (!canSubmit || !selectedAgent) return;
              onSubmitInstruction(selectedAgent.id, instruction.trim());
            }}
            disabled={!canSubmit}
            className="rpg-panel px-2 py-1 text-[8px] font-mono uppercase tracking-widest"
            style={{
              color: canSubmit ? "#35f7cf" : "#4f6f8b",
              borderColor: canSubmit ? "#35f7cf66" : "#1e3d5a",
            }}
          >
            dispatch
          </button>
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="mb-1 text-[8px] font-mono uppercase tracking-widest" style={{ color: "#6ca4c4" }}>
          Evidence
        </div>
        {relatedFindings.length === 0 ? (
          <div className="text-[8px] font-mono" style={{ color: "#4f6f8b" }}>
            No recovered evidence yet for this system.
          </div>
        ) : (
          <div className="space-y-1">
            {relatedFindings.map((finding) => (
              <div
                key={`${finding.nodeId}-${finding.taskType}-${finding.summary}`}
                className="rounded-sm px-2 py-1"
                style={{ background: "#0c1826", border: "1px solid #1e3d5a" }}
              >
                <div className="text-[8px] font-mono" style={{ color: "#cfe9ff" }}>
                  {finding.summary}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
