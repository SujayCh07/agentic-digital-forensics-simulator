"use client";

/**
 * NIPS — useInvestigation hook
 *
 * Orchestrates the investigation gameplay loop:
 *  1. On mount: initializes agents on the Phaser map via EventBridge
 *  2. Player calls assignTask(agentId, nodeId, taskType)
 *  3. Hook drives agent through moving → executing → reporting states
 *  4. On completion: pushes AgentResult + SimEvent to evidence feed
 *  5. Updates metrics based on accumulated findings
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
// Timing constants (ms)
// ---------------------------------------------------------------------------

const MOVE_DURATION = 2000;
const EXECUTE_DURATION = 1500;
const MAX_FEED_EVENTS = 200;

// ---------------------------------------------------------------------------
// Initial metrics (maps to Dashboard SimMetrics slots)
// corruptionLevel     → eggIndex
// evidenceIntegrity   → priceIndex (100 - integrity%)
// compromisedSystems  → unemploymentRate
// networkActivity     → interestRate
// threatLevel         → socialUnrest
// systemsOnline       → businessSurvival
// caseConfidence      → govApproval
// ---------------------------------------------------------------------------

const INITIAL_METRICS: SimMetrics = {
  eggIndex: 0,          // corruptionLevel
  priceIndex: 0,        // evidenceIntegrity (degradation %)
  unemploymentRate: 0,  // compromisedSystems
  interestRate: 10,     // networkActivity
  socialUnrest: 0.1,    // threatLevel
  businessSurvival: 1.0, // systemsOnline
  govApproval: 0,       // caseConfidence
};

// ---------------------------------------------------------------------------
// Bridge accessor (lazy, cached)
// ---------------------------------------------------------------------------

let bridgePromise: Promise<typeof import("@/game/bridge/EventBridge")> | null = null;
function getBridge() {
  if (!bridgePromise) {
    bridgePromise = import("@/game/bridge/EventBridge");
  }
  return bridgePromise;
}

// ---------------------------------------------------------------------------
// Metric update helper
// ---------------------------------------------------------------------------

function updateMetricsFromFindings(
  current: SimMetrics,
  findings: AgentResult[],
): SimMetrics {
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const totalFindings = findings.length;
  const avgConfidence =
    totalFindings > 0
      ? findings.reduce((s, f) => s + f.confidence, 0) / totalFindings
      : 0;
  const redHerrings = findings.filter((f) => f.isRedHerring).length;
  const realFindings = totalFindings - redHerrings;

  return {
    eggIndex: Math.min(1, (criticalCount * 0.15 + highCount * 0.08)),
    priceIndex: Math.min(100, realFindings * 8),
    unemploymentRate: Math.min(6, criticalCount + highCount * 0.5),
    interestRate: Math.max(0, 10 - totalFindings * 1.5),
    socialUnrest: Math.min(0.9, 0.1 + criticalCount * 0.12),
    businessSurvival: Math.max(0.2, 1.0 - criticalCount * 0.1),
    govApproval: Math.min(1, avgConfidence * (realFindings / Math.max(1, totalFindings + 1))),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface InvestigationHookReturn {
  /** Evidence feed — compatible with EventFeed component */
  events: SimEvent[];
  /** Current metrics — compatible with Dashboard component */
  metrics: SimMetrics;
  metricsHistory: SimMetrics[];
  /** Agent and task state */
  agents: AgentDefinition[];
  activeTasks: Task[];
  completedFindings: AgentResult[];
  systemNodes: CaseSystemNode[];
  /** Selection */
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  /** Assign a task — noop if agent is busy */
  assignTask: (agentId: AgentId, nodeId: string, taskType: TaskType) => void;
  /** Attack graph data — compatible with SocialGraph component */
  graphData: GraphData;
  /** Investigation meta */
  stage: number;
  currentCycle: number;
  isComplete: boolean;
  caseId: string;
  caseName: string;
  incidentBrief: string;
  objective: string;
}

