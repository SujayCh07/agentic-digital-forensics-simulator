"use client";

import { useEffect, useMemo, useState } from "react";
import { evidenceKeyForFinding } from "@/lib/investigationProgression";
import type {
  AgentDefinition,
  AgentId,
  AgentResult,
  CaseSystemNode,
  IssueState,
} from "@/types/investigation";

interface FloatingSystemInspectorProps {
  node: CaseSystemNode;
  findings: AgentResult[];
  issues: IssueState[];
  agents: AgentDefinition[];
  lockedAgents: AgentId[];
  funds: number;
  position: {
    left: number;
    top: number;
  };
  onSubmitInstruction: (agentId: AgentId, rawInstruction: string) => void;
  onResolveIssue: (issueId: string, agentId: AgentId) => void;
  onClose: () => void;
}

const STATUS_COLOR: Record<CaseSystemNode["status"], string> = {
  clean: "#35f7cf",
  suspicious: "#ffb347",
  compromised: "#ff5c5c",
  offline: "#4f6f8b",
  recovered: "#00d4ff",
};

const AGENT_COLOR: Record<AgentId, string> = {
  logis: "#c9d8e8",
  nexus: "#00d4ff",
  filer: "#f59e0b",
  chrono: "#b06fff",
};

const REQUIRED_AGENT_LABEL: Record<IssueState["requiredAgent"], AgentId> = {
  LOGIS: "logis",
  NEXUS: "nexus",
  FILER: "filer",
  CHRONO: "chrono",
};

