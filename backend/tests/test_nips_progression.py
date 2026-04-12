"""Tests for deterministic NIPS midgame/endgame progression."""

from __future__ import annotations

from typing import Literal

from nips.models import FinalReportSubmission, IssueResolutionRequest, SyncedFinding
from nips.progression import build_case_state, evaluate_final_report, resolve_issue, sync_finding
from nips.session import create_session, destroy_session


def _finding(
    *,
    node_id: str,
    evidence_key: str,
    tags: list[str],
    task_type: str | None,
    evidence_type: str = "log_entry",
    severity: Literal["low", "medium", "high", "critical"] = "high",
) -> SyncedFinding:
    return SyncedFinding(
        finding_id=evidence_key,
        evidence_key=evidence_key,
        node_id=node_id,
        task_type=task_type,
        summary=evidence_key,
        details=f"Details for {evidence_key}",
        severity=severity,
        evidence_type=evidence_type,
        confidence=0.9,
        tags=tags,
        agent_id="LOGIS",
        agent_name="LOGIS",
    )


def _prime_case(session_id: str):
    session = create_session(session_id)
    findings = [
        _finding(
            node_id="WKS-03",
            evidence_key="WKS-03:inspect_artifacts",
            task_type="inspect_artifacts",
            evidence_type="steg_payload",
            tags=["credential_dumping", "mimikatz"],
        ),
        _finding(
            node_id="WKS-03",
            evidence_key="WKS-03:trace_lateral_movement",
            task_type="trace_lateral_movement",
            evidence_type="network_packet",
            severity="critical",
            tags=["origin", "patient_zero", "credential_chain"],
        ),
        _finding(
            node_id="MAIL-01",
            evidence_key="MAIL-01:analyze_logs",
            task_type="analyze_logs",
            evidence_type="log_entry",
            tags=["brute_force", "credential_abuse"],
        ),
        _finding(
            node_id="MAIL-01",
            evidence_key="MAIL-01:trace_lateral_movement",
            task_type="trace_lateral_movement",
            evidence_type="network_packet",
            severity="critical",
            tags=["pivot_node", "lateral_movement", "hub"],
        ),
        _finding(
            node_id="DB-02",
            evidence_key="DB-02:analyze_logs",
            task_type="analyze_logs",
            evidence_type="log_entry",
            severity="critical",
            tags=["data_exfiltration", "database_dump", "source_code"],
        ),
        _finding(
            node_id="DB-02",
            evidence_key="DB-02:trace_connections",
            task_type="trace_connections",
            evidence_type="network_packet",
            severity="critical",
            tags=["staging", "rsync", "data_movement"],
        ),
        _finding(
            node_id="BACKUP-01",
            evidence_key="BACKUP-01:recover_files",
            task_type="recover_files",
            evidence_type="deleted_file",
            severity="critical",
            tags=["staging_file", "source_code", "file_carving"],
        ),
        _finding(
            node_id="GW-01",
            evidence_key="GW-01:trace_connections",
            task_type="trace_connections",
            evidence_type="network_packet",
            severity="critical",
            tags=["exfiltration", "c2_server", "bulletproof_hosting"],
        ),
        _finding(
            node_id="GW-01",
            evidence_key="GW-01:analyze_logs",
            task_type="analyze_logs",
            evidence_type="log_entry",
            severity="critical",
            tags=["firewall_evasion", "admin_access"],
        ),
    ]
    for finding in findings:
        sync_finding(session, finding)
    return session