export function useInvestigation(): InvestigationHookReturn {
  const [agents, setAgents] = useState<AgentDefinition[]>(INITIAL_AGENTS);
  const [systemNodes, setSystemNodes] = useState<CaseSystemNode[]>(CASE_NODES);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedFindings, setCompletedFindings] = useState<AgentResult[]>([]);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [metrics, setMetrics] = useState<SimMetrics>(INITIAL_METRICS);
  const [metricsHistory, setMetricsHistory] = useState<SimMetrics[]>([INITIAL_METRICS]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [stage, setStage] = useState(1);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const [graphData, setGraphData] = useState<GraphData>({
    relationships: CASE_RELATIONSHIPS,
    npcs: CASE_AGENTS_NPCS,
    influenceEvents: [],
    version: 0,
  });

  // Refs for stable access inside timeouts
  const agentsRef = useRef(agents);
  const tasksRef = useRef(activeTasks);
  const findingsRef = useRef(completedFindings);
  const cycleRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => { agentsRef.current = agents; }, [agents]);
  useEffect(() => { tasksRef.current = activeTasks; }, [activeTasks]);
  useEffect(() => { findingsRef.current = completedFindings; }, [completedFindings]);

  // ── Initialize agents on the Phaser map ──────────────────────────────────
  useEffect(() => {
    getBridge().then(({ eventBridge }) => {
      eventBridge.emitInitNPCs(CASE_AGENTS_NPCS);
    });

    // Seed graph data
    setGraphData({
      relationships: CASE_RELATIONSHIPS,
      npcs: CASE_AGENTS_NPCS,
      influenceEvents: [],
      version: 1,
    });

    return () => {
      for (const t of timeoutsRef.current) clearTimeout(t);
    };
  }, []);

  // ── Push event to feed ────────────────────────────────────────────────────
  const pushEvent = useCallback((event: SimEvent) => {
    setEvents((prev) => {
      const next = prev.length >= MAX_FEED_EVENTS
        ? [...prev.slice(-MAX_FEED_EVENTS + 1), event]
        : [...prev, event];
      return next;
    });
  }, []);

  // ── Assign task ───────────────────────────────────────────────────────────
  const assignTask = useCallback(
    (agentId: AgentId, nodeId: string, taskType: TaskType) => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      const node = systemNodes.find((n) => n.id === nodeId);

      if (!agent || !node) return;
      if (agent.status !== "idle") return; // already busy

      const taskId = `task-${agentId}-${nodeId}-${Date.now()}`;
      const now = Date.now();
      cycleRef.current += 1;
      const cycle = cycleRef.current;
      setCurrentCycle(cycle);

      const task: Task = {
        id: taskId,
        agentId,
        targetNodeId: nodeId,
        type: taskType,
        status: "moving",
        startedAt: now,
      };

      // ── 1. Set agent → moving ─────────────────────────────────────────────
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, status: "moving", currentTaskId: taskId, currentNodeId: nodeId }
            : a,
        ),
      );
      setActiveTasks((prev) => [...prev, task]);

      // Move NPC on Phaser map
      getBridge().then(({ eventBridge }) => {
        eventBridge.emitNPCMove(agentId, node.tileX, node.tileY);
      });

      pushEvent({
        id: `${taskId}-move`,
        type: "reaction",
        agentId,
        agentName: agent.name,
        message: `Moving to ${node.name} — task: ${taskType.replace(/_/g, " ")}`,
        phase: stage,
        round: cycle,
        maxRounds: 99,
        timestamp: now,
        data: { nodeId, taskType },
      });

      // ── 2. After MOVE_DURATION → executing ───────────────────────────────
      const t1 = setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId ? { ...a, status: "executing" } : a,
          ),
        );
        setActiveTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: "executing" } : t,
          ),
        );

        pushEvent({
          id: `${taskId}-exec`,
          type: "reaction",
          agentId,
          agentName: agent.name,
          message: `Executing ${taskType.replace(/_/g, " ")} at ${node.name}...`,
          phase: stage,
          round: cycle,
          maxRounds: 99,
          timestamp: Date.now(),
          data: { nodeId, taskType },
        });

        // ── 3. After EXECUTE_DURATION → result ─────────────────────────────
        const t2 = setTimeout(() => {
          const templateKey = `${nodeId}:${taskType}`;
          const template = TASK_RESULTS[templateKey] ?? {
            ...FALLBACK_RESULT,
            nodeId,
            nodeName: node.name,
            taskType,
          };

          const result: AgentResult = {
            ...template,
            agentId,
            agentName: agent.name,
          };

          // Update node with finding id
          setSystemNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? { ...n, knownFindings: [...n.knownFindings, taskId] }
                : n,
            ),
          );

          // Update agent NPC position in graph data
          setGraphData((prev) => ({
            ...prev,
            npcs: prev.npcs.map((npc) =>
              npc.id === agentId
                ? { ...npc, x: node.tileX, y: node.tileY }
                : npc,
            ),
            version: prev.version + 1,
          }));

          // Complete task + agent → reporting then idle
          setActiveTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? { ...t, status: "complete", completedAt: Date.now(), result }
                : t,
            ),
          );
          setAgents((prev) =>
            prev.map((a) =>
              a.id === agentId ? { ...a, status: "reporting" } : a,
            ),
          );

          setCompletedFindings((prev) => {
            const next = [...prev, result];
            findingsRef.current = next;

            // Update metrics
            const newMetrics = updateMetricsFromFindings(metrics, next);
            setMetrics(newMetrics);
            setMetricsHistory((h) => [...h, newMetrics].slice(-30));

            // Advance stage based on critical findings
            const critCount = next.filter((f) => f.severity === "critical").length;
            if (critCount >= 6) setStage(3);
            else if (critCount >= 3) setStage(2);

            // Case complete when player has found the main exfil chain
            const foundKeys = ["MAIL-01:trace_lateral_movement", "DB-02:analyze_logs", "GW-01:trace_connections"];
            const allFound = foundKeys.every((k) =>
              next.some((f) => `${f.nodeId}:${f.taskType}` === k),
            );
            if (allFound) setIsComplete(true);

            return next;
          });

          // Push finding to evidence feed
          pushEvent({
            id: `${taskId}-result`,
            type: result.severity === "critical" ? "protest" : result.severity === "high" ? "strike" : "reaction",
            agentId,
            agentName: agent.name,
            message: result.summary,
            phase: stage,
            round: cycle,
            maxRounds: 99,
            timestamp: Date.now(),
            data: {
              nodeId,
              taskType,
              confidence: result.confidence,
              severity: result.severity,
              tags: result.tags,
              isRedHerring: result.isRedHerring,
            },
          });

          // Brief "reporting" pause, then idle
          const t3 = setTimeout(() => {
            setAgents((prev) =>
              prev.map((a) =>
                a.id === agentId
                  ? { ...a, status: "idle", currentTaskId: undefined }
                  : a,
              ),
            );
          }, 800);
          timeoutsRef.current.push(t3);
        }, EXECUTE_DURATION);
        timeoutsRef.current.push(t2);
      }, MOVE_DURATION);
      timeoutsRef.current.push(t1);
    },
    [systemNodes, stage, pushEvent, metrics],
  );

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
    assignTask,
    graphData,
    stage,
    currentCycle,
    isComplete,
    caseId: CASE_META.id,
    caseName: CASE_META.name,
    incidentBrief: CASE_META.brief,
    objective: CASE_META.objective,
  };
}
