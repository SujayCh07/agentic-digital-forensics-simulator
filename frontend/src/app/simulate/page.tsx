"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentCommandModal, type MessageEntry } from "@/components/AgentCommandModal";
import { AgentDirectory } from "@/components/AgentDirectory";
import { AgentMarketplace } from "@/components/AgentMarketplace";
import { AgentStatusBar } from "@/components/AgentStatusBar";
import { Dashboard } from "@/components/Dashboard";
import { EconomicReportModal } from "@/components/EconomicReportModal";
import { EventFeed } from "@/components/EventFeed";
import { HelperSelectionPanel } from "@/components/HelperSelectionPanel";
import { NodeListPanel } from "@/components/NodeListPanel";
import { NPCInteractionModal } from "@/components/NPCInteractionModal";
import { PauseOverlay } from "@/components/PauseOverlay";
import { UserBoard } from "@/components/UserBoard/UserBoard";
import { CYBER_CITY_SECTOR_SEEDS, DOMAIN_LABEL_BY_SECTOR } from "@/data/cyberCitySectors";
import { CASE_AGENTS_NPCS } from "@/data/case_midnight_exfil";

import { useInvestigation } from "@/hooks/useInvestigation";
import { useBoardState } from "@/hooks/useBoardState";
import { useSimulation } from "@/hooks/useSimulation";
import { useRadio } from "@/hooks/useRadio";
import { RadioPanel } from "@/components/RadioPanel";
import type { ActiveHelpers, AgentDefinition, AgentId, CaseSystemNode, NipsAgentInstance, NipsMarketplaceOffer, NipsEvidenceUpdate } from "@/types/investigation";
import type { BackendNPC } from "@/types/backend";
import { clearReplayData, getReplayData } from "@/lib/replayStore";
import {
  initNipsSession,
  buyNipsAgent,
  requestNipsMarketplaceRefresh,
  setMarketplaceCallbacks,
  disconnectNips,
} from "@/lib/investigationAgentClient";
import {
  buildAgentStateModel,
  normalizeOwnedAgents,
  ROLE_ORDER,
  toAgentId,
} from "@/lib/agentState";
import {
  applyCaseRewards,
  computeCaseRewards,
  loadProgress,
  saveProgress,
  type PlayerProgress,
} from "@/lib/playerProgress";
import { audioManager } from "@/lib/audioManager";
import type { NPCHoverInfo, NPCState, SimEvent } from "@/types";

// Mirror game/constants values here to avoid importing Phaser during SSR.
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 960;
const SCALE_FACTOR = 1;
const WORLD_TILE_SIZE = 32;

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

const MAP_FRAME_MAX_WIDTH = 1120;

const AGENT_MARKER_COLORS: Record<AgentId, string> = {
  logis: "#22d3ee",
  nexus: "#a78bfa",
  filer: "#f59e0b",
  chrono: "#34d399",
};

interface AgentMarkerData {
  agent: NipsAgentInstance;
  npcId: string;
  position: NPCState;
  isLocked: boolean;
  color: string;
  roleLabel: string;
  statusLabel: string;
  assignmentLabel: string;
  sectorCode: string;
  sectorLabel: string;
}

function normalizeAgentId(id: string) {
  return id.toLowerCase();
}

function resolveAgentPositionId(
  agent: NipsAgentInstance,
  positions: Record<string, NPCState>,
) {
  const arc = normalizeAgentId(agent.archetype);
  return Object.keys(positions).find(
    (id) =>
      normalizeAgentId(id) === arc ||
      arc.startsWith(normalizeAgentId(id)) ||
      id === agent.instance_id ||
      id === agent.codename,
  );
}

function resolveSector(worldX: number, worldY: number) {
  const tileX = Math.floor(worldX / WORLD_TILE_SIZE);
  const tileY = Math.floor(worldY / WORLD_TILE_SIZE);
  return CYBER_CITY_SECTOR_SEEDS.find(
    (sector) =>
      tileX >= sector.bounds.x &&
      tileX < sector.bounds.x + sector.bounds.width &&
      tileY >= sector.bounds.y &&
      tileY < sector.bounds.y + sector.bounds.height,
  );
}

function buildAgentMarkers(
  slotAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>>,
  positions: Record<string, NPCState>,
  lockedRoles: AgentId[],
  agentStates: AgentDefinition[],
  systemNodes: CaseSystemNode[],
): AgentMarkerData[] {
  return ROLE_ORDER.flatMap((roleId) => {
    const agent = slotAgentsByRole[roleId];
    if (!agent) return [];

    const npcId = resolveAgentPositionId(agent, positions);
    if (!npcId) return [];

    const position = positions[npcId];
    const archetype = roleId;
    const agentState = agentStates.find((entry) => entry.id === roleId);
    const sector = resolveSector(position.worldX, position.worldY);
    const nodeName = agentState?.currentNodeId
      ? systemNodes.find((node) => node.id === agentState.currentNodeId)?.name
      : null;
    const isLocked = lockedRoles.includes(roleId);

    return [{
      agent,
      npcId,
      position,
      isLocked,
      color: AGENT_MARKER_COLORS[archetype] ?? "#22d3ee",
      roleLabel: agent.primary_specialties[0] ?? agent.team_role,
      statusLabel: isLocked ? "locked" : agentState?.status ?? "idle",
      assignmentLabel: isLocked
        ? "Locked — recruit to unlock"
        : nodeName ?? "Awaiting task",
      sectorCode: sector?.id ?? "TRANSIT",
      sectorLabel: sector ? DOMAIN_LABEL_BY_SECTOR[sector.id] : "Transit lane",
    }];
  });
}

