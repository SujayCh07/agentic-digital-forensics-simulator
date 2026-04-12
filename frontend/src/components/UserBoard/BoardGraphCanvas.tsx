"use client";

/**
 * NIPS — Board Graph Canvas
 *
 * Pure D3 canvas force simulation, ported directly from SocialGraph.tsx.
 * Same architecture: RAF draw loop reads nodesRef/edgesRef, mousedown/move/up
 * drive D3 drag (alphaTarget(0.3).restart on down, alphaTarget(0) on up).
 *
 * Responsibilities:
 * - Render board nodes (system, unknown, outcome, hypothesis, evidence)
 * - Render edges between them  
 * - Force simulation for smooth interaction
 * - Expose callback when a node is right-clicked (for edge creation UI)
 * - Accept externally added nodes (evidence drops, hypotheses)
 *
 * Does NOT handle: evidence panel, consultation panel, top bar.
 * Those are handled by the parent UserBoard component.
 */

import * as d3 from "d3";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { INITIAL_BOARD_NODES, INITIAL_BOARD_EDGES } from "@/data/boardData";
import type { AgentResult } from "@/types/investigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoardSimNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  nodeType: "system" | "unknown" | "outcome" | "hypothesis" | "evidence";
  status: "normal" | "suspicious" | "confirmed" | "contradicted" | "isolated";
  evidenceCount: number;
  // for evidence nodes
  agentId?: string;
  agentName?: string;
  severity?: string;
  confidence?: number;
  summary?: string;
}

export interface BoardSimEdge extends d3.SimulationLinkDatum<BoardSimNode> {
  id: string;
  sourceId: string;
  targetId: string;
  status: "unknown" | "suspected" | "confirmed" | "contradicted";
  label?: string;
}

export interface BoardCanvasHandle {
  addNode: (node: BoardSimNode) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: Omit<BoardSimEdge, "source" | "target">) => void;
  removeEdge: (id: string) => void;
  updateNodeStatus: (id: string, status: BoardSimNode["status"], evidenceCount?: number) => void;
  getNodesSnapshot: () => BoardSimNode[];
}

interface Props {
  onNodeClick?: (node: BoardSimNode) => void;
  onEdgeClick?: (edge: BoardSimEdge) => void;
  onCanvasClick?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  normal:      "#4a6580",
  suspicious:  "#f59e0b",
  confirmed:   "#00d4ff",
  contradicted:"#ff3a3a",
  isolated:    "#2a5070",
};

const AGENT_COLORS: Record<string, string> = {
  logis: "#c9d8e8",
  nexus: "#00d4ff",
  filer: "#f59e0b",
  chrono: "#b06fff",
};

const EDGE_COLORS: Record<string, string> = {
  unknown:     "#3a5f7a",
  suspected:   "#f59e0b",
  confirmed:   "#00d4ff",
  contradicted:"#ff3a3a",
};

function nodeRadius(n: BoardSimNode): number {
  if (n.nodeType === "evidence")   return 65;
  if (n.nodeType === "hypothesis") return 55;
  if (n.nodeType === "outcome")    return 48;
  return 42;
}

// ---------------------------------------------------------------------------
// Build initial data from boardData
// ---------------------------------------------------------------------------

function buildInitialNodes(): BoardSimNode[] {
  return INITIAL_BOARD_NODES.filter((n) => n.revealed).map((n) => ({
    id: n.id,
    label: n.label,
    nodeType: n.type as BoardSimNode["nodeType"],
    status: n.status as BoardSimNode["status"],
    evidenceCount: 0,
    // Start top-right — sim will spread them
    x: 800 + (Math.random() - 0.5) * 40,
    y: 60  + (Math.random() - 0.5) * 40,
  }));
}

function buildInitialEdges(nodes: BoardSimNode[]): BoardSimEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return INITIAL_BOARD_EDGES.filter((e) => e.revealed).map((e) => ({
    id: e.id,
    source: nodeMap.get(e.source) ?? e.source,
    target: nodeMap.get(e.target) ?? e.target,
    sourceId: e.source,
    targetId: e.target,
    status: e.status as BoardSimEdge["status"],
    label: e.label,
  }));
}

