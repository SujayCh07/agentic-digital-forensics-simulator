"use client";

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
import { DEFAULT_ACTIVE_HELPERS } from "@/data/helpers";
import { MIDNIGHT_EXFIL_CASE } from "@/data/investigationCases";
import type { InvestigationCaseConfig } from "@/data/investigationCaseTypes";
import { getCapableAgent, resolveIntent } from "@/lib/intentResolver";
import {
  resolveNipsIssue,
  setProgressionCallbacks,
  submitNipsFinalReport,
  syncNipsFinding,
} from "@/lib/investigationAgentClient";
import {
  buildEvidenceKey,
  buildFindingId,
  buildStableFindingSeed,
  inferTaskTypeFromEvidenceUpdate,
  resolveAgentIdFromEvidence,
  resolveArtifactType,
} from "@/lib/investigationProgression";
import type { SimEvent, SimMetrics } from "@/types";
import type {
  ActiveHelpers,
  AgentDefinition,
  AgentId,
  AgentResult,
  CaseSystemNode,
  FinalEvaluation,
  FinalFeedback,
  FinalReportSubmission,
  Helper,
  IssueState,
  NipsAgentInstance,
  NipsCaseState,
  NipsEvidenceUpdate,
  Task,
  TaskType,
  ThreatState,
} from "@/types/investigation";
import type { GraphData } from "./useSimulation";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOVE_DURATION = 2000; // ms agent spends "moving"
const BASE_EXECUTE_DURATION = 1500; // ms base; scaled by helper efficiency
const REPORT_DURATION = 800; // ms agent spends "reporting"
const MAX_FEED_EVENTS = 200;
const PRESSURE_INTERVAL_MS = 45_000; // 45 seconds per pressure tick

const STARTING_FUNDS = 1500;

const ALL_AGENT_IDS: AgentId[] = ["logis", "nexus", "filer", "chrono"];
const NIPS_ARCHETYPE_BY_AGENT_ID = {
  logis: "LOGIS",
  nexus: "NEXUS",
  filer: "FILER",
  chrono: "CHRONO",
} as const;

/** Derive locked agents: everyone except the chosen starter */
function deriveLockedAtStart(activeHelpers: ActiveHelpers): AgentId[] {
  // _starter is injected by HelperSelectionPanel
  const starter = (activeHelpers as unknown as Record<string, unknown>)
    ._starter as AgentId | undefined;
  if (starter && ALL_AGENT_IDS.includes(starter)) {
    return ALL_AGENT_IDS.filter((id) => id !== starter);
  }
  // Fallback: default to logis as starter (lock the rest)
  return ["nexus", "filer", "chrono"];
}

const AGENT_UNLOCK_COST: Partial<Record<AgentId, number>> = {
  logis: 700,
  nexus: 800,
  filer: 900,
  chrono: 1100,
};

// Funds earned per completed finding
const FUNDS_PER_SEVERITY: Record<string, number> = {
  critical: 500,
  high: 300,
  medium: 200,
  low: 100,
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
  eggIndex: 0, // corruption starts low
  priceIndex: 0, // evidence integrity: 0% degraded
  unemploymentRate: 0, // compromised systems count
  interestRate: 10, // network activity (base noise)
  socialUnrest: 0.1, // threat level (low)
  businessSurvival: 1.0, // all systems online
  govApproval: 0, // case confidence (no findings yet)
};

function buildInitialThreatState(
  caseConfig: InvestigationCaseConfig,
): ThreatState {
  const spreadLevel =
    Math.round(
      (caseConfig.nodes.reduce((sum, node) => sum + node.threatLevel, 0) /
        caseConfig.nodes.length) *
        1000,
    ) / 1000;
  return {
    spreadLevel,
    caseConfidence: 0,
    nodeThreats: Object.fromEntries(
      caseConfig.nodes.map((node) => [node.id, node.threatLevel]),
    ),
    stabilizedNodeIds: [],
  };
}

// ---------------------------------------------------------------------------
// Agent personality commentary — short in-character remarks
// ---------------------------------------------------------------------------

type CommentaryKey =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "failure"
  | "wrong_agent";

