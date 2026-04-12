"""Deterministic NIPS case progression logic."""

from __future__ import annotations

import time

from nips.case_bundle import get_case_bundle
from nips.models import (
    CaseBundle,
    CaseState,
    FinalEvaluation,
    FinalEvaluationEnvelope,
    FinalFeedback,
    FinalReportSubmission,
    IssueDefinition,
    IssueFailureReason,
    IssueResolutionRequest,
    IssueResolutionResult,
    IssueState,
    NipsSession,
    SyncedFinding,
    ThreatState,
)

FUNDS_PER_SEVERITY = {
    "critical": 500,
    "high": 300,
    "medium": 200,
    "low": 100,
}


def _issue_lookup(bundle: CaseBundle) -> dict[str, IssueDefinition]:
    return {issue.id: issue for issue in bundle.issues}


def _dependency_lookup(bundle: CaseBundle) -> dict[str, list[str]]:
    dependencies: dict[str, list[str]] = {issue.id: [] for issue in bundle.issues}
    for issue in bundle.issues:
        for unlocked in issue.unlocks_issue_ids:
            dependencies.setdefault(unlocked, []).append(issue.id)
    return dependencies


def initialize_issue_states(case_id: str) -> dict[str, IssueState]:
    bundle = get_case_bundle(case_id)
    return {
        issue.id: IssueState(
            issue_id=issue.id,
            status="locked",
            available=False,
            attempts=0,
            missing_evidence=list(issue.required_evidence),
        )
        for issue in bundle.issues
    }


def initial_threat_state(case_id: str) -> ThreatState:
    bundle = get_case_bundle(case_id)
    node_threats = {node.id: node.threat_level for node in bundle.nodes}
    spread_level = round(sum(node_threats.values()) / max(1, len(node_threats)), 3)
    return ThreatState(
        spread_level=spread_level,
        case_confidence=0.0,
        node_threats=node_threats,
        stabilized_node_ids=[],
    )


def synced_finding_keys(session: NipsSession) -> set[str]:
    return {finding.evidence_key for finding in session.synced_findings}


def synced_finding_tags(session: NipsSession) -> set[str]:
    return {tag for finding in session.synced_findings for tag in finding.tags}


def sync_finding(session: NipsSession, finding: SyncedFinding) -> tuple[SyncedFinding | None, list[str]]:
    if any(
        existing.finding_id == finding.finding_id or existing.evidence_key == finding.evidence_key
        for existing in session.synced_findings
    ):
        refreshed = refresh_issue_states(session)
        return None, refreshed

    session.synced_findings.append(finding)
    session.funds += FUNDS_PER_SEVERITY.get(finding.severity, 100)

    confidence_gain = 0.02
    if {"origin", "patient_zero"} & set(finding.tags):
        confidence_gain = 0.05
    elif {"pivot_node", "source_code", "staging_file", "exfiltration"} & set(finding.tags):
        confidence_gain = 0.04

    session.case_confidence = min(1.0, session.case_confidence + confidence_gain)
    session.threat_state.case_confidence = session.case_confidence
    refreshed = refresh_issue_states(session)
    session.final_phase_ready = compute_final_phase_ready(session)
    return finding, refreshed


def refresh_issue_states(session: NipsSession) -> list[str]:
    bundle = get_case_bundle(session.case_id)
    dependencies = _dependency_lookup(bundle)
    found_keys = synced_finding_keys(session)
    newly_available: list[str] = []
    now = time.time()

    for issue in bundle.issues:
        state = session.issue_states.setdefault(issue.id, IssueState(issue_id=issue.id))
        missing = [key for key in issue.required_evidence if key not in found_keys]
        dependency_ids = dependencies.get(issue.id, [])
        dependency_titles = [
            dep_id for dep_id in dependency_ids
            if session.issue_states.get(dep_id, IssueState(issue_id=dep_id)).status != "resolved"
        ]
        available = not missing and not dependency_titles

        state.missing_evidence = missing
        if state.status == "resolved":
            state.available = True
            continue

        if available:
            if not state.available and state.unlocked_at is None:
                state.unlocked_at = now
                newly_available.append(issue.id)
            state.available = True
            state.status = "available"
            state.feedback_message = None
        else:
            state.available = False
            if state.status != "failed_attempt":
                state.status = "locked"
            if missing:
                state.feedback_message = (
                    "More corroboration is needed before this response is safe: "
                    + ", ".join(missing)
                )
            elif dependency_titles:
                state.feedback_message = (
                    "The current timeline does not support this step yet. Resolve the upstream incident chain first."
                )

    return newly_available