function buildVisibleSpecialists(
  slotAgentsByRole: Partial<Record<AgentId, NipsAgentInstance>>,
): BackendNPC[] {
  return CASE_AGENTS_NPCS.map((npc) => {
    const roleId = npc.id as AgentId;
    const slotAgent = slotAgentsByRole[roleId];
    return {
      ...npc,
      name: slotAgent?.display_name ?? npc.name,
    };
  });
}

function setWorldPaused(paused: boolean) {
  const game = (globalThis as Record<string, unknown>).__PHASER_GAME__ as
    | {
        scene?: {
          pause?: (sceneKey: string) => void;
          resume?: (sceneKey: string) => void;
          isPaused?: (sceneKey: string) => boolean;
        };
      }
    | undefined;

  const sceneManager = game?.scene;
  if (!sceneManager) return;

  if (paused) {
    if (!sceneManager.isPaused?.("WorldScene")) {
      sceneManager.pause?.("WorldScene");
    }
    return;
  }

  if (sceneManager.isPaused?.("WorldScene")) {
    sceneManager.resume?.("WorldScene");
  } else {
    sceneManager.resume?.("WorldScene");
  }
}

export default function SimulatePage() {
  return (
    <Suspense fallback={<GameCanvasPlaceholder />}>
      <SimulateRouter />
    </Suspense>
  );
}

function SimulateRouter() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");
  if (mode === "investigate") return <InvestigateContent />;
  return <SimulateContent />;
}

// ---------------------------------------------------------------------------
// InvestigateContent — phase router: team selection → game
// ---------------------------------------------------------------------------

function InvestigateContent() {
  const [phase, setPhase] = useState<"selecting" | "playing">("selecting");
  const [activeHelpers, setActiveHelpers] = useState<ActiveHelpers | null>(null);
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());

  const handleProgressChange = useCallback((p: PlayerProgress) => {
    setProgress(p);
    saveProgress(p);
  }, []);

  const handleConfirm = useCallback((helpers: ActiveHelpers) => {
    setActiveHelpers(helpers);
    setPhase("playing");
  }, []);

  if (phase === "selecting" || !activeHelpers) {
    return (
      <HelperSelectionPanel
        progress={progress}
        onProgressChange={handleProgressChange}
        onConfirm={handleConfirm}
      />
    );
  }

  return (
    <InvestigateGame
      activeHelpers={activeHelpers}
      progress={progress}
      onProgressChange={handleProgressChange}
    />
  );
}

// ---------------------------------------------------------------------------
// InvestigateGame — core gameplay loop (receives confirmed helpers)
// ---------------------------------------------------------------------------

