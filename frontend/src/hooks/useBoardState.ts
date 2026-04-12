"use client";

/**
 * NIPS — User Board state hook
 *
 * Manages the investigation board: problem graph, pinned evidence,
 * hypothesis nodes, connections, and agent consultation.
 *
 * Consumes completedFindings and systemNodes from useInvestigation
 * but owns its own board layout and state.
 */

import { useCallback, useState } from "react";
import {
  INITIAL_BOARD_NODES,
  INITIAL_BOARD_EDGES,
  EVIDENCE_PLACEMENT_EFFECTS,
  AGENT_CONSULT_TEMPLATES,
  DEFAULT_CONSULT_RESPONSES,
} from "@/data/boardData";
import type {
  AgentId,
  AgentResult,
  BoardConnection,
  BoardGraphEdge,
  BoardGraphNode,
  BoardRelation,
  ConsultationResponse,
  HypothesisNode,
  HypothesisStatus,
} from "@/types/investigation";

// ---------------------------------------------------------------------------
// Hook return interface
// ---------------------------------------------------------------------------

export interface BoardHookReturn {
  // Graph data
  boardNodes: BoardGraphNode[];
  boardEdges: BoardGraphEdge[];
  hypotheses: HypothesisNode[];
  connections: BoardConnection[];

  // Pinned evidence
  pinnedEvidenceIds: string[];
  pinEvidence: (evidenceKey: string) => void;
  unpinEvidence: (evidenceKey: string) => void;
  isPinned: (evidenceKey: string) => boolean;

  // Hypothesis management
  addHypothesis: (text: string, position?: { x: number; y: number }) => string;
  editHypothesis: (id: string, text: string) => void;
  removeHypothesis: (id: string) => void;
  setHypothesisStatus: (id: string, status: HypothesisStatus) => void;

  // Evidence → board node attachment
  attachEvidenceToNode: (evidenceKey: string, boardNodeId: string) => void;
  addEvidenceNode: (finding: AgentResult) => void;

  // Connections
  addConnection: (sourceId: string, targetId: string, relation: BoardRelation) => void;
  removeConnection: (id: string) => void;

  // Selection
  selectedItemIds: string[];
  toggleSelectItem: (id: string) => void;
  clearSelection: () => void;

  // Agent consultation
  consultations: ConsultationResponse[];
  consultAgent: (agentId: AgentId, findings: AgentResult[]) => void;

