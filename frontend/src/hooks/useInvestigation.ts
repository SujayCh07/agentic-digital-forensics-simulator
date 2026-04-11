"use client";

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
  };
}