function InvestigateGame({
  activeHelpers,
  progress,
  onProgressChange,
}: {
  activeHelpers: ActiveHelpers;
  progress: PlayerProgress;
  onProgressChange: (p: PlayerProgress) => void;
}) {
  const router = useRouter();
  const inv = useInvestigation(activeHelpers);
  const starterRole = (((activeHelpers as unknown as { _starter?: AgentId })._starter) ??
    "logis") as AgentId;
  const [activeOverlay, setActiveOverlay] = useState<"board" | "market" | null>(null);
  const [rewardsShown, setRewardsShown] = useState(false);
  const board = useBoardState();
  const [paused, setPaused] = useState(false);
  const [hoverInfo, setHoverInfo] = useState<NPCHoverInfo | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [overlayMetrics, setOverlayMetrics] = useState<OverlayMetrics>(DEFAULT_OVERLAY_METRICS);
  const radio = useRadio();

  // --- NIPS Gemini agent system state ---
  const [nipsAgents, setNipsAgents] = useState<NipsAgentInstance[]>([]);
  const [nipsOffers, setNipsOffers] = useState<NipsMarketplaceOffer[]>([]);
  const [nipsFunds, setNipsFunds] = useState(1500);
  const [nipsNextRefresh, setNipsNextRefresh] = useState(0);
  const [chatAgent, setChatAgent] = useState<NipsAgentInstance | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, MessageEntry[]>>({});
  const [showDirectory, setShowDirectory] = useState(false);
  const [lockedAgentInfo, setLockedAgentInfo] = useState<NipsAgentInstance | null>(null);
  const [npcPositions, setNpcPositions] = useState<Record<string, NPCState>>({});
  const agentState = useMemo(
    () =>
      buildAgentStateModel({
        ownedAgents: nipsAgents,
        marketplaceOffers: nipsOffers,
        baseLockedRoles: inv.lockedAgents,
      }),
    [nipsAgents, nipsOffers, inv.lockedAgents],
  );
  const ownedRoleKey = agentState.ownedRoleIds.join("|");
  const slotRoleKey = ROLE_ORDER.map((roleId) => {
    const slotAgent = agentState.slotAgentsByRole[roleId];
    return `${roleId}:${slotAgent?.instance_id ?? "none"}:${slotAgent?.display_name ?? "none"}`;
  }).join("|");

  // ── Audio: stop music when leaving the game view ────────────────────────────
  useEffect(() => {
    return () => { audioManager.stopMusic(); };
  }, []);

  // ── Audio: switch music tracks based on investigation pressure ──────────────
  useEffect(() => {
    if (inv.pressureLevel >= 8) {
      audioManager.switchToCorruptMusic();
    } else if (inv.pressureLevel >= 4) {
      audioManager.switchToIncidentMusic();
    }
  }, [inv.pressureLevel]);

  // ── Audio: play sound when new evidence is found ────────────────────────────
  useEffect(() => {
    if (inv.events.length > 0) {
      audioManager.playEvidenceAdded();
    }
  }, [inv.events.length]);

  // Init NIPS backend session
  useEffect(() => {
    const cleanupSession = initNipsSession({
      onSessionReady: (data) => {
        setNipsAgents(normalizeOwnedAgents(data.agents));
        setNipsOffers(data.marketplace);
        setNipsFunds(data.funds);
        setNipsNextRefresh(data.next_refresh);
      },
      onError: (msg) => console.error("[NIPS]", msg),
    }, inv.caseId, starterRole.toUpperCase());

    setMarketplaceCallbacks({
      onAgentPurchased: (data) => {
        const roleId = toAgentId(data.agent.archetype);
        setNipsAgents((prev) => normalizeOwnedAgents([...prev, data.agent]));
        if (roleId) {
          setNipsOffers((prev) =>
            prev.filter((offer) => toAgentId(offer.agent.archetype) !== roleId),
          );
        }
        setNipsFunds(data.funds);
      },
      onMarketplaceRefreshed: (data) => {
        setNipsOffers(data.marketplace);
        setNipsNextRefresh(data.next_refresh);
      },
      onAgentsList: (data) => {
        setNipsAgents(normalizeOwnedAgents(data.agents));
        setNipsFunds(data.funds);
      },
      onError: (msg) => console.error("[NIPS marketplace]", msg),
    });

    return () => {
      cleanupSession();
      disconnectNips();
    };
  }, [inv.caseId, starterRole]);

  useEffect(() => {
    inv.syncRoleUnlocks(agentState.ownedRoleIds);
  }, [ownedRoleKey, inv.syncRoleUnlocks]);

  useEffect(() => {
    const hasVisibleSlots = ROLE_ORDER.some(
      (roleId) => Boolean(agentState.slotAgentsByRole[roleId]),
    );
    if (!hasVisibleSlots) return;

    const visibleSpecialists = buildVisibleSpecialists(agentState.slotAgentsByRole);
    const specialistIds = new Set(visibleSpecialists.map((npc) => npc.id));

    import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
      eventBridge.emitInitNPCs(visibleSpecialists, starterRole);
      eventBridge.emitNPCIdentityUpdates(
        visibleSpecialists.map((npc) => ({
          npcId: npc.id,
          name: npc.name,
        })),
      );
      setNpcPositions((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(
            ([npcId]) =>
              !ROLE_ORDER.includes(npcId as AgentId) || specialistIds.has(npcId),
          ),
        ),
      );
    });
  }, [slotRoleKey, starterRole, agentState.slotAgentsByRole]);

  // Handle sprite clicks → open agent chat
  // Sprite npcIds are lowercase archetype prefixes like "logis", "nexus", etc.
  // Match by archetype (case-insensitive), or by instance_id/codename for marketplace agents.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    import("@/game/bridge/EventBridge").then(({ eventBridge }) => {
      const clickHandler = (data: { npcId: string }) => {
        audioManager.playButtonClick();
        handler(data);
      };
      const handler = (data: { npcId: string }) => {
        const id = data.npcId.toLowerCase();
        const slotAgent =
          agentState.deployedAgents.find(
            (a) =>
              a.archetype.toLowerCase() === id ||
              a.archetype.toLowerCase().startsWith(id) ||
              a.instance_id === data.npcId ||
              a.codename === data.npcId,
          ) ??
          agentState.slotAgentsByRole[id as AgentId];
        const agent = slotAgent ?? null;
        if (agent) {
          const roleId = toAgentId(agent.archetype) ?? (id as AgentId);
          const isLocked = agentState.lockedRoles.includes(roleId);
          if (isLocked) {
            setLockedAgentInfo(agent);
          } else {
            setChatAgent(agent);
          }
        }
      };
      const posHandler = (npc: NPCState) => {
        setNpcPositions((prev) => ({ ...prev, [npc.id]: npc }));
      };

      eventBridge.on("sim:npc-click", clickHandler);
      eventBridge.on("sim:npc-position", posHandler);
      cleanup = () => {
        eventBridge.off("sim:npc-click", clickHandler);
        eventBridge.off("sim:npc-position", posHandler);
      };
    });
    return () => cleanup?.();
  }, [agentState.deployedAgents, agentState.lockedRoles, agentState.slotAgentsByRole]);

  const handleBuyAgent = useCallback((offerId: string) => {
    buyNipsAgent(offerId);
  }, []);

  const handleRefreshMarketplace = useCallback(() => {
    requestNipsMarketplaceRefresh();
  }, []);

  const showBoard = activeOverlay === "board";
  const showMarketplace = activeOverlay === "market";

  const toggleBoard = useCallback(() => {
    audioManager.playPauseMenu();
    setActiveOverlay((prev) => (prev === "board" ? null : "board"));
  }, []);

  const openBoard = useCallback(() => {
    setActiveOverlay("board");
  }, []);

  const toggleMarketplace = useCallback(() => {
    audioManager.playPauseMenu();
    setActiveOverlay((prev) => (prev === "market" ? null : "market"));
  }, []);

  const openMarketplace = useCallback(() => {
    setActiveOverlay("market");
  }, []);

  const nodeContextStr = inv.selectedNodeId
    ? `Selected node: ${inv.systemNodes.find((n) => n.id === inv.selectedNodeId)?.name ?? inv.selectedNodeId} (${inv.selectedNodeId})`
    : "";

  const agentMarkers = useMemo(
    () =>
      buildAgentMarkers(
        agentState.slotAgentsByRole,
        npcPositions,
        agentState.lockedRoles,
        inv.agents,
        inv.systemNodes,
      ),
    [
      agentState.slotAgentsByRole,
      agentState.lockedRoles,
      npcPositions,
      inv.agents,
      inv.systemNodes,
    ],
  );
  const pinnedFindingCount = useMemo(
    () =>
      inv.completedFindings.filter((finding) =>
        board.isPinned(`${finding.nodeId}:${finding.taskType}`),
      ).length,
    [board, inv.completedFindings],
  );

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
      if (paused) return;
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
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.repeat) {
        e.preventDefault();
        setPaused((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paused]);

  useEffect(() => {
    setWorldPaused(paused);
    return () => setWorldPaused(false);
  }, [paused]);

  return (
    <div
      className="relative flex h-screen flex-col overflow-clip"
      style={{ background: "#080c12" }}
      data-testid="investigate-page"
    >
      {/* Top bar: EchoLocate header + agent status */}
      <div
        className="rpg-panel flex h-16 shrink-0 items-center gap-4 rounded-none border-x-0 border-t-0 px-5 panel-slide-top"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <div className="flex items-center gap-3 shrink-0 mr-3">
          <span className="text-[12px] font-mono tracking-[0.14em]" style={{ color: "#00d4ff" }}>
            ◈ EchoLocate
          </span>
          <span className="text-[11px] font-mono" style={{ color: "#1e3d5a" }}>|</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: "#2a5070" }}>
            investigation console
          </span>
        </div>

        {/* Agent status bar */}
        <div className="flex-1 h-full py-1.5 overflow-x-auto">
          <AgentStatusBar
            agents={inv.agents}
            activeTasks={inv.activeTasks}
            lockedAgents={agentState.lockedRoles}
            slotAgentsByRole={agentState.slotAgentsByRole}
            onAgentClick={(agentId) => {
              const nipsAgent = agentState.slotAgentsByRole[agentId];
              if (nipsAgent) {
                const isLocked = agentState.lockedRoles.includes(agentId);
                if (isLocked) {
                  setLockedAgentInfo(nipsAgent);
                } else {
                  setChatAgent(nipsAgent);
                }
              }
            }}
          />
        </div>

        <div className="ml-3 flex shrink-0 items-center gap-2.5">
          {/* Funds display */}
          <div className="flex items-center gap-1.5 rpg-panel px-3 py-1.5">
            <span className="text-[10px] font-mono" style={{ color: "#2a5070" }}>₡</span>
            <span className="text-[11px] font-mono tabular-nums" style={{ color: "#00ff88" }}>
              {nipsFunds.toLocaleString()}
            </span>
          </div>
          {inv.isComplete && (
            <button
              type="button"
              onClick={() => { audioManager.playButtonClick(); setRewardsShown(true); }}
              className="text-[10px] font-mono transition-opacity hover:opacity-70"
              style={{ color: "#00ff88", textShadow: "0 0 8px rgba(0,255,136,0.5)" }}
            >
              CASE CLOSED — CLAIM REWARDS →
            </button>
          )}
          <button
            type="button"
            onClick={toggleBoard}
            className="rpg-panel px-3.5 py-2 text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
            style={{
              color: showBoard ? "#f5d0fe" : "#d8b4fe",
              border: `1px solid ${showBoard ? "#d946ef" : "rgba(176,111,255,0.38)"}`,
              background: showBoard ? "rgba(176,111,255,0.18)" : "rgba(176,111,255,0.08)",
              boxShadow: "0 0 16px rgba(176,111,255,0.12)",
            }}
          >
            Case Board {pinnedFindingCount > 0 ? `(${pinnedFindingCount})` : ""}
          </button>
          <button
            type="button"
            onClick={toggleMarketplace}
            className="rpg-panel px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-70"
            style={{ color: showMarketplace ? "#f59e0b" : "#4a6580", border: `1px solid ${showMarketplace ? "#f59e0b" : "#1e3d5a"}` }}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => { audioManager.playPauseMenu(); setShowDirectory(true); }}
            className="rpg-panel px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-70"
            style={{ color: "#4a6580" }}
          >
            Agents ({agentState.ownedAgents.length}/4)
          </button>
          <button
            type="button"
            onClick={() => { audioManager.playPauseMenu(); radio.setIsOpen(!radio.isOpen); }}
            className="rpg-panel px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-70"
            style={{
              color: radio.isOpen ? "#00d4ff" : "#4a6580",
              border: `1px solid ${radio.isOpen ? "#00d4ff" : "#1e3d5a"}`,
              background: radio.isOpen ? "rgba(0,212,255,0.08)" : "transparent",
            }}
          >
            Radio {radio.status !== "idle" ? "·" : ""}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-2 overflow-hidden p-3">
        {/* Left: Evidence feed */}
        <div className="rpg-panel panel-slide-left flex h-full w-[248px] shrink-0 flex-col">
          <div className="shrink-0 px-4 py-3" style={{ borderBottom: "1px solid #1e3d5a" }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: "#00d4ff" }}>
                Evidence Feed
              </h2>
              <button
                type="button"
                onClick={openBoard}
                className="rounded-md px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-80"
                style={{
                  background: "rgba(176,111,255,0.14)",
                  border: "1px solid rgba(176,111,255,0.48)",
                  color: "#d8b4fe",
                  boxShadow: "0 0 16px rgba(176,111,255,0.14)",
                }}
              >
                Open Board
              </button>
            </div>
            <p className="mt-2 text-[9px] font-mono leading-5" style={{ color: "#6f87a1" }}>
              Analyze logs, pin evidence, and connect the strongest findings.
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <EventFeed
              events={inv.events}
              onPinEvent={(event: SimEvent) => {
                const finding = inv.completedFindings.find(f =>
                  event.message.includes(f.summary.substring(0, 30))
                );
                if (finding) {
                  board.pinEvidence(`${finding.nodeId}:${finding.taskType}`);
                }
              }}
              onOpenBoard={(event: SimEvent) => {
                const finding = inv.completedFindings.find(f =>
                  event.message.includes(f.summary.substring(0, 30))
                );
                if (finding) {
                  board.addEvidenceNode(finding);
                  openBoard();
                }
              }}
            />
          </div>
        </div>

        {/* Center: Game canvas */}
        <div
          className="relative flex min-w-0 flex-1 items-start justify-center overflow-hidden pt-0.5"
        >
          <div
            ref={canvasContainerRef}
            className="relative shrink-0 overflow-hidden"
            style={{
              width: "100%",
              maxWidth: MAP_FRAME_MAX_WIDTH,
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 12,
              background: "#050911",
              boxShadow: "0 28px 72px rgba(0,0,0,0.72)",
            }}
          >
            <GameCanvas />
            {/* NPC hover tooltip */}
            {hoverInfo && (
              <div className="pointer-events-none absolute z-30 overflow-hidden" style={{ left: overlayMetrics.offsetX, top: overlayMetrics.offsetY, width: overlayMetrics.width, height: overlayMetrics.height }}>
                <NPCTooltip info={hoverInfo} scaleX={overlayMetrics.scaleX} scaleY={overlayMetrics.scaleY} />
              </div>
            )}
            <div
              className="pointer-events-none absolute z-20 overflow-hidden"
              style={{
                left: overlayMetrics.offsetX,
                top: overlayMetrics.offsetY,
                width: overlayMetrics.width,
                height: overlayMetrics.height,
              }}
            >
              <AgentOverlay
                markers={agentMarkers}
                boundsWidth={overlayMetrics.width}
                boundsHeight={overlayMetrics.height}
                scaleX={overlayMetrics.scaleX}
                scaleY={overlayMetrics.scaleY}
                onAgentClick={(agent) => {
                  const roleId = toAgentId(agent.archetype);
                  const isLocked = roleId ? agentState.lockedRoles.includes(roleId) : false;
                  if (isLocked) {
                    setLockedAgentInfo(agent);
                  } else {
                    setChatAgent(agent);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Right: Node list panel */}
        <div className="panel-slide-right shrink-0">
          <NodeListPanel
            nodes={inv.systemNodes}
            selectedNodeId={inv.selectedNodeId}
            onSelectNode={(id) => inv.setSelectedNodeId(inv.selectedNodeId === id ? null : id)}
            summary={
              <Dashboard
                metrics={inv.metrics}
                metricsHistory={inv.metricsHistory}
                phase={inv.stage}
                round={inv.currentCycle}
                maxRounds={99}
                embedded
              />
            }
          />
        </div>
      </div>

      {/* Investigation Board */}
      {showBoard && (
        <UserBoard
          board={board}
          completedFindings={inv.completedFindings}
          lockedAgents={agentState.lockedRoles}
          onClose={() => setActiveOverlay(null)}
        />
      )}

      {/* Marketplace overlay */}
      {showMarketplace && (
        <div className="fixed inset-x-0 top-14 z-[80] mx-auto max-w-4xl px-4 py-3">
          <div className="rpg-panel p-4">
            <AgentMarketplace
              offersByRole={agentState.offersByRole}
              ownedAgentsByRole={agentState.ownedAgentsByRole}
              funds={nipsFunds}
              nextRefresh={nipsNextRefresh}
              lockedAgents={agentState.lockedRoles}
              ownedAgentCount={agentState.ownedAgents.length}
              onBuy={handleBuyAgent}
              onRefresh={handleRefreshMarketplace}
            />
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => setActiveOverlay(null)}
                className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                Close Marketplace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent directory modal */}
      {showDirectory && (
        <AgentDirectory
          agents={agentState.ownedAgents}
          lockedAgents={agentState.lockedRoles}
          slotAgentsByRole={agentState.slotAgentsByRole}
          onOpenChat={(agent) => {
            setShowDirectory(false);
            setChatAgent(agent);
          }}
          onLockedClick={(agent) => {
            setShowDirectory(false);
            setLockedAgentInfo(agent);
          }}
          onClose={() => setShowDirectory(false)}
        />
      )}

      {/* Locked Agent Popup */}
      {lockedAgentInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rpg-panel p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center animate-[modalIn_200ms_ease-out]">
            <div className="text-[24px]">🔒</div>
            <div>
              <div className="text-[11px] font-mono font-bold" style={{ color: "#00d4ff" }}>
                {lockedAgentInfo.display_name.toUpperCase()} IS LOCKED
              </div>
              <div className="mt-1 text-[10px] font-mono uppercase tracking-[0.12em] text-[var(--muted)]">
                {lockedAgentInfo.archetype} Specialist
              </div>
            </div>
            <p className="text-[11px] font-mono leading-6" style={{ color: "#4a6580" }}>
              This specialist is visible in the field, but their role is still locked.
              Recruit them in the marketplace to unlock and use them.
            </p>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setLockedAgentInfo(null)}
                className="flex-1 rpg-panel py-2 text-[10px] font-mono uppercase tracking-[0.12em] transition-all hover:bg-white/5"
                style={{ color: "#4a6580" }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setLockedAgentInfo(null);
                  openMarketplace();
                }}
                className="flex-1 rpg-panel py-2 text-[10px] font-mono uppercase tracking-[0.12em] transition-all"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid #f59e0b", color: "#f59e0b" }}
              >
                Go to Market
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mini Map */}
      <GameMiniMap
        positions={npcPositions}
        markers={agentMarkers}
        onAgentClick={(agent) => {
          const roleId = toAgentId(agent.archetype);
          const isLocked = roleId ? agentState.lockedRoles.includes(roleId) : false;
          if (isLocked) {
            setLockedAgentInfo(agent);
          } else {
            setChatAgent(agent);
          }
        }}
      />

      {/* Agent chat modal */}
      {/* Radio Panel */}
      <RadioPanel radio={radio} agents={agentState.ownedAgents} />

      {chatAgent && (
        <AgentCommandModal
          agent={chatAgent}
          nodeContext={nodeContextStr}
          currentFunds={nipsFunds}
          initialMessages={chatHistories[chatAgent.instance_id]}
          onEvidenceUpdate={(ev) => inv.addExternalEvidence(ev)}
          onFundsChange={setNipsFunds}
          onOpenRadio={() => {
            radio.setSelectedAgent(chatAgent);
            radio.setIsOpen(true);
          }}
          onClose={(msgs) => {
            setChatHistories((prev) => ({ ...prev, [chatAgent.instance_id]: msgs }));
            setChatAgent(null);
          }}
        />
      )}

      <PauseOverlay
        isVisible={paused}
        onResume={() => setPaused(false)}
        onRestart={() => router.replace("/simulate?mode=investigate&map=moonCity")}
        onReturnToLanding={() => router.push("/")}
      />

      {/* Case Complete — Rewards Modal */}
      {rewardsShown && inv.isComplete && (
        <CaseRewardsModal
          findings={inv.completedFindings}
          progress={progress}
          onClose={(updated) => {
            onProgressChange(updated);
            setRewardsShown(false);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CaseRewardsModal
// ---------------------------------------------------------------------------

function CaseRewardsModal({
  findings,
  progress,
  onClose,
}: {
  findings: import("@/types/investigation").AgentResult[];
  progress: PlayerProgress;
  onClose: (updated: PlayerProgress) => void;
}) {
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount     = findings.filter((f) => f.severity === "high").length;
  const { credits, reputation } = computeCaseRewards(findings.length, criticalCount, highCount);
  const updated = applyCaseRewards(progress, credits, reputation);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.80)" }}
    >
      <div className="rpg-panel flex flex-col" style={{ width: 420 }}>
        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #1e3d5a" }}>
          <div className="text-[11px] font-mono font-bold" style={{ color: "#00ff88", textShadow: "0 0 10px rgba(0,255,136,0.4)" }}>
            ◈ CASE CLOSED
          </div>
          <div className="text-[8px] font-mono uppercase tracking-widest mt-0.5" style={{ color: "#2a5070" }}>
            Investigation complete — rewards issued
          </div>
        </div>

        {/* Stats */}
        <div className="px-5 py-4 flex flex-col gap-2">
          {[
            { label: "Total findings", value: findings.length },
            { label: "Critical findings", value: criticalCount },
            { label: "High findings", value: highCount },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[8px] font-mono" style={{ color: "#4a6580" }}>{label}</span>
              <span className="text-[9px] font-mono tabular-nums" style={{ color: "#c9d8e8" }}>{value}</span>
            </div>
          ))}
          <div className="mt-2 pt-2" style={{ borderTop: "1px solid #1e3d5a" }}>
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono" style={{ color: "#00ff88" }}>Credits earned</span>
              <span className="text-[11px] font-mono font-bold tabular-nums" style={{ color: "#00ff88" }}>
                +{credits.toLocaleString()}₡
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[8px] font-mono" style={{ color: "#b06fff" }}>Reputation</span>
              <span className="text-[9px] font-mono tabular-nums" style={{ color: "#b06fff" }}>+{reputation}</span>
            </div>
          </div>
          <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: "1px solid #1e3d5a" }}>
            <span className="text-[8px] font-mono" style={{ color: "#2a5070" }}>Total balance</span>
            <span className="text-[10px] font-mono tabular-nums" style={{ color: "#00ff88" }}>
              {updated.credits.toLocaleString()}₡
            </span>
          </div>
        </div>

        <div className="px-5 py-3 flex justify-between items-center" style={{ borderTop: "1px solid #1e3d5a" }}>
          <span className="text-[7px] font-mono" style={{ color: "#1e3d5a" }}>
            Spend credits to upgrade helpers before next case
          </span>
          <button
            type="button"
            onClick={() => onClose(updated)}
            className="px-4 py-1.5 text-[9px] font-mono rounded transition-all"
            style={{
              background: "rgba(0,212,255,0.12)",
              border: "1px solid #00d4ff",
              color: "#00d4ff",
              boxShadow: "0 0 10px rgba(0,212,255,0.15)",
            }}
          >
            CONTINUE →
          </button>
        </div>
      </div>
    </div>
  );
}

