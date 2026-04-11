"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
<<<<<<< HEAD
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AgentCommandModal } from "@/components/AgentCommandModal";
import { AttackGraph } from "@/components/AttackGraph";
import { EventFeed } from "@/components/EventFeed";
import { eventBridge } from "@/game/bridge/EventBridge";
import { useInvestigation } from "@/hooks/useInvestigation";
import type {
  AgentDefinition,
  InvestigationAgentSession,
} from "@/types/investigation";
=======
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AgentStatusBar } from "@/components/AgentStatusBar";
import { Dashboard } from "@/components/Dashboard";
import { EconomicReportModal } from "@/components/EconomicReportModal";
import { EventFeed } from "@/components/EventFeed";
import { NodeListPanel } from "@/components/NodeListPanel";
import { NPCInteractionModal } from "@/components/NPCInteractionModal";
import { TaskAssignmentModal } from "@/components/TaskAssignmentModal";
import { useInvestigation } from "@/hooks/useInvestigation";
import { useSimulation } from "@/hooks/useSimulation";
import type { AgentId } from "@/types/investigation";
import { clearReplayData, getReplayData } from "@/lib/replayStore";
import type { NPCHoverInfo, SimEvent } from "@/types";
>>>>>>> redesign2

const GameCanvas = dynamic(
  () =>
    import("@/components/GameCanvas").then((m) => ({ default: m.GameCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[640px] items-center justify-center text-[11px] font-mono text-[var(--muted)]">
        Initializing investigation map...
      </div>
    ),
  },
);

export default function SimulatePage() {
  return (
<<<<<<< HEAD
    <Suspense
      fallback={<div className="p-6 text-sm font-mono">Loading case...</div>}
    >
      <SimulateContent />
=======
    <Suspense fallback={<GameCanvasPlaceholder />}>
      <SimulateRouter />
>>>>>>> redesign2
    </Suspense>
  );
}

<<<<<<< HEAD
function buildInitialAgentSession(
  agent: AgentDefinition,
): InvestigationAgentSession {
  return {
    interactionId: null,
    messages: [
      {
        id: `intro-${agent.id}`,
        role: "agent",
        content: `${agent.name} online. ${agent.title}, ${agent.experienceYears} years in ${agent.specialty.toLowerCase()}. ${agent.helpfulnessStyle}`,
        createdAt: 0,
      },
    ],
  };
=======
function SimulateRouter() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  if (mode === "investigate") return <InvestigateContent />;
  return <SimulateContent />;
}

// ---------------------------------------------------------------------------
// InvestigateContent — NIPS core gameplay loop
// ---------------------------------------------------------------------------

function InvestigateContent() {
  const inv = useInvestigation();
  const [showGraph, setShowGraph] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<NPCHoverInfo | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [overlayMetrics, setOverlayMetrics] = useState<OverlayMetrics>(DEFAULT_OVERLAY_METRICS);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusScale, setFocusScale] = useState(1);

  // Reuse the same canvas event plumbing from SimulateContent
  useEffect(() => {
    if (focusMode) {
      setFocusScale(Math.max(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT));
    } else {
      setFocusScale(1);
    }
  }, [focusMode]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
      const onHover = (info: NPCHoverInfo) => setHoverInfo(info);
      const onHoverOut = () => setHoverInfo(null);
      eventBridge.on("sim:npc-hover", onHover);
      eventBridge.on("sim:npc-hover-out", onHoverOut);
      cleanup = () => {
        eventBridge.off("sim:npc-hover", onHover);
        eventBridge.off("sim:npc-hover-out", onHoverOut);
      };
    });
    return () => cleanup?.();
  }, []);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    let observedTarget: Element | null = null;
    const updateMetrics = () => {
      const canvas = container.querySelector("canvas") ?? container.querySelector("[data-testid='game-canvas']");
      const target = canvas instanceof HTMLElement ? canvas : null;
      if (!target) return;
      if (observedTarget !== target) {
        if (observedTarget) resizeObserver.unobserve(observedTarget);
        observedTarget = target;
        resizeObserver.observe(target);
      }
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const next: OverlayMetrics = {
        offsetX: targetRect.left - containerRect.left,
        offsetY: targetRect.top - containerRect.top,
        width: targetRect.width,
        height: targetRect.height,
        scaleX: targetRect.width / GAME_WIDTH,
        scaleY: targetRect.height / GAME_HEIGHT,
      };
      setOverlayMetrics((prev) => {
        const changed = Math.abs(prev.offsetX - next.offsetX) > 0.5 || Math.abs(prev.offsetY - next.offsetY) > 0.5 || Math.abs(prev.width - next.width) > 0.5 || Math.abs(prev.height - next.height) > 0.5;
        return changed ? next : prev;
      });
    };
    const resizeObserver = new ResizeObserver(() => updateMetrics());
    resizeObserver.observe(container);
    const mutationObserver = new MutationObserver(() => updateMetrics());
    mutationObserver.observe(container, { childList: true, subtree: true });
    window.addEventListener("resize", updateMetrics);
    document.addEventListener("fullscreenchange", updateMetrics);
    updateMetrics();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", updateMetrics);
      document.removeEventListener("fullscreenchange", updateMetrics);
    };
  }, []);

  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
        eventBridge.emitCameraPan(-dx / SCALE_FACTOR, -dy / SCALE_FACTOR);
      });
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture(e.pointerId);
    };
    el.style.cursor = "crosshair";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const zoomTarget = el.querySelector("canvas") ?? el.querySelector("[data-testid='game-canvas']");
      const rect = zoomTarget instanceof HTMLElement ? zoomTarget.getBoundingClientRect() : el.getBoundingClientRect();
      const scaleX = rect.width > 0 ? GAME_WIDTH / rect.width : 1;
      const scaleY = rect.height > 0 ? GAME_HEIGHT / rect.height : 1;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;
      import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
        eventBridge.emitCameraZoom(delta, mouseX, mouseY);
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setFocusMode(false); setShowGraph(false); inv.setSelectedNodeId(null); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [inv]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen();
  }, []);

  const selectedNode = inv.selectedNodeId
    ? inv.systemNodes.find((n) => n.id === inv.selectedNodeId) ?? null
    : null;

  return (
    <div
      className="relative flex h-screen flex-col overflow-clip"
      style={{ background: "#080c12" }}
      data-testid="investigate-page"
    >
      {/* Top bar: NIPS header + agent status */}
      <div
        className={`rpg-panel flex h-14 shrink-0 items-center gap-3 rounded-none border-x-0 border-t-0 px-4 panel-slide-top ${focusMode ? "panel-hidden-top" : ""}`}
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <div className="flex items-center gap-3 shrink-0 mr-3">
          <span className="text-[10px] font-mono tracking-tight" style={{ color: "#00d4ff" }}>
            ◈ NIPS
          </span>
          <span className="text-[10px] font-mono" style={{ color: "#1e3d5a" }}>|</span>
          {/* Stage dots */}
          <div className="flex gap-1">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className="h-2 w-10 rounded-sm transition-colors duration-500"
                style={{
                  border: "1px solid #1e3d5a",
                  background: inv.stage >= s ? (s === 3 ? "#ff3a3a" : s === 2 ? "#f59e0b" : "#00d4ff") : "#0d1520",
                  boxShadow: inv.stage >= s ? (s === 3 ? "0 0 6px rgba(255,58,58,0.5)" : s === 2 ? "0 0 6px rgba(245,158,11,0.5)" : "0 0 6px rgba(0,212,255,0.5)") : "none",
                }}
              />
            ))}
          </div>
          <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>
            C{inv.currentCycle}
          </span>
          {/* Pressure indicator */}
          {inv.pressureLevel > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <div
                className="h-1.5 w-16 rounded-sm overflow-hidden"
                style={{ background: "#1e3d5a" }}
                title={`Incident pressure: ${inv.pressureLevel}/10`}
              >
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${inv.pressureLevel * 10}%`,
                    background: inv.pressureLevel >= 7 ? "#ff3a3a"
                             : inv.pressureLevel >= 4 ? "#f59e0b"
                             : "#00ff88",
                  }}
                />
              </div>
              <span className="text-[7px] font-mono" style={{ color: inv.pressureLevel >= 7 ? "#ff3a3a" : "#4a6580" }}>
                P{inv.pressureLevel}
              </span>
            </div>
          )}
        </div>

        {/* Agent status bar */}
        <div className="flex-1 h-full py-1.5 overflow-x-auto">
          <AgentStatusBar agents={inv.agents} activeTasks={inv.activeTasks} lockedAgents={inv.lockedAgents} />
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {/* Funds display */}
          <div className="flex items-center gap-1.5 rpg-panel px-2 py-1">
            <span className="text-[8px] font-mono" style={{ color: "#2a5070" }}>₡</span>
            <span className="text-[9px] font-mono tabular-nums" style={{ color: "#00ff88" }}>
              {inv.funds.toLocaleString()}
            </span>
          </div>
          {inv.isComplete && (
            <span className="text-[9px] font-mono" style={{ color: "#00ff88", textShadow: "0 0 8px rgba(0,255,136,0.5)" }}>
              CASE CLOSED
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowGraph(true)}
            className="rpg-panel px-2 py-1 text-[8px] font-mono uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{ color: "#4a6580" }}
          >
            ATTACK MAP
          </button>
          <button
            type="button"
            onClick={() => setFocusMode((f) => !f)}
            className="rpg-panel px-2 py-1 text-[8px] font-mono uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{ color: focusMode ? "#00d4ff" : "#4a6580", border: `1px solid ${focusMode ? "#00d4ff" : "#1e3d5a"}` }}
          >
            {focusMode ? "[ EXIT FOCUS ]" : "[ FOCUS ]"}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        {/* Left: Evidence feed */}
        <div className={`rpg-panel flex h-full w-60 shrink-0 flex-col panel-slide-left ${focusMode ? "panel-hidden-left" : ""}`}>
          <div className="flex items-center px-3 py-2 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
            <h2 className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "#00d4ff" }}>
              Evidence Feed
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <EventFeed events={inv.events} />
          </div>
        </div>

        {/* Center: Game canvas */}
        <div
          className={focusMode ? "fixed inset-0 z-50 flex items-center justify-center overflow-hidden" : "relative flex min-w-0 flex-1 items-center justify-center overflow-hidden"}
          style={focusMode ? { background: "#080c12" } : undefined}
        >
          <div
            ref={canvasContainerRef}
            className="relative shrink-0 canvas-glow canvas-expand"
            style={{
              border: "1px solid #1e3d5a",
              borderRadius: 4,
              ...(focusMode ? { transform: `scale(${focusScale})`, transformOrigin: "center center", border: "none", padding: 0, boxShadow: "none" } : {}),
            }}
          >
            <GameCanvas />
            {/* Zoom / Fullscreen controls */}
            <div className="absolute top-2 right-2 z-40 flex gap-1">
              <button type="button" onClick={() => { import("@/game/bridge/EventBridge").then(({ eventBridge }) => eventBridge.emitCameraZoom(1)); }} className="rpg-panel px-1.5 py-1 text-[9px] font-mono transition-opacity hover:opacity-70" style={{ color: "#4a6580" }}>ZOOM+</button>
              <button type="button" onClick={() => { import("@/game/bridge/EventBridge").then(({ eventBridge }) => eventBridge.emitCameraZoom(-1)); }} className="rpg-panel px-1.5 py-1 text-[9px] font-mono transition-opacity hover:opacity-70" style={{ color: "#4a6580" }}>ZOOM-</button>
              <button type="button" onClick={toggleFullscreen} className="rpg-panel px-1.5 py-1 text-[9px] font-mono transition-opacity hover:opacity-70" style={{ color: "#4a6580" }}>{isFullscreen ? "EXIT" : "FULL"}</button>
            </div>
            {/* NPC hover tooltip */}
            {hoverInfo && (
              <div className="pointer-events-none absolute z-30 overflow-hidden" style={{ left: overlayMetrics.offsetX, top: overlayMetrics.offsetY, width: overlayMetrics.width, height: overlayMetrics.height }}>
                <NPCTooltip info={hoverInfo} scaleX={overlayMetrics.scaleX} scaleY={overlayMetrics.scaleY} />
              </div>
            )}
          </div>
        </div>

        {/* Right: Node list panel */}
        <div className={`panel-slide-right ${focusMode ? "panel-hidden-right" : ""}`}>
          <NodeListPanel
            nodes={inv.systemNodes}
            selectedNodeId={inv.selectedNodeId}
            onSelectNode={(id) => inv.setSelectedNodeId(inv.selectedNodeId === id ? null : id)}
          />
        </div>
      </div>

      {/* Viewport-fixed dashboard */}
      <div className={`fixed bottom-3 right-60 z-40 pointer-events-auto ${focusMode ? "opacity-0 pointer-events-none" : ""}`}>
        <Dashboard
          metrics={inv.metrics}
          metricsHistory={inv.metricsHistory}
          phase={inv.stage}
          round={inv.currentCycle}
          maxRounds={99}
        />
      </div>

      {/* Focus mode exit button */}
      {focusMode && (
        <button type="button" className="fixed top-4 right-4 z-[60] rpg-panel px-3 py-1.5 text-[9px] font-mono transition-opacity hover:opacity-70" style={{ color: "#4a6580", border: "1px solid #1e3d5a" }} onClick={() => setFocusMode(false)}>
          [ESC] exit focus
        </button>
      )}

      {/* Task assignment modal */}
      {selectedNode && (
        <TaskAssignmentModal
          node={selectedNode}
          agents={inv.agents}
          lockedAgents={inv.lockedAgents}
          funds={inv.funds}
          onSubmitInstruction={(agentId: AgentId, rawInstruction: string) => {
            inv.submitInstruction(agentId, selectedNode.id, rawInstruction);
            inv.setSelectedNodeId(null);
          }}
          onUnlockAgent={(agentId: AgentId) => inv.unlockAgent(agentId)}
          onClose={() => inv.setSelectedNodeId(null)}
        />
      )}

      {/* Attack Graph Modal */}
      {showGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowGraph(false); }}>
          <div className="relative flex flex-col animate-[modalIn_200ms_ease-out] rpg-panel" style={{ width: 700, height: 560 }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid #1e3d5a" }}>
              <h2 className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "#00d4ff" }}>◈ Attack Graph</h2>
              <button type="button" onClick={() => setShowGraph(false)} className="text-[10px] font-mono uppercase tracking-widest transition-opacity hover:opacity-60" style={{ color: "#4a6580" }}>[ESC]</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SocialGraph npcs={inv.graphData.npcs} relationships={inv.graphData.relationships} influenceEvents={inv.graphData.influenceEvents} version={inv.graphData.version} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
>>>>>>> redesign2
}

function SimulateContent() {
  const searchParams = useSearchParams();
  const isReplay = searchParams.get("mode") === "replay";
  const inv = useInvestigation();
  const { investigationState, selectNearestNode, selectNode, assignTask } = inv;
  const [mapMode, setMapMode] = useState<"assign" | "pan">("assign");
  const [showGraph, setShowGraph] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [agentSessions, setAgentSessions] = useState<
    Record<string, InvestigationAgentSession>
  >({});
  const mapRef = useRef<HTMLDivElement>(null);

  const activeAgent = useMemo(
    () =>
      activeAgentId
        ? (investigationState.availableAgents.find(
            (agent) => agent.id === activeAgentId,
          ) ?? null)
        : null,
    [activeAgentId, investigationState.availableAgents],
  );

  const activeAgentSession = useMemo(
    () =>
      activeAgent
        ? (agentSessions[activeAgent.id] ??
          buildInitialAgentSession(activeAgent))
        : null,
    [activeAgent, agentSessions],
  );

  useEffect(() => {
    if (isReplay) return;
    eventBridge.emitInteractionMode(mapMode);
  }, [isReplay, mapMode]);

  useEffect(() => {
    if (isReplay) return;
    const onSystemClick = (payload: { col: number; row: number }) => {
      if (mapMode !== "assign") return;
      selectNearestNode(payload.col, payload.row);
    };
    const onAgentClick = (payload: { npcId: string }) => {
      if (
        investigationState.availableAgents.some(
          (agent) => agent.id === payload.npcId,
        )
      ) {
        setActiveAgentId(payload.npcId);
      }
    };
    eventBridge.on("sim:system-click", onSystemClick);
    eventBridge.on("sim:npc-click", onAgentClick);
    return () => {
      eventBridge.off("sim:system-click", onSystemClick);
      eventBridge.off("sim:npc-click", onAgentClick);
    };
  }, [
    investigationState.availableAgents,
    isReplay,
    mapMode,
    selectNearestNode,
  ]);

  useEffect(() => {
    if (isReplay) return;
    const el = mapRef.current;
    if (!el) return;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (event: PointerEvent) => {
      if (mapMode !== "pan" || event.button !== 0) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      el.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging || mapMode !== "pan") return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      eventBridge.emitCameraPan(-dx, -dy);
    };
    const onUp = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture(event.pointerId);
    };
    const onWheel = (event: WheelEvent) => {
      if (mapMode !== "pan") return;
      event.preventDefault();
      eventBridge.emitCameraZoom(event.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [isReplay, mapMode]);

  if (isReplay) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rpg-panel p-6 text-center text-sm font-mono">
          Replay mode is deprecated in this build.
          <div className="mt-3">
            <Link href="/" className="underline">
              Back to case desk
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-3 px-3 py-3">
        <header className="rpg-panel flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
              NIPS / OPERATION MIDNIGHT LEDGER
            </p>
            <h1 className="mt-1 text-xl font-pixel">Command Investigation</h1>
            <p className="mt-2 text-[11px] font-mono text-[var(--muted)]">
              Objective: {inv.investigationState.currentObjective}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-white/20 px-2 py-1 text-[10px] font-mono uppercase">
              {inv.connectionState}
            </span>
            <button
              type="button"
              onClick={() =>
                setMapMode((prev) => (prev === "assign" ? "pan" : "assign"))
              }
              className="rounded border border-white/20 px-3 py-2 text-[11px] font-mono uppercase"
            >
              Mode: {mapMode}
            </button>
            <button
              type="button"
              onClick={() => setShowGraph(true)}
              className="rounded border border-[var(--accent-cyan)] px-3 py-2 text-[11px] font-mono"
            >
              Attack Graph
            </button>
            <Link
              href="/"
              className="rounded border border-white/20 px-3 py-2 text-[11px] font-mono"
            >
              Exit
            </Link>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col gap-3">
            <div className="rpg-panel flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
                Evidence Feed
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <EventFeed events={inv.events} />
              </div>
            </div>
            <div className="rpg-panel p-3">
              <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
                Findings
              </div>
              <div className="max-h-[320px] space-y-2 overflow-auto">
                {inv.investigationState.completedFindings.length === 0 && (
                  <div className="text-[10px] font-mono text-[var(--muted)]">
                    No findings yet. Click an agent and issue commands.
                  </div>
                )}
                {inv.investigationState.completedFindings.map(
                  (finding, index) => (
                    <div
                      key={`${finding.nodeId}-${index}`}
                      className="rounded border border-white/10 p-2"
                    >
                      <p className="text-[10px] font-mono text-[var(--foreground)]">
                        {finding.summary}
                      </p>
                      <p className="mt-1 text-[9px] font-mono uppercase text-[var(--muted)]">
                        {finding.agent} · {finding.evidenceType} ·{" "}
                        {Math.round(finding.confidence * 100)}%
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>

          <section
            ref={mapRef}
            className="rpg-panel relative min-h-[680px] overflow-hidden p-2"
          >
            <div className="border-b border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
              Map
            </div>
            <div className="absolute left-4 top-4 z-10 rounded border border-white/15 bg-black/40 px-3 py-2 text-[10px] font-mono">
              {mapMode === "assign"
                ? "Assign mode: click a building, then click an agent and send command."
                : "Pan mode: drag map to move camera, scroll to zoom."}
            </div>
            <GameCanvas />
          </section>
        </div>
      </div>

      {showGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <button
            type="button"
            aria-label="Close attack graph"
            className="absolute inset-0"
            onClick={() => setShowGraph(false)}
          />
          <div className="rpg-panel h-[80vh] w-full max-w-6xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
                Attack Graph
              </h2>
              <button
                type="button"
                onClick={() => setShowGraph(false)}
                className="text-[10px] font-mono"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AttackGraph
                nodes={inv.systems}
                edges={inv.edges}
                selectedNodeId={inv.investigationState.selectedNodeId}
                onSelectNode={(nodeId) => {
                  selectNode(nodeId);
                  setShowGraph(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
      {activeAgent && (
        <AgentCommandModal
          agent={activeAgent}
          session={activeAgentSession ?? buildInitialAgentSession(activeAgent)}
          currentObjective={investigationState.currentObjective}
          selectedNode={inv.selectedNode}
          completedFindings={investigationState.completedFindings.slice(-6)}
          recentEvents={inv.events.slice(-8).map((event) => ({
            id: event.id,
            type: event.type,
            agentName: event.agentName,
            message: event.message,
            round: event.round,
          }))}
          onClose={() => setActiveAgentId(null)}
          onSessionChange={(session) =>
            setAgentSessions((prev) => ({
              ...prev,
              [activeAgent.id]: session,
            }))
          }
          onDispatchTask={(dispatch) =>
            assignTask(activeAgent.id, dispatch.taskType, dispatch.objective)
          }
        />
      )}
    </div>
  );
}
