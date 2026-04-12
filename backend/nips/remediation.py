"""
Remediation action scoring for the NIPS endgame loop.

Actions are evaluated against the fixed case truth. The player never
sees a "correct / incorrect" verdict — they infer correctness from the
progress bar movement and from the terse operational commentary.
"""
from __future__ import annotations

from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Fixed case truth for remediation
# "isolate MAIL-01" is correct → high score; "isolate FW-01" is noise → low score
# ---------------------------------------------------------------------------

_REMEDIATION_TRUTH: dict[str, dict[str, dict[str, int]]] = {
    "midnight_exfil": {
        # Scores 0–100 per (action, node) pair.  "default" = any other node.
        "isolate": {
            "MAIL-01":   80,   # isolate entry point
            "DB-02":     90,   # isolate the compromised database — best move
            "GW-01":     70,   # cut the egress gateway
            "EXT-01":    55,   # block external endpoint
            "default":   10,
        },
        "block_egress": {
            "GW-01":     95,   # stop outbound exfiltration
            "EXT-01":    65,   # block external C2 endpoint
            "FW-01":     40,   # generic firewall — partial credit
            "default":    8,
        },
        "patch": {
            "MAIL-01":   75,   # patch the mail-server entry point
            "DB-02":     65,   # harden the database
            "WS-03":     45,   # lateral movement hop
            "default":   20,
        },
        "restore": {
            "DB-02":     85,   # restore the exfiltrated database
            "BACKUP-01": 70,   # restore from backup node
            "MAIL-01":   50,
            "default":   15,
        },
        "remediate": {
            "DB-02":     70,
            "MAIL-01":   60,
            "GW-01":     55,
            "WS-03":     45,
            "default":   25,
        },
    }
}

# Cost in ₡ per action type
REMEDIATION_COSTS: dict[str, int] = {
    "isolate":     200,
    "patch":       150,
    "block_egress": 250,
    "restore":     300,
    "remediate":   100,
}

# ── Commentary pools  (terse, operational, no right/wrong signal) ────────────

_COMMENTARY: dict[str, list[str]] = {
    # Generic high-score actions  (score ≥ 60)
    "high": [
        "Action executed. Monitoring for rebound activity.",
        "Confirmed. Post-action telemetry looks quiet — watch for lateral escalation.",
        "Done. No immediate counter-reaction detected. Continue the sweep.",
        "Executed cleanly. Indicators are moving in the right direction.",
    ],
    # Mid-score actions  (30–59)
    "mid": [
        "Action applied. Marginal improvement observed — consider adjacent targets.",
        "Partial mitigation registered. The threat may have secondary staging.",
        "Executed, though the telemetry is still ambiguous. Don't stop here.",
        "Applied. Some noise dampened, but the root vector may still be active.",
    ],
    # Low-score actions  (0–29)
    "low": [
        "Action completed, but the observable state has barely shifted. Re-examine your diagnosis.",
        "Minimal effect detected. This may not be the right target.",
        "Executed with little measurable impact. The threat may be elsewhere.",
        "Logged. The indicators haven't moved much — consider a different approach.",
    ],
    # Insufficient funds
    "no_funds": [
        "Action blocked — insufficient operational funds. Secure more resources first.",
    ],
}


@dataclass
class RemediationResult:
    action_type: str
    target_node: str
    progress_delta: float
    cost: int
    commentary: str
    funds_remaining: int
    success: bool


def score_remediation(
    case_id: str,
    action_type: str,
    target_node: str,
) -> tuple[int, float, int]:
    """Return (score 0-100, progress_delta, cost)."""
    truth_map = (
        _REMEDIATION_TRUTH.get(case_id, {}).get(action_type, {})
    )
    score = truth_map.get(target_node.upper(), truth_map.get("default", 10))
    # Progress delta: non-linear — correct actions give meaningful progress
    if score >= 70:
        delta = 10 + (score - 70) * 0.5   # 10–17.5
    elif score >= 40:
        delta = 4 + (score - 40) * 0.2    # 4–10
    else:
        delta = score * 0.1                # 0–4

    delta = round(delta, 1)
    cost = REMEDIATION_COSTS.get(action_type, 150)
    return score, delta, cost


def get_commentary(score: int, seed: str = "") -> str:
    import hashlib
    if score >= 60:
        pool = _COMMENTARY["high"]
    elif score >= 30:
        pool = _COMMENTARY["mid"]
    else:
        pool = _COMMENTARY["low"]
    idx = int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(pool)
    return pool[idx]


def execute_remediation(
    case_id: str,
    action_type: str,
    target_node: str,
    current_funds: int,
) -> RemediationResult:
    score, delta, cost = score_remediation(case_id, action_type, target_node)

    if current_funds < cost:
        return RemediationResult(
            action_type=action_type,
            target_node=target_node,
            progress_delta=0.0,
            cost=0,
            commentary=_COMMENTARY["no_funds"][0],
            funds_remaining=current_funds,
            success=False,
        )

    commentary = get_commentary(score, seed=f"{action_type}:{target_node}")
    return RemediationResult(
        action_type=action_type,
        target_node=target_node,
        progress_delta=delta,
        cost=cost,
        commentary=commentary,
        funds_remaining=current_funds - cost,
        success=True,
    )
