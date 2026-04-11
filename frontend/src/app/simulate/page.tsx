"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
    <Suspense
      fallback={<div className="p-6 text-sm font-mono">Loading case...</div>}
    >
      <SimulateContent />
    </Suspense>
  );
}

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