export function FloatingSystemInspector({
  node,
  findings,
  issues,
  agents,
  lockedAgents,
  funds,
  position,
  onSubmitInstruction,
  onResolveIssue,
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
  }, [agents, lockedAgents, node.id]);

  const statusColor = STATUS_COLOR[node.status];
  const nodeFindings = useMemo(
    () => findings.filter((finding) => finding.nodeId === node.id).reverse(),
    [findings, node.id],
  );
  const nodeIssues = useMemo(
    () => issues.filter((issue) => issue.buildingId === node.id),
    [issues, node.id],
  );
  const findingKeys = useMemo(
    () => new Set(nodeFindings.map((finding) => evidenceKeyForFinding(finding))),
    [nodeFindings],
  );

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
  const selectedAgentLocked = lockedAgents.includes(selectedAgentId);
  const selectedAgentBusy = selectedAgent ? selectedAgent.status !== "idle" : true;
  const canDispatch =
    !selectedAgentLocked &&
    !selectedAgentBusy &&
    instruction.trim().length >= 4;

  return (
    <div
      className="absolute z-40 w-[390px] rounded-xl"
      style={{
        left: position.left,
        top: position.top,
        background: "rgba(8, 12, 18, 0.96)",
        border: `1px solid ${statusColor}55`,
        boxShadow: `0 16px 40px rgba(0,0,0,0.78), 0 0 18px ${statusColor}1f`,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className="flex items-start justify-between px-4 py-3"
        style={{ borderBottom: "1px solid #173146" }}
      >
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.14em]" style={{ color: "#cfe9ff" }}>
            {node.id}
          </div>
          <div className="mt-1 text-[12px] font-mono" style={{ color: "#d9edff" }}>
            {node.name}
          </div>
          <div className="mt-1 text-[8px] font-mono uppercase tracking-[0.18em]" style={{ color: statusColor }}>
            {node.status}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-[8px] font-mono uppercase tracking-[0.16em] hover:opacity-70"
          style={{ color: "#6c8ca8" }}
        >
          close
        </button>
      </div>

      <div className="px-4 py-3" style={{ borderBottom: "1px solid #173146" }}>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: "#6ca4c4" }}>
            Node Threat
          </span>
          <span className="text-[8px] font-mono tabular-nums" style={{ color: statusColor }}>
            {Math.round(node.threatLevel * 100)}%
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full" style={{ background: "#173146" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.round(node.threatLevel * 100)}%`,
              background: statusColor,
            }}
          />
        </div>
      </div>

      <div className="px-4 py-3" style={{ borderBottom: "1px solid #173146" }}>
        <div className="mb-2 text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: "#6ca4c4" }}>
          Dispatch Agent
        </div>
        <div className="grid grid-cols-4 gap-1.5">
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
                className="rounded-md px-2 py-1.5 text-[8px] font-mono uppercase tracking-[0.12em]"
                style={{
                  border: `1px solid ${isSelected ? `${AGENT_COLOR[agent.id]}88` : "#1e3d5a"}`,
                  background: isSelected ? `${AGENT_COLOR[agent.id]}16` : "#0a1320",
                  color: isLocked ? "#38526a" : AGENT_COLOR[agent.id],
                  opacity: isBusy && !isLocked ? 0.6 : 1,
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
          placeholder="e.g. trace the pivot path through this node"
          className="mt-3 w-full rounded-md px-2 py-2 text-[9px] font-mono outline-none"
          style={{ background: "#0a1320", border: "1px solid #1e3d5a", color: "#d3e9ff" }}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[7px] font-mono" style={{ color: "#4f6f8b" }}>
            funds: {funds.toLocaleString()}C
          </span>
          <button
            type="button"
            onClick={() => {
              if (!selectedAgent || !canDispatch) return;
              onSubmitInstruction(selectedAgent.id, instruction.trim());
            }}
            disabled={!canDispatch}
            className="rounded-md px-3 py-1.5 text-[8px] font-mono uppercase tracking-[0.16em]"
            style={{
              color: canDispatch ? "#35f7cf" : "#4f6f8b",
              border: `1px solid ${canDispatch ? "#35f7cf66" : "#1e3d5a"}`,
              background: canDispatch ? "rgba(53,247,207,0.08)" : "rgba(15,25,39,0.4)",
            }}
          >
            dispatch task
          </button>
        </div>
      </div>

      <div className="px-4 py-3" style={{ borderBottom: "1px solid #173146" }}>
        <div className="mb-2 text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: "#6ca4c4" }}>
          Actionable Issues
        </div>
        {nodeIssues.length === 0 ? (
          <div className="text-[8px] font-mono" style={{ color: "#4f6f8b" }}>
            No structured midgame issues are attached to this node yet.
          </div>
        ) : (
          <div className="space-y-2">
            {nodeIssues.map((issue) => {
              const requiredAgentId = REQUIRED_AGENT_LABEL[issue.requiredAgent];
              const selectedMatches = selectedAgentId === requiredAgentId;
              const readyForAttempt =
                issue.status === "available" &&
                !selectedAgentLocked &&
                !selectedAgentBusy;

              return (
                <div
                  key={issue.id}
                  className="rounded-lg px-3 py-2"
                  style={{ background: "#0c1826", border: "1px solid #1e3d5a" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[9px] font-mono font-bold" style={{ color: "#d8ecff" }}>
                        {issue.title}
                      </div>
                      <div className="mt-1 text-[8px] font-mono leading-5" style={{ color: "#6f87a1" }}>
                        {issue.description}
                      </div>
                    </div>
                    <span
                      className="rounded px-2 py-1 text-[7px] font-mono uppercase tracking-[0.16em]"
                      style={{
                        color:
                          issue.status === "resolved"
                            ? "#35f7cf"
                            : issue.status === "available"
                              ? "#ffcf70"
                              : issue.status === "failed_attempt"
                                ? "#ff7f7f"
                                : "#4f6f8b",
                        border: "1px solid #1e3d5a",
                      }}
                    >
                      {issue.status}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[7px] font-mono uppercase tracking-[0.14em]">
                    <span style={{ color: "#4f6f8b" }}>Required agent</span>
                    <span style={{ color: AGENT_COLOR[requiredAgentId] }}>{issue.requiredAgent}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {issue.requiredEvidence.map((evidenceKey) => {
                      const known = findingKeys.has(evidenceKey);
                      return (
                        <span
                          key={evidenceKey}
                          className="rounded px-2 py-1 text-[7px] font-mono"
                          style={{
                            color: known ? "#35f7cf" : "#ffcf70",
                            background: known ? "rgba(53,247,207,0.08)" : "rgba(255,207,112,0.08)",
                            border: `1px solid ${known ? "#35f7cf33" : "#ffcf7033"}`,
                          }}
                        >
                          {known ? "have" : "need"} {evidenceKey}
                        </span>
                      );
                    })}
                  </div>

                  {issue.feedbackMessage ? (
                    <div className="mt-2 text-[8px] font-mono leading-5" style={{ color: "#7aa5c6" }}>
                      {issue.feedbackMessage}
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[7px] font-mono" style={{ color: selectedMatches ? AGENT_COLOR[requiredAgentId] : "#4f6f8b" }}>
                      {selectedMatches
                        ? "Selected agent matches issue role."
                        : `Select ${issue.requiredAgent} to resolve this issue.`}
                    </span>
                    <button
                      type="button"
                      onClick={() => onResolveIssue(issue.id, selectedAgentId)}
                      disabled={!readyForAttempt}
                      className="rounded-md px-3 py-1.5 text-[8px] font-mono uppercase tracking-[0.16em]"
                      style={{
                        color: readyForAttempt ? "#00d4ff" : "#4f6f8b",
                        border: `1px solid ${readyForAttempt ? "#00d4ff55" : "#1e3d5a"}`,
                        background: readyForAttempt ? "rgba(0,212,255,0.08)" : "rgba(15,25,39,0.4)",
                      }}
                    >
                      assign resolve
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 py-3">
        <div className="mb-2 text-[8px] font-mono uppercase tracking-[0.16em]" style={{ color: "#6ca4c4" }}>
          Recent Evidence
        </div>
        {nodeFindings.length === 0 ? (
          <div className="text-[8px] font-mono" style={{ color: "#4f6f8b" }}>
            No recovered findings have been linked to this node yet.
          </div>
        ) : (
          <div className="space-y-2">
            {nodeFindings.slice(0, 3).map((finding) => (
              <div
                key={finding.findingId}
                className="rounded-md px-3 py-2"
                style={{ background: "#0c1826", border: "1px solid #1e3d5a" }}
              >
                <div className="text-[8px] font-mono" style={{ color: "#cfe9ff" }}>
                  {finding.summary}
                </div>
                <div className="mt-1 text-[7px] font-mono" style={{ color: "#6f87a1" }}>
                  {finding.evidenceKey}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