const AGENT_COMMENTARY: Record<AgentId, Record<CommentaryKey, string>> = {
  logis: {
    critical: "Auth trail confirms it. No ambiguity here.",
    high: "Logs don't lie. This is significant.",
    medium: "Possible indicator. Needs corroboration.",
    low: "Nothing conclusive. Could be noise.",
    failure: "Nothing interpretable in those logs.",
    wrong_agent: "I read logs. That's not my domain.",
  },
  nexus: {
    critical: "Traffic pattern locked. This is the path.",
    high: "This traffic doesn't belong here. At all.",
    medium: "Something moved through this node.",
    low: "Clean for now. I'll keep watching.",
    failure: "Unclear what you're asking for.",
    wrong_agent: "I trace packets, not files. Try FILER.",
  },
  filer: {
    critical: "Recovered. Every byte tells a story.",
    high: "Something was buried here. Found it.",
    medium: "Partial match. Enough to note.",
    low: "Surface clean. Doesn't mean it's clean.",
    failure: "Can't make sense of that instruction.",
    wrong_agent: "I analyze artifacts. Not network flows.",
  },
  chrono: {
    critical: "Sequence reconstructed. The chain is clear.",
    high: "The timing alone is damning.",
    medium: "Correlation exists. More data needed.",
    low: "Nothing that fits the incident window.",
    failure: "Instruction too vague for timeline work.",
    wrong_agent: "Time is my domain. Not authentication.",
  },
};

function getCommentary(agentId: AgentId, key: CommentaryKey): string {
  return AGENT_COMMENTARY[agentId]?.[key] ?? "";
}

// ---------------------------------------------------------------------------
// Helper stat helpers
// ---------------------------------------------------------------------------

/**
 * Execution duration for a given agent, scaled by helper efficiency.
 * Efficiency 0.5 → ~1.5× base duration; efficiency 1.0 → ~0.8× (snappy).
 */
function getExecuteDuration(helper: Helper | undefined): number {
  if (!helper) return BASE_EXECUTE_DURATION;
  // efficiency 0.5→factor 1.5, 0.9→factor 0.9
  return Math.round(BASE_EXECUTE_DURATION * (1.9 - helper.efficiency));
}

/** Low-quality vague summaries for rookie helpers (accuracy < 0.65). */
function degradeSummary(severity: AgentResult["severity"]): string {
  if (severity === "critical")
    return "Significant anomaly detected at this node. Full details unclear — analyst confidence low.";
  if (severity === "high")
    return "Unusual activity observed. Partial indicators found. Further analysis recommended.";
  if (severity === "medium")
    return "Minor irregularity noted. Could be noise. Inconclusive.";
  return "No clear indicators found at this node with current tools.";
}

/**
 * Apply helper accuracy to a result:
 * - Scales confidence down proportionally
 * - If accuracy < 0.65: replaces summary with vague text, truncates details
 */
function applyHelperAccuracy(
  result: AgentResult,
  helper: Helper | undefined,
): AgentResult {
  if (!helper) return result;
  const acc = helper.accuracy;
  const degraded = acc < 0.65;

  return {
    ...result,
    confidence:
      Math.round(
        Math.min(result.confidence, result.confidence * acc + 0.08) * 100,
      ) / 100,
    summary: degraded ? degradeSummary(result.severity) : result.summary,
    details: degraded
      ? `${result.details.substring(0, Math.floor(result.details.length * 0.55))} ... [analyst confidence low — upgrade helper for complete data]`
      : result.details,
  };
}

// ---------------------------------------------------------------------------
// Metric update
// ---------------------------------------------------------------------------

function computeMetrics(findings: AgentResult[]): SimMetrics {
  const criticalCount = findings.filter(
    (f) => f.severity === "critical",
  ).length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const total = findings.length;
  const redHerrings = findings.filter((f) => f.isRedHerring).length;
  const real = total - redHerrings;
  const avgConf =
    total > 0 ? findings.reduce((s, f) => s + f.confidence, 0) / total : 0;

  return {
    eggIndex: Math.min(1, criticalCount * 0.15 + highCount * 0.08),
    priceIndex: Math.min(100, real * 8),
    unemploymentRate: Math.min(6, criticalCount + highCount * 0.5),
    interestRate: Math.max(0, 10 - total * 1.5),
    socialUnrest: Math.min(0.9, 0.1 + criticalCount * 0.12),
    businessSurvival: Math.max(0.2, 1.0 - criticalCount * 0.1),
    govApproval: Math.min(1, avgConf * (real / Math.max(1, total + 1))),
  };
}

