import { API_BASE } from "@/lib/apiBase";
import type {
  InvestigationAgentChatRequest,
  InvestigationAgentChatResponse,
  InvestigationTaskCompletionRequest,
  InvestigationTaskDispatch,
} from "@/types/investigation";

interface BackendChatResponse {
  reply: string;
  interaction_id?: string | null;
  dispatched_task?: {
    task_type: InvestigationTaskDispatch["taskType"];
    objective: string;
    rationale: string;
    confidence: number;
  } | null;
  refusal_reason?: string | null;
}

interface BackendTaskCompletionResponse {
  summary: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  evidence_type: "log" | "network" | "artifact" | "timeline";
}

function mapError(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  return fallback;
}

export async function chatWithInvestigationAgent(
  request: InvestigationAgentChatRequest,
): Promise<InvestigationAgentChatResponse> {
  const response = await fetch(`${API_BASE}/investigation/agents/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: request.agentId,
      message: request.message,
      previous_interaction_id: request.previousInteractionId ?? null,
      current_objective: request.currentObjective,
      agent_status: request.agentStatus,
      selected_node: request.selectedNode
        ? {
            id: request.selectedNode.id,
            name: request.selectedNode.name,
            type: request.selectedNode.type,
            threat_level: request.selectedNode.threatLevel,
            known_findings: request.selectedNode.knownFindings.map(
              (finding) => ({
                node_id: finding.nodeId,
                summary: finding.summary,
                confidence: finding.confidence,
                severity: finding.severity,
                evidence_type: finding.evidenceType,
              }),
            ),
          }
        : null,
      completed_findings: request.completedFindings.map((finding) => ({
        node_id: finding.nodeId,
        summary: finding.summary,
        confidence: finding.confidence,
        severity: finding.severity,
        evidence_type: finding.evidenceType,
      })),
      recent_events: request.recentEvents.map((event) => ({
        id: event.id,
        type: event.type,
        agent_name: event.agentName,
        message: event.message,
        round: event.round,
      })),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      detail?: string;
    };
    throw new Error(mapError(payload.detail, "Agent chat request failed."));
  }

  const payload = (await response.json()) as BackendChatResponse;
  return {
    reply: payload.reply,
    interactionId: payload.interaction_id ?? null,
    dispatchedTask: payload.dispatched_task
      ? {
          taskType: payload.dispatched_task.task_type,
          objective: payload.dispatched_task.objective,
          rationale: payload.dispatched_task.rationale,
          confidence: payload.dispatched_task.confidence,
        }
      : null,
    refusalReason: payload.refusal_reason ?? null,
  };
}

export async function completeInvestigationTask(
  request: InvestigationTaskCompletionRequest,
) {
  const response = await fetch(
    `${API_BASE}/investigation/agents/complete-task`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: request.agentId,
        task_type: request.taskType,
        task_objective: request.taskObjective,
        current_objective: request.currentObjective,
        selected_node: {
          id: request.selectedNode.id,
          name: request.selectedNode.name,
          type: request.selectedNode.type,
          threat_level: request.selectedNode.threatLevel,
          known_findings: request.selectedNode.knownFindings.map((finding) => ({
            node_id: finding.nodeId,
            summary: finding.summary,
            confidence: finding.confidence,
            severity: finding.severity,
            evidence_type: finding.evidenceType,
          })),
        },
        completed_findings: request.completedFindings.map((finding) => ({
          node_id: finding.nodeId,
          summary: finding.summary,
          confidence: finding.confidence,
          severity: finding.severity,
          evidence_type: finding.evidenceType,
        })),
        recent_events: request.recentEvents.map((event) => ({
          id: event.id,
          type: event.type,
          agent_name: event.agentName,
          message: event.message,
          round: event.round,
        })),
      }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      detail?: string;
    };
    throw new Error(
      mapError(payload.detail, "Task completion request failed."),
    );
  }

  const payload = (await response.json()) as BackendTaskCompletionResponse;
  return {
    summary: payload.summary,
    confidence: payload.confidence,
    severity: payload.severity,
    evidenceType: payload.evidence_type,
  };
}