function SimulateContent() {
  const router = useRouter();
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
  const [paused, setPaused] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [hoverInfo, setHoverInfo] = useState<NPCHoverInfo | null>(null);
  const [overlayMetrics, setOverlayMetrics] = useState<OverlayMetrics>(
    DEFAULT_OVERLAY_METRICS,
  );
  const [showReport, setShowReport] = useState(false);
  const reportShownRef = useRef(false);

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
      if (paused) return;
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

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
  }, [paused]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.repeat) {
        e.preventDefault();
        setPaused((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [paused]);

  useEffect(() => {
    setWorldPaused(paused);
    return () => setWorldPaused(false);
  }, [paused]);

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
            className="text-[12px] font-mono tracking-[0.16em]"
            style={{ color: "#00d4ff" }}
          >
            ◈ EchoLocate — No Incident Loaded
          </span>
          <p
            className="text-[12px] font-mono uppercase tracking-[0.14em]"
            style={{ color: "#c9d8e8" }}
          >
            No incident loaded.
          </p>
          <p
            className="text-[11px] font-mono uppercase tracking-[0.14em]"
            style={{ color: "#4a6580" }}
          >
            Load a case from the home screen to begin your investigation.
          </p>
          <Link
            href="/"
            className="rpg-panel mt-2 px-6 py-2 text-[11px] font-mono transition-opacity hover:opacity-80"
            style={{ color: "#00d4ff", border: "1px solid #1e3d5a" }}
          >
            {">> Load Case <<"}
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
        className="rpg-panel flex h-14 shrink-0 items-center justify-between rounded-none border-x-0 border-t-0 px-5 panel-slide-top"
        style={{ borderBottom: "1px solid #1e3d5a" }}
        data-testid="phase-bar"
      >
        <div className="flex items-center gap-3">
          <span
            className="text-[12px] font-mono tracking-[0.14em]"
            style={{ color: "#00d4ff" }}
          >
            ◈ EchoLocate
          </span>
          <span className="text-[11px] font-mono" style={{ color: "#1e3d5a" }}>
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
            className="ml-2 text-[10px] font-mono uppercase tracking-[0.14em]"
            style={{ color: "#4a6580" }}
          >
            {sim.phaseLabel}
          </span>
          )}
        </div>

        <div className="relative z-[2] flex items-center gap-3">
          {sim.isRunning && isRecording && (
            <span
              className="text-[10px] font-mono animate-pulse"
              style={{ color: "#ff3a3a" }}
            >
              ● REC
            </span>
          )}
          {sim.isComplete && (
            <>
              <span
                className="text-[10px] font-mono"
                style={{ color: "#00ff88", textShadow: "0 0 8px rgba(0,255,136,0.5)" }}
              >
                CASE CLOSED
              </span>
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-60"
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
                    a.download = `echolocate-case-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-[10px] font-mono uppercase tracking-[0.14em] transition-opacity hover:opacity-60"
                  style={{ color: "#4a6580" }}
                >
                  SAVE JSON
                </button>
              )}
            </>
          )}
          {sim.isRunning && !isRecording && (
            <span
              className="text-[10px] font-mono uppercase tracking-[0.14em] animate-pulse"
              style={{ color: "#4a6580" }}
            >
              Investigating...
            </span>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        {/* Left: Evidence feed */}
        <div className="rpg-panel panel-slide-left flex h-full w-[300px] shrink-0 flex-col">
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #1e3d5a" }}
          >
            <h2
              className="text-[10px] font-mono uppercase tracking-[0.16em]"
              style={{ color: "#00d4ff" }}
            >
              Evidence Feed
            </h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <EventFeed events={sim.events} onEventClick={handleEventClick} />
          </div>
        </div>

        {/* Center: Game canvas */}
        <div
          className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden"
        >
          <div
            ref={canvasContainerRef}
            className="relative shrink-0 overflow-hidden"
            style={{
              width: "100%",
              maxWidth: MAP_FRAME_MAX_WIDTH,
              border: "1px solid rgba(255,255,255,0.04)",
              borderRadius: 12,
              background: "#050911",
              boxShadow: "0 28px 72px rgba(0,0,0,0.72)",
            }}
          >
            <GameCanvas />

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

        <div className="rpg-panel flex w-[320px] shrink-0 flex-col">
          <div
            className="px-4 py-3"
            style={{ borderBottom: "1px solid #1e3d5a" }}
          >
            <span
              className="text-[10px] font-mono uppercase tracking-[0.16em]"
              style={{ color: "#00d4ff" }}
            >
              Operation Status
            </span>
          </div>
          <Dashboard
            metrics={sim.metrics}
            metricsHistory={sim.metricsHistory}
            phase={sim.phase}
            round={sim.round}
            maxRounds={sim.maxRounds}
            embedded
          />
        </div>
      </div>

      {/* Agent Profile Modal */}
      {selectedNpc && (
        <NPCInteractionModal
          npc={selectedNpc}
          simulationId={simulationId}
          onClose={() => setSelectedNpcId(null)}
        />
      )}

      {showReport && (
        <EconomicReportModal
          report={sim.report}
          loading={sim.reportLoading}
          error={sim.reportError}
          onClose={() => setShowReport(false)}
        />
      )}

      <PauseOverlay
        isVisible={paused}
        onResume={() => setPaused(false)}
        onRestart={() => {
          if (simulationId) {
            router.replace(`/simulate?id=${simulationId}&map=moonCity${isRecording ? "&record=true" : ""}`);
            return;
          }
          router.push("/");
        }}
        onReturnToLanding={() => router.push("/")}
      />

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

// ---------------------------------------------------------------------------
// AgentOverlay — floating labels that follow agents
// ---------------------------------------------------------------------------

function AgentOverlay({
  markers,
  boundsWidth,
  boundsHeight,
  scaleX,
  scaleY,
  onAgentClick,
}: {
  markers: AgentMarkerData[];
  boundsWidth: number;
  boundsHeight: number;
  scaleX: number;
  scaleY: number;
  onAgentClick: (agent: NipsAgentInstance) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {markers.map((marker) => {
        const anchorX = marker.position.x * scaleX;
        const anchorY = marker.position.y * scaleY;
        const estimatedWidth = Math.min(
          148,
          Math.max(72, marker.agent.display_name.length * 6 + 22),
        );
        const labelHeight = 20;
        const spriteHalfHeight = Math.max(9, 14 * scaleY);
        const labelGap = 40;
        const left = Math.max(
          6,
          Math.min(
            anchorX - estimatedWidth / 2,
            Math.max(6, boundsWidth - estimatedWidth - 6),
          ),
        );
        const top = Math.max(
          6,
          Math.min(
            anchorY - spriteHalfHeight - labelHeight - labelGap,
            Math.max(6, boundsHeight - labelHeight - 6),
          ),
        );

        return (
          <div
            key={marker.agent.instance_id}
            className="absolute pointer-events-auto"
            style={{
              left,
              top,
            }}
          >
            <button
              type="button"
              onClick={() => onAgentClick(marker.agent)}
              className="animate-[fadeIn_0.3s_ease-out] rounded-full px-2.5 py-[3px] text-[8px] font-mono tracking-[0.06em] transition-opacity hover:opacity-100"
              style={{
                width: estimatedWidth,
                background: "rgba(7,12,19,0.78)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: marker.isLocked ? "#6f87a1" : "#d9e6f2",
                boxShadow: marker.isLocked
                  ? "0 6px 14px rgba(0,0,0,0.2)"
                  : `0 0 10px ${marker.color}12, 0 6px 14px rgba(0,0,0,0.24)`,
                textShadow: "0 1px 0 rgba(0,0,0,0.6)",
                whiteSpace: "nowrap",
                backdropFilter: "blur(2px)",
                opacity: 0.92,
              }}
            >
              {marker.agent.display_name}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GameMiniMap — tactical bottom-left map
// ---------------------------------------------------------------------------

function GameMiniMap({
  positions,
  markers,
  onAgentClick,
}: {
  positions: Record<string, NPCState>;
  markers: AgentMarkerData[];
  onAgentClick: (agent: NipsAgentInstance) => void;
}) {
  const MAP_W = 1600;
  const MAP_H = 1280;
  const MINI_W = 170;
  const MINI_H = 122;

  const toMiniX = (wx: number) => (wx / MAP_W) * MINI_W;
  const toMiniY = (wy: number) => (wy / MAP_H) * MINI_H;

  return (
    <div
      className="fixed bottom-4 left-4 z-40 rpg-panel p-1 animate-[panelSlideLeft_0.4s_ease-out]"
      style={{
        width: MINI_W + 8,
        height: MINI_H + 24,
        background: "rgba(8,12,18,0.95)",
        border: "1px solid #1e3d5a",
      }}
    >
      <div className="flex items-center justify-between px-1 mb-1 border-b border-[#1e3d5a] pb-0.5">
        <span className="text-[8px] font-mono uppercase tracking-[0.16em] text-[#4a6580]">
          Tactical Map
        </span>
        <span className="text-[8px] font-mono text-[#1e3d5a]">
          {markers.length} AGENTS
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded bg-[#0d1520]"
        style={{ width: MINI_W, height: MINI_H }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(#1e3d5a 0.5px, transparent 0.5px)",
            backgroundSize: "8px 8px",
          }}
        />

        {Object.values(positions).map((pos) => {
          const isAgent = markers.some((marker) => marker.npcId === pos.id);
          if (isAgent) return null;

          return (
            <div
              key={pos.id}
              className="absolute h-0.5 w-0.5 rounded-full bg-[#1e3d5a]"
              style={{
                left: toMiniX(pos.worldX),
                top: toMiniY(pos.worldY),
              }}
            />
          );
        })}

        {markers.map((marker) => {
          return (
            <div
              key={marker.agent.instance_id}
              className={`absolute z-10 ${
                !marker.isLocked ? "animate-pulse" : ""
              }`}
              style={{
                left: toMiniX(marker.position.worldX) - 4,
                top: toMiniY(marker.position.worldY) - 4,
              }}
            >
              <button
                type="button"
                className="h-2.5 w-2.5 rounded-full border"
                style={{
                  backgroundColor: marker.isLocked ? "#2a5070" : marker.color,
                  borderColor: marker.isLocked ? "#1e3d5a" : "#fff",
                  boxShadow: marker.isLocked ? "none" : `0 0 6px ${marker.color}`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAgentClick(marker.agent);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
