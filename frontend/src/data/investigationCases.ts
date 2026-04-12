import {
  TUTORIAL_CASE_AGENTS_NPCS,
  TUTORIAL_CASE_META,
  TUTORIAL_CASE_NODES,
  TUTORIAL_CASE_RELATIONSHIPS,
  TUTORIAL_FALLBACK_RESULT,
  TUTORIAL_INITIAL_AGENTS,
  TUTORIAL_PRESSURE_MILESTONES,
  TUTORIAL_TASK_RESULTS,
} from "./case_guided_tutorial";
import {
  CASE_AGENTS_NPCS,
  CASE_META,
  CASE_NODES,
  CASE_RELATIONSHIPS,
  FALLBACK_RESULT,
  INITIAL_AGENTS,
  TASK_RESULTS,
} from "./case_midnight_exfil";
import type { InvestigationCaseConfig } from "./investigationCaseTypes";

export const MIDNIGHT_EXFIL_CASE: InvestigationCaseConfig = {
  meta: CASE_META,
  nodes: CASE_NODES,
  agentsNpcs: CASE_AGENTS_NPCS,
  initialAgents: INITIAL_AGENTS,
  relationships: CASE_RELATIONSHIPS,
  taskResults: TASK_RESULTS,
  fallbackResult: FALLBACK_RESULT,
  backendCaseId: CASE_META.id,
  pressureEnabled: true,
  pressureMilestones: [
    {
      level: 3,
      nodeId: "EXT-01",
      status: "suspicious",
      threatLevel: 0.35,
      message: "INCIDENT ESCALATION — External activity detected",
    },
    {
      level: 5,
      nodeId: "BACKUP-01",
      status: "compromised",
      threatLevel: 0.88,
      message: "INCIDENT ESCALATION — Backup system now compromised",
    },
    {
      level: 8,
      nodeId: "GW-01",
      status: "compromised",
      threatLevel: 0.95,
      message: "CRITICAL ESCALATION — Active exfiltration in progress",
    },
  ],
};

export const GUIDED_TUTORIAL_CASE: InvestigationCaseConfig = {
  meta: TUTORIAL_CASE_META,
  nodes: TUTORIAL_CASE_NODES,
  agentsNpcs: TUTORIAL_CASE_AGENTS_NPCS,
  initialAgents: TUTORIAL_INITIAL_AGENTS,
  relationships: TUTORIAL_CASE_RELATIONSHIPS,
  taskResults: TUTORIAL_TASK_RESULTS,
  fallbackResult: TUTORIAL_FALLBACK_RESULT,
  backendCaseId: TUTORIAL_CASE_META.id,
  initialLockedAgents: [],
  startingFunds: 2500,
  pressureEnabled: false,
  pressureMilestones: TUTORIAL_PRESSURE_MILESTONES,
};

export const INVESTIGATION_CASES = {
  [MIDNIGHT_EXFIL_CASE.meta.id]: MIDNIGHT_EXFIL_CASE,
  [GUIDED_TUTORIAL_CASE.meta.id]: GUIDED_TUTORIAL_CASE,
} satisfies Record<string, InvestigationCaseConfig>;

export function getInvestigationCase(caseId: string): InvestigationCaseConfig {
  return INVESTIGATION_CASES[caseId] ?? MIDNIGHT_EXFIL_CASE;
}