def _failure_result(
    session: NipsSession,
    issue: IssueDefinition,
    state: IssueState,
    *,
    reason: IssueFailureReason,
    message: str,
) -> IssueResolutionResult:
    state.attempts += 1
    state.status = "failed_attempt"
    state.last_failure_reason = reason
    state.feedback_message = message
    session.final_phase_ready = compute_final_phase_ready(session)
    return IssueResolutionResult(
        issue_id=issue.id,
        building_id=issue.building_id,
        sector_id=issue.sector_id,
        success=False,
        status=state.status,
        reason=reason,
        message=message,
        unlocked_issue_ids=[],
        revealed_evidence_keys=[],
        threat_delta=0.0,
        case_confidence_delta=0.0,
        final_phase_ready=session.final_phase_ready,
    )


def resolve_issue(session: NipsSession, request: IssueResolutionRequest) -> IssueResolutionResult:
    bundle = get_case_bundle(session.case_id)
    issues = _issue_lookup(bundle)
    issue = issues[request.issue_id]
    refresh_issue_states(session)
    state = session.issue_states[issue.id]

    if state.status == "resolved":
        return IssueResolutionResult(
            issue_id=issue.id,
            building_id=issue.building_id,
            sector_id=issue.sector_id,
            success=True,
            status="resolved",
            message="This issue has already been resolved and the node remains stabilized.",
            unlocked_issue_ids=[],
            revealed_evidence_keys=issue.reveals_evidence_keys,
            threat_delta=0.0,
            case_confidence_delta=0.0,
            final_phase_ready=session.final_phase_ready,
        )

    if not state.available:
        reason = "insufficient_evidence" if state.missing_evidence else "timeline_conflict"
        if state.missing_evidence:
            message = (
                "This fix is premature. The team still needs corroborating evidence from "
                + ", ".join(state.missing_evidence)
                + "."
            )
        else:
            message = (
                "The current evidence sequence does not support this action yet. The attack chain still has unresolved upstream gaps."
            )
        return _failure_result(session, issue, state, reason=reason, message=message)

    if request.agent_archetype != issue.required_agent:
        return _failure_result(
            session,
            issue,
            state,
            reason="wrong_agent",
            message=(
                f"{issue.required_agent} is the right specialist for this task. "
                f"{request.agent_archetype} can investigate around it, but cannot safely close it."
            ),
        )

    found_tags = synced_finding_tags(session)
    if issue.contradictory_tags and found_tags.intersection(issue.contradictory_tags):
        return _failure_result(
            session,
            issue,
            state,
            reason="contradicted_by_findings",
            message="Current findings contradict this containment step. Recheck the most recent anomaly chain before forcing a resolution.",
        )

    state.attempts += 1
    state.status = "resolved"
    state.available = True
    state.resolved_at = time.time()
    state.resolved_by = request.agent_archetype
    state.last_failure_reason = None
    state.feedback_message = "Resolution confirmed. The node is stabilizing."

    current_threat = session.threat_state.node_threats.get(issue.building_id, 0.0)
    session.threat_state.node_threats[issue.building_id] = max(
        0.0,
        round(current_threat - issue.spread_reduction, 3),
    )
    session.threat_state.spread_level = max(
        0.0,
        round(session.threat_state.spread_level - issue.spread_reduction, 3),
    )
    if issue.building_id not in session.threat_state.stabilized_node_ids:
        session.threat_state.stabilized_node_ids.append(issue.building_id)

    session.case_confidence = min(1.0, round(session.case_confidence + issue.confidence_delta, 3))
    session.threat_state.case_confidence = session.case_confidence

    newly_available = refresh_issue_states(session)
    session.final_phase_ready = compute_final_phase_ready(session)

    return IssueResolutionResult(
        issue_id=issue.id,
        building_id=issue.building_id,
        sector_id=issue.sector_id,
        success=True,
        status="resolved",
        message="Resolution accepted. Threat spread has been reduced and the forensic chain is clearer.",
        unlocked_issue_ids=[issue_id for issue_id in issue.unlocks_issue_ids if issue_id in newly_available],
        revealed_evidence_keys=issue.reveals_evidence_keys,
        threat_delta=issue.spread_reduction,
        case_confidence_delta=issue.confidence_delta,
        final_phase_ready=session.final_phase_ready,
    )


