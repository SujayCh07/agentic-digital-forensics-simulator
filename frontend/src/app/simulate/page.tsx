"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AttackGraph } from "@/components/AttackGraph";
import { BuildingInspector } from "@/components/BuildingInspector";
import { EchoPanel } from "@/components/EchoPanel";
import { EconomicReportModal } from "@/components/EconomicReportModal";
import { EvidenceFeed } from "@/components/EvidenceFeed";
import { IncidentReportPanel } from "@/components/IncidentReportPanel";
import { NPCInteractionModal } from "@/components/NPCInteractionModal";
import { TimelineScrubber } from "@/components/TimelineScrubber";
import { useSimulation } from "@/hooks/useSimulation";
import { eventBridge } from "@/game/bridge/EventBridge";
import { buildInvestigationState } from "@/lib/investigationAdapter";
import { clearReplayData, getReplayData } from "@/lib/replayStore";

const GameCanvas = dynamic(
  () => import("@/components/GameCanvas").then((module) => ({ default: module.GameCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center text-[11px] font-mono uppercase tracking-[0.3em] text-[var(--muted)]">
        Booting city map…
      </div>
    ),
  },
);

function EmptyState() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="rpg-panel max-w-lg space-y-4 p-6 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
          NIPS
        </p>
        <h1 className="text-xl font-pixel text-[var(--foreground)]">
          No Active Investigation
        </h1>
        <p className="text-[12px] font-mono leading-6 text-[var(--muted)]">
          Open the case desk and start a fresh run, or load a saved replay to inspect a previous incident.
        </p>
        <Link
          href="/"
          className="inline-flex rounded border border-[var(--accent-cyan)] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--foreground)] transition-opacity hover:opacity-80"
        >
          Return To Case Desk
        </Link>
      </div>
    </div>
  );
}

function SimulateContent() {
  const searchParams = useSearchParams();
  const simulationId = searchParams.get("id") || "";
  const isReplay = searchParams.get("mode") === "replay";
  const isRecording = searchParams.get("record") === "true";
  const isMock = process.env.NEXT_PUBLIC_MOCK_BACKEND === "true";

  const sim = useSimulation(simulationId || undefined, isRecording);
  const { start, startFromRecording } = sim;
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const hasStartedRef = useRef(false);
  const reportShownRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) return;

    if (isReplay) {
      const replay = getReplayData();
      if (replay) {
        hasStartedRef.current = true;
        clearReplayData();
        startFromRecording(replay);
      }
      return;
    }

    if (simulationId || isMock) {
      hasStartedRef.current = true;
      start();
    }

    return () => {
      hasStartedRef.current = false;
    };
  }, [isMock, isReplay, simulationId, start, startFromRecording]);

  useEffect(() => {
    const handleNpcClick = (payload: { npcId: string }) => {
      setSelectedNpcId(payload.npcId);
    };

    eventBridge.on("sim:npc-click", handleNpcClick);
    return () => {
      eventBridge.off("sim:npc-click", handleNpcClick);
    };
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
  }, [sim.isComplete, sim.report, sim.reportLoading]);

  const investigationState = useMemo(
    () =>
      buildInvestigationState({
        npcs: sim.graphData.npcs,
        relationships: sim.graphData.relationships,
        events: sim.events,
        round: sim.round,
        maxRounds: sim.maxRounds,
        selectedSystemId: selectedNpcId,
      }),
    [
      selectedNpcId,
      sim.events,
      sim.graphData.npcs,
      sim.graphData.relationships,
      sim.maxRounds,
      sim.round,
    ],
  );

  const selectedNpc = selectedNpcId ? sim.getNpc(selectedNpcId) : undefined;

  if (!simulationId && !isReplay && !isMock) {
    return <EmptyState />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 px-4 py-4">
        <header className="rpg-panel flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-[var(--accent-cyan)]">
              NIPS / ECHO
            </p>
            <h1 className="mt-2 text-xl font-pixel text-[var(--foreground)]">
              Incident Response Center
            </h1>
            <p className="mt-2 text-[11px] font-mono leading-6 text-[var(--muted)]">
              Buildings represent machines, roads represent network paths, and the city is now a live forensic evidence graph.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em]">
            <span
              className="rounded border px-2 py-1"
              style={{
                borderColor:
                  sim.connectionState === "connected"
                    ? "#7ef9c6"
                    : sim.connectionState === "reconnecting"
                      ? "#ffb347"
                      : "#78d7ff",
                color:
                  sim.connectionState === "connected"
                    ? "#7ef9c6"
                    : sim.connectionState === "reconnecting"
                      ? "#ffb347"
                      : "#78d7ff",
              }}
            >
              {sim.connectionState}
            </span>
            {isRecording && (
              <span className="rounded border border-[var(--accent-red)] px-2 py-1 text-[var(--accent-red)]">
                Recording
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowGraph(true)}
              className="rounded border border-[var(--accent-cyan)] px-3 py-2 text-[var(--foreground)] transition-opacity hover:opacity-80"
            >
              Attack Graph
            </button>
            {sim.report && (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="rounded border border-[var(--accent-amber)] px-3 py-2 text-[var(--foreground)] transition-opacity hover:opacity-80"
              >
                Report
              </button>
            )}
            <Link
              href="/"
              className="rounded border border-white/10 px-3 py-2 text-[var(--muted)] transition-opacity hover:opacity-80"
            >
              Exit
            </Link>
          </div>
        </header>

        {sim.error && (
          <div className="rounded border border-[var(--accent-red)] bg-[rgba(255,92,108,0.08)] px-4 py-3 text-[11px] font-mono leading-6 text-[var(--foreground)]">
            {sim.error}
          </div>
        )}

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
          <div className="flex min-h-0 flex-col gap-4">
            <IncidentReportPanel
              state={investigationState}
              connectionState={sim.connectionState}
            />
            <div className="min-h-[320px] flex-1">
              <EvidenceFeed events={investigationState.clueFeed} />
            </div>
          </div>

          <div className="flex min-h-[640px] flex-col gap-4">
            <section className="rpg-panel relative flex min-h-[560px] flex-1 items-center justify-center overflow-hidden p-2">
              <div className="absolute left-4 top-4 z-10 rounded border border-white/10 bg-black/30 px-3 py-2">
                <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--muted)]">
                  Selected Building
                </p>
                <p className="mt-1 text-[11px] font-mono text-[var(--foreground)]">
                  {selectedNpc?.name || investigationState.systems[0]?.name || "Awaiting target"}
                </p>
              </div>
              <div className="h-full w-full">
                <GameCanvas />
              </div>
            </section>

            <TimelineScrubber state={investigationState} />
          </div>

          <div className="flex min-h-0 flex-col gap-4">
            <EchoPanel state={investigationState} />
            <BuildingInspector state={investigationState} />
          </div>
        </div>
      </div>

      {selectedNpc && (
        <NPCInteractionModal
          npc={selectedNpc}
          simulationId={simulationId}
          onClose={() => setSelectedNpcId(null)}
        />
      )}

      {showGraph && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowGraph(false);
          }}
        >
          <div className="rpg-panel h-[80vh] w-full max-w-6xl overflow-hidden">
            <AttackGraph
              npcs={sim.graphData.npcs}
              relationships={sim.graphData.relationships}
              influenceEvents={sim.graphData.influenceEvents}
              version={sim.graphData.version}
            />
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
    </div>
  );
}

export default function SimulatePage() {
  return (
    <Suspense fallback={<EmptyState />}>
      <SimulateContent />
    </Suspense>
  );
}
