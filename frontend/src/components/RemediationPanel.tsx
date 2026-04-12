"use client";

import { useEffect, useState } from "react";
import { executeRemediation } from "@/lib/investigationAgentClient";
import type {
  NipsAgentInstance,
  RemediationResult,
} from "@/types/investigation";

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

const ACTIONS = [
  {
    id: "block_egress" as const,
    label: "Block Egress",
    cost: 250,
    description: "Cut outbound traffic from a compromised node.",
    bestAgent: "LOGIS",
    bestReason: "Network routing specialist",
  },
  {
    id: "isolate" as const,
    label: "Isolate",
    cost: 200,
    description: "Quarantine and disconnect a compromised node.",
    bestAgent: "NEXUS",
    bestReason: "Systems architect",
  },
  {
    id: "patch" as const,
    label: "Patch",
    cost: 150,
    description: "Apply security patches to a vulnerable node.",
    bestAgent: "NEXUS",
    bestReason: "Systems hardening",
  },
  {
    id: "restore" as const,
    label: "Restore",
    cost: 300,
    description: "Restore node from a clean backup.",
    bestAgent: "FILER",
    bestReason: "Data recovery specialist",
  },
  {
    id: "remediate" as const,
    label: "Remediate",
    cost: 100,
    description: "General remediation and forensic sweep.",
    bestAgent: "CHRONO",
    bestReason: "Timeline & forensics",
  },
] as const;

const SUGGESTED_NODES = [
  "MAIL-01",
  "DB-02",
  "GW-01",
  "WS-03",
  "EXT-01",
  "BACKUP-01",
  "FW-01",
];