def compute_final_phase_ready(session: NipsSession) -> bool:
    required_issue = session.issue_states.get("gw01_block_egress")
    if not required_issue or required_issue.status != "resolved":
        return False

    tags = synced_finding_tags(session)
    has_origin = bool({"origin", "patient_zero"} & tags)
    has_pivot = "pivot_node" in tags
    has_staging = bool({"source_code", "staging_file", "staging_relay"} & tags)
    has_exfil = "exfiltration" in tags
    return has_origin and has_pivot and has_staging and has_exfil


def build_case_state(session: NipsSession) -> CaseState:
    bundle = get_case_bundle(session.case_id)
    issues_payload: list[dict[str, object]] = []
    for issue in bundle.issues:
        state = session.issue_states.setdefault(issue.id, IssueState(issue_id=issue.id))
        issues_payload.append(
            {
                "id": issue.id,
                "building_id": issue.building_id,
                "sector_id": issue.sector_id,
                "type": issue.type,
                "title": issue.title,
                "description": issue.description,
                "required_evidence": issue.required_evidence,
                "optional_evidence": issue.optional_evidence,
                "required_agent": issue.required_agent,
                "unlocks_issue_ids": issue.unlocks_issue_ids,
                "status": state.status,
                "attempts": state.attempts,
                "available": state.available,
                "missing_evidence": state.missing_evidence,
                "last_failure_reason": state.last_failure_reason,
                "feedback_message": state.feedback_message,
            }
        )

    latest_feedback = session.evaluation_history[-1].feedback if session.evaluation_history else None
    return CaseState(
        case_id=session.case_id,
        funds=session.funds,
        issues=issues_payload,
        resolved_issue_count=sum(1 for state in session.issue_states.values() if state.status == "resolved"),
        final_phase_ready=session.final_phase_ready,
        threat_state=session.threat_state,
        synced_finding_ids=[finding.finding_id for finding in session.synced_findings],
        synced_evidence_keys=[finding.evidence_key for finding in session.synced_findings],
        latest_feedback=latest_feedback,
    )


def _mitigation_accuracy(submission: FinalReportSubmission, bundle: CaseBundle) -> float:
    required = set(bundle.final_truth.required_mitigations)
    submitted = set(submission.mitigation_plan)
    core_hits = len(required.intersection(submitted))
    accuracy = core_hits / max(1, len(required))

    bonus = 0.0
    if "isolate_system" in submitted:
        bonus += 0.5 / max(1, len(required))
    if "restore_backups" in submitted:
        bonus += 0.25 / max(1, len(required))

    if core_hits < len(required):
        accuracy = min(0.95, accuracy + bonus)
    else:
        accuracy = 1.0
    return round(min(1.0, accuracy), 3)


def _path_accuracy(submitted_path: list[str], truth_path: list[str]) -> float:
    truth_edges = list(zip(truth_path, truth_path[1:]))
    submitted_edges = set(zip(submitted_path, submitted_path[1:]))
    matched = sum(1 for edge in truth_edges if edge in submitted_edges)
    return round(matched / max(1, len(truth_edges)), 3)


