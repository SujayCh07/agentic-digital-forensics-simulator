"use client";

/**
 * EchoLocate evidence card component.
 *
 * Compact card showing evidence metadata. Used in:
 * - Board left panel (pinned evidence list)
 * - Detail inspector (when selected)
 */

import type { AgentResult } from "@/types/investigation";

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

interface EvidenceCardProps {
  finding: AgentResult;
  isPinned: boolean;
  isSelected?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onSelect?: () => void;
  compact?: boolean;
}

export function EvidenceCard({
  finding,
  isPinned,
  isSelected,
  onPin,
  onUnpin,
  onSelect,
  compact,
}: EvidenceCardProps) {
  const sevColor = SEVERITY_COLOR[finding.severity] ?? "#4a6580";
  const agentColor = AGENT_COLOR[finding.agentId] ?? "#4a6580";

  return (
    <div
      className={`rounded transition-all ${onSelect ? "cursor-pointer" : ""}`}
      onClick={onSelect}
      style={{
        background: isSelected ? "rgba(0,212,255,0.06)" : "rgba(8,12,18,0.8)",
        border: `1px solid ${isSelected ? "#00d4ff40" : "#1e3d5a"}`,
        padding: compact ? "6px 8px" : "8px 10px",
        boxShadow: isSelected ? "0 0 8px rgba(0,212,255,0.1)" : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span
            className="text-[8px] font-mono font-bold shrink-0"
            style={{ color: agentColor }}
          >
            {finding.agentName}
          </span>
          <span className="text-[7px] font-mono shrink-0" style={{ color: "#1e3d5a" }}>·</span>
          <span className="text-[7px] font-mono truncate" style={{ color: "#2a5070" }}>
            {finding.nodeName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[6px] font-mono px-1 py-0.5 rounded uppercase"
            style={{
              color: sevColor,
              background: `${sevColor}15`,
              border: `1px solid ${sevColor}30`,
            }}
          >
            {finding.severity}
          </span>

          {/* Pin/unpin button */}
          {(onPin || onUnpin) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                isPinned ? onUnpin?.() : onPin?.();
              }}
              className="text-[10px] transition-opacity hover:opacity-60"
              title={isPinned ? "Unpin from board" : "Pin to board"}
              style={{ color: isPinned ? "#00d4ff" : "#2a5070" }}
            >
              {isPinned ? "📌" : "📍"}
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <p
        className={`font-mono leading-relaxed ${compact ? "text-[8px] line-clamp-2" : "text-[8px]"}`}
        style={{ color: "#4a6580" }}
      >
        {finding.summary}
      </p>

      {/* Confidence bar */}
      {!compact && (
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-0.5 rounded-sm overflow-hidden" style={{ background: "#1e3d5a" }}>
            <div
              className="h-full rounded-sm"
              style={{
                width: `${finding.confidence * 100}%`,
                background: finding.confidence >= 0.8 ? "#00ff88" : finding.confidence >= 0.5 ? "#f59e0b" : "#ff3a3a",
              }}
            />
          </div>
          <span className="text-[6px] font-mono tabular-nums" style={{ color: "#2a5070" }}>
            {Math.round(finding.confidence * 100)}%
          </span>
        </div>
      )}

      {/* Tags */}
      {!compact && finding.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {finding.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-[6px] font-mono px-1 py-0.5 rounded"
              style={{ color: "#2a5070", background: "#1e3d5a40" }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
