"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { EconomicReportModal } from "@/components/EconomicReportModal";
import { EventFeed } from "@/components/EventFeed";
import { NPCInteractionModal } from "@/components/NPCInteractionModal";
import { useSimulation } from "@/hooks/useSimulation";
import { clearReplayData, getReplayData } from "@/lib/replayStore";
import type { NPCHoverInfo, SimEvent } from "@/types";

const SocialGraph = dynamic(
  () =>
    import("@/components/SocialGraph").then((m) => ({
      default: m.SocialGraph,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-full items-center justify-center text-[8px] font-mono uppercase tracking-widest"
        style={{ color: "#2a5070" }}
      >
        Loading network...
      </div>
    ),
  },
);

// Mirror game/constants values here to avoid importing Phaser during SSR.
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 960;
const SCALE_FACTOR = 1;

const GameCanvas = dynamic(
  () =>
    import("@/components/GameCanvas").then((m) => ({ default: m.GameCanvas })),
  { ssr: false, loading: () => <GameCanvasPlaceholder /> },
);

function GameCanvasPlaceholder() {
  return (
    <div
      className="rpg-panel flex items-center justify-center box-border"
      style={{
        width: GAME_WIDTH * SCALE_FACTOR,
        height: GAME_HEIGHT * SCALE_FACTOR,
        background: "#080c12",
      }}
    >
      <span
        className="text-[8px] font-mono uppercase tracking-widest animate-pulse"
        style={{ color: "#1e3d5a" }}
      >
        Initializing grid...
      </span>
    </div>
  );
}

const SENTIMENT_LABEL: Record<
  NPCHoverInfo["sentiment"],
  { symbol: string; color: string }
> = {
  happy:   { symbol: "+", color: "#00ff88" },
  neutral: { symbol: "~", color: "#4a6580" },
  worried: { symbol: "?", color: "#f59e0b" },
  angry:   { symbol: "!", color: "#ff3a3a" },
};

interface OverlayMetrics {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
}

function NPCTooltip({
  info,
  scaleX,
  scaleY,
}: {
  info: NPCHoverInfo;
  scaleX: number;
  scaleY: number;
}) {
  const sent = SENTIMENT_LABEL[info.sentiment];
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{
        left: info.x * scaleX + 16,
        top: info.y * scaleY - 4,
      }}
    >
      <div
        className="rounded px-2 py-1"
        style={{
          background: "#0f1927",
          border: "1px solid #1e3d5a",
          boxShadow: "0 0 12px rgba(0,0,0,0.8)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono" style={{ color: "#c9d8e8" }}>
            {info.name}
          </span>
          <span className="text-[10px] font-mono" style={{ color: sent.color }}>
            [{sent.symbol}]
          </span>
        </div>
        <div
          className="text-[8px] font-mono tracking-widest uppercase"
          style={{ color: "#4a6580" }}
        >
          {info.role}
        </div>
      </div>
    </div>
  );
}

const DEFAULT_OVERLAY_METRICS: OverlayMetrics = {
  offsetX: 0,
  offsetY: 0,
  width: GAME_WIDTH * SCALE_FACTOR,
  height: GAME_HEIGHT * SCALE_FACTOR,
  scaleX: SCALE_FACTOR,
  scaleY: SCALE_FACTOR,
};

export default function SimulatePage() {
  return (
    <Suspense fallback={<GameCanvasPlaceholder />}>
      <SimulateContent />
    </Suspense>
  );
}

function SimulateContent() {
  const searchParams = useSearchParams();
  const isMock = process.env.NEXT_PUBLIC_MOCK_BACKEND === "true";
  const simulationId = searchParams.get("id") || "";
  const isReplay = searchParams.get("mode") === "replay";
  const isRecording = searchParams.get("record") === "true";
  const sim = useSimulation(simulationId || undefined, isRecording);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);

  const handleEventClick = useCallback((event: SimEvent) => {
    setSelectedNpcId(event.agentId);
  }, []);

  const selectedNpc = selectedNpcId ? sim.getNpc(selectedNpcId) : undefined;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [focusScale, setFocusScale] = useState(1);
  const [hoverInfo, setHoverInfo] = useState<NPCHoverInfo | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [overlayMetrics, setOverlayMetrics] = useState<OverlayMetrics>(
    DEFAULT_OVERLAY_METRICS,
  );
  const [showReport, setShowReport] = useState(false);
  const reportShownRef = useRef(false);

  useEffect(() => {
    if (focusMode) {
      setFocusScale(
        Math.max(
          window.innerWidth / GAME_WIDTH,
          window.innerHeight / GAME_HEIGHT,
        ),
      );
    } else {
      setFocusScale(1);
    }
  }, [focusMode]);

  const hasStartedRef = useRef(false);
  useEffect(() => {
    if (hasStartedRef.current) return;
    if (isReplay) {
      const data = getReplayData();
      if (data) {
        hasStartedRef.current = true;
        clearReplayData();
        sim.startFromRecording(data);
      }
    } else if (simulationId || isMock) {
      hasStartedRef.current = true;
      sim.start();
    }
    return () => {
      hasStartedRef.current = false;
    };
  }, [simulationId, isReplay]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
      const handler = () => {
        setHoverInfo(null);
      };
      eventBridge.on("sim:init-npcs", handler);
      cleanup = () => eventBridge.off("sim:init-npcs", handler);
    });
    return () => cleanup?.();
  }, []);

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
    let cleanup: (() => void) | undefined;
    import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
      const handler = (data: { npcId: string }) => {
        setSelectedNpcId(data.npcId);
      };
      eventBridge.on("sim:npc-click", handler);
      cleanup = () => eventBridge.off("sim:npc-click", handler);
    });
    return () => cleanup?.();
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    let observedTarget: Element | null = null;
    const updateMetrics = () => {
      const canvas =
        container.querySelector("canvas") ??
        container.querySelector("[data-testid='game-canvas']");
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
        const changed =
          Math.abs(prev.offsetX - next.offsetX) > 0.5 ||
          Math.abs(prev.offsetY - next.offsetY) > 0.5 ||
          Math.abs(prev.width - next.width) > 0.5 ||
          Math.abs(prev.height - next.height) > 0.5;
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
      el.style.cursor = "crosshair";
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
      el.style.cursor = "crosshair";
      el.releasePointerCapture(e.pointerId);
    };

    el.style.cursor = "crosshair";
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;

      const zoomTarget =
        el.querySelector("canvas") ??
        el.querySelector("[data-testid='game-canvas']");
      const rect =
        zoomTarget instanceof HTMLElement
          ? zoomTarget.getBoundingClientRect()
          : el.getBoundingClientRect();
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
      if (e.key === "Escape") {
        setFocusMode(false);
        setShowGraph(false);
        setShowReport(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sim.isComplete) {
      reportShownRef.current = false;
      setShowReport(false);
      return;
    }
    if (reportShownRef.current) return;
    if (sim.reportLoading || sim.report) {
      reportShownRef.current = true;
      setShowReport(true);
    }
  }, [sim.isComplete, sim.reportLoading, sim.report]);

  if (!simulationId && !isMock && !isReplay) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center px-6"
        style={{ background: "#080c12" }}
      >
        <div
          className="flex max-w-md flex-col items-center gap-4 p-8 text-center rpg-panel"
        >
          <span
            className="text-[10px] font-mono tracking-widest"
            style={{ color: "#00d4ff" }}
          >
            ◈ NIPS — No Incident Loaded
          </span>
          <p
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "#c9d8e8" }}
          >
            No incident loaded.
          </p>
          <p
            className="text-[10px] font-mono uppercase tracking-widest"
            style={{ color: "#4a6580" }}
          >
            Load an incident from the home screen to begin your investigation.
          </p>
          <Link
            href="/"
            className="rpg-panel mt-2 px-6 py-2 text-[10px] font-mono transition-opacity hover:opacity-80"
            style={{ color: "#00d4ff", border: "1px solid #1e3d5a" }}
          >
            {">> Load Incident <<"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen flex-col overflow-clip"
      style={{ background: "#080c12" }}
      data-testid="simulate-page"
    >
      {/* Stage indicator bar */}
      <div
        className={`rpg-panel flex h-10 shrink-0 items-center justify-between rounded-none border-x-0 border-t-0 px-4 panel-slide-top ${focusMode ? "panel-hidden-top" : ""}`}
        style={{ borderBottom: "1px solid #1e3d5a" }}
        data-testid="phase-bar"
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[10px] font-mono tracking-tight"
            style={{ color: "#00d4ff" }}
          >
            ◈ NIPS
          </span>
          <span className="text-[10px] font-mono" style={{ color: "#1e3d5a" }}>
            |
          </span>
          {/* Stage dots */}
          <div className="flex gap-1">
            {[1, 2, 3].map((p) => (
              <div
                key={p}
                className="h-2 w-12 rounded-sm transition-colors duration-500"
                style={{
                  border: "1px solid #1e3d5a",
                  background:
                    sim.phase >= p
                      ? p === 3
                        ? "#ff3a3a"
                        : p === 2
                          ? "#f59e0b"
                          : "#00d4ff"
                      : "#0d1520",
                  boxShadow:
                    sim.phase >= p
                      ? p === 3
                        ? "0 0 6px rgba(255,58,58,0.5)"
                        : p === 2
                          ? "0 0 6px rgba(245,158,11,0.5)"
                          : "0 0 6px rgba(0,212,255,0.5)"
                      : "none",
                }}
              />
            ))}
          </div>
          {sim.phase > 0 && (
            <span
              className="text-[9px] font-mono uppercase tracking-widest ml-2"
              style={{ color: "#4a6580" }}
            >
              {sim.phaseLabel}
            </span>
          )}
        </div>

        <div className="relative z-[2] flex items-center gap-3">
          {sim.isRunning && isRecording && (
            <span
              className="text-[9px] font-mono animate-pulse"
              style={{ color: "#ff3a3a" }}
            >
              ● REC
            </span>
          )}
          {sim.isComplete && (
            <>
              <span
                className="text-[9px] font-mono"
                style={{ color: "#00ff88", textShadow: "0 0 8px rgba(0,255,136,0.5)" }}
              >
                CASE CLOSED
              </span>
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="text-[9px] font-mono uppercase tracking-widest transition-opacity hover:opacity-60"
                style={{ color: "#4a6580" }}
              >
                {sim.reportLoading
                  ? "[Evidence...]"
                  : sim.report
                    ? "[Evidence]"
                    : "[Evidence Pending]"}
              </button>
              {sim.getRecording() && (
                <button
                  type="button"
                  onClick={() => {
                    const recording = sim.getRecording();
                    if (!recording) return;
                    const blob = new Blob(
                      [JSON.stringify(recording, null, 2)],
                      { type: "application/json" },
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `nips-case-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-[9px] font-mono uppercase tracking-widest transition-opacity hover:opacity-60"
                  style={{ color: "#4a6580" }}
                >
                  SAVE JSON
                </button>
              )}
            </>
          )}
          {sim.isRunning && !isRecording && (
            <span
              className="text-[9px] font-mono uppercase tracking-widest animate-pulse"
              style={{ color: "#4a6580" }}
            >
              Investigating...
            </span>
          )}
          <button
            type="button"
            onClick={() => setFocusMode((f) => !f)}
            className="rpg-panel px-3 py-1 text-[9px] font-mono font-bold tracking-widest transition-all hover:opacity-80"
            style={{
              color: focusMode ? "#00d4ff" : "#4a6580",
              border: `1px solid ${focusMode ? "#00d4ff" : "#1e3d5a"}`,
              boxShadow: focusMode ? "0 0 10px rgba(0,212,255,0.2)" : "none",
            }}
            title="Toggle focus mode (hides panels)"
          >
            {focusMode ? "[ EXIT FOCUS ]" : "[ FOCUS ]"}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-2 overflow-hidden p-2">
        {/* Left: Evidence feed */}
        <div
          className={`rpg-panel flex h-full w-64 shrink-0 flex-col panel-slide-left ${focusMode ? "panel-hidden-left" : ""}`}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: "1px solid #1e3d5a" }}
          >
            <h2
              className="text-[8px] font-mono uppercase tracking-widest"
              style={{ color: "#00d4ff" }}
            >
              Evidence Feed
            </h2>
            <button
              type="button"
              onClick={() => setShowGraph(true)}
              className="text-[9px] font-mono uppercase tracking-widest transition-opacity hover:opacity-60"
              style={{ color: "#4a6580" }}
              title="Open Attack Graph"
            >
              ATTACK MAP
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <EventFeed events={sim.events} onEventClick={handleEventClick} />
          </div>
        </div>

        {/* Center: Game canvas */}
        <div
          className={
            focusMode
              ? "fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
              : "relative flex min-w-0 flex-1 items-center justify-center overflow-hidden"
          }
          style={focusMode ? { background: "#080c12" } : undefined}
        >
          <div
            ref={canvasContainerRef}
            className="relative shrink-0 canvas-glow canvas-expand"
            style={{
              border: "1px solid #1e3d5a",
              borderRadius: 4,
              ...(focusMode
                ? {
                    transform: `scale(${focusScale})`,
                    transformOrigin: "center center",
                    border: "none",
                    padding: 0,
                    boxShadow: "none",
                  }
                : {}),
            }}
          >
            <GameCanvas />

            {/* Zoom / Fullscreen controls */}
            <div className="absolute top-2 right-2 z-40 flex gap-1">
              <button
                type="button"
                onClick={() => {
                  import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
                    eventBridge.emitCameraZoom(1);
                  });
                }}
                className="rpg-panel px-1.5 py-1 text-[9px] font-mono transition-opacity hover:opacity-70"
                style={{ color: "#4a6580" }}
                title="Zoom in"
              >
                ZOOM+
              </button>
              <button
                type="button"
                onClick={() => {
                  import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
                    eventBridge.emitCameraZoom(-1);
                  });
                }}
                className="rpg-panel px-1.5 py-1 text-[9px] font-mono transition-opacity hover:opacity-70"
                style={{ color: "#4a6580" }}
                title="Zoom out"
              >
                ZOOM-
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rpg-panel px-1.5 py-1 text-[9px] font-mono transition-opacity hover:opacity-70"
                style={{ color: "#4a6580" }}
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? "EXIT" : "FULL"}
              </button>
            </div>

            {/* NPC hover tooltip */}
            {hoverInfo && (
              <div
                className="pointer-events-none absolute z-30 overflow-hidden"
                style={{
                  left: overlayMetrics.offsetX,
                  top: overlayMetrics.offsetY,
                  width: overlayMetrics.width,
                  height: overlayMetrics.height,
                }}
              >
                <NPCTooltip
                  info={hoverInfo}
                  scaleX={overlayMetrics.scaleX}
                  scaleY={overlayMetrics.scaleY}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Viewport-fixed dashboard */}
      <div
        className={`fixed bottom-3 right-3 z-40 pointer-events-auto ${focusMode ? "opacity-0 pointer-events-none" : ""}`}
      >
        <Dashboard
          metrics={sim.metrics}
          metricsHistory={sim.metricsHistory}
          phase={sim.phase}
          round={sim.round}
          maxRounds={sim.maxRounds}
        />
      </div>

      {/* Focus mode exit button */}
      {focusMode && (
        <button
          type="button"
          className="fixed top-4 right-4 z-[60] rpg-panel px-3 py-1.5 text-[9px] font-mono transition-opacity hover:opacity-70"
          style={{ color: "#4a6580", border: "1px solid #1e3d5a" }}
          onClick={() => setFocusMode(false)}
        >
          [ESC] exit focus
        </button>
      )}

      {/* Agent Profile Modal */}
      {selectedNpc && (
        <NPCInteractionModal
          npc={selectedNpc}
          simulationId={simulationId}
          onClose={() => setSelectedNpcId(null)}
        />
      )}

      {/* Attack Graph Modal */}
      {showGraph && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGraph(false);
          }}
        >
          <div
            className="relative flex flex-col animate-[modalIn_200ms_ease-out] rpg-panel"
            style={{
              width: 700,
              height: 560,
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{
                borderBottom: "1px solid #1e3d5a",
              }}
            >
              <h2
                className="text-[10px] font-mono uppercase tracking-widest"
                style={{ color: "#00d4ff" }}
              >
                ◈ Attack Graph
              </h2>
              <button
                type="button"
                onClick={() => setShowGraph(false)}
                className="text-[10px] font-mono uppercase tracking-widest transition-opacity hover:opacity-60"
                style={{ color: "#4a6580" }}
              >
                [ESC]
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SocialGraph
                npcs={sim.graphData.npcs}
                relationships={sim.graphData.relationships}
                influenceEvents={sim.graphData.influenceEvents}
                version={sim.graphData.version}
              />
            </div>
          </div>
        </div>
      )}

      {showReport && (
        <EconomicReportModal
          report={sim.report}
          loading={sim.reportLoading}
          error={sim.reportError}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Connection error overlay */}
      {sim.error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="rpg-panel px-6 py-4 text-center">
            <p className="font-mono text-sm font-bold" style={{ color: "#ff3a3a" }}>
              Connection Lost
            </p>
            <p className="mt-2 font-mono text-xs" style={{ color: "#4a6580" }}>
              The investigation server disconnected. Please return home and load a new incident.
            </p>
            <a
              href="/"
              className="mt-3 block font-mono text-xs underline"
              style={{ color: "#2a5070" }}
            >
              {"<-"} Back to home
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
