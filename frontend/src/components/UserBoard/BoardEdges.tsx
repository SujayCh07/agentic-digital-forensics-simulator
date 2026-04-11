"use client";

/**
 * NIPS — Board custom React Flow edge component
 *
 * Styled edges with dynamic colors based on edge status:
 * - unknown: dashed gray
 * - suspected: dashed amber
 * - confirmed: solid cyan with glow
 * - contradicted: red dashed with strikethrough
 * - isolated: dim gray
 */

import { memo } from "react";
import { BaseEdge, getStraightPath, type EdgeProps } from "@xyflow/react";

const STATUS_STYLE: Record<string, { stroke: string; dash: string; width: number; glow?: string }> = {
  unknown:      { stroke: "#2a5070", dash: "6 4",   width: 1 },
  suspected:    { stroke: "#f59e0b", dash: "6 3",   width: 1.5 },
  confirmed:    { stroke: "#00d4ff", dash: "",       width: 2, glow: "rgba(0,212,255,0.3)" },
  contradicted: { stroke: "#ff3a3a", dash: "4 4",   width: 1.5 },
  isolated:     { stroke: "#1e3d5a", dash: "2 2",   width: 1 },
};

function BoardEdgeRaw({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: EdgeProps) {
  const d = data as { status: string; label?: string } | undefined;
  const status = d?.status ?? "unknown";
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.unknown;

  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      {/* Glow layer for confirmed edges */}
      {style.glow && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: style.glow,
            strokeWidth: style.width + 4,
            strokeDasharray: style.dash || undefined,
            filter: "blur(3px)",
          }}
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#00d4ff" : style.stroke,
          strokeWidth: selected ? style.width + 0.5 : style.width,
          strokeDasharray: style.dash || undefined,
        }}
      />

      {/* Edge label */}
      {d?.label && (
        <foreignObject
          x={labelX - 50}
          y={labelY - 10}
          width={100}
          height={20}
          className="pointer-events-none"
        >
          <div
            className="text-center text-[7px] font-mono"
            style={{ color: style.stroke }}
          >
            {d.label}
          </div>
        </foreignObject>
      )}
    </>
  );
}

export const BoardEdge = memo(BoardEdgeRaw);
