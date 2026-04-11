"use client";

<<<<<<< HEAD
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eventBridge } from "@/game/bridge/EventBridge";
import { completeInvestigationTask } from "@/lib/investigationAgentClient";
import {
  buildDeterministicResult,
  buildPresetAgents,
  CASE_EDGES,
  CASE_OBJECTIVE,
  CASE_SYSTEMS,
  supportsTask,
} from "@/lib/investigationCase";
import type { SimEvent } from "@/types";
import type { BackendNPC } from "@/types/backend";
import type {
  AgentDefinition,
  InvestigationState,
  NetworkEdge,
  SystemNode,
  Task,
  TaskType,
} from "@/types/investigation";

type ConnectionState = "connected" | "running_task";

function toNPC(agent: AgentDefinition, node: SystemNode): BackendNPC {
  return {
    id: agent.id,
    name: agent.name,
    gender: "nonbinary",
    bio: `${agent.specialty} specialist`,
    persona: agent.specialty,
    mbti: "INTJ",
    country: "NIPS",
    profession: agent.specialty,
    role: "activist",
    interested_topics: [],
    income_level: "high",
    political_leaning: 0,
    reputation: 0.9,
    beliefs: [],
    controversial_ideas: [],
    x: node.x,
    y: node.y,
    mood: "neutral",
  };
}

function asEvent(
  id: string,
  message: string,
  agentName = "SYSTEM",
  agentId = "system",
  type: SimEvent["type"] = "intel",
): SimEvent {
  return {
    id,
    type,
    agentId,
    agentName,
    message,
    phase: 1,
    round: 0,
    maxRounds: 1,
    timestamp: Date.now(),
  };
}

