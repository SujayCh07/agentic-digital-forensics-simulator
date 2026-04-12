"""
Boss-agent evaluation logic for the NIPS endgame loop.

Compares a player's CaseProposal against the fixed case truth and returns
funding + commentary without revealing whether the player was right or wrong.
"""
from __future__ import annotations

import re
from dataclasses import dataclass


# ---------------------------------------------------------------------------
# Fixed case truth (deterministic, never procedurally generated)
# ---------------------------------------------------------------------------

_CASE_TRUTH: dict[str, dict] = {
    "midnight_exfil": {
        # Keywords that indicate correct root-cause understanding
        "root_cause_keywords": [
            "lateral movement", "lateral", "credential",
            "privilege escalation", "escalation", "exfiltration", "exfil",
            "unauthorized access", "mail", "smtp", "spearphish", "phish",
            "data theft", "data breach", "breach", "compromise",
        ],
        # All relevant nodes (any mention is worth points)
        "relevant_nodes": ["MAIL-01", "DB-02", "GW-01", "EXT-01", "BACKUP-01"],
        # High-value nodes — mentioning these is stronger signal
        "critical_nodes": ["DB-02", "GW-01"],
        # Entry-point node — signals the player traced the attack chain
        "entry_node": "MAIL-01",
    }
}

# ---------------------------------------------------------------------------
# Commentary pools  (indexed by score bucket: 0 low, 1 mid, 2 high)
# These deliberately avoid confirming or denying the player's analysis.
# ---------------------------------------------------------------------------

_COMMENTARY = [
    # Low score (0–29)
    [
        "Noted. The threat picture is still developing — keep your analysts digging. "
        "I've allocated a modest operational budget; use it wisely.",
        "Preliminary assessment acknowledged. I'd recommend broadening the scope "
        "before committing to a single hypothesis. Funds are reserved for continued work.",
        "The picture here is incomplete. I'm not in a position to authorise a "
        "full response yet, but here is seed funding to push the investigation forward.",
    ],
    # Mid score (30–64)
    [
        "Reasonable hypothesis. The systems you've called out are consistent with "
        "the telemetry we have. I'm releasing operational funds — continue hardening "
        "and keep the evidence chain tight.",
        "Some of this tracks with what command is seeing at the strategic level. "
        "Proceed with caution; the attack surface may be wider than this proposal "
        "captures. Budget approved for the next phase.",
        "Your read on the infrastructure aligns with several of our indicators. "
        "Funds allocated. I'll want a tighter report once remediation begins.",
    ],
    # High score (65–100)
    [
        "This is a credible, well-structured assessment. The operational picture "
        "you've described maps to the threat intelligence we're tracking. "
        "Maximum discretionary funding released — execute the remediation plan.",
        "Strong analytical work. Your team identified the right nodes and the "
        "attack vector is plausible given the evidence chain. Budget unlocked "
        "in full — do not let this threat persist.",
        "Exactly the kind of actionable assessment command needs. Funding approved "
        "at the highest tier. This incident does not leave this network — understood?",
    ],
]

# ---------------------------------------------------------------------------

@dataclass
class BossEvaluation:
    funds_awarded: int
    commentary: str
    confidence_rating: float   # 0–1 (not shown as "score" in UI)
    progress_delta: float      # 0–30, added to frontend recovery progress


def evaluate_proposal(
    case_id: str,
    root_cause: str,
    systems_involved: str,
) -> BossEvaluation:
    """Score a player proposal against the known truth and return an evaluation."""
    truth = _CASE_TRUTH.get(case_id, _CASE_TRUTH["midnight_exfil"])
    combined = (root_cause + " " + systems_involved).lower()

    # ── Root-cause keyword score (0–45) ──────────────────────────────────────
    rc_hits = sum(
        1 for kw in truth["root_cause_keywords"] if kw in combined
    )
    rc_score = min(45, rc_hits * 8)

    # ── Node mention score (0–40) ─────────────────────────────────────────────
    # Normalise the input to upper for node matching
    combined_upper = (root_cause + " " + systems_involved).upper()
    critical_hits = sum(
        1 for n in truth["critical_nodes"]
        if re.search(r"\b" + re.escape(n) + r"\b", combined_upper)
    )
    relevant_hits = sum(
        1 for n in truth["relevant_nodes"]
        if re.search(r"\b" + re.escape(n) + r"\b", combined_upper)
    )
    entry_hit = 1 if re.search(
        r"\b" + re.escape(truth["entry_node"]) + r"\b", combined_upper
    ) else 0

    node_score = min(40, critical_hits * 14 + entry_hit * 8 + relevant_hits * 4)

    # ── Length / detail bonus (0–15) ─────────────────────────────────────────
    word_count = len(combined.split())
    detail_bonus = min(15, word_count // 5)

    # ── Total (0–100) ────────────────────────────────────────────────────────
    total = rc_score + node_score + detail_bonus
    total = min(100, max(0, total))

    # ── Map to funds (0–600) ─────────────────────────────────────────────────
    # Non-linear: reward improves faster once the player gets past 50
    if total >= 65:
        funds = 400 + int((total - 65) * (200 / 35))
    elif total >= 30:
        funds = 150 + int((total - 30) * (250 / 35))
    else:
        funds = int(total * 5)

    funds = min(600, max(0, funds))

    # ── Progress delta (0–30) ────────────────────────────────────────────────
    progress_delta = round(total * 0.30, 1)

    # ── Pick commentary ──────────────────────────────────────────────────────
    import hashlib
    bucket = 2 if total >= 65 else (1 if total >= 30 else 0)
    # Use hash of content to pick deterministic-ish comment within bucket
    idx = int(hashlib.md5((root_cause + systems_involved).encode()).hexdigest(), 16) % len(_COMMENTARY[bucket])
    commentary = _COMMENTARY[bucket][idx]

    # ── Confidence rating (used as a decorative bar in the UI) ───────────────
    confidence_rating = round(total / 100, 2)

    return BossEvaluation(
        funds_awarded=funds,
        commentary=commentary,
        confidence_rating=confidence_rating,
        progress_delta=progress_delta,
    )