// ---------------------------------------------------------------------------
// Draw helpers
// ---------------------------------------------------------------------------

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawNode(ctx: CanvasRenderingContext2D, n: BoardSimNode, hovered: boolean, zoom: d3.ZoomTransform) {
  const x = n.x ?? 0;
  const y = n.y ?? 0;
  const r = nodeRadius(n);
  const half_w = r;
  const half_h = n.nodeType === "evidence" ? 42 : 28;

  const statusColor = STATUS_COLORS[n.status] ?? "#4a6580";
  const isUnknown = n.nodeType === "unknown";
  const isEv = n.nodeType === "evidence";
  const isHyp = n.nodeType === "hypothesis";

  // Box fill
  ctx.globalAlpha = hovered ? 1 : 0.92;
  ctx.fillStyle = isEv
    ? "rgba(8,12,18,0.97)"
    : isHyp
      ? `${statusColor}0A`
      : "rgba(8,12,18,0.95)";

  if (isUnknown) {
    ctx.strokeStyle = hovered ? "#00d4ff" : "#2a5070";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 3]);
  } else {
    ctx.strokeStyle = hovered ? "#00d4ff" : statusColor;
    ctx.lineWidth = hovered ? 2 : 1.5;
    ctx.setLineDash([]);
  }

  // Shadow / glow
  if (hovered) {
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 12;
  } else if (n.status === "confirmed") {
    ctx.shadowColor = "#00d4ff";
    ctx.shadowBlur = 6;
  } else {
    ctx.shadowColor = statusColor;
    ctx.shadowBlur = 3;
  }

  drawRoundRect(ctx, x - half_w, y - half_h, half_w * 2, half_h * 2, 4);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Content
  const labelColor = isHyp ? statusColor : "#c9d8e8";
  const scaleFactor = Math.max(0.7, Math.min(1, zoom.k));

  if (isUnknown) {
    ctx.font = `bold ${Math.round(14 * scaleFactor)}px monospace`;
    ctx.fillStyle = "#2a5070";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("???", x, y - 4);
    ctx.font = `${Math.round(7 * scaleFactor)}px monospace`;
    ctx.fillStyle = "#1e3d5a";
    ctx.fillText(n.label.toUpperCase(), x, y + 12);
    return;
  }

  if (isEv) {
    const agentColor = AGENT_COLORS[n.agentId ?? ""] ?? "#4a6580";
    // Agent name
    ctx.font = `bold ${Math.round(8 * scaleFactor)}px monospace`;
    ctx.fillStyle = agentColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(n.agentName?.toUpperCase() ?? "", x, y - 22);
    // Node name
    ctx.font = `${Math.round(7 * scaleFactor)}px monospace`;
    ctx.fillStyle = "#2a5070";
    ctx.fillText(n.label, x, y - 12);
    // Summary truncated
    ctx.font = `${Math.round(7 * scaleFactor)}px monospace`;
    ctx.fillStyle = "#4a6580";
    const words = (n.summary ?? "").split(" ");
    let line = "";
    let lineY = y - 1;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > half_w * 1.8) {
        ctx.fillText(line, x, lineY);
        line = w;
        lineY += 9;
        if (lineY > y + 20) { ctx.fillText("...", x, lineY); break; }
      } else {
        line = test;
      }
    }
    if (line && lineY <= y + 20) ctx.fillText(line, x, lineY);
    // Confidence bar
    const sevColor = n.severity === "critical" ? "#ff3a3a" : n.severity === "high" ? "#f59e0b" : "#00d4ff";
    ctx.fillStyle = "#1e3d5a";
    drawRoundRect(ctx, x - half_w + 8, y + 26, (half_w - 8) * 2, 3, 1);
    ctx.fill();
    ctx.fillStyle = sevColor;
    drawRoundRect(ctx, x - half_w + 8, y + 26, Math.max(2, (half_w - 8) * 2 * (n.confidence ?? 0.5)), 3, 1);
    ctx.fill();
    return;
  }

  // System / outcome / hypothesis
  // Status dot
  ctx.beginPath();
  ctx.arc(x - half_w + 10, y - 8, 3, 0, Math.PI * 2);
  ctx.fillStyle = statusColor;
  ctx.shadowColor = statusColor;
  ctx.shadowBlur = 4;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Label
  ctx.font = `bold ${Math.round(9 * scaleFactor)}px monospace`;
  ctx.fillStyle = isHyp ? statusColor : (n.nodeType === "outcome" ? "#ff3a3a" : "#c9d8e8");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const maxW = half_w * 1.7;
  let label = n.label;
  while (ctx.measureText(label).width > maxW && label.length > 4) label = label.slice(0, -1);
  if (label !== n.label) label += "…";
  ctx.fillText(label, x, y + 2);

  // Status label
  ctx.font = `${Math.round(6.5 * scaleFactor)}px monospace`;
  ctx.fillStyle = statusColor;
  ctx.fillText(n.status.toUpperCase(), x, y + 14);

  // Evidence counter badge
  if (n.evidenceCount > 0) {
    ctx.font = `${Math.round(6 * scaleFactor)}px monospace`;
    ctx.fillStyle = "#00d4ff";
    ctx.fillText(`${n.evidenceCount} ev`, x + half_w - 14, y - 14);
  }
}