def _prime_tutorial_case(session_id: str):
    session = create_session(session_id, "guided_tutorial")
    findings = [
        _finding(
            node_id="WKS-03",
            evidence_key="WKS-03:inspect_artifacts",
            task_type="inspect_artifacts",
            evidence_type="steg_payload",
            severity="critical",
            tags=["credential_dumping", "origin", "patient_zero"],
        ),
        _finding(
            node_id="MAIL-01",
            evidence_key="MAIL-01:analyze_logs",
            task_type="analyze_logs",
            tags=["credential_abuse", "relay_access"],
        ),
        _finding(
            node_id="MAIL-01",
            evidence_key="MAIL-01:trace_lateral_movement",
            task_type="trace_lateral_movement",
            evidence_type="network_packet",
            severity="critical",
            tags=["pivot_node", "lateral_movement", "hub"],
        ),
        _finding(
            node_id="BACKUP-01",
            evidence_key="BACKUP-01:recover_files",
            task_type="recover_files",
            evidence_type="deleted_file",
            severity="critical",
            tags=["source_code", "staging_file", "staging_relay"],
        ),
        _finding(
            node_id="GW-01",
            evidence_key="GW-01:trace_connections",
            task_type="trace_connections",
            evidence_type="network_packet",
            severity="critical",
            tags=["exfiltration", "outbound_transfer"],
        ),
        _finding(
            node_id="GW-01",
            evidence_key="GW-01:analyze_logs",
            task_type="analyze_logs",
            severity="high",
            tags=["firewall_evasion", "egress_path"],
        ),
    ]
    for finding in findings:
        sync_finding(session, finding)
    return session


def test_sync_finding_unlocks_first_issue():
    session = create_session("progression-unlock")
    try:
        starting_funds = session.funds
        _, newly_available = sync_finding(
            session,
            _finding(
                node_id="WKS-03",
                evidence_key="WKS-03:inspect_artifacts",
                task_type="inspect_artifacts",
                evidence_type="steg_payload",
                tags=["credential_dumping"],
            ),
        )

        assert "wks03_credential_source" in newly_available
        case_state = build_case_state(session)
        assert case_state.funds == starting_funds + 300
        issue = next(issue for issue in case_state.issues if issue["id"] == "wks03_credential_source")
        assert issue["status"] == "available"
        assert issue["available"] is True
    finally:
        destroy_session("progression-unlock")


def test_resolve_issue_success_unlocks_ready_follow_up():
    session = create_session("progression-success")
    try:
        for finding in (
            _finding(
                node_id="WKS-03",
                evidence_key="WKS-03:inspect_artifacts",
                task_type="inspect_artifacts",
                evidence_type="steg_payload",
                tags=["credential_dumping"],
            ),
            _finding(
                node_id="MAIL-01",
                evidence_key="MAIL-01:analyze_logs",
                task_type="analyze_logs",
                tags=["brute_force"],
            ),
            _finding(
                node_id="MAIL-01",
                evidence_key="MAIL-01:trace_lateral_movement",
                task_type="trace_lateral_movement",
                evidence_type="network_packet",
                severity="critical",
                tags=["pivot_node", "hub"],
            ),
        ):
            sync_finding(session, finding)

        result = resolve_issue(
            session,
            IssueResolutionRequest(
                issue_id="wks03_credential_source",
                agent_archetype="FILER",
            ),
        )

        assert result.success is True
        assert result.status == "resolved"
        assert "mail01_pivot_containment" in result.unlocked_issue_ids
        assert session.threat_state.node_threats["WKS-03"] < 0.35
    finally:
        destroy_session("progression-success")


def test_resolve_issue_wrong_agent_returns_contextual_failure():
    session = create_session("progression-wrong-agent")
    try:
        sync_finding(
            session,
            _finding(
                node_id="WKS-03",
                evidence_key="WKS-03:inspect_artifacts",
                task_type="inspect_artifacts",
                evidence_type="steg_payload",
                tags=["credential_dumping"],
            ),
        )

        result = resolve_issue(
            session,
            IssueResolutionRequest(
                issue_id="wks03_credential_source",
                agent_archetype="NEXUS",
            ),
        )

        assert result.success is False
        assert result.reason == "wrong_agent"
        assert "FILER" in result.message
    finally:
        destroy_session("progression-wrong-agent")


def test_guided_tutorial_session_starts_with_single_starter_and_deterministic_offers():
    session = create_session(
        "tutorial-starter",
        "guided_tutorial",
        starter_archetype="FILER",
    )
    try:
        assert session.funds == 250
        assert [agent.archetype for agent in session.deployed_agents] == ["FILER"]
        assert [offer.agent.archetype for offer in session.marketplace_offers] == [
            "LOGIS",
            "NEXUS",
            "CHRONO",
        ]
        assert [offer.agent.cost for offer in session.marketplace_offers] == [450, 550, 700]
    finally:
        destroy_session("tutorial-starter")


