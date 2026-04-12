"use client";

/**
 * EchoLocate board custom React Flow node components.
 *
 * All nodes have 4 handles (top, bottom, left, right) for flexible connections.
 * Nodes are fully draggable via React Flow's built-in drag system.
 */

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  normal: "#4a6580",
  suspicious: "#f59e0b",
  confirmed: "#00d4ff",
  contradicted: "#ff3a3a",
  isolated: "#2a5070",
};

const HANDLE_STYLE: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "#0f1927",
  border: "1.5px solid #4a6580",
  borderRadius: "50%",
  zIndex: 10,
};

/** All 4 handles for every node */
function AllHandles() {
  return (
    <>
      <Handle type="target" position={Position.Left}   id="left-in"   style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  id="right-out" style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Top}    id="top-in"    style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" style={HANDLE_STYLE} />
    </>
  );
}

// ---------------------------------------------------------------------------
// System Node
// ---------------------------------------------------------------------------

function SystemBoardNodeRaw({ data, selected }: NodeProps) {
  const d = data as {
    label: string;
    status: string;
    evidenceCount: number;
    systemNodeId?: string;
    onSelect?: () => void;
  };

  const statusColor = STATUS_COLORS[d.status] ?? "#4a6580";
  const isSelected = selected;

  return (
    <div
      onClick={d.onSelect}
      className="relative"
      style={{
        background: "rgba(8,12,18,0.97)",
        border: `1.5px solid ${isSelected ? "#00d4ff" : statusColor}`,
        borderRadius: 4,
        padding: "8px 12px",
        minWidth: 130,
        boxShadow: isSelected
          ? "0 0 14px rgba(0,212,255,0.35), inset 0 0 20px rgba(0,212,255,0.06)"
          : `0 0 8px ${statusColor}25`,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <AllHandles />

      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}80` }}
        />
        <span className="text-[10px] font-mono font-bold truncate" style={{ color: "#c9d8e8" }}>
          {d.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: statusColor }}>
          {d.status}
        </span>
        {d.evidenceCount > 0 && (
          <span
            className="text-[7px] font-mono px-1 rounded"
            style={{ color: "#00d4ff", background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.2)" }}
          >
            {d.evidenceCount} ev
          </span>
        )}
      </div>

      {d.systemNodeId && (
        <div className="text-[6px] font-mono mt-1" style={{ color: "#1e3d5a" }}>
          {d.systemNodeId}
        </div>
      )}
    </div>
  );
}

export const SystemBoardNode = memo(SystemBoardNodeRaw);

// ---------------------------------------------------------------------------
// Unknown Node
// ---------------------------------------------------------------------------

function UnknownBoardNodeRaw({ data, selected }: NodeProps) {
  const d = data as { label: string; onSelect?: () => void };

  return (
    <div
      onClick={d.onSelect}
      className="relative"
      style={{
        background: "rgba(8,12,18,0.8)",
        border: `1.5px dashed ${selected ? "#00d4ff" : "#2a5070"}`,
        borderRadius: 6,
        padding: "10px 14px",
        minWidth: 110,
        animation: "unknownPulse 3s ease-in-out infinite",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <AllHandles />

      <div className="text-center">
        <div
          className="text-[14px] font-mono font-bold"
          style={{ color: "#2a5070", textShadow: "0 0 8px rgba(42,80,112,0.5)" }}
        >
          ???
        </div>
        <div className="text-[7px] font-mono uppercase tracking-widest mt-1" style={{ color: "#1e3d5a" }}>
          {d.label}
        </div>
      </div>
    </div>
  );
}

export const UnknownBoardNode = memo(UnknownBoardNodeRaw);

// ---------------------------------------------------------------------------
// Outcome Node
// ---------------------------------------------------------------------------

function OutcomeBoardNodeRaw({ data, selected }: NodeProps) {
  const d = data as { label: string; description?: string; onSelect?: () => void };

  return (
    <div
      onClick={d.onSelect}
      className="relative"
      style={{
        background: "rgba(255,58,58,0.08)",
        border: `1.5px solid ${selected ? "#00d4ff" : "#ff3a3a60"}`,
        borderRadius: 4,
        padding: "8px 12px",
        minWidth: 140,
        boxShadow: "0 0 12px rgba(255,58,58,0.12)",
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <AllHandles />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px]" style={{ color: "#ff3a3a" }}>!</span>
        <span className="text-[9px] font-mono font-bold" style={{ color: "#ff3a3a" }}>
          {d.label}
        </span>
      </div>

      {d.description && (
        <div className="text-[7px] font-mono leading-relaxed" style={{ color: "#4a6580" }}>
          {d.description}
        </div>
      )}
    </div>
  );
}

export const OutcomeBoardNode = memo(OutcomeBoardNodeRaw);

// ---------------------------------------------------------------------------
// Hypothesis Node
// ---------------------------------------------------------------------------

function HypothesisBoardNodeRaw({ data, selected }: NodeProps) {
  const d = data as {
    text: string;
    status: string;
    onEdit?: (text: string) => void;
    onRemove?: () => void;
    onSelect?: () => void;
  };

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(d.text);

  const statusColorMap: Record<string, string> = {
    open: "#b06fff",
    supported: "#00ff88",
    challenged: "#f59e0b",
    inconclusive: "#4a6580",
  };
  const color = statusColorMap[d.status] ?? "#b06fff";

  const handleSubmit = () => {
    if (editText.trim()) d.onEdit?.(editText.trim());
    setEditing(false);
  };

  return (
    <div
      onClick={d.onSelect}
      className="relative"
      style={{
        background: `${color}08`,
        border: `1.5px solid ${selected ? "#00d4ff" : `${color}60`}`,
        borderRadius: 6,
        padding: "8px 12px",
        minWidth: 160,
        maxWidth: 260,
        boxShadow: `0 0 10px ${color}18`,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <AllHandles />

      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color }}>
          HYPOTHESIS · {d.status}
        </span>
        {d.onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); d.onRemove?.(); }}
            className="text-[8px] font-mono transition-opacity hover:opacity-60"
            style={{ color: "#4a6580" }}
          >
            ✕
          </button>
        )}
      </div>

      {editing ? (
        <input
          type="text"
          autoFocus
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") setEditing(false); }}
          onClick={(e) => e.stopPropagation()}
          className="w-full text-[9px] font-mono outline-none px-1 py-0.5 rounded nodrag"
          style={{ background: "#080c12", border: `1px solid ${color}40`, color: "#c9d8e8", caretColor: color }}
        />
      ) : (
        <div
          className="text-[9px] font-mono leading-relaxed"
          style={{ color: "#c9d8e8" }}
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditText(d.text); }}
          title="Double-click to edit"
        >
          &ldquo;{d.text}&rdquo;
        </div>
      )}
    </div>
  );
}

export const HypothesisBoardNode = memo(HypothesisBoardNodeRaw);

// ---------------------------------------------------------------------------
// Evidence Node (dragged from evidence panel)
// ---------------------------------------------------------------------------

function EvidenceBoardNodeRaw({ data, selected }: NodeProps) {
  const d = data as {
    agentName: string;
    agentId: string;
    nodeName: string;
    summary: string;
    severity: string;
    confidence: number;
    tags: string[];
    onRemove?: () => void;
  };

  const SEVERITY_COLOR: Record<string, string> = {
    critical: "#ff3a3a",
    high: "#f59e0b",
    medium: "#00d4ff",
    low: "#4a6580",
  };
  const AGENT_COLOR: Record<string, string> = {
    logis: "#c9d8e8",
    nexus: "#00d4ff",
    filer: "#f59e0b",
    chrono: "#b06fff",
  };

  const sevColor = SEVERITY_COLOR[d.severity] ?? "#4a6580";
  const agentColor = AGENT_COLOR[d.agentId] ?? "#4a6580";

  return (
    <div
      className="relative"
      style={{
        background: "rgba(8,12,18,0.97)",
        border: `1.5px solid ${selected ? "#00d4ff" : `${agentColor}40`}`,
        borderRadius: 4,
        padding: "7px 10px",
        minWidth: 180,
        maxWidth: 260,
        boxShadow: selected ? "0 0 12px rgba(0,212,255,0.25)" : `0 0 8px ${agentColor}15`,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <AllHandles />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[8px] font-mono font-bold shrink-0" style={{ color: agentColor }}>
            {d.agentName}
          </span>
          <span className="text-[7px] font-mono truncate" style={{ color: "#2a5070" }}>· {d.nodeName}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="text-[6px] font-mono px-1 rounded uppercase"
            style={{ color: sevColor, background: `${sevColor}15`, border: `1px solid ${sevColor}30` }}
          >
            {d.severity}
          </span>
          {d.onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); d.onRemove?.(); }}
              className="text-[8px] font-mono transition-opacity hover:opacity-60"
              style={{ color: "#4a6580" }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="text-[8px] font-mono leading-relaxed line-clamp-2" style={{ color: "#4a6580" }}>
        {d.summary}
      </p>

      {/* Confidence bar */}
      <div className="flex items-center gap-2 mt-1.5">
        <div className="flex-1 h-0.5 rounded-sm overflow-hidden" style={{ background: "#1e3d5a" }}>
          <div
            className="h-full"
            style={{
              width: `${d.confidence * 100}%`,
              background: d.confidence >= 0.8 ? "#00ff88" : d.confidence >= 0.5 ? "#f59e0b" : "#ff3a3a",
            }}
          />
        </div>
        <span className="text-[6px] font-mono tabular-nums" style={{ color: "#2a5070" }}>
          {Math.round(d.confidence * 100)}%
        </span>
      </div>
    </div>
  );
}

export const EvidenceBoardNode = memo(EvidenceBoardNodeRaw);