function drawEdge(
  ctx: CanvasRenderingContext2D,
  edge: BoardSimEdge,
  hovered: boolean,
) {
  const s = edge.source as BoardSimNode;
  const t = edge.target as BoardSimNode;
  if (!s?.x || !t?.x) return;

  const color = EDGE_COLORS[edge.status] ?? "#3a5f7a";
  ctx.strokeStyle = hovered ? "#ffffff" : color;
  ctx.lineWidth = hovered ? 2.5 : (edge.status === "confirmed" ? 2 : 1.2);

  if (edge.status === "unknown") ctx.setLineDash([6, 4]);
  else if (edge.status === "suspected") ctx.setLineDash([5, 3]);
  else if (edge.status === "contradicted") ctx.setLineDash([4, 4]);
  else ctx.setLineDash([]);

  if (edge.status === "confirmed" || hovered) {
    ctx.shadowColor = hovered ? "#ffffff" : "#00d4ff";
    ctx.shadowBlur = hovered ? 8 : 5;
  }

  // Curved edge (same as SocialGraph)
  const mx = (s.x! + t.x!) / 2;
  const my = (s.y! + t.y!) / 2;
  const dx = t.x! - s.x!;
  const dy = t.y! - s.y!;
  const cx2 = mx + dy * 0.08;
  const cy2 = my - dx * 0.08;

  ctx.beginPath();
  ctx.moveTo(s.x!, s.y!);
  ctx.quadraticCurveTo(cx2, cy2, t.x!, t.y!);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowBlur = 0;

  // Label at midpoint
  if (edge.label) {
    ctx.font = "6px monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(edge.label, cx2, cy2);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BoardGraphCanvas = forwardRef<BoardCanvasHandle, Props>(
  function BoardGraphCanvas({ onNodeClick, onEdgeClick, onCanvasClick }, ref) {
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simRef       = useRef<d3.Simulation<BoardSimNode, BoardSimEdge> | null>(null);
    const nodesRef     = useRef<BoardSimNode[]>([]);
    const edgesRef     = useRef<BoardSimEdge[]>([]);
    const rafRef       = useRef<number>(0);
    const hoveredNodeRef = useRef<BoardSimNode | null>(null);
    const hoveredEdgeRef = useRef<BoardSimEdge | null>(null);
    const dragRef      = useRef<BoardSimNode | null>(null);
    const zoomRef      = useRef<d3.ZoomTransform>(d3.zoomIdentity);
    const zoomBehaviorRef = useRef<d3.ZoomBehavior<HTMLCanvasElement, unknown> | null>(null);
    // True while the pointer is held down over a node (used to suppress D3 panning)
    const nodeDownRef  = useRef(false);
    const [dims, setDims] = useState({ w: 880, h: 560 });

    // Measure container
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const ro = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width > 10 && height > 10) setDims({ w: width, h: height });
      });
      ro.observe(el);
      return () => ro.disconnect();
    }, []);

    // Resize canvas + re-attach zoom
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = dims.w * dpr;
      canvas.height = dims.h * dpr;
      canvas.style.width  = `${dims.w}px`;
      canvas.style.height = `${dims.h}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);

      const zoom = d3.zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.25, 3])
        // Don't pan/zoom while the mouse is held down on a node
        .filter((event) => !nodeDownRef.current)
        .on("zoom", (e: d3.D3ZoomEvent<HTMLCanvasElement, unknown>) => {
          zoomRef.current = e.transform;
        });
      d3.select(canvas).call(zoom);
      zoomBehaviorRef.current = zoom;

      // Update force center
      const cx = dims.w / 2;
      const cy = dims.h / 2;
      const sim = simRef.current;
      if (sim) {
        (sim.force("center") as d3.ForceCenter<BoardSimNode>)?.x(cx).y(cy);
        (sim.force("x") as d3.ForceX<BoardSimNode>)?.x(cx);
        (sim.force("y") as d3.ForceY<BoardSimNode>)?.y(cy);
      }
    }, [dims]);

    // Build simulation once on mount
    useEffect(() => {
      const nodes = buildInitialNodes();
      const edges = buildInitialEdges(nodes);
      nodesRef.current = nodes;
      edgesRef.current = edges;

      const cx = dims.w / 2;
      const cy = dims.h / 2;

      const sim = d3.forceSimulation<BoardSimNode>(nodes)
        .force("link",
          d3.forceLink<BoardSimNode, BoardSimEdge>(edges as BoardSimEdge[])
            .id((d) => d.id)
            .distance(140)
            .strength(0.3)
        )
        .force("charge",  d3.forceManyBody<BoardSimNode>().strength(-200).distanceMax(400))
        .force("center",  d3.forceCenter(cx, cy).strength(0.04))
        .force("collide", d3.forceCollide<BoardSimNode>((d) => nodeRadius(d) + 12).strength(0.85).iterations(3))
        .force("x",       d3.forceX(cx).strength(0.025))
        .force("y",       d3.forceY(cy).strength(0.025))
        .alphaDecay(0.015)
        .velocityDecay(0.35);

      simRef.current = sim;
      return () => { sim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Draw loop (same pattern as SocialGraph) ──────────────────────────
    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w, h } = dims;
      ctx.clearRect(0, 0, w, h);

      // Dark background
      ctx.fillStyle = "#080c12";
      ctx.fillRect(0, 0, w, h);

      // Dot grid
      ctx.fillStyle = "#1e3d5a20";
      const gap = 24;
      for (let x = gap; x < w; x += gap)
        for (let y = gap; y < h; y += gap) {
          ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2); ctx.fill();
        }

      ctx.save();
      ctx.translate(zoomRef.current.x, zoomRef.current.y);
      ctx.scale(zoomRef.current.k, zoomRef.current.k);

      const hEdge = hoveredEdgeRef.current;
      const hNode = hoveredNodeRef.current;

      // Edges
      for (const e of edgesRef.current) {
        drawEdge(ctx, e, e === hEdge);
      }

      // Nodes
      for (const n of nodesRef.current) {
        drawNode(ctx, n, n === hNode, zoomRef.current);
      }

      ctx.restore();

      // Legend (fixed)
      drawLegend(ctx, w);

      // MiniMap (fixed)
      drawMiniMap(ctx, w, h, nodesRef.current, zoomRef.current);

      rafRef.current = requestAnimationFrame(draw);
    }, [dims]);

// ... after existing helpers ...

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  canvasH: number,
  nodes: BoardSimNode[],
  zoom: d3.ZoomTransform
) {
  const mw = 120;
  const mh = 80;
  const x = canvasW - mw - 10;
  const y = canvasH - mh - 10;
  const padding = 6;

  // Background
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(8,12,18,0.95)";
  ctx.strokeStyle = "#1e3d5a";
  ctx.lineWidth = 1;
  drawRoundRect(ctx, x, y, mw, mh, 3);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;

  if (nodes.length === 0) return;

  // Calculate nodes bounding box to scale them into minimap
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const n of nodes) {
    if (n.x! < minX) minX = n.x!;
    if (n.x! > maxX) maxX = n.x!;
    if (n.y! < minY) minY = n.y!;
    if (n.y! > maxY) maxY = n.y!;
  }
  // Add some buffer
  const b = 200;
  minX -= b; maxX += b; minY -= b; maxY += b;

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const ratioX = (mw - padding * 2) / contentW;
  const ratioY = (mh - padding * 2) / contentH;
  const scale = Math.min(ratioX, ratioY);

  const offX = x + padding + (mw - padding * 2 - contentW * scale) / 2;
  const offY = y + padding + (mh - padding * 2 - contentH * scale) / 2;

  const toMapX = (gx: number) => offX + (gx - minX) * scale;
  const toMapY = (gy: number) => offY + (gy - minY) * scale;

  // Draw nodes as dots
  for (const n of nodes) {
    ctx.beginPath();
    ctx.arc(toMapX(n.x!), toMapY(n.y!), 1.5, 0, Math.PI * 2);
    ctx.fillStyle = (n.nodeType === "evidence" ? "#f59e0b" : n.nodeType === "hypothesis" ? "#b06fff" : STATUS_COLORS[n.status] ?? "#4a6580");
    ctx.fill();
  }

  // Draw viewport rectangle
  const vw = canvasW / zoom.k;
  const vh = canvasH / zoom.k;
  const vx = -zoom.x / zoom.k;
  const vy = -zoom.y / zoom.k;

  ctx.strokeStyle = "rgba(0, 212, 255, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(toMapX(vx), toMapY(vy), vw * scale, vh * scale);
  ctx.fillStyle = "rgba(0, 212, 255, 0.05)";
  ctx.fillRect(toMapX(vx), toMapY(vy), vw * scale, vh * scale);
}

    // Start/stop RAF loop
    useEffect(() => {
      rafRef.current = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(rafRef.current);
    }, [draw]);

    // ── Mouse interaction ─────────────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      function screenToGraph(sx: number, sy: number): [number, number] {
        return zoomRef.current.invert([sx, sy]) as [number, number];
      }

      function getMousePos(e: MouseEvent) {
        const rect = canvas!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }

      function getNodeAt(gx: number, gy: number): BoardSimNode | null {
        for (const n of nodesRef.current) {
          const dx = (n.x ?? 0) - gx;
          const dy = (n.y ?? 0) - gy;
          if (Math.abs(dx) < nodeRadius(n) && Math.abs(dy) < 32) return n;
        }
        return null;
      }

      function getEdgeAt(gx: number, gy: number): BoardSimEdge | null {
        for (const e of edgesRef.current) {
          const s = e.source as BoardSimNode;
          const t = e.target as BoardSimNode;
          if (s.x == null || s.y == null || t.x == null || t.y == null) continue;
          const mx = (s.x + t.x) / 2;
          const my = (s.y + t.y) / 2;
          const dy2 = (s.y + t.y) / 2 - s.y;
          const dx2 = (s.x + t.x) / 2 - s.x;
          const cx2 = mx + dy2 * 0.08;
          const cy2 = my - dx2 * 0.08;
          const dist = Math.hypot(gx - cx2, gy - cy2);
          if (dist < 12) return e;
        }
        return null;
      }

      // Pending drag: records mousedown position so we can distinguish click vs drag
      const pending = { node: null as BoardSimNode | null, sx: 0, sy: 0 };
      const DRAG_THRESHOLD = 4; // px before drag activates

      const onMove = (e: MouseEvent) => {
        const { x, y } = getMousePos(e);

        // Promote pending to active drag once threshold exceeded
        if (pending.node && !dragRef.current) {
          if (Math.hypot(x - pending.sx, y - pending.sy) > DRAG_THRESHOLD) {
            const [gx, gy] = screenToGraph(x, y);
            dragRef.current = pending.node;
            dragRef.current.fx = gx;
            dragRef.current.fy = gy;
            canvas.style.cursor = "grabbing";
            simRef.current?.alphaTarget(0.3).restart();
          }
        }

        // Active drag: lock node to cursor
        if (dragRef.current) {
          const [gx, gy] = screenToGraph(x, y);
          dragRef.current.fx = gx;
          dragRef.current.fy = gy;
          simRef.current?.alpha(0.3).restart();
          return;
        }

        // Hover effects
        const [gx, gy] = screenToGraph(x, y);
        const node = getNodeAt(gx, gy);
        hoveredNodeRef.current = node;
        hoveredEdgeRef.current = node ? null : getEdgeAt(gx, gy);
        canvas.style.cursor = node ? "grab" : (hoveredEdgeRef.current ? "pointer" : "default");
      };

      const onDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        const { x, y } = getMousePos(e);
        const [gx, gy] = screenToGraph(x, y);
        const node = getNodeAt(gx, gy);
        if (node) {
          nodeDownRef.current = true;   // suppress D3 pan
          pending.node = node;
          pending.sx = x;
          pending.sy = y;
          e.stopPropagation();
        }
      };

      const onUp = () => {
        nodeDownRef.current = false;    // re-enable D3 pan
        const wasDragging = !!dragRef.current;

        if (dragRef.current) {
          dragRef.current.fx = null;
          dragRef.current.fy = null;
          dragRef.current = null;
          canvas.style.cursor = "default";
          simRef.current?.alphaTarget(0);
        }

        // If button released without dragging → plain click → fire connection logic
        const candidate = pending.node;
        pending.node = null;
        if (!wasDragging && candidate) {
          onNodeClick?.(candidate);
        }
      };

      const onClick = (e: MouseEvent) => {
        const { x, y } = getMousePos(e);
        const [gx, gy] = screenToGraph(x, y);
        // Node clicks handled in onUp — only dispatch edges/canvas from here
        if (getNodeAt(gx, gy)) return;
        const edge = getEdgeAt(gx, gy);
        if (edge) { onEdgeClick?.(edge); return; }
        onCanvasClick?.();
      };

      const onLeave = () => {
        hoveredNodeRef.current = null;
        hoveredEdgeRef.current = null;
        // Don't cancel active drag; clear only pending candidate
        if (!dragRef.current) pending.node = null;
      };

      canvas.addEventListener("mousemove", onMove);
      canvas.addEventListener("mousedown", onDown);
      canvas.addEventListener("click",     onClick);
      canvas.addEventListener("mouseleave", onLeave);
      // mouseup on document so releasing outside the canvas always fires
      document.addEventListener("mouseup", onUp);
      return () => {
        canvas.removeEventListener("mousemove", onMove);
        canvas.removeEventListener("mousedown", onDown);
        canvas.removeEventListener("click",     onClick);
        canvas.removeEventListener("mouseleave", onLeave);
        document.removeEventListener("mouseup", onUp);
      };
    }, [onNodeClick, onEdgeClick, onCanvasClick]);


    // ── Imperative API for parent to add/remove nodes & edges ─────────────
    useImperativeHandle(ref, () => ({
      addNode(node: BoardSimNode) {
        // Enter from top-right like SocialGraph
        node.x = dims.w - 60 + (Math.random() - 0.5) * 30;
        node.y = 50 + (Math.random() - 0.5) * 30;
        nodesRef.current = [...nodesRef.current, node];
        simRef.current?.nodes(nodesRef.current);
        simRef.current?.alpha(0.5).restart();
      },
      removeNode(id: string) {
        nodesRef.current = nodesRef.current.filter((n) => n.id !== id);
        edgesRef.current = edgesRef.current.filter(
          (e) => (e.source as BoardSimNode).id !== id && (e.target as BoardSimNode).id !== id
        );
        simRef.current?.nodes(nodesRef.current);
        const linkForce = simRef.current?.force("link") as d3.ForceLink<BoardSimNode, BoardSimEdge> | undefined;
        linkForce?.links(edgesRef.current);
        simRef.current?.alpha(0.1).restart();
      },
      addEdge(edge: Omit<BoardSimEdge, "source" | "target">) {
        const s = nodesRef.current.find((n) => n.id === edge.sourceId);
        const t = nodesRef.current.find((n) => n.id === edge.targetId);
        if (!s || !t) return;
        const full: BoardSimEdge = { ...edge, source: s, target: t };
        edgesRef.current = [...edgesRef.current, full];
        const linkForce = simRef.current?.force("link") as d3.ForceLink<BoardSimNode, BoardSimEdge> | undefined;
        linkForce?.links(edgesRef.current);
        simRef.current?.alpha(0.1).restart();
      },
      removeEdge(id: string) {
        edgesRef.current = edgesRef.current.filter((e) => e.id !== id);
        const linkForce = simRef.current?.force("link") as d3.ForceLink<BoardSimNode, BoardSimEdge> | undefined;
        linkForce?.links(edgesRef.current);
      },
      updateNodeStatus(id, status, evidenceCount) {
        const n = nodesRef.current.find((node) => node.id === id);
        if (!n) return;
        n.status = status;
        if (evidenceCount !== undefined) n.evidenceCount = evidenceCount;
      },
      getNodesSnapshot() {
        return [...nodesRef.current];
      },
    }), [dims.w]);

    return (
      <div ref={containerRef} className="relative w-full h-full">
        <canvas ref={canvasRef} className="block w-full h-full" />
        <button
          type="button"
          onClick={() => {
            const canvas = canvasRef.current;
            const zoom = zoomBehaviorRef.current;
            if (canvas && zoom) d3.select(canvas).call(zoom.transform, d3.zoomIdentity);
          }}
          className="absolute top-2 left-2 z-10 text-[7px] font-mono uppercase tracking-widest px-2 py-1 rounded transition-opacity hover:opacity-70"
          style={{ background: "rgba(8,12,18,0.9)", border: "1px solid #1e3d5a", color: "#4a6580" }}
        >
          Reset Zoom
        </button>
      </div>
    );
  }
);

// ---------------------------------------------------------------------------
// Legend
// ---------------------------------------------------------------------------

function drawLegend(ctx: CanvasRenderingContext2D, canvasW: number) {
  const x = canvasW - 110;
  let y = 8;
  const w = 100;
  const h = 80;

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(8,12,18,0.95)";
  ctx.strokeStyle = "#1e3d5a";
  ctx.lineWidth = 1;
  drawRoundRect(ctx, x, y, w, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = "bold 7px monospace";
  ctx.fillStyle = "#2a5070";
  ctx.textAlign = "left";
  y += 13;
  ctx.fillText("EDGE STATUS", x + 6, y);
  y += 10;

  const types: [string, string, boolean][] = [
    ["unknown",      "#3a5f7a", true],
    ["suspected",    "#f59e0b", true],
    ["confirmed",    "#00d4ff", false],
    ["contradicted", "#ff3a3a", true],
  ];
  ctx.font = "6px monospace";
  for (const [label, color, dashed] of types) {
    ctx.strokeStyle = color;
    ctx.lineWidth = dashed ? 1 : 1.8;
    ctx.setLineDash(dashed ? [4, 3] : []);
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 3);
    ctx.lineTo(x + 22, y + 3);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillText(label, x + 26, y + 6);
    y += 13;
  }
}
