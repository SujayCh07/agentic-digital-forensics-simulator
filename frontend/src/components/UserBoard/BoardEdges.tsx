"use client";

/**
 * NIPS — Board custom React Flow edge component
 *
 * Click on any edge to delete it.
 * Uses getSmoothStepPath for better routing around nodes.
 * Status-based colors: unknown=gray, suspected=amber, confirmed=cyan glow,
 * contradicted=red, isolated=dim.
 */

import { memo, useCallback } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";

const STATUS_STYLE: Record<string, { stroke: string; dash: string; width: number; glow?: string }> = {
  unknown:      { stroke: "#3a5f7a", dash: "6 4",  width: 1.2 },
  suspected:    { stroke: "#f59e0b", dash: "5 3",  width: 1.5 },
  confirmed:    { stroke: "#00d4ff", dash: "",      width: 2,   glow: "rgba(0,212,255,0.25)" },
  contradicted: { stroke: "#ff3a3a", dash: "4 4",  width: 1.5 },
  isolated:     { stroke: "#1e3d5a", dash: "2 2",  width: 1 },
  // Used by hypothesis connections
  supports:     { stroke: "#00ff88", dash: "",      width: 1.5 },
  questions:    { stroke: "#f59e0b", dash: "4 3",  width: 1.2 },
  causes:       { stroke: "#00d4ff", dash: "",      width: 1.8 },
  contradicts:  { stroke: "#ff3a3a", dash: "4 4",  width: 1.5 },
  relates:      { stroke: "#4a6580", dash: "3 3",  width: 1 },
};

function BoardEdgeRaw({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const d = data as { status?: string; label?: string } | undefined;
  const status = d?.status ?? "unknown";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.unknown;
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const onEdgeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      // Delete edge on click
      setEdges((edges) => edges.filter((edge) => edge.id !== id));
    },
    [id, setEdges]
  );

  const strokeColor = selected ? "#ffffff" : style.stroke;
  const strokeWidth = selected ? style.width + 1 : style.width;

  return (
    <>
      {/* Glow / bloom layer for confirmed/selected */}
      {(style.glow || selected) && (
        <path
          d={edgePath}
          fill="none"
          stroke={selected ? "#ffffff" : (style.glow ?? style.stroke)}
          strokeWidth={strokeWidth + 5}
          strokeOpacity={0.12}
          style={{ filter: "blur(4px)" }}
        />
      )}

      {/* Invisible fat hit area for easier clicking */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
        style={{ cursor: "pointer" }}
        onClick={onEdgeClick}
      />

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: style.dash || undefined,
          cursor: "pointer",
        }}
      />

      {/* Delete button in the middle on hover / select */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <button
              type="button"
              onClick={onEdgeClick}
              className="text-[8px] font-mono rounded-full flex items-center justify-center transition-colors"
              title="Click to delete"
              style={{
                width: 18,
                height: 18,
                background: "#0f1927",
                border: "1px solid #ff3a3a60",
                color: "#ff3a3a",
              }}
            >
              ✕
            </button>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Edge status label */}
      {d?.label && !selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "none",
            }}
          >
            <span
              className="text-[6px] font-mono px-1 py-0.5 rounded"
              style={{
                color: style.stroke,
                background: "rgba(8,12,18,0.85)",
                border: `1px solid ${style.stroke}30`,
              }}
            >
              {d.label}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const BoardEdge = memo(BoardEdgeRaw);