def evaluate_final_report(
    session: NipsSession,
    submission: FinalReportSubmission,
) -> FinalEvaluationEnvelope:
    bundle = get_case_bundle(session.case_id)
    truth = bundle.final_truth
    session.final_reports.append(submission)

    origin_correct = submission.origin_node_id == truth.origin_node_id
    path_accuracy = _path_accuracy(submission.attack_path, truth.attack_path)
    attack_type_correct = submission.attack_type == truth.attack_type
    mitigation_accuracy = _mitigation_accuracy(submission, bundle)
    fix_correct = mitigation_accuracy >= 0.999
    score = round(
        (25.0 if origin_correct else 0.0)
        + (35.0 * path_accuracy)
        + (15.0 if attack_type_correct else 0.0)
        + (25.0 * mitigation_accuracy),
        2,
    )
    passed = score >= 70.0 and origin_correct and path_accuracy >= 0.6

    evaluation = FinalEvaluation(
        origin_correct=origin_correct,
        path_accuracy=path_accuracy,
        attack_type_correct=attack_type_correct,
        fix_correct=fix_correct,
        score=score,
        passed=passed,
        mitigation_accuracy=mitigation_accuracy,
    )

    incorrect_assumptions: list[str] = []
    misleading_evidence: list[str] = []
    missing_connections: list[str] = []
    suggested_recheck_targets: list[str] = []

    if not origin_correct:
        incorrect_assumptions.append(
            "The workstation origin evidence was under-weighted. WKS-03 is where the credential chain begins."
        )
        suggested_recheck_targets.extend(["WKS-03", "MAIL-01"])

    if path_accuracy < 1.0:
        truth_edges = list(zip(truth.attack_path, truth.attack_path[1:]))
        submitted_edges = set(zip(submission.attack_path, submission.attack_path[1:]))
        for source, target in truth_edges:
            if (source, target) not in submitted_edges:
                missing_connections.append(
                    f"You missed the confirmed handoff between {source} and {target}."
                )
        if "BACKUP-01" not in submission.attack_path:
            misleading_evidence.append(
                "Gateway telemetry alone does not explain the transfer size. BACKUP-01 carried the staging relay before egress."
            )
            suggested_recheck_targets.append("BACKUP-01")
        if "EXT-01" in submission.attack_path and "BACKUP-01" not in submission.attack_path:
            misleading_evidence.append(
                "EXT-01 can pull attention because the external endpoint is noisy, but it is not enough to skip the internal staging chain."
            )

    if not attack_type_correct:
        incorrect_assumptions.append(
            "The evidence points to data exfiltration, not a purely disruptive intrusion or malware-only event."
        )

    if mitigation_accuracy < 1.0:
        incorrect_assumptions.append(
            "The mitigation plan is incomplete. Reset credentials, remove persistence, and block external communication are the core containment steps."
        )

    tags = synced_finding_tags(session)
    if "source_code" not in tags and "staging_file" not in tags:
        missing_connections.append(
            "The source-code staging evidence is still thin. Re-examine DB-02 and BACKUP-01 together."
        )
        suggested_recheck_targets.extend(["DB-02", "BACKUP-01"])
    if "exfiltration" not in tags:
        misleading_evidence.append(
            "No confirmed outbound telemetry supports a final accusation yet. GW-01 still needs direct exfiltration corroboration."
        )
        suggested_recheck_targets.append("GW-01")

    feedback = FinalFeedback(
        incorrect_assumptions=incorrect_assumptions
        or ["The report needs tighter alignment between the evidence chain and the final claim."],
        misleading_evidence=misleading_evidence
        or ["One or more clues were overweighted relative to the full attack path."],
        missing_connections=missing_connections
        or ["At least one edge in the attack path still needs a stronger causal link."],
        suggested_recheck_targets=sorted(set(suggested_recheck_targets or ["WKS-03", "BACKUP-01", "GW-01"])),
    )

    envelope = FinalEvaluationEnvelope(evaluation=evaluation, feedback=feedback)
    session.evaluation_history.append(envelope)
    session.final_phase_ready = compute_final_phase_ready(session)
    return envelope
