"use client";

/**
 * NIPS — Board custom React Flow node components
 *
 * Four node types matching the board data model:
 * - SystemBoardNode: known system with status & evidence count
 * - UnknownBoardNode: "???" placeholder with pulse
 * - OutcomeBoardNode: visible consequence
 * - HypothesisBoardNode: player theory with editable text
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
  width: 6,
  height: 6,
  background: "#1e3d5a",
  border: "1px solid #4a6580",
};

// ---------------------------------------------------------------------------
// System Node
// ---------------------------------------------------------------------------

function SystemBoardNodeRaw({ data }: NodeProps) {
  const d = data as {
    label: string;
    status: string;
    evidenceCount: number;
    systemNodeId?: string;
    onSelect?: () => void;
    selected?: boolean;
  };

  const statusColor = STATUS_COLORS[d.status] ?? "#4a6580";

  return (
    <div
      onClick={d.onSelect}
      className="relative cursor-pointer"
      style={{
        background: "rgba(8,12,18,0.95)",
        border: `1.5px solid ${d.selected ? "#00d4ff" : statusColor}`,
        borderRadius: 4,
        padding: "8px 12px",
        minWidth: 130,
        boxShadow: d.selected
          ? `0 0 12px rgba(0,212,255,0.3), inset 0 0 20px rgba(0,212,255,0.05)`
          : `0 0 8px ${statusColor}20`,
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

      <div className="flex items-center gap-1.5 mb-1">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}80`,
          }}
        />
        <span
          className="text-[10px] font-mono font-bold truncate"
          style={{ color: "#c9d8e8" }}
        >
          {d.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className="text-[7px] font-mono uppercase tracking-widest"
          style={{ color: statusColor }}
        >
          {d.status}
        </span>
        {d.evidenceCount > 0 && (
          <span
            className="text-[7px] font-mono px-1 rounded"
            style={{
              color: "#00d4ff",
              background: "rgba(0,212,255,0.1)",
              border: "1px solid rgba(0,212,255,0.2)",
            }}
          >
            {d.evidenceCount} ev
          </span>
        )}
      </div>

      {d.systemNodeId && (
        <div
          className="text-[6px] font-mono mt-1"
          style={{ color: "#1e3d5a" }}
        >
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

function UnknownBoardNodeRaw({ data }: NodeProps) {
  const d = data as { label: string; onSelect?: () => void; selected?: boolean };

  return (
    <div
      onClick={d.onSelect}
      className="relative cursor-pointer"
      style={{
        background: "rgba(8,12,18,0.8)",
        border: `1.5px dashed ${d.selected ? "#00d4ff" : "#2a5070"}`,
        borderRadius: 6,
        padding: "10px 14px",
        minWidth: 110,
        animation: "unknownPulse 3s ease-in-out infinite",
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

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

function OutcomeBoardNodeRaw({ data }: NodeProps) {
  const d = data as {
    label: string;
    description?: string;
    onSelect?: () => void;
    selected?: boolean;
  };

  return (
    <div
      onClick={d.onSelect}
      className="relative cursor-pointer"
      style={{
        background: "rgba(255,58,58,0.08)",
        border: `1.5px solid ${d.selected ? "#00d4ff" : "#ff3a3a60"}`,
        borderRadius: 4,
        padding: "8px 12px",
        minWidth: 140,
        boxShadow: "0 0 12px rgba(255,58,58,0.1)",
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />

      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px]" style={{ color: "#ff3a3a" }}>!</span>
        <span
          className="text-[9px] font-mono font-bold"
          style={{ color: "#ff3a3a" }}
        >
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

function HypothesisBoardNodeRaw({ data }: NodeProps) {
  const d = data as {
    text: string;
    status: string;
    onEdit?: (text: string) => void;
    onRemove?: () => void;
    onSelect?: () => void;
    selected?: boolean;
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
    if (editText.trim()) {
      d.onEdit?.(editText.trim());
    }
    setEditing(false);
  };

  return (
    <div
      onClick={d.onSelect}
      className="relative cursor-pointer"
      style={{
        background: `${color}08`,
        border: `1.5px solid ${d.selected ? "#00d4ff" : `${color}60`}`,
        borderRadius: 6,
        padding: "8px 12px",
        minWidth: 160,
        maxWidth: 260,
        boxShadow: `0 0 10px ${color}15`,
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

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
          className="w-full text-[9px] font-mono outline-none px-1 py-0.5 rounded"
          style={{
            background: "#080c12",
            border: `1px solid ${color}40`,
            color: "#c9d8e8",
            caretColor: color,
          }}
        />
      ) : (
        <div
          className="text-[9px] font-mono leading-relaxed"
          style={{ color: "#c9d8e8" }}
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); setEditText(d.text); }}
          title="Double-click to edit"
        >
          "{d.text}"
        </div>
      )}
    </div>
  );
}

export const HypothesisBoardNode = memo(HypothesisBoardNodeRaw);
