"use client";

/**
 * NIPS — User Board
 *
 * Full-screen overlay investigation board. Three-column layout:
 * Left: Evidence panel (pinned + available findings)
 * Center: React Flow canvas (problem graph + hypotheses)
 * Right: Agent consultation panel
 *
 * Uses @xyflow/react for the interactive graph canvas.
 */

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  SystemBoardNode,
  UnknownBoardNode,
  OutcomeBoardNode,
  HypothesisBoardNode,
} from "./BoardNodes";
import { BoardEdge } from "./BoardEdges";
import { EvidenceCard } from "./EvidenceCard";
import { AgentConsultPanel } from "./AgentConsultPanel";

import type { AgentId, AgentResult } from "@/types/investigation";
import type { BoardHookReturn } from "@/hooks/useBoardState";

// ---------------------------------------------------------------------------
// Node/edge type registrations
// ---------------------------------------------------------------------------

const nodeTypes = {
  systemNode: SystemBoardNode,
  unknownNode: UnknownBoardNode,
  outcomeNode: OutcomeBoardNode,
  hypothesisNode: HypothesisBoardNode,
};

const edgeTypes = {
  boardEdge: BoardEdge,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface UserBoardProps {
  board: BoardHookReturn;
  completedFindings: AgentResult[];
  lockedAgents: AgentId[];
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserBoard({
  board,
  completedFindings,
  lockedAgents,
  onClose,
}: UserBoardProps) {
  const [evidenceTab, setEvidenceTab] = useState<"pinned" | "available">("pinned");
  const [hypothesisInput, setHypothesisInput] = useState("");
  const [showHypothesisForm, setShowHypothesisForm] = useState(false);

  // ── Build React Flow nodes from board state ───────────────────────────

  const flowNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // Graph nodes (only revealed ones)
    for (const gn of board.boardNodes) {
      if (!gn.revealed) continue;

      const nodeTypeMap: Record<string, string> = {
        system: "systemNode",
        unknown: "unknownNode",
        outcome: "outcomeNode",
        hypothesis: "hypothesisNode",
      };

      nodes.push({
        id: gn.id,
        type: nodeTypeMap[gn.type] ?? "systemNode",
        position: gn.position,
        data: {
          label: gn.label,
          status: gn.status,
          evidenceCount: gn.linkedEvidenceIds.length,
          systemNodeId: gn.systemNodeId,
          description: (gn.metadata as Record<string, string> | undefined)?.description,
          selected: board.selectedItemIds.includes(gn.id),
          onSelect: () => board.toggleSelectItem(gn.id),
        },
      });
    }

    // Hypothesis nodes
    for (const h of board.hypotheses) {
      nodes.push({
        id: h.id,
        type: "hypothesisNode",
        position: h.position,
        data: {
          text: h.text,
          status: h.status,
          selected: board.selectedItemIds.includes(h.id),
          onSelect: () => board.toggleSelectItem(h.id),
          onEdit: (text: string) => board.editHypothesis(h.id, text),
          onRemove: () => board.removeHypothesis(h.id),
        },
      });
    }

    return nodes;
  }, [board.boardNodes, board.hypotheses, board.selectedItemIds, board]);

  // ── Build React Flow edges from board state ───────────────────────────

  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    // Graph edges (only revealed ones)
    for (const ge of board.boardEdges) {
      if (!ge.revealed) continue;

      // Only show if both source and target are revealed
      const sourceRevealed = board.boardNodes.find(n => n.id === ge.source)?.revealed;
      const targetRevealed = board.boardNodes.find(n => n.id === ge.target)?.revealed;
      if (!sourceRevealed || !targetRevealed) continue;

      edges.push({
        id: ge.id,
        source: ge.source,
        target: ge.target,
        type: "boardEdge",
        data: {
          status: ge.status,
          label: ge.label,
        },
      });
    }

    // Board connections (evidence ↔ hypothesis links etc.)
    for (const conn of board.connections) {
      edges.push({
        id: conn.id,
        source: conn.sourceId,
        target: conn.targetId,
        type: "boardEdge",
        data: {
          status: conn.relation === "contradicts" ? "contradicted" : "suspected",
          label: conn.relation,
        },
        animated: true,
      });
    }

    return edges;
  }, [board.boardEdges, board.boardNodes, board.connections]);

  // ── React Flow change handlers ──────────────────────────────────────

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply position changes to our board state
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          const isHypothesis = change.id.startsWith("hyp-");
          if (isHypothesis) {
            board.updateHypothesisPosition(change.id, change.position);
          } else {
            board.updateNodePosition(change.id, change.position);
          }
        }
      }
    },
    [board]
  );

  const onEdgesChange: OnEdgesChange = useCallback(() => {
    // Edge changes are managed by our board state, not React Flow
  }, []);

  // ── Evidence helpers ─────────────────────────────────────────────────

  const pinnedFindings = useMemo(
    () => completedFindings.filter(f => board.isPinned(`${f.nodeId}:${f.taskType}`)),
    [completedFindings, board]
  );

  const availableFindings = useMemo(
    () => completedFindings.filter(f => !board.isPinned(`${f.nodeId}:${f.taskType}`)),
    [completedFindings, board]
  );

  const selectedFindings = useMemo(() => {
    const selectedKeys = new Set(board.selectedItemIds);
    return completedFindings.filter(f => {
      const key = `${f.nodeId}:${f.taskType}`;
      return selectedKeys.has(key);
    });
  }, [completedFindings, board.selectedItemIds]);

  // ── Hypothesis creation ──────────────────────────────────────────────

  const handleAddHypothesis = useCallback(() => {
    if (!hypothesisInput.trim()) return;
    board.addHypothesis(hypothesisInput.trim());
    setHypothesisInput("");
    setShowHypothesisForm(false);
  }, [hypothesisInput, board]);

  // ── Agent consultation ────────────────────────────────────────────────

  const handleConsult = useCallback((agentId: AgentId) => {
    // Get findings that match selected evidence
    const allFindings = selectedFindings.length > 0 ? selectedFindings : pinnedFindings;
    board.consultAgent(agentId, allFindings);
  }, [selectedFindings, pinnedFindings, board]);

  // ── Drop handler for evidence → node attachment ──────────────────────

  const handleEvidenceDrop = useCallback(
    (evidenceKey: string, targetNodeId: string) => {
      board.attachEvidenceToNode(evidenceKey, targetNodeId);
    },
    [board]
  );

  return (
    <div
      className="fixed inset-0 z-[55] flex flex-col"
      style={{ background: "#080c12" }}
    >
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 h-10 shrink-0"
        style={{
          background: "rgba(15,25,39,0.98)",
          borderBottom: "1px solid #1e3d5a",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono" style={{ color: "#00d4ff" }}>
            ◈ INVESTIGATION BOARD
          </span>
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>
            The Midnight Exfiltration
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[7px] font-mono" style={{ color: "#2a5070" }}>
            {board.pinnedEvidenceIds.length} pinned · {board.hypotheses.length} hypotheses
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[9px] font-mono transition-opacity hover:opacity-60"
            style={{ color: "#4a6580" }}
          >
            [ESC] CLOSE
          </button>
        </div>
      </div>

      {/* ── Three-column layout ──────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: Evidence Panel ─────────────────────────────────── */}
        <div
          className="w-60 shrink-0 flex flex-col h-full"
          style={{
            background: "rgba(8,12,18,0.95)",
            borderRight: "1px solid #1e3d5a",
          }}
        >
          {/* Evidence tab switcher */}
          <div className="flex shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
            {(["pinned", "available"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setEvidenceTab(tab)}
                className="flex-1 py-2 text-[7px] font-mono uppercase tracking-widest transition-colors"
                style={{
                  color: evidenceTab === tab ? "#00d4ff" : "#2a5070",
                  background: evidenceTab === tab ? "rgba(0,212,255,0.05)" : "transparent",
                  borderBottom: evidenceTab === tab ? "2px solid #00d4ff" : "2px solid transparent",
                }}
              >
                {tab} ({tab === "pinned" ? pinnedFindings.length : availableFindings.length})
              </button>
            ))}
          </div>

          {/* Evidence list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
            {evidenceTab === "pinned" ? (
              pinnedFindings.length === 0 ? (
                <div className="text-[8px] font-mono italic text-center py-4" style={{ color: "#1e3d5a" }}>
                  No evidence pinned yet. Pin findings from the Available tab or the evidence feed.
                </div>
              ) : (
                pinnedFindings.map((f) => {
                  const key = `${f.nodeId}:${f.taskType}`;
                  return (
                    <div key={key}>
                      <EvidenceCard
                        finding={f}
                        isPinned
                        isSelected={board.selectedItemIds.includes(key)}
                        onUnpin={() => board.unpinEvidence(key)}
                        onSelect={() => board.toggleSelectItem(key)}
                        compact
                      />
                      {/* Attach to node buttons */}
                      <div className="flex gap-1 mt-0.5 px-1">
                        {board.boardNodes
                          .filter(n => n.revealed && n.type === "system")
                          .map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => handleEvidenceDrop(key, n.id)}
                              className="text-[6px] font-mono px-1 py-0.5 rounded transition-opacity hover:opacity-70"
                              style={{
                                color: n.linkedEvidenceIds.includes(key) ? "#00ff88" : "#2a5070",
                                background: n.linkedEvidenceIds.includes(key) ? "#00ff8810" : "#1e3d5a20",
                                border: `1px solid ${n.linkedEvidenceIds.includes(key) ? "#00ff8830" : "#1e3d5a40"}`,
                              }}
                              title={`Attach to ${n.label}`}
                            >
                              {n.linkedEvidenceIds.includes(key) ? "✓" : "→"} {(n.systemNodeId ?? n.label).substring(0, 7)}
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              availableFindings.length === 0 ? (
                <div className="text-[8px] font-mono italic text-center py-4" style={{ color: "#1e3d5a" }}>
                  {completedFindings.length === 0
                    ? "No evidence found yet. Deploy agents to investigate systems."
                    : "All evidence is pinned to the board."}
                </div>
              ) : (
                availableFindings.map((f) => {
                  const key = `${f.nodeId}:${f.taskType}`;
                  return (
                    <EvidenceCard
                      key={key}
                      finding={f}
                      isPinned={false}
                      onPin={() => board.pinEvidence(key)}
                      compact
                    />
                  );
                })
              )
            )}
          </div>

          {/* Hypothesis creation */}
          <div className="shrink-0 px-2 py-2" style={{ borderTop: "1px solid #1e3d5a" }}>
            {showHypothesisForm ? (
              <div className="flex flex-col gap-1.5">
                <input
                  type="text"
                  autoFocus
                  value={hypothesisInput}
                  onChange={(e) => setHypothesisInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddHypothesis();
                    if (e.key === "Escape") setShowHypothesisForm(false);
                  }}
                  placeholder='e.g. "MAIL-01 is the pivot point"'
                  className="w-full text-[8px] font-mono outline-none px-2 py-1.5 rounded"
                  style={{
                    background: "#080c12",
                    border: "1px solid #b06fff40",
                    color: "#c9d8e8",
                    caretColor: "#b06fff",
                  }}
                />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={handleAddHypothesis}
                    disabled={!hypothesisInput.trim()}
                    className="flex-1 text-[7px] font-mono py-1 rounded transition-all"
                    style={{
                      background: hypothesisInput.trim() ? "rgba(176,111,255,0.12)" : "#0d1520",
                      border: `1px solid ${hypothesisInput.trim() ? "#b06fff" : "#1e3d5a"}`,
                      color: hypothesisInput.trim() ? "#b06fff" : "#2a5070",
                    }}
                  >
                    ADD
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHypothesisForm(false)}
                    className="text-[7px] font-mono px-2 py-1 rounded"
                    style={{ color: "#4a6580", border: "1px solid #1e3d5a" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowHypothesisForm(true)}
                className="w-full text-[8px] font-mono py-1.5 rounded transition-all hover:opacity-80"
                style={{
                  background: "rgba(176,111,255,0.08)",
                  border: "1px solid #b06fff40",
                  color: "#b06fff",
                }}
              >
                + NEW HYPOTHESIS
              </button>
            )}
          </div>
        </div>

        {/* ── Center: React Flow Canvas ────────────────────────────── */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            style={{ background: "#080c12" }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="#1e3d5a30"
            />
            <Controls
              showInteractive={false}
              style={{
                background: "rgba(8,12,18,0.9)",
                border: "1px solid #1e3d5a",
                borderRadius: 4,
              }}
            />

            {/* Graph legend */}
            <Panel position="bottom-left">
              <div
                className="rounded px-3 py-2"
                style={{
                  background: "rgba(8,12,18,0.9)",
                  border: "1px solid #1e3d5a",
                }}
              >
                <div className="text-[6px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "#2a5070" }}>
                  Edge Legend
                </div>
                <div className="flex flex-col gap-1">
                  {[
                    { status: "unknown", color: "#2a5070", dash: true },
                    { status: "suspected", color: "#f59e0b", dash: true },
                    { status: "confirmed", color: "#00d4ff", dash: false },
                    { status: "contradicted", color: "#ff3a3a", dash: true },
                  ].map(({ status, color, dash }) => (
                    <div key={status} className="flex items-center gap-2">
                      <svg width={24} height={4}>
                        <line
                          x1={0} y1={2} x2={24} y2={2}
                          stroke={color}
                          strokeWidth={dash ? 1 : 2}
                          strokeDasharray={dash ? "4 3" : ""}
                        />
                      </svg>
                      <span className="text-[6px] font-mono" style={{ color }}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* ── Right: Agent Consultation Panel ──────────────────────── */}
        <div
          className="w-64 shrink-0 h-full"
          style={{
            background: "rgba(8,12,18,0.95)",
            borderLeft: "1px solid #1e3d5a",
          }}
        >
          <AgentConsultPanel
            selectedFindings={selectedFindings.length > 0 ? selectedFindings : pinnedFindings}
            consultations={board.consultations}
            onConsult={handleConsult}
            lockedAgents={lockedAgents}
          />
        </div>
      </div>

      {/* ── Board-specific CSS ───────────────────────────────────── */}
      <style>{`
        @keyframes unknownPulse {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 8px rgba(42,80,112,0.2); }
          50% { opacity: 1; box-shadow: 0 0 16px rgba(42,80,112,0.4); }
        }
        .react-flow__controls button {
          background: rgba(8,12,18,0.9) !important;
          border: 1px solid #1e3d5a !important;
          border-bottom: none !important;
          color: #4a6580 !important;
          width: 24px !important;
          height: 24px !important;
        }
        .react-flow__controls button:last-child {
          border-bottom: 1px solid #1e3d5a !important;
        }
        .react-flow__controls button:hover {
          background: rgba(0,212,255,0.08) !important;
        }
        .react-flow__controls button svg {
          fill: #4a6580 !important;
        }
        .react-flow__edge-interaction {
          stroke: transparent;
        }
      `}</style>
    </div>
  );
}