// ---------------------------------------------------------------------------
// EventBridge accessor
// ---------------------------------------------------------------------------

let bridgePromise: Promise<typeof import("@/game/bridge/EventBridge")> | null =
  null;
function getBridge() {
  if (!bridgePromise) bridgePromise = import("@/game/bridge/EventBridge");
  return bridgePromise;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface InvestigationHookReturn {
  /** Active helpers used this case (one per role) */
  activeHelpers: ActiveHelpers;
  // Evidence feed + metrics (compatible with existing UI components)
  events: SimEvent[];
  metrics: SimMetrics;
  metricsHistory: SimMetrics[];

  // Agent + task state
  agents: AgentDefinition[];
  activeTasks: Task[];
  completedFindings: AgentResult[];
  systemNodes: CaseSystemNode[];

  // Selection
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  // Core action: NL instruction → interpret → execute or fail
  submitInstruction: (
    agentId: AgentId,
    nodeId: string,
    rawInstruction: string,
  ) => void;

  // Funds + unlock
  funds: number;
  lockedAgents: AgentId[];
  unlockAgent: (agentId: AgentId) => boolean;
  registerRecruitedAgent: (agentId: AgentId, recruitedName?: string) => void;

  // Pressure / escalation
  pressureLevel: number; // 0–10
  threatState: ThreatState;
  caseState: NipsCaseState | null;
  issues: IssueState[];
  finalPhaseReady: boolean;
  finalEvaluation: {
    result: "pass" | "fail";
    evaluation: FinalEvaluation;
    feedback: FinalFeedback;
  } | null;

  // Attack graph (compatible with SocialGraph)
  graphData: GraphData;

  // Meta
  stage: number; // 1–3
  currentCycle: number;
  isComplete: boolean;
  caseId: string;
  caseName: string;
  incidentBrief: string;
  objective: string;
  resolveIssue: (issueId: string, agentId: AgentId) => void;
  submitFinalReport: (report: FinalReportSubmission) => void;
  addExternalEvidence: (
    eu: NipsEvidenceUpdate,
    roster?: NipsAgentInstance[],
  ) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useInvestigation(
  activeHelpers: ActiveHelpers = DEFAULT_ACTIVE_HELPERS,
  caseConfig: InvestigationCaseConfig = MIDNIGHT_EXFIL_CASE,
): InvestigationHookReturn {
  const [agents, setAgents] = useState<AgentDefinition[]>(
    caseConfig.initialAgents,
  );
  const [systemNodes, setSystemNodes] = useState<CaseSystemNode[]>(
    caseConfig.nodes,
  );
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [completedFindings, setCompletedFindings] = useState<AgentResult[]>([]);
  const [events, setEvents] = useState<SimEvent[]>([]);
  const [metrics, setMetrics] = useState<SimMetrics>(INITIAL_METRICS);
  const [metricsHistory, setMetricsHistory] = useState<SimMetrics[]>([
    INITIAL_METRICS,
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [stage, setStage] = useState(1);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [funds, setFunds] = useState(
    caseConfig.startingFunds ?? STARTING_FUNDS,
  );
  const [lockedAgents, setLockedAgents] = useState<AgentId[]>(
    () => caseConfig.initialLockedAgents ?? deriveLockedAtStart(activeHelpers),
  );
  const [pressureLevel, setPressureLevel] = useState(0);
  const [threatState, setThreatState] = useState<ThreatState>(() =>
    buildInitialThreatState(caseConfig),
  );
  const [caseState, setCaseState] = useState<NipsCaseState | null>(null);
  const [issues, setIssues] = useState<IssueState[]>([]);
  const [finalPhaseReady, setFinalPhaseReady] = useState(false);
  const [finalEvaluation, setFinalEvaluation] = useState<{
    result: "pass" | "fail";
    evaluation: FinalEvaluation;
    feedback: FinalFeedback;
  } | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({
    relationships: caseConfig.relationships,
    npcs: caseConfig.agentsNpcs,
    influenceEvents: [],
    version: 0,
  });

  // Stable refs for use inside timeouts
  const agentsRef = useRef(agents);
  const findingsRef = useRef(completedFindings);
  const systemNodesRef = useRef(systemNodes);
  const cycleRef = useRef(0);
  const stageRef = useRef(1);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);
  useEffect(() => {
    findingsRef.current = completedFindings;
  }, [completedFindings]);
  useEffect(() => {
    systemNodesRef.current = systemNodes;
  }, [systemNodes]);
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // ── Initialize agents on Phaser map ──────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: case configuration is fixed for the lifetime of an investigation instance.
  useEffect(() => {
    // Determine the starter agent ID (everyone except lockedAgents at start)
    const starterId = ALL_AGENT_IDS.find((id) => !lockedAgents.includes(id));

    getBridge().then(({ eventBridge }) => {
      eventBridge.emitInitNPCs(caseConfig.agentsNpcs, starterId);
    });
    setGraphData({
      relationships: caseConfig.relationships,
      npcs: caseConfig.agentsNpcs,
      influenceEvents: [],
      version: 1,
    });
    return () => {
      for (const t of timeoutsRef.current) clearTimeout(t);
    };
  }, []);

  // ── Pressure / escalation timer ───────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: pressure progression should use the initial case script rather than reset on every render.
  useEffect(() => {
    if (caseConfig.pressureEnabled === false) return;
    const milestoneByLevel = new Map(
      (caseConfig.pressureMilestones ?? []).map((milestone) => [
        milestone.level,
        milestone,
      ]),
    );
    const interval = setInterval(() => {
      setPressureLevel((prev) => {
        const next = Math.min(10, prev + 1);
        const milestone = milestoneByLevel.get(next);
        if (milestone) {
          setSystemNodes((nodes) =>
            nodes.map((n) =>
              n.id === milestone.nodeId
                ? {
                    ...n,
                    status: milestone.status,
                    threatLevel: milestone.threatLevel,
                  }
                : n,
            ),
          );
          pushEvent({
            id: `pressure-${next}-${Date.now()}`,
            type: "phase_change",
            agentId: "system",
            agentName: "SYSTEM",
            message: milestone.message,
            phase: stageRef.current,
            round: cycleRef.current,
            maxRounds: 99,
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
    setEvents((prev) =>
      prev.length >= MAX_FEED_EVENTS
        ? [...prev.slice(-MAX_FEED_EVENTS + 1), event]
        : [...prev, event],
    );
  }, []);

  useEffect(() => {
    setProgressionCallbacks({
      onCaseState: (data) => {
        setCaseState(data);
        setFunds(data.funds);
        setIssues(data.issues);
        setThreatState(data.threat_state);
        setFinalPhaseReady(data.final_phase_ready);
        setMetrics((prev) => ({
          ...prev,
          govApproval: data.threat_state.caseConfidence,
          socialUnrest: Math.max(
            prev.socialUnrest,
            data.threat_state.spreadLevel,
          ),
        }));
        setSystemNodes((prev) =>
          prev.map((node) => {
            const nodeThreat = data.threat_state.nodeThreats[node.id];
            const stabilized = data.threat_state.stabilizedNodeIds.includes(
              node.id,
            );
            return {
              ...node,
              threatLevel: nodeThreat ?? node.threatLevel,
              status: stabilized
                ? "recovered"
                : node.status === "recovered"
                  ? "suspicious"
                  : node.status,
            };
          }),
        );
      },
      onIssueAvailable: (issue) => {
        pushEvent({
          id: `issue-available-${issue.id}-${Date.now()}`,
          type: "system_response",
          agentId: "system",
          agentName: "SYSTEM",
          message: `New actionable issue available at ${issue.buildingId}: ${issue.title}`,
          phase: stageRef.current,
          round: cycleRef.current,
          maxRounds: 99,
          timestamp: Date.now(),
          data: { issueId: issue.id, buildingId: issue.buildingId },
        });
      },
      onIssueResolved: (result) => {
        pushEvent({
          id: `issue-resolved-${result.issue_id}-${Date.now()}`,
          type: "policy_response",
          agentId: "system",
          agentName: "SYSTEM",
          message: result.message,
          phase: stageRef.current,
          round: cycleRef.current,
          maxRounds: 99,
          timestamp: Date.now(),
          data: {
            issueId: result.issue_id,
            nodeId: result.building_id,
            issueResolved: true,
          },
        });
      },
      onIssueFailed: (result) => {
        pushEvent({
          id: `issue-failed-${result.issue_id}-${Date.now()}`,
          type: "layoff",
          agentId: "system",
          agentName: "SYSTEM",
          message: result.message,
          phase: stageRef.current,
          round: cycleRef.current,
          maxRounds: 99,
          timestamp: Date.now(),
          data: {
            issueId: result.issue_id,
            nodeId: result.building_id,
            reason: result.reason,
          },
        });
      },
      onThreatUpdated: (state) => {
        setThreatState(state);
      },
      onFinalPhaseReady: ({ ready }) => {
        setFinalPhaseReady(ready);
      },
      onFinalEvaluation: (data) => {
        setFinalEvaluation(data);
        setIsComplete(data.evaluation.passed);
        pushEvent({
          id: `final-evaluation-${Date.now()}`,
          type: data.result === "pass" ? "policy_response" : "system_response",
          agentId: "system",
          agentName: "SYSTEM",
          message:
            data.result === "pass"
              ? "Final report accepted. Case closed."
              : "Final report rejected. Review the structured feedback and continue the investigation.",
          phase: stageRef.current,
          round: cycleRef.current,
          maxRounds: 99,
          timestamp: Date.now(),
          data: {
            finalEvaluation: true,
            result: data.result,
            score: data.evaluation.score,
          },
        });
      },
      onError: () => undefined,
    });
  }, [pushEvent]);

  // ── Unlock agent ──────────────────────────────────────────────────────────
  const unlockAgent = useCallback(
    (agentId: AgentId): boolean => {
      const cost = AGENT_UNLOCK_COST[agentId];
      if (!cost) return false;

      let success = false;
      setFunds((prev) => {
        if (prev < cost) return prev;
        success = true;
        return prev - cost;
      });

      if (success) {
        setLockedAgents((prev) => prev.filter((id) => id !== agentId));
        pushEvent({
          id: `unlock-${agentId}-${Date.now()}`,
          type: "policy_response",
          agentId,
          agentName: agentId.toUpperCase(),
          message: `${agentId.toUpperCase()} has joined the investigation. (−${cost?.toLocaleString()}₡)`,
          phase: stageRef.current,
          round: cycleRef.current,
          maxRounds: 99,
          timestamp: Date.now(),
        });
      }

      return success;
    },
    [pushEvent],
  );

  const registerRecruitedAgent = useCallback(
    (agentId: AgentId, recruitedName?: string) => {
      let unlocked = false;
      setLockedAgents((prev) => {
        if (!prev.includes(agentId)) return prev;
        unlocked = true;
        return prev.filter((id) => id !== agentId);
      });

      if (!unlocked) return;

      pushEvent({
        id: `recruit-${agentId}-${Date.now()}`,
        type: "policy_response",
        agentId,
        agentName: recruitedName ?? agentId.toUpperCase(),
        message: `${recruitedName ?? agentId.toUpperCase()} joined the live response roster.`,
        phase: stageRef.current,
        round: cycleRef.current,
        maxRounds: 99,
        timestamp: Date.now(),
        data: { recruited: true, agentId },
      });
    },
    [pushEvent],
  );

  // ── Internal: run a FAILURE task (wrong agent or unresolvable instruction) ──
  // biome-ignore lint/correctness/useExhaustiveDependencies: task execution intentionally reads stable helper/case refs without recreating the callback every render.
  const runFailure = useCallback(
    (
      agentId: AgentId,
      nodeId: string,
      rawInstruction: string,
      reason: string,
      failureType: "wrong_agent" | "unresolvable",
    ) => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      const node = systemNodesRef.current.find((n) => n.id === nodeId);
      if (!agent || !node) return;

      cycleRef.current += 1;
      const cycle = cycleRef.current;
      setCurrentCycle(cycle);

      const taskId = `fail-${agentId}-${Date.now()}`;

      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, status: "moving", currentTaskId: taskId }
            : a,
        ),
      );

      const commentaryKey: CommentaryKey =
        failureType === "wrong_agent" ? "wrong_agent" : "failure";
      const commentary = getCommentary(agentId, commentaryKey);

      pushEvent({
        id: `${taskId}-deploy`,
        type: "reaction",
        agentId,
        agentName: agent.name,
        message: `Deploying to ${node.name} — "${rawInstruction}"`,
        phase: stageRef.current,
        round: cycle,
        maxRounds: 99,
        timestamp: Date.now(),
        data: { nodeId, failure: true },
      });

      getBridge().then(({ eventBridge }) => {
        eventBridge.emitNPCMove(agentId, node.tileX, node.tileY);
      });

      const t1 = setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId ? { ...a, status: "executing" } : a,
          ),
        );

        const t2 = setTimeout(() => {
          // Failure result event
          pushEvent({
            id: `${taskId}-fail`,
            type: "layoff", // red color in EventFeed
            agentId,
            agentName: agent.name,
            message:
              failureType === "wrong_agent"
                ? `WRONG AGENT — ${reason} — ${commentary}`
                : `FAILED — ${reason} — ${commentary}`,
            phase: stageRef.current,
            round: cycle,
            maxRounds: 99,
            timestamp: Date.now(),
            data: { nodeId, failure: true, failureType, reason },
          });

          // Pressure rises slightly (time wasted)
          setPressureLevel((p) => Math.min(10, p + 0.5));

          // Small funds penalty
          setFunds((prev) => Math.max(0, prev - 50));

          setAgents((prev) =>
            prev.map((a) =>
              a.id === agentId
                ? { ...a, status: "idle", currentTaskId: undefined }
                : a,
            ),
          );
        }, getExecuteDuration(activeHelpers[agentId]));

        timeoutsRef.current.push(t2);
      }, MOVE_DURATION * 0.6);

      timeoutsRef.current.push(t1);
    },
    [pushEvent],
  );

  // ── Internal: run a VALID task ────────────────────────────────────────────
  // biome-ignore lint/correctness/useExhaustiveDependencies: task execution intentionally reads stable helper/case refs without recreating the callback every render.
  const runTask = useCallback(
    (
      agentId: AgentId,
      nodeId: string,
      taskType: TaskType,
      rawInstruction: string,
    ) => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      const node = systemNodesRef.current.find((n) => n.id === nodeId);
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

      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? {
                ...a,
                status: "moving",
                currentTaskId: taskId,
                currentNodeId: nodeId,
              }
            : a,
        ),
      );
      setActiveTasks((prev) => [...prev, task]);

      getBridge().then(({ eventBridge }) => {
        eventBridge.emitNPCMove(agentId, node.tileX, node.tileY);
      });

      pushEvent({
        id: `${taskId}-move`,
        type: "reaction",
        agentId,
        agentName: agent.name,
        message: `Moving to ${node.name} — "${rawInstruction}"`,
        phase: stageRef.current,
        round: cycle,
        maxRounds: 99,
        timestamp: Date.now(),
        data: { nodeId, taskType },
      });

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
          message: `Executing at ${node.name}...`,
          phase: stageRef.current,
          round: cycle,
          maxRounds: 99,
          timestamp: Date.now(),
          data: { nodeId, taskType },
        });

        const t2 = setTimeout(() => {
          // Look up pre-written result; apply helper accuracy scaling
          const key = `${nodeId}:${taskType}`;
          const template = caseConfig.taskResults[key] ?? {
            ...caseConfig.fallbackResult,
            nodeId,
            nodeName: node.name,
            taskType,
          };
          const evidenceKey = buildEvidenceKey(nodeId, taskType);
          const findingId = buildFindingId({
            evidenceKey,
            nodeId,
            taskType,
            summary: template.summary,
          });
          const rawResult: AgentResult = {
            ...template,
            findingId,
            evidenceKey,
            source: "local_task",
            agentId,
            agentName: agent.name,
          };
          const result = applyHelperAccuracy(rawResult, activeHelpers[agentId]);
          const isRepeatFinding = findingsRef.current.some(
            (finding) => finding.findingId === result.findingId,
          );

          // Update node with finding reference
          setSystemNodes((prev) =>
            prev.map((n) =>
              n.id === nodeId
                ? {
                    ...n,
                    knownFindings: n.knownFindings.includes(result.findingId)
                      ? n.knownFindings
                      : [...n.knownFindings, result.findingId],
                  }
                : n,
            ),
          );

          // Update agent NPC position in graph
          setGraphData((prev) => ({
            ...prev,
            npcs: prev.npcs.map((npc) =>
              npc.id === agentId
                ? { ...npc, x: node.tileX, y: node.tileY }
                : npc,
            ),
            version: prev.version + 1,
          }));

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
            const next = prev.some(
              (finding) => finding.findingId === result.findingId,
            )
              ? prev
              : [...prev, result];
            findingsRef.current = next;

            // Update metrics
            const newMetrics = computeMetrics(next);
            setMetrics(newMetrics);
            setMetricsHistory((h) => [...h, newMetrics].slice(-30));

            // Stage advancement
            const critCount = next.filter(
              (f) => f.severity === "critical",
            ).length;
            if (critCount >= 6) {
              setStage(3);
              stageRef.current = 3;
            } else if (critCount >= 3) {
              setStage(2);
              stageRef.current = 2;
            }

            return next;
          });

          // Earn funds for finding
          const earned = FUNDS_PER_SEVERITY[result.severity] ?? 100;
          setFunds((prev) => prev + earned);

          // Agent personality commentary
          const severityKey = result.severity as CommentaryKey;
          const commentary = getCommentary(agentId, severityKey);

          // Push finding to evidence feed
          pushEvent({
            id: `${taskId}-result`,
            type:
              result.severity === "critical"
                ? "protest"
                : result.severity === "high"
                  ? "strike"
                  : result.isRedHerring
                    ? "price_change"
                    : "reaction",
            agentId,
            agentName: agent.name,
            message: result.summary,
            phase: stageRef.current,
            round: cycle,
            maxRounds: 99,
            timestamp: Date.now(),
            data: {
              nodeId,
              taskType,
              findingId: result.findingId,
              evidenceKey: result.evidenceKey,
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
              agentId,
              agentName: agent.name,
              message: `"${commentary}"`,
              phase: stageRef.current,
              round: cycle,
              maxRounds: 99,
              timestamp: Date.now() + 1,
              data: { commentary: true },
            });
          }

          // Funds earned notification
          pushEvent({
            id: `${taskId}-funds`,
            type: "policy_response",
            agentId: "system",
            agentName: "SYSTEM",
            message: `+${earned}₡ earned for ${result.severity} finding`,
            phase: stageRef.current,
            round: cycle,
            maxRounds: 99,
            timestamp: Date.now() + 2,
            data: { funds: earned },
          });

          const t3 = setTimeout(() => {
            setAgents((prev) =>
              prev.map((a) =>
                a.id === agentId
                  ? { ...a, status: "idle", currentTaskId: undefined }
                  : a,
              ),
            );
          }, REPORT_DURATION);
          timeoutsRef.current.push(t3);

          if (!isRepeatFinding) {
            syncNipsFinding({
              finding_id: result.findingId,
              evidence_key: result.evidenceKey,
              node_id: result.nodeId,
              task_type: result.taskType,
              summary: result.summary,
              details: result.details,
              severity: result.severity,
              evidence_type: result.evidenceType,
              confidence: result.confidence,
              tags: result.tags,
              agent_id: NIPS_ARCHETYPE_BY_AGENT_ID[agentId],
              agent_name: agent.name,
            });
          }
        }, getExecuteDuration(activeHelpers[agentId]));
        timeoutsRef.current.push(t2);
      }, MOVE_DURATION);
      timeoutsRef.current.push(t1);
    },
    [pushEvent],
  );

  // ── Public: submit natural-language instruction ───────────────────────────
  const submitInstruction = useCallback(
    (agentId: AgentId, nodeId: string, rawInstruction: string) => {
      const agent = agentsRef.current.find((a) => a.id === agentId);
      const node = systemNodesRef.current.find((n) => n.id === nodeId);
      if (!agent || !node || agent.status !== "idle") return;

      const resolved = resolveIntent(rawInstruction);

      // Case 1: instruction cannot be resolved at all
      if (!resolved.taskType) {
        runFailure(
          agentId,
          nodeId,
          rawInstruction,
          resolved.failReason ?? "Instruction unclear.",
          "unresolvable",
        );
        return;
      }

      // Case 2: wrong specialist
      if (!agent.capabilities.includes(resolved.taskType)) {
        const neededAgent = getCapableAgent(resolved.taskType);
        runFailure(
          agentId,
          nodeId,
          rawInstruction,
          `"${resolved.interpretation}" requires ${neededAgent}.`,
          "wrong_agent",
        );
        return;
      }

      // Case 3: valid — execute
      runTask(agentId, nodeId, resolved.taskType, rawInstruction);
    },
    [runFailure, runTask],
  );

  const resolveIssueForAgent = useCallback(
    (issueId: string, agentId: AgentId) => {
      resolveNipsIssue({
        issue_id: issueId,
        agent_archetype: NIPS_ARCHETYPE_BY_AGENT_ID[agentId],
      });
    },
    [],
  );

  const submitFinalReportAction = useCallback(
    (report: FinalReportSubmission) => {
      submitNipsFinalReport(report);
    },
    [],
  );

  return {
    activeHelpers,
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
    registerRecruitedAgent,
    pressureLevel,
    threatState,
    caseState,
    issues,
    finalPhaseReady,
    finalEvaluation,
    graphData,
    stage,
    currentCycle,
    isComplete,
    caseId: caseConfig.meta.id,
    caseName: caseConfig.meta.name,
    incidentBrief: caseConfig.meta.brief,
    objective: caseConfig.meta.objective,
    resolveIssue: resolveIssueForAgent,
    submitFinalReport: submitFinalReportAction,
    addExternalEvidence: (
      eu: NipsEvidenceUpdate,
      roster: NipsAgentInstance[] = [],
    ) => {
      const taskType = inferTaskTypeFromEvidenceUpdate(eu);
      const stableSeed = buildStableFindingSeed({
        nodeId: eu.node_id,
        summary: eu.summary,
        tags: eu.tags,
      });
      const evidenceKey =
        eu.evidence_key ??
        buildEvidenceKey(eu.node_id, taskType, eu.finding_id ?? stableSeed);
      const findingId = buildFindingId({
        findingId: eu.finding_id,
        evidenceKey,
        nodeId: eu.node_id,
        taskType,
        summary: eu.summary,
      });

      const result: AgentResult = {
        findingId,
        evidenceKey,
        source: "nips_chat",
        agentId: resolveAgentIdFromEvidence(eu, roster),
        agentName: eu.agent_display_name,
        nodeId: eu.node_id,
        nodeName:
          caseConfig.nodes.find((n) => n.id === eu.node_id)?.name || eu.node_id,
        taskType,
        summary: eu.summary,
        details: eu.details,
        confidence: eu.confidence,
        severity: eu.severity,
        evidenceType: resolveArtifactType(eu.evidence_type),
        tags: eu.tags,
        isRedHerring: eu.is_false_positive,
      };

      setSystemNodes((prev) =>
        prev.map((node) =>
          node.id === eu.node_id
            ? {
                ...node,
                knownFindings: node.knownFindings.includes(findingId)
                  ? node.knownFindings
                  : [...node.knownFindings, findingId],
              }
            : node,
        ),
      );

      setCompletedFindings((prev) => {
        const next = prev.some((finding) => finding.findingId === findingId)
          ? prev
          : [...prev, result];
        findingsRef.current = next;
        const newMetrics = computeMetrics(next);
        setMetrics(newMetrics);
        setMetricsHistory((history) => [...history, newMetrics].slice(-30));
        return next;
      });

      const newEvent: SimEvent = {
        id: `ev-nips-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: "reaction", // Use reaction type for findings
        agentId: result.agentId,
        agentName: eu.agent_display_name,
        agentCategory: eu.evidence_type.split("_")[0].toUpperCase(),
        message: eu.summary,
        phase: stage,
        round: currentCycle,
        maxRounds: caseConfig.meta.maxCycles ?? 10,
        timestamp: Date.now(),
        data: {
          nips: true,
          severity: eu.severity,
          nodeId: eu.node_id,
          findingId,
          evidenceKey,
        },
      };
      setEvents((prev) =>
        prev.some(
          (event) =>
            event.data &&
            (event.data as { findingId?: string }).findingId === findingId,
        )
          ? prev
          : [...prev, newEvent],
      );

      const reward =
        eu.severity === "critical" ? 800 : eu.severity === "high" ? 400 : 200;
      setFunds((f) => f + reward);
    },
  };
}