const ARCHETYPE_COLOR: Record<string, string> = {
  LOGIS: "#22d3ee",
  NEXUS: "#a78bfa",
  FILER: "#f59e0b",
  CHRONO: "#34d399",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RemediationPanelProps {
  funds: number;
  agents: NipsAgentInstance[];
  lastResult: RemediationResult | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RemediationPanel({
  funds,
  agents,
  lastResult,
  onClose,
}: RemediationPanelProps) {
  const [selectedAction, setSelectedAction] = useState<
    (typeof ACTIONS)[number]["id"] | null
  >(null);
  const [targetNode, setTargetNode] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<NipsAgentInstance | null>(
    null,
  );
  const [executing, setExecuting] = useState(false);

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0]);
    }
  }, [agents, selectedAgent]);

  // Reset executing when parent pushes a result
  useEffect(() => {
    if (lastResult) setExecuting(false);
  }, [lastResult]);

  const action = ACTIONS.find((a) => a.id === selectedAction);
  const canExecute =
    !executing &&
    selectedAction !== null &&
    targetNode.trim().length > 0 &&
    selectedAgent !== null;
  const affordable = action ? funds >= action.cost : false;

  const handleExecute = () => {
    if (!canExecute || !selectedAction || !affordable || !selectedAgent) return;
    setExecuting(true);
    executeRemediation(
      selectedAction,
      targetNode.trim().toUpperCase(),
      selectedAgent.archetype,
    );
  };

  const resultColor =
    lastResult === null
      ? "#4a6580"
      : lastResult.progress_delta >= 10
        ? "#34d399"
        : lastResult.progress_delta >= 4
          ? "#f59e0b"
          : "#ef4444";

  return (
    /* Full-screen backdrop */
    <div
      className="fixed inset-0 z-[85] flex items-start justify-end"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
    >
      {/* Panel — positioned over right column */}
      <div
        className="relative flex flex-col h-full overflow-y-auto"
        style={{
          width: 300,
          background: "#070e1a",
          borderLeft: "1px solid #1e3d5a",
          boxShadow: "-16px 0 48px rgba(0,0,0,0.7)",
        }}
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #1e3d5a" }}
        >
          <div>
            <div
              className="text-[11px] font-mono font-bold"
              style={{ color: "#00d4ff" }}
            >
              REMEDIATION
            </div>
            <div
              className="mt-0.5 text-[8px] font-mono uppercase tracking-widest"
              style={{ color: "#2a5070" }}
            >
              Select action · agent · target node
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[16px] font-mono text-slate-600 hover:text-slate-300 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-4">
          {/* ── Step 1: Action ────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div
              className="text-[9px] font-mono uppercase tracking-widest"
              style={{ color: "#00d4ff" }}
            >
              1 — Select Action
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAction(a.id)}
                  className="flex items-center justify-between rounded px-3 py-2 text-left transition-all"
                  style={{
                    background:
                      selectedAction === a.id
                        ? "rgba(0,212,255,0.1)"
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedAction === a.id ? "#00d4ff" : "#1e3d5a"}`,
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-[10px] font-mono font-bold"
                      style={{
                        color: selectedAction === a.id ? "#00d4ff" : "#c9d8e8",
                      }}
                    >
                      {a.label}
                    </span>
                    <span
                      className="text-[8px] font-mono"
                      style={{ color: "#4a6580" }}
                    >
                      {a.description}
                    </span>
                    <span
                      className="text-[7px] font-mono"
                      style={{
                        color: ARCHETYPE_COLOR[a.bestAgent] ?? "#4a6580",
                      }}
                    >
                      Best: {a.bestAgent} — {a.bestReason}
                    </span>
                  </div>
                  <span
                    className="ml-3 flex-shrink-0 text-[9px] font-mono tabular-nums"
                    style={{ color: funds >= a.cost ? "#00ff88" : "#ef4444" }}
                  >
                    {a.cost}₡
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Step 2: Agent ─────────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div
              className="text-[9px] font-mono uppercase tracking-widest"
              style={{ color: "#00d4ff" }}
            >
              2 — Assign Agent
            </div>
            {agents.length === 0 ? (
              <p className="text-[9px] font-mono" style={{ color: "#2a5070" }}>
                No agents deployed.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {agents.map((agent) => {
                  const color = ARCHETYPE_COLOR[agent.archetype] ?? "#4a6580";
                  const isBest = action?.bestAgent === agent.archetype;
                  const isSelected =
                    selectedAgent?.instance_id === agent.instance_id;
                  return (
                    <button
                      key={agent.instance_id}
                      type="button"
                      onClick={() => setSelectedAgent(agent)}
                      className="flex items-center gap-3 rounded px-3 py-2 text-left transition-all"
                      style={{
                        background: isSelected
                          ? `${color}14`
                          : "rgba(255,255,255,0.03)",
                        border: `1px solid ${isSelected ? color : "#1e3d5a"}`,
                      }}
                    >
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{
                          background: color,
                          boxShadow: isSelected ? `0 0 6px ${color}` : "none",
                        }}
                      />
                      <div className="flex flex-col gap-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-mono font-bold"
                            style={{ color: isSelected ? color : "#c9d8e8" }}
                          >
                            {agent.display_name}
                          </span>
                          {isBest && (
                            <span
                              className="rounded px-1 py-0.5 text-[7px] font-mono"
                              style={{ background: `${color}20`, color }}
                            >
                              BEST FIT
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[8px] font-mono"
                          style={{ color: "#4a6580" }}
                        >
                          {agent.archetype}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Step 3: Target node ──────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <div
              className="text-[9px] font-mono uppercase tracking-widest"
              style={{ color: "#00d4ff" }}
            >
              3 — Target Node
            </div>
            <input
              id="target-node"
              type="text"
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              placeholder="e.g. DB-02"
              className="w-full rounded px-3 py-2 text-[10px] font-mono uppercase outline-none"
              style={{
                background: "#0a1320",
                border: "1px solid #1e3d5a",
                color: "#c9d8e8",
              }}
            />
            {/* Quick-pick */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_NODES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTargetNode(n)}
                  className="rounded px-2 py-1 text-[8px] font-mono transition-all hover:opacity-80"
                  style={{
                    background:
                      targetNode === n
                        ? "rgba(0,212,255,0.1)"
                        : "rgba(255,255,255,0.04)",
                    border: `1px solid ${targetNode === n ? "#00d4ff" : "#1e3d5a"}`,
                    color: targetNode === n ? "#00d4ff" : "#4a6580",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* ── Execute ──────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleExecute}
            disabled={!canExecute || !affordable || executing}
            className="w-full rounded py-2.5 text-[10px] font-mono uppercase tracking-widest transition-opacity"
            style={{
              background:
                canExecute && affordable && !executing
                  ? "rgba(0,212,255,0.14)"
                  : "rgba(255,255,255,0.03)",
              border: `1px solid ${canExecute && affordable && !executing ? "#00d4ff" : "#1e3d5a"}`,
              color:
                canExecute && affordable && !executing ? "#00d4ff" : "#2a5070",
              cursor:
                canExecute && affordable && !executing
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            {executing
              ? "Executing..."
              : !affordable && action
                ? `Need ${action.cost}₡ (have ${funds}₡)`
                : "Execute Action"}
          </button>

          {/* ── Last result ──────────────────────────────────────────── */}
          {lastResult && (
            <div
              className="flex flex-col gap-2 rounded p-3"
              style={{
                background: "#0a1320",
                border: `1px solid ${resultColor}33`,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[8px] font-mono"
                  style={{ color: "#4a6580" }}
                >
                  {lastResult.action_type.replace("_", " ").toUpperCase()} →{" "}
                  {lastResult.target_node}
                </span>
                {lastResult.success && (
                  <span
                    className="text-[9px] font-mono tabular-nums font-bold"
                    style={{ color: resultColor }}
                  >
                    +{lastResult.progress_delta.toFixed(1)} pts
                  </span>
                )}
              </div>
              <p
                className="text-[8px] font-mono leading-5"
                style={{ color: "#6f87a1" }}
              >
                {lastResult.commentary}
              </p>
              {lastResult.success && (
                <div
                  className="text-[8px] font-mono"
                  style={{ color: "#2a5070" }}
                >
                  Cost: {lastResult.cost}₡ · Remaining:{" "}
                  {lastResult.funds.toLocaleString()}₡
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
