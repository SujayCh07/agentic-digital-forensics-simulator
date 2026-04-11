from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from models.schemas import ContextSourceResponse, IndicatorSnapshot

ECHO_AGENT_IDS = ("logis", "nexus", "filer", "chrono")
ECHO_AGENT_NAMES = {
    "logis": "LOGIS",
    "nexus": "NEXUS",
    "filer": "FILER",
    "chrono": "CHRONO",
}

ECHO_SCENARIOS = [
    {
        "id": "midnight-exfiltration",
        "name": "The Midnight Exfiltration",
        "incident": (
            "Last night, 40GB of source code vanished from the west district. "
            "Find the origin building, reconstruct the attack path, and name the process responsible."
        ),
        "ground_truth": {
            "origin_building": "warehouse-7",
            "attack_path": ["warehouse-7", "relay-hall", "archive-3", "city-hall"],
            "payload_type": "ransomware",
            "responsible_pid": "pid-4481",
        },
    },
    {
        "id": "ghost-in-the-grid",
        "name": "Ghost in the Grid",
        "incident": (
            "A contractor deleted logs and hid a lateral movement trail behind a routine maintenance window."
        ),
        "ground_truth": {
            "origin_building": "maintenance-depot",
            "attack_path": ["maintenance-depot", "switchyard", "records-vault"],
            "payload_type": "log-wiper",
            "responsible_pid": "pid-1702",
        },
    },
]


def build_echo_scenario() -> dict:
    scenario = ECHO_SCENARIOS[0]
    clues = [
        {
            "id": "clue-log-1",
            "type": "log_anomaly",
            "building_id": "warehouse-7",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": "Security logs show an unexpected 03:14 login from a maintenance account.",
            "raw_evidence": "auth.log: maintenance account accessed admin console",
            "confidence": 0.84,
            "agent_id": "logis",
            "is_red_herring": False,
        },
        {
            "id": "clue-net-1",
            "type": "network_flag",
            "building_id": "relay-hall",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": "Outbound traffic spikes from the relay hall align with the exfiltration window.",
            "raw_evidence": "netflow: sustained transfer to foreign endpoint",
            "confidence": 0.77,
            "agent_id": "nexus",
            "is_red_herring": False,
        },
        {
            "id": "clue-file-1",
            "type": "recovered_file",
            "building_id": "archive-3",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": "Recovered fragments point to a staged archive cleanup script.",
            "raw_evidence": "carved file fragment: cleanup.ps1",
            "confidence": 0.69,
            "agent_id": "filer",
            "is_red_herring": False,
        },
        {
            "id": "clue-red-1",
            "type": "timeline_event",
            "building_id": "city-hall",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "description": "A convincing but false lead suggests city hall triggered the breach.",
            "raw_evidence": "audit trail points to city hall only after tampering",
            "confidence": 0.25,
            "agent_id": "chrono",
            "is_red_herring": True,
        },
    ]

    return {
        "scenario_id": scenario["id"],
        "name": scenario["name"],
        "incident": scenario["incident"],
        "ground_truth": scenario["ground_truth"],
        "evidence_nodes": [
            {
                "id": "warehouse-7",
                "name": "Warehouse 7",
                "building_type": "server_warehouse",
                "clues": clues[:1],
            },
            {
                "id": "relay-hall",
                "name": "Relay Hall",
                "building_type": "network_relay",
                "clues": clues[1:2],
            },
            {
                "id": "archive-3",
                "name": "Archive 3",
                "building_type": "data_archive",
                "clues": clues[2:3],
            },
            {
                "id": "city-hall",
                "name": "City Hall",
                "building_type": "administration",
                "clues": clues[3:],
            },
        ],
        "network_graph": [
            {"source": "warehouse-7", "target": "relay-hall", "traffic": "encrypted burst"},
            {"source": "relay-hall", "target": "archive-3", "traffic": "staged handoff"},
            {"source": "archive-3", "target": "city-hall", "traffic": "cover traffic"},
        ],
        "timeline": [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "building_id": "warehouse-7",
                "event_type": "access",
                "description": "Maintenance credentials opened the warehouse backend.",
            },
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "building_id": "relay-hall",
                "event_type": "transfer",
                "description": "Large outbound packet burst begins.",
            },
        ],
        "red_herrings": clues[3:],
        "agents": [
            {
                "id": "logis",
                "name": "LOGIS",
                "specialization": "log_analysis",
                "confidence": 0.71,
                "findings": clues[:1],
                "memory": ["Detected an anomalous maintenance login."],
                "sprite_position": [6, 4],
                "state": "investigating",
            },
            {
                "id": "nexus",
                "name": "NEXUS",
                "specialization": "network_analysis",
                "confidence": 0.63,
                "findings": clues[1:2],
                "memory": ["Outbound packets match exfiltration timing."],
                "sprite_position": [11, 5],
                "state": "reporting",
            },
            {
                "id": "filer",
                "name": "FILER",
                "specialization": "file_analysis",
                "confidence": 0.58,
                "findings": clues[2:3],
                "memory": ["Recovered cleanup script fragments."],
                "sprite_position": [8, 10],
                "state": "idle",
            },
            {
                "id": "chrono",
                "name": "CHRONO",
                "specialization": "timeline_reconstruction",
                "confidence": 0.79,
                "findings": clues[3:],
                "memory": ["Timeline includes one red herring."],
                "sprite_position": [14, 9],
                "state": "waiting",
            },
        ],
    }