export function useInvestigation() {
  const [nodes, setNodes] = useState<SystemNode[]>(CASE_SYSTEMS);
  const [edges] = useState<NetworkEdge[]>(CASE_EDGES);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connected");
  const [state, setState] = useState<InvestigationState>({
    selectedNodeId: null,
    availableAgents: buildPresetAgents(),
    activeTasks: [],
    completedFindings: [],
    discoveredEvidence: [],
    currentObjective: CASE_OBJECTIVE,
  });
  const initialAgentsRef = useRef(state.availableAgents);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasInitializedRef = useRef(false);
  const nodesRef = useRef(nodes);
  const eventsRef = useRef(events);
  const stateRef = useRef(state);

  const nodeLookup = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const appendEvent = useCallback((event: SimEvent) => {
    setEvents((prev) => [...prev.slice(-150), event]);
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const npcSeed: BackendNPC[] = initialAgentsRef.current.map((agent) => {
        const homeNode =
          CASE_SYSTEMS.find((node) => node.id === agent.homeNodeId) ??
          CASE_SYSTEMS[0];
        return toNPC(agent, homeNode);
      });
      eventBridge.emitResetNPCs();
      eventBridge.emitInitNPCs(npcSeed);
      appendEvent(
        asEvent(
          "boot-case",
          "Case loaded. Agents online and awaiting assignments.",
          "NIPS CORE",
        ),
      );
    }

    return () => {
      for (const timeout of timeoutsRef.current) clearTimeout(timeout);
      timeoutsRef.current = [];
    };
  }, [appendEvent]);

  const selectedNode = state.selectedNodeId
    ? (nodeLookup.get(state.selectedNodeId) ?? null)
    : null;

  const selectNearestNode = useCallback(
    (col: number, row: number) => {
      const nearest = nodesRef.current.reduce(
        (best, node) => {
          const score = Math.abs(node.x - col) + Math.abs(node.y - row);
          return score < best.score ? { node, score } : best;
        },
        { node: nodesRef.current[0], score: Number.POSITIVE_INFINITY },
      ).node;
      setState((prev) => ({ ...prev, selectedNodeId: nearest.id }));
      appendEvent(
        asEvent(
          `select-${Date.now()}`,
          `Selected ${nearest.name}. Agent command channel ready.`,
          "COMMAND",
          "player",
          "assignment",
        ),
      );
      return nearest;
    },
    [appendEvent],
  );

  const assignTask = useCallback(
    (agentId: string, taskType: TaskType, taskObjective = "") => {
      const node = selectedNode;
      if (!node) {
        return "Select a system first so the agent knows where to work.";
      }

      const agent = state.availableAgents.find((item) => item.id === agentId);
      if (
        !agent ||
        agent.currentStatus !== "idle" ||
        !supportsTask(agent, taskType)
      ) {
        return !agent
          ? "Agent channel unavailable."
          : `${agent.name} cannot take that task right now.`;
      }

      const taskId = `task-${Date.now()}`;
      const startedAt = Date.now();
      const task: Task = {
        id: taskId,
        agentId,
        targetNodeId: node.id,
        type: taskType,
        status: "in_progress",
        startedAt,
        completedAt: null,
        result: null,
      };

      setConnectionState("running_task");
      setState((prev) => ({
        ...prev,
        activeTasks: [...prev.activeTasks, task],
        availableAgents: prev.availableAgents.map((item) =>
          item.id === agentId
            ? { ...item, currentStatus: "in_transit", currentTask: taskId }
            : item,
        ),
      }));

      appendEvent(
        asEvent(
          `task-start-${taskId}`,
          `${agent.name} assigned to ${node.name}: ${taskObjective || taskType}.`,
          agent.name,
          agent.id,
          "assignment",
        ),
      );
      eventBridge.emitNPCMove(agent.id, node.x, node.y);

      const runTimeout = setTimeout(() => {
        void (async () => {
          let result = buildDeterministicResult(agent, node, taskType);

          try {
            const completion = await completeInvestigationTask({
              agentId: agent.id,
              taskType,
              taskObjective,
              currentObjective: stateRef.current.currentObjective,
              selectedNode: node,
              completedFindings: stateRef.current.completedFindings.slice(-6),
              recentEvents: eventsRef.current.slice(-8).map((event) => ({
                id: event.id,
                type: event.type,
                agentName: event.agentName,
                message: event.message,
                round: event.round,
              })),
            });
            result = {
              agent: agent.name,
              nodeId: node.id,
              summary: completion.summary,
              confidence: completion.confidence,
              severity: completion.severity,
              evidenceType: completion.evidenceType,
            };
          } catch (error) {
            console.error("Failed to generate Gemini task completion:", error);
            appendEvent(
              asEvent(
                `task-fallback-${taskId}`,
                `${agent.name} task completion fell back to local findings because the Gemini request failed.`,
                "NIPS CORE",
              ),
            );
          }

          eventBridge.emitNPCMood(
            agent.id,
            result.severity === "critical" ? "anxious" : "hopeful",
          );
          appendEvent(
            asEvent(
              `task-result-${taskId}`,
              result.summary,
              agent.name,
              agent.id,
              "intel",
            ),
          );
          setNodes((prev) =>
            prev.map((item) =>
              item.id === node.id
                ? {
                    ...item,
                    knownFindings: [...item.knownFindings, result],
                    threatLevel:
                      result.severity === "critical"
                        ? "critical"
                        : result.severity === "high"
                          ? "high"
                          : item.threatLevel,
                  }
                : item,
            ),
          );
          setState((prev) => ({
            ...prev,
            activeTasks: prev.activeTasks.map((item) =>
              item.id === taskId
                ? {
                    ...item,
                    status: "completed",
                    completedAt: Date.now(),
                    result,
                  }
                : item,
            ),
            completedFindings: [...prev.completedFindings, result],
            discoveredEvidence: [...prev.discoveredEvidence, result],
            availableAgents: prev.availableAgents.map((item) =>
              item.id === agentId
                ? { ...item, currentStatus: "running_task" }
                : item,
            ),
          }));
        })();
      }, 1600);

      const returnTimeout = setTimeout(() => {
        const homeNode = nodeLookup.get(agent.homeNodeId) ?? node;
        eventBridge.emitNPCMove(agent.id, homeNode.x, homeNode.y);
        setState((prev) => ({
          ...prev,
          availableAgents: prev.availableAgents.map((item) =>
            item.id === agentId
              ? { ...item, currentStatus: "idle", currentTask: null }
              : item,
          ),
        }));
        setConnectionState("connected");
      }, 3000);

      timeoutsRef.current.push(runTimeout, returnTimeout);
      return null;
    },
    [appendEvent, nodeLookup, selectedNode, state.availableAgents],
  );

  return {
    events,
    systems: nodes,
    edges,
    selectedNode,
    connectionState,
    investigationState: state,
    selectNode: (nodeId: string) =>
      setState((prev) => ({ ...prev, selectedNodeId: nodeId })),
    selectNearestNode,
    assignTask,
=======
/**
 * NIPS — useInvestigation hook
 *
 * Orchestrates the investigation gameplay loop:
 *
 * Player submits natural-language instruction for an agent + node
 *   ↓
 * resolveIntent() interprets instruction into a TaskType
 *   ↓
 * Capability check — wrong agent = hard fail (time wasted, pressure rises)
 *   ↓
 * Agent: moving (2s) → executing (1.5s) → reporting (0.8s) → idle
 *   ↓
 * Pre-written AgentResult pushed to evidence feed + metrics updated
 *   ↓
 * Funds earned based on finding severity
 *
 * Other mechanics:
 * - Funds: start at 1500₡, unlock locked agents (NEXUS/FILER/CHRONO)
 * - Pressure: escalation timer fires every 45s, worsens incident state
 * - Agent personality: short in-character commentary appended to findings
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CASE_AGENTS_NPCS,
  CASE_META,
  CASE_NODES,
  CASE_RELATIONSHIPS,
  FALLBACK_RESULT,
  INITIAL_AGENTS,
  TASK_RESULTS,
} from "@/data/case_midnight_exfil";
import { getCapableAgent, resolveIntent } from "@/lib/intentResolver";
import type {
  AgentDefinition,
  AgentId,
  AgentResult,
  CaseSystemNode,
  Task,
  TaskType,
} from "@/types/investigation";
import type { SimEvent, SimMetrics } from "@/types";
import type { GraphData } from "./useSimulation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOVE_DURATION    = 2000;   // ms agent spends "moving"
const EXECUTE_DURATION = 1500;   // ms agent spends "executing"
const REPORT_DURATION  = 800;    // ms agent spends "reporting"
const MAX_FEED_EVENTS  = 200;
const PRESSURE_INTERVAL_MS = 45_000; // 45 seconds per pressure tick

const STARTING_FUNDS   = 1500;
const LOCKED_AT_START: AgentId[] = ["nexus", "filer", "chrono"];

const AGENT_UNLOCK_COST: Partial<Record<AgentId, number>> = {
  nexus:  800,
  filer:  900,
  chrono: 1100,
};

// Funds earned per completed finding
const FUNDS_PER_SEVERITY: Record<string, number> = {
  critical: 500,
  high:     300,
  medium:   200,
  low:      100,
};

// ---------------------------------------------------------------------------
// Initial metrics
// Slots map to Dashboard's SimMetrics labels (renamed in Dashboard.tsx)
//   eggIndex        → Corruption Level
//   priceIndex      → Evidence Integrity
//   unemploymentRate → Compromised Systems
//   interestRate    → Network Activity
//   socialUnrest    → Threat Level
//   businessSurvival → Systems Online
//   govApproval     → Case Confidence
// ---------------------------------------------------------------------------

const INITIAL_METRICS: SimMetrics = {
  eggIndex:         0,      // corruption starts low
  priceIndex:       0,      // evidence integrity: 0% degraded
  unemploymentRate: 0,      // compromised systems count
  interestRate:     10,     // network activity (base noise)
  socialUnrest:     0.1,    // threat level (low)
  businessSurvival: 1.0,    // all systems online
  govApproval:      0,      // case confidence (no findings yet)
};

// ---------------------------------------------------------------------------
// Agent personality commentary — short in-character remarks
// ---------------------------------------------------------------------------

type CommentaryKey = "critical" | "high" | "medium" | "low" | "failure" | "wrong_agent";

const AGENT_COMMENTARY: Record<AgentId, Record<CommentaryKey, string>> = {
  logis: {
    critical:    "Auth trail confirms it. No ambiguity here.",
    high:        "Logs don't lie. This is significant.",
    medium:      "Possible indicator. Needs corroboration.",
    low:         "Nothing conclusive. Could be noise.",
    failure:     "Nothing interpretable in those logs.",
    wrong_agent: "I read logs. That's not my domain.",
  },
  nexus: {
    critical:    "Traffic pattern locked. This is the path.",
    high:        "This traffic doesn't belong here. At all.",
    medium:      "Something moved through this node.",
    low:         "Clean for now. I'll keep watching.",
    failure:     "Unclear what you're asking for.",
    wrong_agent: "I trace packets, not files. Try FILER.",
  },
  filer: {
    critical:    "Recovered. Every byte tells a story.",
    high:        "Something was buried here. Found it.",
    medium:      "Partial match. Enough to note.",
    low:         "Surface clean. Doesn't mean it's clean.",
    failure:     "Can't make sense of that instruction.",
    wrong_agent: "I analyze artifacts. Not network flows.",
  },
  chrono: {
    critical:    "Sequence reconstructed. The chain is clear.",
    high:        "The timing alone is damning.",
    medium:      "Correlation exists. More data needed.",
    low:         "Nothing that fits the incident window.",
    failure:     "Instruction too vague for timeline work.",
    wrong_agent: "Time is my domain. Not authentication.",
  },
};

function getCommentary(agentId: AgentId, key: CommentaryKey): string {
  return AGENT_COMMENTARY[agentId]?.[key] ?? "";
}

// ---------------------------------------------------------------------------
// Metric update
// ---------------------------------------------------------------------------

function computeMetrics(findings: AgentResult[]): SimMetrics {
  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const highCount     = findings.filter(f => f.severity === "high").length;
  const total         = findings.length;
  const redHerrings   = findings.filter(f => f.isRedHerring).length;
  const real          = total - redHerrings;
  const avgConf       = total > 0 ? findings.reduce((s, f) => s + f.confidence, 0) / total : 0;

  return {
    eggIndex:         Math.min(1,   criticalCount * 0.15 + highCount * 0.08),
    priceIndex:       Math.min(100, real * 8),
    unemploymentRate: Math.min(6,   criticalCount + highCount * 0.5),
    interestRate:     Math.max(0,   10 - total * 1.5),
    socialUnrest:     Math.min(0.9, 0.1 + criticalCount * 0.12),
    businessSurvival: Math.max(0.2, 1.0 - criticalCount * 0.1),
    govApproval:      Math.min(1,   avgConf * (real / Math.max(1, total + 1))),
  };
}

// ---------------------------------------------------------------------------
// EventBridge accessor
// ---------------------------------------------------------------------------

let bridgePromise: Promise<typeof import("@/game/bridge/EventBridge")> | null = null;
function getBridge() {
  if (!bridgePromise) bridgePromise = import("@/game/bridge/EventBridge");
  return bridgePromise;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface InvestigationHookReturn {
  // Evidence feed + metrics (compatible with existing UI components)
  events:          SimEvent[];
  metrics:         SimMetrics;
  metricsHistory:  SimMetrics[];

  // Agent + task state
  agents:           AgentDefinition[];
  activeTasks:      Task[];
  completedFindings: AgentResult[];
  systemNodes:      CaseSystemNode[];

  // Selection
  selectedNodeId:    string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Core action: NL instruction → interpret → execute or fail
  submitInstruction: (agentId: AgentId, nodeId: string, rawInstruction: string) => void;

  // Funds + unlock
  funds:       number;
  lockedAgents: AgentId[];
  unlockAgent: (agentId: AgentId) => boolean;

  // Pressure / escalation
  pressureLevel: number;   // 0–10

  // Attack graph (compatible with SocialGraph)
  graphData: GraphData;

  // Meta
  stage:        number;    // 1–3
  currentCycle: number;
  isComplete:   boolean;
  caseId:       string;
  caseName:     string;
  incidentBrief: string;
  objective:    string;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInvestigation(): InvestigationHookReturn {
  const [agents,            setAgents]            = useState<AgentDefinition[]>(INITIAL_AGENTS);
  const [systemNodes,       setSystemNodes]        = useState<CaseSystemNode[]>(CASE_NODES);
  const [activeTasks,       setActiveTasks]        = useState<Task[]>([]);
  const [completedFindings, setCompletedFindings]  = useState<AgentResult[]>([]);
  const [events,            setEvents]             = useState<SimEvent[]>([]);
  const [metrics,           setMetrics]            = useState<SimMetrics>(INITIAL_METRICS);
  const [metricsHistory,    setMetricsHistory]     = useState<SimMetrics[]>([INITIAL_METRICS]);
  const [selectedNodeId,    setSelectedNodeId]     = useState<string | null>(null);
  const [stage,             setStage]              = useState(1);
  const [currentCycle,      setCurrentCycle]       = useState(0);
  const [isComplete,        setIsComplete]         = useState(false);
  const [funds,             setFunds]              = useState(STARTING_FUNDS);
  const [lockedAgents,      setLockedAgents]       = useState<AgentId[]>(LOCKED_AT_START);
  const [pressureLevel,     setPressureLevel]      = useState(0);
  const [graphData,         setGraphData]          = useState<GraphData>({
    relationships: CASE_RELATIONSHIPS,
    npcs:          CASE_AGENTS_NPCS,
    influenceEvents: [],
    version: 0,
  });

  // Stable refs for use inside timeouts
  const agentsRef         = useRef(agents);
  const findingsRef       = useRef(completedFindings);
  const systemNodesRef    = useRef(systemNodes);
  const cycleRef          = useRef(0);
  const stageRef          = useRef(1);
  const timeoutsRef       = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { findingsRef.current = completedFindings; }, [completedFindings]);
  useEffect(() => { systemNodesRef.current = systemNodes; }, [systemNodes]);
  useEffect(() => { stageRef.current = stage; }, [stage]);

  // ── Initialize agents on Phaser map ──────────────────────────────────────
  useEffect(() => {
    getBridge().then(({ eventBridge }) => {
      eventBridge.emitInitNPCs(CASE_AGENTS_NPCS);
    });
    setGraphData({
      relationships: CASE_RELATIONSHIPS,
      npcs:          CASE_AGENTS_NPCS,
      influenceEvents: [],
      version: 1,
    });
    return () => {
      for (const t of timeoutsRef.current) clearTimeout(t);
    };
  }, []);

  // ── Pressure / escalation timer ───────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setPressureLevel(prev => {
        const next = Math.min(10, prev + 1);

        // Pressure 3: EXT-01 becomes suspicious (incident more visible)
        if (next === 3) {
          setSystemNodes(nodes => nodes.map(n =>
            n.id === "EXT-01" ? { ...n, status: "suspicious" as const, threatLevel: 0.35 } : n,
          ));
          pushEvent({
            id: `pressure-3-${Date.now()}`,
            type: "phase_change",
            agentId: "system", agentName: "SYSTEM",
            message: "INCIDENT ESCALATION — External activity detected",
            phase: stageRef.current, round: cycleRef.current, maxRounds: 99,
            timestamp: Date.now(),
          });
        }

        // Pressure 5: BACKUP-01 threat increases (attacker progressing)
        if (next === 5) {
          setSystemNodes(nodes => nodes.map(n =>
            n.id === "BACKUP-01" ? { ...n, status: "compromised" as const, threatLevel: 0.88 } : n,
          ));
          pushEvent({
            id: `pressure-5-${Date.now()}`,
            type: "phase_change",
            agentId: "system", agentName: "SYSTEM",
            message: "INCIDENT ESCALATION — Backup system now compromised",
            phase: stageRef.current, round: cycleRef.current, maxRounds: 99,
            timestamp: Date.now(),
          });
        }

        // Pressure 8: GW-01 threat spikes (egress underway)
        if (next === 8) {
          setSystemNodes(nodes => nodes.map(n =>
            n.id === "GW-01" ? { ...n, status: "compromised" as const, threatLevel: 0.95 } : n,
          ));
          pushEvent({
            id: `pressure-8-${Date.now()}`,
            type: "phase_change",
            agentId: "system", agentName: "SYSTEM",
            message: "CRITICAL ESCALATION — Active exfiltration in progress",
            phase: stageRef.current, round: cycleRef.current, maxRounds: 99,
            timestamp: Date.now(),
          });
        }

        return next;
      });
    }, PRESSURE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Push event to feed ────────────────────────────────────────────────────
  const pushEvent = useCallback((event: SimEvent) => {
    setEvents(prev =>
      prev.length >= MAX_FEED_EVENTS
        ? [...prev.slice(-MAX_FEED_EVENTS + 1), event]
        : [...prev, event],
    );
  }, []);

  // ── Unlock agent ──────────────────────────────────────────────────────────
  const unlockAgent = useCallback((agentId: AgentId): boolean => {
    const cost = AGENT_UNLOCK_COST[agentId];
    if (!cost) return false;

    let success = false;
    setFunds(prev => {
      if (prev < cost) return prev;
      success = true;
      return prev - cost;
    });

    if (success) {
      setLockedAgents(prev => prev.filter(id => id !== agentId));
      pushEvent({
        id: `unlock-${agentId}-${Date.now()}`,
        type: "policy_response",
        agentId,
        agentName: agentId.toUpperCase(),
        message: `${agentId.toUpperCase()} has joined the investigation. (−${cost?.toLocaleString()}₡)`,
        phase: stageRef.current, round: cycleRef.current, maxRounds: 99,
        timestamp: Date.now(),
      });
    }

    return success;
  }, [pushEvent]);

  // ── Internal: run a FAILURE task (wrong agent or unresolvable instruction) ──
  const runFailure = useCallback((
    agentId: AgentId,
    nodeId: string,
    rawInstruction: string,
    reason: string,
    failureType: "wrong_agent" | "unresolvable",
  ) => {
    const agent = agentsRef.current.find(a => a.id === agentId);
    const node  = systemNodesRef.current.find(n => n.id === nodeId);
    if (!agent || !node) return;

    cycleRef.current += 1;
    const cycle = cycleRef.current;
    setCurrentCycle(cycle);

    const taskId = `fail-${agentId}-${Date.now()}`;

    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, status: "moving", currentTaskId: taskId } : a,
    ));

    const commentaryKey: CommentaryKey = failureType === "wrong_agent" ? "wrong_agent" : "failure";
    const commentary = getCommentary(agentId, commentaryKey);

    pushEvent({
      id: `${taskId}-deploy`,
      type: "reaction",
      agentId, agentName: agent.name,
      message: `Deploying to ${node.name} — "${rawInstruction}"`,
      phase: stageRef.current, round: cycle, maxRounds: 99,
      timestamp: Date.now(),
      data: { nodeId, failure: true },
    });

    getBridge().then(({ eventBridge }) => {
      eventBridge.emitNPCMove(agentId, node.tileX, node.tileY);
    });

    const t1 = setTimeout(() => {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: "executing" } : a));

      const t2 = setTimeout(() => {
        // Failure result event
        pushEvent({
          id: `${taskId}-fail`,
          type: "layoff", // red color in EventFeed
          agentId, agentName: agent.name,
          message: failureType === "wrong_agent"
            ? `WRONG AGENT — ${reason} — ${commentary}`
            : `FAILED — ${reason} — ${commentary}`,
          phase: stageRef.current, round: cycle, maxRounds: 99,
          timestamp: Date.now(),
          data: { nodeId, failure: true, failureType, reason },
        });

        // Pressure rises slightly (time wasted)
        setPressureLevel(p => Math.min(10, p + 0.5));

        // Small funds penalty
        setFunds(prev => Math.max(0, prev - 50));

        setAgents(prev => prev.map(a =>
          a.id === agentId ? { ...a, status: "idle", currentTaskId: undefined } : a,
        ));
      }, EXECUTE_DURATION);

      timeoutsRef.current.push(t2);
    }, MOVE_DURATION * 0.6);

    timeoutsRef.current.push(t1);
  }, [pushEvent]);

  // ── Internal: run a VALID task ────────────────────────────────────────────
  const runTask = useCallback((
    agentId: AgentId,
    nodeId: string,
    taskType: TaskType,
    rawInstruction: string,
  ) => {
    const agent = agentsRef.current.find(a => a.id === agentId);
    const node  = systemNodesRef.current.find(n => n.id === nodeId);
    if (!agent || !node) return;

    cycleRef.current += 1;
    const cycle = cycleRef.current;
    setCurrentCycle(cycle);

    const taskId = `task-${agentId}-${nodeId}-${Date.now()}`;
    const task: Task = {
      id: taskId,
      agentId,
      targetNodeId: nodeId,
      type: taskType,
      status: "moving",
      startedAt: Date.now(),
    };

    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, status: "moving", currentTaskId: taskId, currentNodeId: nodeId } : a,
    ));
    setActiveTasks(prev => [...prev, task]);

    getBridge().then(({ eventBridge }) => {
      eventBridge.emitNPCMove(agentId, node.tileX, node.tileY);
    });

    pushEvent({
      id: `${taskId}-move`,
      type: "reaction",
      agentId, agentName: agent.name,
      message: `Moving to ${node.name} — "${rawInstruction}"`,
      phase: stageRef.current, round: cycle, maxRounds: 99,
      timestamp: Date.now(),
      data: { nodeId, taskType },
    });

    const t1 = setTimeout(() => {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: "executing" } : a));
      setActiveTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: "executing" } : t));

      pushEvent({
        id: `${taskId}-exec`,
        type: "reaction",
        agentId, agentName: agent.name,
        message: `Executing at ${node.name}...`,
        phase: stageRef.current, round: cycle, maxRounds: 99,
        timestamp: Date.now(),
        data: { nodeId, taskType },
      });

      const t2 = setTimeout(() => {
        // Look up pre-written result
        const key = `${nodeId}:${taskType}`;
        const template = TASK_RESULTS[key] ?? { ...FALLBACK_RESULT, nodeId, nodeName: node.name, taskType };

        const result: AgentResult = { ...template, agentId, agentName: agent.name };

        // Update node with finding reference
        setSystemNodes(prev => prev.map(n =>
          n.id === nodeId ? { ...n, knownFindings: [...n.knownFindings, taskId] } : n,
        ));

        // Update agent NPC position in graph
        setGraphData(prev => ({
          ...prev,
          npcs: prev.npcs.map(npc => npc.id === agentId ? { ...npc, x: node.tileX, y: node.tileY } : npc),
          version: prev.version + 1,
        }));

        setActiveTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: "complete", completedAt: Date.now(), result } : t,
        ));

        setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: "reporting" } : a));

        setCompletedFindings(prev => {
          const next = [...prev, result];
          findingsRef.current = next;

          // Update metrics
          const newMetrics = computeMetrics(next);
          setMetrics(newMetrics);
          setMetricsHistory(h => [...h, newMetrics].slice(-30));

          // Stage advancement
          const critCount = next.filter(f => f.severity === "critical").length;
          if (critCount >= 6) { setStage(3); stageRef.current = 3; }
          else if (critCount >= 3) { setStage(2); stageRef.current = 2; }

          // Case completion: all 3 key exfil-chain findings discovered
          const keyFindings = [
            "MAIL-01:trace_lateral_movement",
            "DB-02:analyze_logs",
            "GW-01:trace_connections",
          ];
          const allFound = keyFindings.every(k =>
            next.some(f => `${f.nodeId}:${f.taskType}` === k),
          );
          if (allFound) setIsComplete(true);

          return next;
        });

        // Earn funds for finding
        const earned = FUNDS_PER_SEVERITY[result.severity] ?? 100;
        setFunds(prev => prev + earned);

        // Agent personality commentary
        const severityKey = result.severity as CommentaryKey;
        const commentary = getCommentary(agentId, severityKey);

        // Push finding to evidence feed
        pushEvent({
          id: `${taskId}-result`,
          type: result.severity === "critical" ? "protest"
              : result.severity === "high"     ? "strike"
              : result.isRedHerring            ? "price_change"
              : "reaction",
          agentId, agentName: agent.name,
          message: result.summary,
          phase: stageRef.current, round: cycle, maxRounds: 99,
          timestamp: Date.now(),
          data: {
            nodeId, taskType,
            confidence: result.confidence,
            severity: result.severity,
            tags: result.tags,
            isRedHerring: result.isRedHerring,
            details: result.details,
          },
        });

        // Agent commentary as separate event
        if (commentary) {
          pushEvent({
            id: `${taskId}-comment`,
            type: "reaction",
            agentId, agentName: agent.name,
            message: `"${commentary}"`,
            phase: stageRef.current, round: cycle, maxRounds: 99,
            timestamp: Date.now() + 1,
            data: { commentary: true },
          });
        }

        // Funds earned notification
        pushEvent({
          id: `${taskId}-funds`,
          type: "policy_response",
          agentId: "system", agentName: "SYSTEM",
          message: `+${earned}₡ earned for ${result.severity} finding`,
          phase: stageRef.current, round: cycle, maxRounds: 99,
          timestamp: Date.now() + 2,
          data: { funds: earned },
        });

        const t3 = setTimeout(() => {
          setAgents(prev => prev.map(a =>
            a.id === agentId ? { ...a, status: "idle", currentTaskId: undefined } : a,
          ));
        }, REPORT_DURATION);
        timeoutsRef.current.push(t3);
      }, EXECUTE_DURATION);
      timeoutsRef.current.push(t2);
    }, MOVE_DURATION);
    timeoutsRef.current.push(t1);
  }, [pushEvent]);

  // ── Public: submit natural-language instruction ───────────────────────────
  const submitInstruction = useCallback((
    agentId: AgentId,
    nodeId: string,
    rawInstruction: string,
  ) => {
    const agent = agentsRef.current.find(a => a.id === agentId);
    const node  = systemNodesRef.current.find(n => n.id === nodeId);
    if (!agent || !node || agent.status !== "idle") return;

    const resolved = resolveIntent(rawInstruction);

    // Case 1: instruction cannot be resolved at all
    if (!resolved.taskType) {
      runFailure(agentId, nodeId, rawInstruction, resolved.failReason ?? "Instruction unclear.", "unresolvable");
      return;
    }

    // Case 2: wrong specialist
    if (!agent.capabilities.includes(resolved.taskType)) {
      const neededAgent = getCapableAgent(resolved.taskType);
      runFailure(
        agentId, nodeId, rawInstruction,
        `"${resolved.interpretation}" requires ${neededAgent}.`,
        "wrong_agent",
      );
      return;
    }

    // Case 3: valid — execute
    runTask(agentId, nodeId, resolved.taskType, rawInstruction);
  }, [runFailure, runTask]);

  return {
    events,
    metrics,
    metricsHistory,
    agents,
    activeTasks,
    completedFindings,
    systemNodes,
    selectedNodeId,
    setSelectedNodeId,
    submitInstruction,
    funds,
    lockedAgents,
    unlockAgent,
    pressureLevel,
    graphData,
    stage,
    currentCycle,
    isComplete,
    caseId:       CASE_META.id,
    caseName:     CASE_META.name,
    incidentBrief: CASE_META.brief,
    objective:    CASE_META.objective,
>>>>>>> redesign2
  };
}
