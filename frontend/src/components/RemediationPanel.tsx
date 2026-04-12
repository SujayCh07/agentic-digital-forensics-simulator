"use client";

import { useEffect, useState } from "react";
import { executeRemediation } from "@/lib/investigationAgentClient";
import type { RemediationResult } from "@/types/investigation";

const ACTIONS = [
  {
    id: "block_egress" as const,
    label: "Block Egress",
    cost: 250,
    description: "Cut outbound traffic from a compromised node",
  },
  {
    id: "isolate" as const,
    label: "Isolate",
    cost: 200,
    description: "Quarantine and disconnect a compromised node",
  },
  {
    id: "patch" as const,
    label: "Patch",
    cost: 150,
    description: "Apply security patches to a vulnerable node",
  },
  {
    id: "restore" as const,
    label: "Restore",
    cost: 300,
    description: "Restore node from a clean backup",
  },
  {
    id: "remediate" as const,
    label: "Remediate",
    cost: 100,
    description: "General remediation sweep on a node",
  },
] as const;

const SUGGESTED_NODES = [
  "MAIL-01",
  "DB-02",
  "GW-01",
  "EXT-01",
  "WS-03",
  "BACKUP-01",
  "FW-01",
];

interface RemediationPanelProps {
  funds: number;
  /** Last result pushed from the parent when nips_remediation_result fires. */
  lastResult: RemediationResult | null;
}

export function RemediationPanel({ funds, lastResult }: RemediationPanelProps) {
  const [selectedAction, setSelectedAction] = useState<
    (typeof ACTIONS)[number]["id"] | null
  >(null);
  const [targetNode, setTargetNode] = useState("");
  const [executing, setExecuting] = useState(false);

  // Reset executing when parent pushes a result
  useEffect(() => {
    if (lastResult) setExecuting(false);
  }, [lastResult]);

  const action = ACTIONS.find((a) => a.id === selectedAction);
  const canExecute =
    !executing && selectedAction !== null && targetNode.trim().length > 0;
  const affordable = action ? funds >= action.cost : false;

  const handleExecute = () => {
    if (!canExecute || !selectedAction || !affordable) return;
    setExecuting(true);
    executeRemediation(selectedAction, targetNode.trim().toUpperCase());
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
    <div className="flex flex-col gap-3">
      <div
        className="text-[9px] font-mono uppercase tracking-widest"
        style={{ color: "#00d4ff" }}
      >
        Remediation Actions
      </div>

      {/* Action grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedAction(a.id)}
            className="flex flex-col items-center gap-1 rounded px-1 py-2 text-center transition-all"
            style={{
              background:
                selectedAction === a.id
                  ? "rgba(0,212,255,0.12)"
                  : "rgba(255,255,255,0.03)",
              border: `1px solid ${selectedAction === a.id ? "#00d4ff" : "#1e3d5a"}`,
              color: selectedAction === a.id ? "#00d4ff" : "#4a6580",
            }}
          >
            <span className="text-[9px] font-mono font-bold">{a.label}</span>
            <span
              className="text-[7px] font-mono tabular-nums"
              style={{ color: funds >= a.cost ? "#00ff88" : "#ef4444" }}
            >
              {a.cost}₡
            </span>
          </button>
        ))}
      </div>

      {/* Action description */}
      {action && (
        <p className="text-[8px] font-mono" style={{ color: "#2a5070" }}>
          {action.description}
        </p>
      )}

      {/* Node input */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="target-node"
          className="text-[8px] font-mono uppercase tracking-widest"
          style={{ color: "#4a6580" }}
        >
          Target node
        </label>
        <input
          id="target-node"
          type="text"
          value={targetNode}
          onChange={(e) => setTargetNode(e.target.value)}
          placeholder="e.g. DB-02"
          className="w-full rounded px-2.5 py-1.5 text-[10px] font-mono uppercase outline-none"
          style={{
            background: "#0a1320",
            border: "1px solid #1e3d5a",
            color: "#c9d8e8",
          }}
        />
        {/* Quick-pick nodes */}
        <div className="mt-0.5 flex flex-wrap gap-1">
          {SUGGESTED_NODES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setTargetNode(n)}
              className="rounded px-1.5 py-0.5 text-[7px] font-mono transition-all hover:opacity-80"
              style={{
                background:
                  targetNode === n
                    ? "rgba(0,212,255,0.1)"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${targetNode === n ? "#00d4ff" : "#1e3d5a"}`,
                color: targetNode === n ? "#00d4ff" : "#2a5070",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Execute button */}
      <button
        type="button"
        onClick={handleExecute}
        disabled={!canExecute || !affordable || executing}
        className="w-full rounded py-2 text-[9px] font-mono uppercase tracking-widest transition-opacity"
        style={{
          background:
            canExecute && affordable && !executing
              ? "rgba(0,212,255,0.12)"
              : "rgba(255,255,255,0.03)",
          border: `1px solid ${canExecute && affordable && !executing ? "#00d4ff" : "#1e3d5a"}`,
          color: canExecute && affordable && !executing ? "#00d4ff" : "#2a5070",
          cursor:
            canExecute && affordable && !executing ? "pointer" : "not-allowed",
        }}
      >
        {executing
          ? "Executing..."
          : !affordable && action
            ? `Insufficient funds (need ${action.cost}₡)`
            : "Execute Action"}
      </button>

      {/* Last result */}
      {lastResult && (
        <div
          className="flex flex-col gap-1.5 rounded p-3"
          style={{
            background: "#0a1320",
            border: `1px solid ${resultColor}33`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono" style={{ color: "#4a6580" }}>
              {lastResult.action_type.replace("_", " ").toUpperCase()} →{" "}
              {lastResult.target_node}
            </span>
            {lastResult.success && (
              <span
                className="text-[8px] font-mono tabular-nums"
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
        </div>
      )}
    </div>
  );
}
