"use client";

/**
 * NIPS — Task Assignment Modal
 *
 * Player selects an agent, types a natural-language instruction,
 * and the system interprets it into a task. Wrong agent = hard fail.
 * Locked agents are gated through the marketplace, not unlocked here directly.
 */

import { useEffect, useRef, useState } from "react";
import { resolveIntent } from "@/lib/intentResolver";
import type { AgentDefinition, AgentId, CaseSystemNode } from "@/types/investigation";

interface TaskAssignmentModalProps {
  node: CaseSystemNode;
  agents: AgentDefinition[];
  /** Agent IDs the player has not yet unlocked */
  lockedAgents: AgentId[];
  /** Current funds balance */
  funds: number;
  /** Called when player submits a valid instruction */
  onSubmitInstruction: (agentId: AgentId, rawInstruction: string) => void;
  onClose: () => void;
}

const NODE_ICON: Record<CaseSystemNode["type"], string> = {
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

const AGENT_HINT: Record<AgentId, string> = {
  logis:  "Logs · Auth · Anomaly detection",
  nexus:  "Network traffic · Connections · Lateral movement",
  filer:  "Files · Artifacts · Steganography · Recovery",
  chrono: "Timeline · Sequence correlation · Causal chains",
};

// Agent-specific instruction placeholders
const AGENT_PLACEHOLDER: Record<AgentId, string> = {
  logis:  "e.g. Check auth logs for failed logins • Look for log tampering • Who accessed this server?",
  nexus:  "e.g. Inspect outbound traffic • Trace where this connected to • Check for lateral movement",
  filer:  "e.g. Recover deleted files • Look for hidden payloads • What tools were left behind?",
  chrono: "e.g. Reconstruct the event sequence • When did this start? • Correlate with other systems",
};

export function TaskAssignmentModal({
  node,
  agents,
  lockedAgents,
  funds,
  onSubmitInstruction,
  onClose,
}: TaskAssignmentModalProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<AgentId | null>(null);
  const [instruction, setInstruction] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-select first available (unlocked + idle) agent
  useEffect(() => {
    const first = agents.find(a => !lockedAgents.includes(a.id) && a.status === "idle");
    if (first) setSelectedAgentId(first.id);
  }, [agents, lockedAgents]);

  // Focus input when agent selected
  useEffect(() => {
    if (selectedAgentId) inputRef.current?.focus();
  }, [selectedAgentId]);

  const resolved = selectedAgentId && instruction.trim().length >= 4
    ? resolveIntent(instruction)
    : null;

  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;
  const isAgentBusy = selectedAgent?.status !== "idle";
  const isLocked = selectedAgentId ? lockedAgents.includes(selectedAgentId) : false;

  const canSubmit =
    selectedAgentId &&
    !isAgentBusy &&
    !isLocked &&
    instruction.trim().length >= 4;

  const handleSubmit = () => {
    if (!canSubmit || !selectedAgentId) return;
    onSubmitInstruction(selectedAgentId, instruction.trim());
    onClose();
  };

  const statusColor = STATUS_COLOR[node.status];
  const nodeIcon = NODE_ICON[node.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.70)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rpg-panel flex flex-col"
        style={{ width: 520, maxHeight: "85vh" }}
        data-testid="task-assignment-modal"
      >
        {/* ── Header ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono" style={{ color: "#4a6580" }}>
              {nodeIcon}
            </span>
            <span className="text-[12px] font-mono font-bold" style={{ color: "#c9d8e8" }}>
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
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono" style={{ color: "#00ff88" }}>
              {funds.toLocaleString()}₡
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[9px] font-mono transition-opacity hover:opacity-60"
              style={{ color: "#4a6580" }}
            >
              [ESC]
            </button>
          </div>
        </div>

        {/* ── Node threat bar ────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-4 py-2 shrink-0"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>
            ID: {node.id}
          </span>
          <span className="text-[7px] font-mono" style={{ color: "#1e3d5a" }}>·</span>
          <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
            {node.type}
          </span>
          <span className="text-[7px] font-mono" style={{ color: "#1e3d5a" }}>·</span>
          <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
            {node.knownFindings.length} finding{node.knownFindings.length !== 1 ? "s" : ""}
          </span>
          <div className="flex-1 h-0.5 rounded-sm overflow-hidden" style={{ background: "#1e3d5a" }}>
            <div
              className="h-full"
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

        {/* ── Agent selector ────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="text-[8px] font-mono uppercase tracking-widest mb-2" style={{ color: "#2a5070" }}>
            Select Agent
          </div>
          <div className="flex gap-2">
            {agents.map((agent) => {
              const isSelected = selectedAgentId === agent.id;
              const isLockedAgent = lockedAgents.includes(agent.id);
              const isBusy = agent.status !== "idle";
              const agentColor = AGENT_COLOR[agent.id];

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => {
                    if (isLockedAgent) return; // handled by unlock button
                    if (!isBusy) setSelectedAgentId(agent.id);
                  }}
                  className="flex-1 flex flex-col items-start p-2 rounded transition-all"
                  style={{
                    background: isSelected ? `${agentColor}12` : "#080c12",
                    border: `1px solid ${isSelected ? `${agentColor}60` : "#1e3d5a"}`,
                    cursor: isLockedAgent || isBusy ? "default" : "pointer",
                    opacity: isBusy && !isLockedAgent ? 0.6 : 1,
                    boxShadow: isSelected ? `0 0 8px ${agentColor}20` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span
                      className="text-[9px] font-mono font-bold"
                      style={{ color: isLockedAgent ? "#2a5070" : agentColor }}
                    >
                      {agent.name}
                    </span>
                    {isLockedAgent ? (
                      <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
                        🔒
                      </span>
                    ) : (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: isBusy ? "#f59e0b" : "#00ff88",
                          boxShadow: isBusy ? "0 0 4px #f59e0b80" : "0 0 4px #00ff8880",
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
                    {isLockedAgent
                      ? "Recruit in marketplace"
                      : isBusy
                        ? agent.status.toUpperCase()
                        : agent.specialty}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Instruction input ──────────────────────────────────── */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid #1e3d5a" }}
        >
          <div className="text-[8px] font-mono uppercase tracking-widest mb-2" style={{ color: "#2a5070" }}>
            Instruction
            {selectedAgent && !isLocked && (
              <span className="ml-2 normal-case" style={{ color: "#1e3d5a" }}>
                — {selectedAgent.name} is listening
              </span>
            )}
          </div>

          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder={
                !selectedAgentId
                  ? "Select an agent first..."
                  : isLocked
                    ? "Agent is locked. Recruit this role in the marketplace."
                    : isAgentBusy
                      ? `${selectedAgent?.name} is ${selectedAgent?.status}...`
                      : selectedAgentId
                        ? AGENT_PLACEHOLDER[selectedAgentId]
                        : "Describe what to investigate..."
              }
              disabled={!selectedAgentId || isLocked || isAgentBusy}
              className="w-full text-[9px] font-mono outline-none px-3 py-2 rounded"
              style={{
                background: "#080c12",
                border: `1px solid ${
                  resolved?.taskType ? "#00d4ff40" : resolved?.failReason ? "#ff3a3a30" : "#1e3d5a"
                }`,
                color: "#c9d8e8",
                caretColor: "#00d4ff",
                opacity: (!selectedAgentId || isLocked || isAgentBusy) ? 0.4 : 1,
              }}
            />
          </div>

          {/* ── Intent interpretation preview ─────────────────────── */}
          <div className="mt-2 min-h-[28px] flex items-center">
            {resolved ? (
              resolved.taskType ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[8px] font-mono" style={{ color: "#00d4ff" }}>▷</span>
                  <span className="text-[8px] font-mono flex-1" style={{ color: "#4a6580" }}>
                    {resolved.interpretation}
                  </span>
                  <span
                    className="text-[7px] font-mono tabular-nums px-1 rounded"
                    style={{
                      color: resolved.confidence >= 0.7 ? "#00ff88" : "#f59e0b",
                      background: resolved.confidence >= 0.7 ? "#00ff8815" : "#f59e0b15",
                    }}
                  >
                    {Math.round(resolved.confidence * 100)}%
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono" style={{ color: "#ff3a3a" }}>✕</span>
                  <span className="text-[8px] font-mono" style={{ color: "#ff3a3a60" }}>
                    {resolved.failReason}
                  </span>
                </div>
              )
            ) : instruction.length >= 4 ? (
              <span className="text-[8px] font-mono animate-pulse" style={{ color: "#1e3d5a" }}>
                Interpreting...
              </span>
            ) : (
              <span className="text-[8px] font-mono" style={{ color: "#1e3d5a" }}>
                {selectedAgentId && !isLocked && !isAgentBusy
                  ? `${AGENT_HINT[selectedAgentId as AgentId]}`
                  : "—"}
              </span>
            )}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderTop: "1px solid #1e3d5a" }}
        >
          <span className="text-[7px] font-mono" style={{ color: "#1e3d5a" }}>
            Wrong agent or unclear instruction = failed task + time lost
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[9px] font-mono rounded transition-opacity hover:opacity-70"
              style={{
                background: "#080c12",
                border: "1px solid #1e3d5a",
                color: "#4a6580",
              }}
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-4 py-1.5 text-[9px] font-mono rounded transition-all"
              style={{
                background: canSubmit ? "rgba(0,212,255,0.12)" : "#0d1520",
                border: `1px solid ${canSubmit ? "#00d4ff" : "#1e3d5a"}`,
                color: canSubmit ? "#00d4ff" : "#2a5070",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? "0 0 10px rgba(0,212,255,0.15)" : undefined,
              }}
            >
              DEPLOY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
