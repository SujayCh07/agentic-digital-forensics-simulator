import type {
  AgentId,
  AttackType,
  IssueStatus,
  MitigationPlanOption,
} from "@/types/investigation";

export interface TutorialGuidedAction {
  id: string;
  nodeId: string;
  agentId: AgentId;
  label: string;
  detail: string;
  instruction: string;
}

export interface TutorialFinalReportDraft {
  originNodeId: string;
  attackPath: string[];
  attackType: AttackType | null;
  mitigationPlan: MitigationPlanOption[];
}

export type TutorialPlacement = "top" | "right" | "bottom" | "left" | "center";

export type TutorialCompletionRule =
  | { type: "manual" }
  | { type: "selected_node"; nodeId: string }
  | { type: "finding"; evidenceKey: string }
  | { type: "issue_resolved"; issueId: string }
  | { type: "final_report_open" }
  | { type: "final_phase_ready" }
  | { type: "final_report_origin"; nodeId: string }
  | { type: "attack_path_prefix"; path: string[] }
  | { type: "attack_type"; attackType: AttackType }
  | { type: "mitigation_selected"; mitigation: MitigationPlanOption }
  | { type: "evaluation_passed" };

export interface TutorialStep {
  id: string;
  title: string;
  body: string;
  why: string;
  targetId: string | null;
  placement: TutorialPlacement;
  completion: TutorialCompletionRule;
  blockerHint?: string;
  continueLabel?: string;
  highlightPadding?: number;
}

export interface TutorialRuntimeState {
  selectedNodeId: string | null;
  findingKeys: Set<string>;
  issueStatusById: Record<string, IssueStatus | undefined>;
  finalPhaseReady: boolean;
  finalReportOpen: boolean;
  finalEvaluationPassed: boolean;
  finalReportDraft: TutorialFinalReportDraft;
}