  // Node position updates (from React Flow)
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  updateHypothesisPosition: (id: string, position: { x: number; y: number }) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

let hypothesisCounter = 0;
let connectionCounter = 0;

export function useBoardState(): BoardHookReturn {
  const [boardNodes, setBoardNodes] = useState<BoardGraphNode[]>(
    () => INITIAL_BOARD_NODES.map(n => ({ ...n }))
  );
  const [boardEdges, setBoardEdges] = useState<BoardGraphEdge[]>(
    () => INITIAL_BOARD_EDGES.map(e => ({ ...e }))
  );
  const [hypotheses, setHypotheses] = useState<HypothesisNode[]>([]);
  const [connections, setConnections] = useState<BoardConnection[]>([]);
  const [pinnedEvidenceIds, setPinnedEvidenceIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [consultations, setConsultations] = useState<ConsultationResponse[]>([]);

  // ── Pin / unpin evidence ────────────────────────────────────────────────

  const isPinned = useCallback(
    (evidenceKey: string) => pinnedEvidenceIds.includes(evidenceKey),
    [pinnedEvidenceIds]
  );

  const pinEvidence = useCallback((evidenceKey: string) => {
    setPinnedEvidenceIds(prev =>
      prev.includes(evidenceKey) ? prev : [...prev, evidenceKey]
    );
  }, []);

  const unpinEvidence = useCallback((evidenceKey: string) => {
    setPinnedEvidenceIds(prev => prev.filter(id => id !== evidenceKey));
  }, []);

  // ── Attach evidence to a board node and apply effects ─────────────────

  const attachEvidenceToNode = useCallback((evidenceKey: string, boardNodeId: string) => {
    // Link evidence to node
    setBoardNodes(prev => prev.map(n =>
      n.id === boardNodeId && !n.linkedEvidenceIds.includes(evidenceKey)
        ? { ...n, linkedEvidenceIds: [...n.linkedEvidenceIds, evidenceKey] }
        : n
    ));

    // Find and apply placement effects
    const effects = EVIDENCE_PLACEMENT_EFFECTS.filter(e => e.evidenceKey === evidenceKey);
    for (const effect of effects) {
      if (effect.revealsNodeId) {
        const revealId = effect.revealsNodeId;
        setBoardNodes(prev => prev.map(n =>
          n.id === revealId
            ? { ...n, revealed: true, type: "system" as const, label: n.label.startsWith("???") ? getRevealedLabel(n.systemNodeId) : n.label }
            : n
        ));
        // Also reveal edges connected to this node
        setBoardEdges(prev => prev.map(e =>
          (e.source === revealId || e.target === revealId) && !e.revealed
            ? { ...e, revealed: true }
            : e
        ));
      }
      if (effect.upgradesEdgeId && effect.upgradesEdgeTo) {
        const edgeId = effect.upgradesEdgeId;
        const edgeTo = effect.upgradesEdgeTo;
        setBoardEdges(prev => prev.map(e =>
          e.id === edgeId
            ? { ...e, status: edgeTo, revealed: true, linkedEvidenceIds: [...e.linkedEvidenceIds, evidenceKey] }
            : e
        ));
      }
      if (effect.marksNodeId && effect.marksNodeAs) {
        const nodeId = effect.marksNodeId;
        const nodeAs = effect.marksNodeAs;
        setBoardNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, status: nodeAs } : n
        ));
      }
    }

    // Auto-pin if not already pinned
    setPinnedEvidenceIds(prev =>
      prev.includes(evidenceKey) ? prev : [...prev, evidenceKey]
    );
  }, []);

  // ── Hypothesis CRUD ───────────────────────────────────────────────────

  const addHypothesis = useCallback((text: string, position?: { x: number; y: number }): string => {
    hypothesisCounter += 1;
    const id = `hyp-${Date.now()}-${hypothesisCounter}`;
    const node: HypothesisNode = {
      id,
      text,
      attachedToIds: [],
      status: "open",
      createdAt: Date.now(),
      position: position ?? { x: 400 + Math.random() * 200, y: 300 + Math.random() * 100 },
    };
    setHypotheses(prev => [...prev, node]);
    return id;
  }, []);

  const editHypothesis = useCallback((id: string, text: string) => {
    setHypotheses(prev => prev.map(h => h.id === id ? { ...h, text } : h));
  }, []);

  const removeHypothesis = useCallback((id: string) => {
    setHypotheses(prev => prev.filter(h => h.id !== id));
    // Remove any connections to this hypothesis
    setConnections(prev => prev.filter(c => c.sourceId !== id && c.targetId !== id));
  }, []);

  const setHypothesisStatus = useCallback((id: string, status: HypothesisStatus) => {
    setHypotheses(prev => prev.map(h => h.id === id ? { ...h, status } : h));
  }, []);

  // ── Connections ─────────────────────────────────────────────────────────

  const addConnection = useCallback((sourceId: string, targetId: string, relation: BoardRelation) => {
    connectionCounter += 1;
    const conn: BoardConnection = {
      id: `conn-${Date.now()}-${connectionCounter}`,
      sourceId,
      targetId,
      relation,
    };
    setConnections(prev => [...prev, conn]);
  }, []);

  const removeConnection = useCallback((id: string) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Selection ─────────────────────────────────────────────────────────

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedItemIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItemIds([]);
  }, []);

  // ── Agent consultation ──────────────────────────────────────────────────

  const consultAgent = useCallback((agentId: AgentId, findings: AgentResult[]) => {
    // Collect all tags from selected findings
    const allTags = new Set<string>();
    for (const f of findings) {
      for (const tag of f.tags) allTags.add(tag);
    }

    // Find best matching template
    const templates = AGENT_CONSULT_TEMPLATES[agentId] ?? [];
    let bestMatch: (typeof templates)[0] | null = null;
    let bestScore = 0;

    for (const tmpl of templates) {
      const score = tmpl.tags.filter(t => allTags.has(t)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = tmpl;
      }
    }

    const response: ConsultationResponse = {
      agentId,
      agentName: agentId.toUpperCase(),
      message: bestMatch?.message ?? DEFAULT_CONSULT_RESPONSES[agentId],
      tone: bestMatch?.tone ?? "nuance",
      timestamp: Date.now(),
    };

    setConsultations(prev => [...prev, response]);
  }, []);

  // ── Position updates ──────────────────────────────────────────────────

  const updateNodePosition = useCallback((id: string, position: { x: number; y: number }) => {
    setBoardNodes(prev => prev.map(n => n.id === id ? { ...n, position } : n));
  }, []);

  const updateHypothesisPosition = useCallback((id: string, position: { x: number; y: number }) => {
    setHypotheses(prev => prev.map(h => h.id === id ? { ...h, position } : h));
  }, []);

  return {
    boardNodes,
    boardEdges,
    hypotheses,
    connections,
    pinnedEvidenceIds,
    pinEvidence,
    unpinEvidence,
    isPinned,
    addHypothesis,
    editHypothesis,
    removeHypothesis,
    setHypothesisStatus,
    attachEvidenceToNode,
    addConnection,
    removeConnection,
    selectedItemIds,
    toggleSelectItem,
    clearSelection,
    consultations,
    consultAgent,
    updateNodePosition,
    updateHypothesisPosition,
    addEvidenceNode: (f: AgentResult) => {
      const id = `ev-node-${f.nodeId}-${f.taskType}`;
      setBoardNodes(prev => {
        if (prev.some(n => n.id === id)) return prev;
        const node: BoardGraphNode = {
          id,
          type: "evidence",
          label: f.nodeName,
          status: "normal",
          revealed: true,
          linkedEvidenceIds: [`${f.nodeId}:${f.taskType}`],
          position: { x: 800 + Math.random() * 50, y: 100 + Math.random() * 50 },
          metadata: {
            agentId: f.agentId,
            agentName: f.agentName,
            severity: f.severity,
            confidence: f.confidence,
            summary: f.summary,
          }
        };
        return [...prev, node];
      });
      // Also pin it
      pinEvidence(`${f.nodeId}:${f.taskType}`);
    }
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SYSTEM_NODE_LABELS: Record<string, string> = {
  "MAIL-01": "Mail Server",
  "DB-02": "Database Server",
  "WKS-03": "Workstation Alpha",
  "GW-01": "Gateway Router",
  "BACKUP-01": "Backup Archive",
  "EXT-01": "External Endpoint",
};

function getRevealedLabel(systemNodeId?: string): string {
  if (!systemNodeId) return "Unknown System";
  return SYSTEM_NODE_LABELS[systemNodeId] ?? systemNodeId;
}
