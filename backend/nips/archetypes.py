"""NIPS archetype definitions for LOGIS, NEXUS, FILER, CHRONO."""

from __future__ import annotations

from nips.models import AgentArchetype, ArchetypeId

LOGIS = AgentArchetype(
    id="LOGIS",
    label="LOGIS — Log Intelligence Specialist",
    description=(
        "Specializes in log analysis, authentication trail forensics, "
        "anomaly detection, and audit-event correlation."
    ),
    core_specialties=[
        "log analysis",
        "authentication trails",
        "anomaly detection",
        "audit events",
        "system/service logs",
        "log correlation",
    ],
    allowed_tools=[
        "inspect_logs",
        "review_known_evidence",
        "correlate_findings",
        "summarize_node_state",
        "list_accessible_nodes",
        "list_current_findings",
        "propose_next_best_action",
    ],
    personality_defaults={
        "personality_type": "Sharp",
        "communication_style": "Fast, clear, and skips the jargon",
    },
    strong_areas=[
        "authentication anomaly detection",
        "log timeline parsing",
        "service-log correlation",
        "audit trail reconstruction",
    ],
    weak_areas=[
        "file artifact recovery",
        "steganography",
        "network path tracing",
        "deep packet analysis",
    ],
    example_prompts=[
        "Check the authentication logs for failed logins",
        "Look for anomalies in the service logs",
        "Correlate the audit events around 03:47",
        "What do the syslog entries say about this node?",
    ],
    base_cost=500,
    base_performance={
        "evidence_yield_modifier": 1.0,
        "evidence_quality_modifier": 1.0,
        "false_positive_risk": 0.10,
        "response_latency_modifier": 1.0,
    },
)

NEXUS = AgentArchetype(
    id="NEXUS",
    label="NEXUS — Network Tracing Specialist",
    description=(
        "Specializes in network path analysis, lateral movement tracing, "
        "ingress/egress detection, and exfiltration path reconstruction."
    ),
    core_specialties=[
        "network paths",
        "connections",
        "routing analysis",
        "lateral movement",
        "ingress/egress tracing",
        "exfiltration path analysis",
    ],
    allowed_tools=[
        "trace_network",
        "review_known_evidence",
        "correlate_findings",
        "summarize_node_state",
        "list_accessible_nodes",
        "list_current_findings",
        "propose_next_best_action",
    ],
    personality_defaults={
        "personality_type": "Swift",
        "communication_style": "Direct, focuses on the connections",
    },
    strong_areas=[
        "lateral movement detection",
        "exfiltration path reconstruction",
        "traffic pattern analysis",
        "network topology mapping",
    ],
    weak_areas=[
        "file metadata analysis",
        "registry forensics",
        "detailed log parsing",
        "timeline ordering",
    ],
    example_prompts=[
        "Trace the network connections from this node",
        "Look for lateral movement paths",
        "Identify the exfiltration route",
        "Map the connections to external endpoints",
    ],
    base_cost=550,
    base_performance={
        "evidence_yield_modifier": 0.9,
        "evidence_quality_modifier": 1.05,
        "false_positive_risk": 0.12,
        "response_latency_modifier": 0.95,
    },
)

FILER = AgentArchetype(
    id="FILER",
    label="FILER — File & Artifact Recovery Specialist",
    description=(
        "Specializes in file artifact recovery, metadata analysis, "
        "suspicious bundles, document lineage, and hidden-payload detection."
    ),
    core_specialties=[
        "file artifacts",
        "metadata analysis",
        "file recovery",
        "suspicious bundles",
        "document lineage",
        "steganography/payload analysis",
    ],
    allowed_tools=[
        "analyze_file_artifacts",
        "review_known_evidence",
        "correlate_findings",
        "summarize_node_state",
        "list_accessible_nodes",
        "list_current_findings",
        "propose_next_best_action",
    ],
    personality_defaults={
        "personality_type": "Keen",
        "communication_style": "Straightforward evidence handler",
    },
    strong_areas=[
        "deleted file recovery",
        "metadata extraction",
        "hidden payload detection",
        "artifact chain-of-custody",
    ],
    weak_areas=[
        "network topology analysis",
        "log correlation",
        "real-time traffic analysis",
        "timeline reconstruction",
    ],
    example_prompts=[
        "Recover any deleted files from this system",
        "Analyze the file metadata for anomalies",
        "Look for hidden payloads or steganography",
        "Trace the document lineage on this node",
    ],
    base_cost=520,
    base_performance={
        "evidence_yield_modifier": 1.1,
        "evidence_quality_modifier": 0.95,
        "false_positive_risk": 0.08,
        "response_latency_modifier": 1.1,
    },
)

CHRONO = AgentArchetype(
    id="CHRONO",
    label="CHRONO — Timeline Reconstruction Specialist",
    description=(
        "Specializes in timeline reconstruction, event ordering, "
        "cross-source correlation, and causality hypothesis building."
    ),
    core_specialties=[
        "timeline reconstruction",
        "event ordering",
        "cross-source correlation",
        "sequence reconstruction",
        "causality hypotheses",
        "incident narrative building",
    ],
    allowed_tools=[
        "reconstruct_timeline",
        "review_known_evidence",
        "correlate_findings",
        "summarize_node_state",
        "list_accessible_nodes",
        "list_current_findings",
        "propose_next_best_action",
    ],
    personality_defaults={
        "personality_type": "Insightful",
        "communication_style": "Focuses on the story and the timing",
    },
    strong_areas=[
        "event sequence reconstruction",
        "cross-source timestamp correlation",
        "causality chain building",
        "incident narrative synthesis",
    ],
    weak_areas=[
        "file recovery",
        "deep network tracing",
        "live traffic capture",
        "artifact metadata extraction",
    ],
    example_prompts=[
        "Reconstruct the timeline of events on this node",
        "Correlate timestamps across all findings so far",
        "Build a causality chain for the breach",
        "What happened in the 22-minute exfiltration window?",
    ],
    base_cost=580,
    base_performance={
        "evidence_yield_modifier": 0.85,
        "evidence_quality_modifier": 1.15,
        "false_positive_risk": 0.06,
        "response_latency_modifier": 1.2,
    },
)

ARCHETYPES: dict[ArchetypeId, AgentArchetype] = {
    "LOGIS": LOGIS,
    "NEXUS": NEXUS,
    "FILER": FILER,
    "CHRONO": CHRONO,
}
