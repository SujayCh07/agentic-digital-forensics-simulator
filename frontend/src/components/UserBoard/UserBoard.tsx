"use client";

/**
 * NIPS — User Board (v5, D3 canvas + React sidebar)
 *
 * The graph canvas uses pure D3 (BoardGraphCanvas, same as SocialGraph).
 * React handles only the sidebar panels and connector drawing overlay.
 *
 * Connection drawing: click a node to start a connection, click another to finish.
 * Evidence drag: drag a card from the left panel onto the canvas.
 */

import { useCallback, useRef, useState, useEffect } from "react";
import { BoardGraphCanvas } from "./BoardGraphCanvas";
import type { BoardCanvasHandle, BoardSimNode, BoardSimEdge } from "./BoardGraphCanvas";
import { AgentConsultPanel } from "./AgentConsultPanel";

import type { AgentId, AgentResult } from "@/types/investigation";
import type { BoardHookReturn } from "@/hooks/useBoardState";

const DRAG_TYPE = "application/nips-evidence";
let _uid = 0;

// ---------------------------------------------------------------------------

interface UserBoardProps {
  board: BoardHookReturn;
  completedFindings: AgentResult[];
  lockedAgents: AgentId[];
  onClose: () => void;
}

export function UserBoard({ board, completedFindings, lockedAgents, onClose }: UserBoardProps) {
  const canvasHandleRef = useRef<BoardCanvasHandle>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);

  const [evidenceTab, setEvidenceTab] = useState<"available" | "pinned">("available");
  const [showHypForm, setShowHypForm]  = useState(false);
  const [hypInput, setHypInput]        = useState("");

  // Connection mode: first click selects source, second click creates edge
  const [connectSrc, setConnectSrc]    = useState<BoardSimNode | null>(null);
  const [showConnectHint, setShowConnectHint] = useState(false);

  // Track which evidence IDs are on the canvas as nodes
  const [canvasEvidenceIds, setCanvasEvidenceIds] = useState<Set<string>>(new Set());

  // Sync board enrichment effects (status changes, revealed nodes/edges)
  useEffect(() => {
    const canvas = canvasHandleRef.current;
    if (!canvas) return;
    board.boardNodes.forEach((bn) => {
      canvas.updateNodeStatus(bn.id, bn.status as BoardSimNode["status"], bn.linkedEvidenceIds.length);
    });
  }, [board.boardNodes]);

  // ── Node click: connection mode ────────────────────────────────────────
  const onNodeClick = useCallback((node: BoardSimNode) => {
    if (!connectSrc) {
      setConnectSrc(node);
      setShowConnectHint(true);
    } else {
      if (connectSrc.id !== node.id) {
        _uid += 1;
        canvasHandleRef.current?.addEdge({
          id: `edge-user-${Date.now()}-${_uid}`,
          sourceId: connectSrc.id,
          targetId: node.id,
          status: "suspected",
        });
      }
      setConnectSrc(null);
      setShowConnectHint(false);
    }
  }, [connectSrc]);

  const onEdgeClick = useCallback((edge: BoardSimEdge) => {
    // Click edge to remove it
    canvasHandleRef.current?.removeEdge(edge.id);
  }, []);

  const onCanvasClick = useCallback(() => {
    setConnectSrc(null);
    setShowConnectHint(false);
  }, []);

  // ── Hypothesis ──────────────────────────────────────────────────────────
  const handleAddHypothesis = useCallback(() => {
    const text = hypInput.trim();
    if (!text) return;
    _uid += 1;
    canvasHandleRef.current?.addNode({
      id: `hyp-${Date.now()}-${_uid}`,
      label: text,
      nodeType: "hypothesis",
      status: "normal",
      evidenceCount: 0,
    });
    setHypInput("");
    setShowHypForm(false);
  }, [hypInput]);

  // ── Evidence drag-to-canvas ─────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw) return;
    let f: AgentResult;
    try { f = JSON.parse(raw); } catch { return; }

    const id = `ev-node-${f.nodeId}-${f.taskType}`;
    if (canvasEvidenceIds.has(id)) return;

    board.pinEvidence(`${f.nodeId}:${f.taskType}`);
    canvasHandleRef.current?.addNode({
      id,
      label: f.nodeName,
      nodeType: "evidence",
      status: "normal",
      evidenceCount: 0,
      agentId: f.agentId,
      agentName: f.agentName,
      severity: f.severity,
      confidence: f.confidence,
      summary: f.summary,
    });
    setCanvasEvidenceIds((prev) => new Set([...prev, id]));
  }, [board, canvasEvidenceIds]);

  const handleDragStart = (e: React.DragEvent, f: AgentResult) => {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(f));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleConsult = useCallback((agentId: AgentId) => {
    const pinned = completedFindings.filter((f) => board.isPinned(`${f.nodeId}:${f.taskType}`));
    board.consultAgent(agentId, pinned.length > 0 ? pinned : completedFindings);
  }, [board, completedFindings]);

  const pinnedFindings = completedFindings.filter((f) => board.isPinned(`${f.nodeId}:${f.taskType}`));
  const evidenceList   = evidenceTab === "pinned" ? pinnedFindings : completedFindings;

  const AGENT_COLOR: Record<string, string> = { logis: "#c9d8e8", nexus: "#00d4ff", filer: "#f59e0b", chrono: "#b06fff" };
  const SEV_COLOR:   Record<string, string> = { critical: "#ff3a3a", high: "#f59e0b", medium: "#00d4ff", low: "#4a6580" };

  return (
    <div className="fixed inset-0 z-[55] flex flex-col" style={{ background: "#080c12" }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-10 shrink-0"
        style={{ background: "rgba(15,25,39,0.98)", borderBottom: "1px solid #1e3d5a" }}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono" style={{ color: "#00d4ff" }}>◈ INVESTIGATION BOARD</span>
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>Midnight Exfiltration</span>
        </div>
        <div className="flex items-center gap-4">
          {showConnectHint && (
            <span className="text-[7px] font-mono animate-pulse" style={{ color: "#f59e0b" }}>
              → Click another node to connect · Click canvas to cancel
            </span>
          )}
          {!showConnectHint && (
            <span className="text-[7px] font-mono" style={{ color: "#1e3d5a" }}>
              Click node→node to connect · Click edge to delete · Drag findings onto canvas
            </span>
          )}
          <button type="button" onClick={onClose}
            className="text-[9px] font-mono transition-opacity hover:opacity-60" style={{ color: "#4a6580" }}>
            [ESC] CLOSE
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left: Evidence panel */}
        <div className="w-56 shrink-0 flex flex-col"
          style={{ background: "rgba(8,12,18,0.95)", borderRight: "1px solid #1e3d5a" }}>

          {/* Tabs */}
          <div className="flex shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
            {(["available", "pinned"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setEvidenceTab(tab)}
                className="flex-1 py-2 text-[7px] font-mono uppercase tracking-widest"
                style={{
                  color: evidenceTab === tab ? "#00d4ff" : "#2a5070",
                  background: evidenceTab === tab ? "rgba(0,212,255,0.05)" : "transparent",
                  borderBottom: evidenceTab === tab ? "2px solid #00d4ff" : "2px solid transparent",
                }}>
                {tab} ({(tab === "pinned" ? pinnedFindings : completedFindings).length})
              </button>
            ))}
          </div>

          <div className="px-2 py-1.5 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
            <p className="text-[6px] font-mono" style={{ color: "#2a5070" }}>⠿ Drag findings onto the canvas</p>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
            {evidenceList.length === 0 ? (
              <p className="text-[8px] font-mono italic text-center py-6" style={{ color: "#1e3d5a" }}>
                {completedFindings.length === 0 ? "Deploy agents to gather evidence." : "No pinned evidence yet."}
              </p>
            ) : evidenceList.map((f) => {
              const id = `ev-node-${f.nodeId}-${f.taskType}`;
              const onCanvas = canvasEvidenceIds.has(id);
              return (
                <div
                  key={`${f.nodeId}:${f.taskType}`}
                  draggable={!onCanvas}
                  onDragStart={(e) => handleDragStart(e, f)}
                  className="rounded"
                  style={{
                    padding: "6px 8px",
                    background: onCanvas ? "rgba(0,212,255,0.04)" : "rgba(8,12,18,0.8)",
                    border: `1px solid ${onCanvas ? "#00d4ff30" : "#1e3d5a"}`,
                    cursor: onCanvas ? "default" : "grab",
                    opacity: onCanvas ? 0.55 : 1,
                  }}>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[8px] font-mono font-bold" style={{ color: AGENT_COLOR[f.agentId] ?? "#4a6580" }}>
                      {f.agentName}
                    </span>
                    <div className="flex items-center gap-1">
                      {onCanvas && <span className="text-[6px] font-mono" style={{ color: "#00d4ff" }}>✓</span>}
                      <span className="text-[6px] font-mono px-1 rounded uppercase"
                        style={{ color: SEV_COLOR[f.severity] ?? "#4a6580", background: `${SEV_COLOR[f.severity] ?? "#4a6580"}15`, border: `1px solid ${SEV_COLOR[f.severity] ?? "#4a6580"}30` }}>
                        {f.severity}
                      </span>
                    </div>
                  </div>
                  <p className="text-[7px] font-mono line-clamp-2" style={{ color: "#4a6580" }}>{f.summary}</p>
                </div>
              );
            })}
          </div>

          {/* Hypothesis form */}
          <div className="shrink-0 px-2 py-2" style={{ borderTop: "1px solid #1e3d5a" }}>
            {showHypForm ? (
              <div className="flex flex-col gap-1.5">
                <input type="text" autoFocus value={hypInput}
                  onChange={(e) => setHypInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddHypothesis(); if (e.key === "Escape") setShowHypForm(false); }}
                  placeholder='e.g. "MAIL-01 is the pivot"'
                  className="w-full text-[8px] font-mono outline-none px-2 py-1.5 rounded"
                  style={{ background: "#080c12", border: "1px solid #b06fff40", color: "#c9d8e8", caretColor: "#b06fff" }} />
                <div className="flex gap-1">
                  <button type="button" onClick={handleAddHypothesis} disabled={!hypInput.trim()}
                    className="flex-1 text-[7px] font-mono py-1 rounded"
                    style={{ background: hypInput.trim() ? "rgba(176,111,255,0.12)" : "#0d1520", border: `1px solid ${hypInput.trim() ? "#b06fff" : "#1e3d5a"}`, color: hypInput.trim() ? "#b06fff" : "#2a5070" }}>
                    ADD
                  </button>
                  <button type="button" onClick={() => setShowHypForm(false)}
                    className="text-[7px] font-mono px-2 py-1 rounded" style={{ color: "#4a6580", border: "1px solid #1e3d5a" }}>
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowHypForm(true)}
                className="w-full text-[8px] font-mono py-1.5 rounded hover:opacity-80"
                style={{ background: "rgba(176,111,255,0.08)", border: "1px solid #b06fff40", color: "#b06fff" }}>
                + NEW HYPOTHESIS
              </button>
            )}
          </div>
        </div>

        {/* Center: D3 canvas */}
        <div ref={canvasWrapperRef} className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
          <BoardGraphCanvas
            ref={canvasHandleRef}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onCanvasClick={onCanvasClick}
          />
          {/* Connection source indicator overlay */}
          {connectSrc && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{ background: "rgba(8,12,18,0.9)", border: "1px solid #f59e0b40", borderRadius: 4, padding: "4px 10px" }}>
              <span className="text-[7px] font-mono" style={{ color: "#f59e0b" }}>
                Connecting from: <strong>{connectSrc.label}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Right: Agent consultation */}
        <div className="w-64 shrink-0 h-full"
          style={{ background: "rgba(8,12,18,0.95)", borderLeft: "1px solid #1e3d5a" }}>
          <AgentConsultPanel
            selectedFindings={pinnedFindings.length > 0 ? pinnedFindings : completedFindings}
            consultations={board.consultations}
            onConsult={handleConsult}
            lockedAgents={lockedAgents}
          />
        </div>
      </div>
    </div>
  );
}
