/**
 * EchoLocate — Intent Resolver
 *
 * Converts a player's natural-language instruction into a structured TaskType.
 * Uses weighted keyword/regex pattern matching — no LLM required for MVP.
 *
 * Design notes:
 * - Multiple patterns can match one task type; scores accumulate
 * - The highest-scoring task type wins
 * - If score < THRESHOLD → null (ambiguous / unresolvable)
 * - Confidence is normalized and exposed for UI display
 *
 * Examples:
 *   "Check auth logs for failed logins"  → analyze_logs  (confidence 0.91)
 *   "See where the traffic is going"     → trace_connections (0.78)
 *   "How did they move between systems?" → trace_lateral_movement (0.85)
 *   "Recover deleted evidence files"     → recover_files (0.88)
 *   "What is the earliest event here?"   → reconstruct_timeline (0.82)
 */

import type { TaskType } from "@/types/investigation";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface IntentResolution {
  taskType: TaskType | null;
  confidence: number;       // 0–1
  interpretation: string;   // human-readable restatement of intent
  rawInstruction: string;
  failReason?: string;      // set when taskType is null
}

// ---------------------------------------------------------------------------
// Scoring rules
// Each matched pattern adds `score` to its task type's total
// ---------------------------------------------------------------------------

const RULES: Array<{ re: RegExp; taskType: TaskType; score: number }> = [
  // ── analyze_logs ──────────────────────────────────────────────────────────
  { re: /\blog(s|ging|file|files|entries?)?\b/i,                    taskType: "analyze_logs", score: 0.9 },
  { re: /\b(auth(entication)?|login|log[\s-]in|access)\b/i,         taskType: "analyze_logs", score: 0.9 },
  { re: /\b(ssh|syslog|audit(ing)?|event.?log|security.?log)\b/i,   taskType: "analyze_logs", score: 1.0 },
  { re: /\b(brute.?force|failed.?login|credential.?abuse?)\b/i,     taskType: "analyze_logs", score: 1.2 },
  { re: /\b(who.?logged|last.?access|account.?activ)\b/i,           taskType: "analyze_logs", score: 1.1 },
  { re: /\b(parse|read|scan|check|analyze|review).{0,20}log/i,      taskType: "analyze_logs", score: 1.2 },
  { re: /\b(password|credential|account).{0,20}(log|trail|record)/i,taskType: "analyze_logs", score: 1.0 },

  // ── detect_anomalies ──────────────────────────────────────────────────────
  { re: /\b(anomal|unusual|abnormal|irregularit)/i,                 taskType: "detect_anomalies", score: 1.3 },
  { re: /\b(weird|strange|odd.?behavior|out.?of.?place)\b/i,        taskType: "detect_anomalies", score: 0.9 },
  { re: /\b(tamper|tampered|gap.?in|missing.?log|log.?wipe|deleted.?log)\b/i, taskType: "detect_anomalies", score: 1.2 },
  { re: /\b(something.?(wrong|off)|behav(e|ior)|misbehav)/i,        taskType: "detect_anomalies", score: 0.8 },
  { re: /\b(detect|find|spot|scan.?for).{0,25}(anomal|irregular|suspicious.?activ)/i, taskType: "detect_anomalies", score: 1.3 },
  { re: /\b(integrity|file.?change|modification|altered)\b/i,       taskType: "detect_anomalies", score: 0.9 },

  // ── trace_connections ─────────────────────────────────────────────────────
  { re: /\b(connection|connections|traffic|packet|port|netflow)\b/i,taskType: "trace_connections", score: 0.9 },
  { re: /\b(outbound|inbound|external.?traffic|firewall|routing)\b/i, taskType: "trace_connections", score: 1.0 },
  { re: /\b(ip.?address|c2|command.and.control|beacon|call.?home)\b/i, taskType: "trace_connections", score: 1.3 },
  { re: /\b(talk(ing)?.?to|communicat|contact|reach(ing)?.?out)\b/i, taskType: "trace_connections", score: 1.1 },
  { re: /\b(data.?transfer|upload|download|exfil(trat)?)\b/i,       taskType: "trace_connections", score: 1.0 },
  { re: /\b(packet.?loss|latency|throughput|bandwidth)\b/i,          taskType: "trace_connections", score: 0.9 },
  { re: /\b(trace|inspect|check).{0,25}(outbound|traffic|flow|connection|network)\b/i, taskType: "trace_connections", score: 1.2 },
  { re: /\b(where.{0,15}(going|sending|sending|transmit))\b/i,      taskType: "trace_connections", score: 1.1 },
  { re: /\b(smb|https?|port.?443|port.?445|443|445)\b/i,            taskType: "trace_connections", score: 0.9 },

  // ── trace_lateral_movement ────────────────────────────────────────────────
  { re: /\blateral\b|\bpivot\b|\bpropagat/i,                        taskType: "trace_lateral_movement", score: 1.5 },
  { re: /\b(spread|hop(ped)?|jump(ed)?|cross(ed)?)\b/i,             taskType: "trace_lateral_movement", score: 0.9 },
  { re: /\b(how.{0,15}(mov(e|ed)|got|spread|arriv))\b/i,            taskType: "trace_lateral_movement", score: 1.3 },
  { re: /\b(origin|patient.?zero|where.{0,15}start|source.?of)\b/i, taskType: "trace_lateral_movement", score: 1.1 },
  { re: /\b(remote.?exec|psexec|wmi|rpc|remote.?login)\b/i,         taskType: "trace_lateral_movement", score: 1.1 },
  { re: /\b(see.?if.{0,20}origin|is.?this.{0,15}source)\b/i,        taskType: "trace_lateral_movement", score: 1.2 },
  { re: /\b(movement.?between|between.{0,20}system|from.*to.*system)\b/i, taskType: "trace_lateral_movement", score: 1.2 },

  // ── recover_files ─────────────────────────────────────────────────────────
  { re: /\b(recover|recovery|undelete|carv(e|ing)?)\b/i,            taskType: "recover_files", score: 1.3 },
  { re: /\b(deleted.?file|file.?deletion|rm\s|shred(ded)?)\b/i,     taskType: "recover_files", score: 1.3 },
  { re: /\b(restore|retrieve).{0,20}file\b/i,                       taskType: "recover_files", score: 1.2 },
  { re: /\b(bash.?history|\.?history|history.?file)\b/i,            taskType: "recover_files", score: 1.1 },
  { re: /\b(what.{0,15}deleted|missing.?file|lost.?file)\b/i,       taskType: "recover_files", score: 1.1 },
  { re: /\bfilesystem\b|\bdisk.?image\b|\binode\b/i,                taskType: "recover_files", score: 0.9 },

  // ── inspect_artifacts ─────────────────────────────────────────────────────
  { re: /\b(artifact|steg(anograph)?|hidden.?payload|lsb)\b/i,      taskType: "inspect_artifacts", score: 1.4 },
  { re: /\b(malware|binary|script|executable|dll|payload|implant)\b/i, taskType: "inspect_artifacts", score: 1.2 },
  { re: /\b(inspect|examine|analyze|look.?at).{0,25}(file|image|artifact|binary|script)\b/i, taskType: "inspect_artifacts", score: 1.3 },
  { re: /\b(mimikatz|credential.?dump|ntlm|lsass|sam.?hash)\b/i,    taskType: "inspect_artifacts", score: 1.2 },
  { re: /\b(usb|removable.?driv|thumb.?driv|pendrive)\b/i,          taskType: "inspect_artifacts", score: 1.0 },
  { re: /\b(what.{0,15}(file|tool|image)|identify.{0,20}(this|the.?file))\b/i, taskType: "inspect_artifacts", score: 0.9 },

  // ── reconstruct_timeline ──────────────────────────────────────────────────
  { re: /\btimeline\b|\bchronolog/i,                                 taskType: "reconstruct_timeline", score: 1.5 },
  { re: /\b(sequence|order.?of.?events|reconstruct|series.?of)\b/i, taskType: "reconstruct_timeline", score: 1.4 },
  { re: /\b(when.?did|what.?happened.?when|earliest|first.?ev|first.?sign)\b/i, taskType: "reconstruct_timeline", score: 1.2 },
  { re: /\b(before.{0,15}after|how.?long|dwell.?time|how.?much.?time)\b/i, taskType: "reconstruct_timeline", score: 1.0 },
  { re: /\b(timestamp|event.?order|time.?of.?(event|attack|breach))\b/i, taskType: "reconstruct_timeline", score: 1.1 },
  { re: /\b(reconstruct|map.?out|build).{0,25}(what|events?|activity)\b/i, taskType: "reconstruct_timeline", score: 1.1 },

  // ── correlate_events ──────────────────────────────────────────────────────
  { re: /\bcorrelat/i,                                               taskType: "correlate_events", score: 1.5 },
  { re: /\b(cross.?reference|link.?event|connect.{0,15}event)\b/i,  taskType: "correlate_events", score: 1.4 },
  { re: /\b(pattern.?across|what.?else.?happened|relation.?between)\b/i, taskType: "correlate_events", score: 1.2 },
  { re: /\b(compare|match.{0,20}event|simultaneous|concurrent)\b/i, taskType: "correlate_events", score: 1.0 },
  { re: /\b(related|connection.?between|link(ed)?.?to|same.?time.?as)\b/i, taskType: "correlate_events", score: 0.9 },
  { re: /\b(other.?system|across.{0,20}(node|machine|system|server))\b/i, taskType: "correlate_events", score: 1.0 },

  // ── general/broad matchers (lax strictness) ───────────────────────────────
  { re: /\b(issue|problem|investigate|find.?bad|find.?out)\b/i,      taskType: "detect_anomalies", score: 0.7 },
  { re: /\b(what.?happened|tell.?me|what('s| is).?going.?on)\b/i,    taskType: "reconstruct_timeline", score: 0.7 },
  { re: /\b(check|look.?at|examine|analyze)\b/i,                     taskType: "detect_anomalies", score: 0.5 },
];

// ---------------------------------------------------------------------------
// Human-readable restatements per task type
// ---------------------------------------------------------------------------

const TASK_INTERPRETATION: Record<TaskType, string> = {
  analyze_logs:           "Analyzing authentication logs and access records",
  detect_anomalies:       "Scanning for behavioral anomalies and log integrity issues",
  trace_connections:      "Tracing network connections and outbound traffic flows",
  trace_lateral_movement: "Mapping lateral movement and attack propagation paths",
  recover_files:          "Recovering deleted files and filesystem artifacts",
  inspect_artifacts:      "Inspecting files, binaries, and embedded payloads",
  reconstruct_timeline:   "Reconstructing the sequence of events at this node",
  correlate_events:       "Cross-referencing events across all observed systems",
};

const TASK_SUGGESTIONS: Record<TaskType, string> = {
  analyze_logs: '"Check auth logs for failed logins"',
  detect_anomalies: '"Scan for file changes" or "Look for unusual behavior"',
  trace_connections: '"Trace outbound connections"',
  trace_lateral_movement: '"See how it spread"',
  recover_files: '"Recover deleted files"',
  inspect_artifacts: '"Inspect the binary"',
  reconstruct_timeline: '"Reconstruct the timeline"',
  correlate_events: '"Cross-reference events"',
};

// Minimum aggregate score required to accept a resolution
const THRESHOLD = 0.5;

// Rough ceiling for normalization (multiple strong matches sum to ~3.5)
const SCORE_CEILING = 3.0;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function resolveIntent(rawInstruction: string): IntentResolution {
  const text = rawInstruction.trim();

  if (!text || text.length < 4) {
    return {
      taskType: null,
      confidence: 0,
      interpretation: "",
      rawInstruction: text,
      failReason: "Instruction too short. Describe what to look for.",
    };
  }

  // Accumulate scores
  const scores = new Map<TaskType, number>();
  for (const { re, taskType, score } of RULES) {
    if (re.test(text)) {
      scores.set(taskType, (scores.get(taskType) ?? 0) + score);
    }
  }

  if (scores.size === 0) {
    return {
      taskType: null,
      confidence: 0,
      interpretation: text,
      rawInstruction: text,
      failReason: "Cannot determine task. Broaden your search or try asking to check logs, trace connections, recover files, or inspect artifacts.",
    };
  }

  // Find highest-scoring task type
  let best: TaskType | null = null;
  let bestScore = 0;
  for (const [t, s] of scores) {
    if (s > bestScore) { best = t; bestScore = s; }
  }

  if (bestScore < THRESHOLD) {
    const suggestion = best ? TASK_SUGGESTIONS[best] : "check logs or trace connections";
    const humanTask = best ? TASK_INTERPRETATION[best].toLowerCase() : "investigate";
    return {
      taskType: null,
      confidence: Math.min(0.4, bestScore / SCORE_CEILING),
      interpretation: text,
      rawInstruction: text,
      failReason: `Ambiguous instruction. Did you mean to ${humanTask}? Try asking: ${suggestion}`,
    };
  }

  return {
    taskType: best,
    confidence: Math.min(1, bestScore / SCORE_CEILING),
    interpretation: TASK_INTERPRETATION[best!] ?? text,
    rawInstruction: text,
  };
}

// ---------------------------------------------------------------------------
// Helper: which agent is capable of a given task type?
// ---------------------------------------------------------------------------

export function getCapableAgent(taskType: TaskType): string {
  const map: Partial<Record<TaskType, string>> = {
    analyze_logs:           "LOGIS",
    detect_anomalies:       "LOGIS",
    trace_connections:      "NEXUS",
    trace_lateral_movement: "NEXUS",
    recover_files:          "FILER",
    inspect_artifacts:      "FILER",
    reconstruct_timeline:   "CHRONO",
    correlate_events:       "CHRONO",
  };
  return map[taskType] ?? "a specialist agent";
}
