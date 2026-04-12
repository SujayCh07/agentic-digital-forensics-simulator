"use client";

import type { CaseSystemNode } from "@/types/investigation";
import { audioManager } from "@/lib/audioManager";

interface NodeListPanelProps {
  nodes: CaseSystemNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const STATUS_COLOR: Record<CaseSystemNode["status"], string> = {
  clean:       "#00ff88",
  suspicious:  "#f59e0b",
  compromised: "#ff3a3a",
  offline:     "#4a6580",
  recovered:   "#00d4ff",
};

const NODE_ICON: Record<CaseSystemNode["type"], string> = {
  server:      "▣",
  workstation: "◈",
  router:      "~",
  database:    "◆",
  archive:     "□",
  external:    "○",
};

export function NodeListPanel({
  nodes,
  selectedNodeId,
  onSelectNode,
}: NodeListPanelProps) {
  return (
    <div
      className="rpg-panel flex flex-col"
      style={{ width: 220 }}
      data-testid="node-list-panel"
    >
      {/* Header */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <span
          className="text-[8px] font-mono uppercase tracking-widest"
          style={{ color: "#00d4ff" }}
        >
          ◈ System Nodes
        </span>
      </div>

      {/* Node list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {nodes.map((node) => {
          const isSelected = node.id === selectedNodeId;
          const statusColor = STATUS_COLOR[node.status];
          const icon = NODE_ICON[node.type];
          const threatPct = Math.round(node.threatLevel * 100);
          const hasFindings = node.knownFindings.length > 0;

          return (
            <button
              key={node.id}
              type="button"
              onClick={() => { audioManager.playButtonClick(); onSelectNode(node.id); }}
              className="w-full text-left px-3 py-2 transition-all"
              style={{
                borderBottom: "1px solid #0d1520",
                background: isSelected ? `${statusColor}08` : "transparent",
                borderLeft: isSelected ? `2px solid ${statusColor}` : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {/* Node name + icon */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: isSelected ? statusColor : "#4a6580" }}
                  >
                    {icon}
                  </span>
                  <span
                    className="text-[9px] font-mono"
                    style={{ color: isSelected ? "#c9d8e8" : "#4a6580" }}
                  >
                    {node.name}
                  </span>
                </div>
                {hasFindings && (
                  <span
                    className="text-[7px] font-mono px-1 rounded"
                    style={{
                      background: "#1e3d5a",
                      color: "#00d4ff",
                    }}
                  >
                    {node.knownFindings.length}
                  </span>
                )}
              </div>

              {/* ID + status */}
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
                  {node.id}
                </span>
                <span
                  className="text-[7px] font-mono"
                  style={{ color: statusColor }}
                >
                  {node.status.toUpperCase()}
                </span>
              </div>

              {/* Threat bar */}
              {node.threatLevel > 0 && (
                <div className="mt-1.5 h-0.5 rounded-sm overflow-hidden" style={{ background: "#1e3d5a" }}>
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${threatPct}%`,
                      background: node.threatLevel > 0.7 ? "#ff3a3a" : node.threatLevel > 0.4 ? "#f59e0b" : "#00ff88",
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <div
        className="px-3 py-1.5 shrink-0 text-[7px] font-mono"
        style={{ borderTop: "1px solid #1e3d5a", color: "#1e3d5a" }}
      >
        Click a node to assign tasks
      </div>
    </div>
  );
}