def test_final_report_success_after_issue_chain():
    session = _prime_case("progression-final-pass")
    try:
        resolve_issue(session, IssueResolutionRequest(issue_id="wks03_credential_source", agent_archetype="FILER"))
        resolve_issue(session, IssueResolutionRequest(issue_id="mail01_pivot_containment", agent_archetype="NEXUS"))
        resolve_issue(session, IssueResolutionRequest(issue_id="db02_dump_window", agent_archetype="CHRONO"))
        resolve_issue(session, IssueResolutionRequest(issue_id="backup01_staging_relay", agent_archetype="FILER"))
        resolve_issue(session, IssueResolutionRequest(issue_id="gw01_block_egress", agent_archetype="NEXUS"))

        assert session.final_phase_ready is True

        envelope = evaluate_final_report(
            session,
            FinalReportSubmission(
                origin_node_id="WKS-03",
                attack_path=["WKS-03", "MAIL-01", "DB-02", "BACKUP-01", "GW-01", "EXT-01"],
                attack_type="data_exfil",
                mitigation_plan=[
                    "reset_credentials",
                    "remove_persistence",
                    "block_external_communication",
                ],
            ),
        )

        assert envelope.evaluation.passed is True
        assert envelope.evaluation.origin_correct is True
        assert envelope.evaluation.path_accuracy == 1.0
        assert envelope.evaluation.score >= 90
    finally:
        destroy_session("progression-final-pass")


def test_final_report_failure_returns_structured_feedback():
    session = _prime_case("progression-final-fail")
    try:
        resolve_issue(session, IssueResolutionRequest(issue_id="wks03_credential_source", agent_archetype="FILER"))
        resolve_issue(session, IssueResolutionRequest(issue_id="mail01_pivot_containment", agent_archetype="NEXUS"))
        resolve_issue(session, IssueResolutionRequest(issue_id="db02_dump_window", agent_archetype="CHRONO"))
        resolve_issue(session, IssueResolutionRequest(issue_id="backup01_staging_relay", agent_archetype="FILER"))
        resolve_issue(session, IssueResolutionRequest(issue_id="gw01_block_egress", agent_archetype="NEXUS"))

        envelope = evaluate_final_report(
            session,
            FinalReportSubmission(
                origin_node_id="GW-01",
                attack_path=["MAIL-01", "DB-02", "GW-01", "EXT-01"],
                attack_type="intrusion",
                mitigation_plan=["restore_backups", "isolate_system"],
            ),
        )

        assert envelope.evaluation.passed is False
        assert envelope.feedback.incorrect_assumptions
        assert envelope.feedback.misleading_evidence
        assert envelope.feedback.missing_connections
        assert "BACKUP-01" in " ".join(envelope.feedback.missing_connections + envelope.feedback.misleading_evidence)
        assert "WKS-03" in " ".join(envelope.feedback.incorrect_assumptions)
    finally:
        destroy_session("progression-final-fail")


def test_tutorial_case_reaches_final_phase_and_passes():
    session = _prime_tutorial_case("progression-tutorial-pass")
    try:
        resolve_issue(session, IssueResolutionRequest(issue_id="wks03_credential_source", agent_archetype="FILER"))
        resolve_issue(session, IssueResolutionRequest(issue_id="mail01_pivot_containment", agent_archetype="NEXUS"))
        resolve_issue(session, IssueResolutionRequest(issue_id="gw01_block_egress", agent_archetype="NEXUS"))

        assert session.final_phase_ready is True

        envelope = evaluate_final_report(
            session,
            FinalReportSubmission(
                origin_node_id="WKS-03",
                attack_path=["WKS-03", "MAIL-01", "BACKUP-01", "GW-01", "EXT-01"],
                attack_type="data_exfil",
                mitigation_plan=[
                    "reset_credentials",
                    "remove_persistence",
                    "block_external_communication",
                ],
            ),
        )

        assert envelope.evaluation.passed is True
        assert envelope.evaluation.path_accuracy == 1.0
    finally:
        destroy_session("progression-tutorial-pass")
