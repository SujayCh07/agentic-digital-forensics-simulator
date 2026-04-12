import { describe, expect, it } from "vitest";
import type { AgentResult, NipsEvidenceUpdate, NipsAgentInstance } from "@/types/investigation";
import {
  buildEvidenceKey,
  buildFindingId,
  buildStableFindingSeed,
  evidenceKeyForFinding,
  inferTaskTypeFromEvidenceUpdate,
  resolveAgentIdFromEvidence,
} from "./investigationProgression";

describe("investigationProgression", () => {
  it("builds a stable finding seed regardless of tag order", () => {
    const a = buildStableFindingSeed({
      nodeId: "GW-01",
      summary: "Gateway logs show a temporary outbound allow rule.",
      tags: ["admin_access", "firewall_evasion", "rule_manipulation"],
    });
    const b = buildStableFindingSeed({
      nodeId: "GW-01",
      summary: "Gateway logs show a temporary outbound allow rule.",
      tags: ["rule_manipulation", "admin_access", "firewall_evasion"],
    });

    expect(a).toBe(
      "gw-01:gateway-logs-show-a-temporary-outbound-allow-rul:admin_access-firewall_evasion-ru",
    );
    expect(b).toBe(a);
  });

  it("infers a known task type from synced evidence when task_type is absent", () => {
    const evidence: Pick<
      NipsEvidenceUpdate,
      "node_id" | "summary" | "tags" | "evidence_type" | "task_type"
    > = {
      node_id: "WKS-03",
      summary:
        "USB contained credential_tool.py (SHA256: a4f2...) — known lateral-movement script.",
      tags: ["credential_dumping", "mimikatz", "ntlm"],
      evidence_type: "steg_payload",
      task_type: null,
    };

    expect(inferTaskTypeFromEvidenceUpdate(evidence)).toBe("inspect_artifacts");
    expect(
      buildEvidenceKey(
        evidence.node_id,
        inferTaskTypeFromEvidenceUpdate(evidence),
        buildStableFindingSeed({
          nodeId: evidence.node_id,
          summary: evidence.summary,
          tags: evidence.tags,
        }),
      ),
    ).toBe("WKS-03:inspect_artifacts");
  });

  it("falls back to deterministic finding keys when no case task matches", () => {
    const stableSeed = buildStableFindingSeed({
      nodeId: "EDU-01",
      summary: "Ambient maintenance notice from public kiosk.",
      tags: ["ambient", "city_noise"],
    });

    expect(buildEvidenceKey("EDU-01", null, stableSeed)).toBe(
      "finding:edu-01:ambient-maintenance-notice-from-public-kiosk:ambient-city_noise",
    );
    expect(
      buildFindingId({
        evidenceKey: `finding:${stableSeed}`,
        nodeId: "EDU-01",
        summary: "Ambient maintenance notice from public kiosk.",
      }),
    ).toBe(stableSeed);
  });

  it("prefers direct evidence archetypes and falls back to roster mapping", () => {
    const roster = [
      {
        instance_id: "agent_nexus_01",
        archetype: "NEXUS",
      } as NipsAgentInstance,
    ];

    expect(
      resolveAgentIdFromEvidence({
        node_id: "GW-01",
        summary: "direct archetype",
        details: "",
        severity: "high",
        confidence: 0.9,
        evidence_type: "network_packet",
        tags: [],
        agent_instance_id: "unknown",
        agent_display_name: "FILER/FORENSICS-01",
        is_false_positive: false,
        agent_archetype: "FILER",
      }),
    ).toBe("filer");

    expect(
      resolveAgentIdFromEvidence(
        {
          node_id: "GW-01",
          summary: "roster fallback",
          details: "",
          severity: "high",
          confidence: 0.9,
          evidence_type: "network_packet",
          tags: [],
          agent_instance_id: "agent_nexus_01",
          agent_display_name: "NEXUS/TRACE-01",
          is_false_positive: false,
        },
        roster,
      ),
    ).toBe("nexus");
  });

  it("uses explicit evidence keys for board linking and falls back to task-derived keys", () => {
    const findingWithKey: AgentResult = {
      findingId: "GW-01:trace_connections",
      evidenceKey: "GW-01:trace_connections",
      agentId: "nexus",
      agentName: "NEXUS",
      nodeId: "GW-01",
      nodeName: "Gateway Router",
      taskType: "trace_connections",
      summary: "GW-01 routed 11.1GB to external infrastructure.",
      details: "details",
      confidence: 0.99,
      severity: "critical",
      evidenceType: "network_packet",
      tags: ["exfiltration"],
      source: "local_task",
    };

    const findingWithoutKey: AgentResult = {
      ...findingWithKey,
      findingId: "custom-finding",
      evidenceKey: "",
      taskType: null,
    };

    expect(evidenceKeyForFinding(findingWithKey)).toBe("GW-01:trace_connections");
    expect(evidenceKeyForFinding(findingWithoutKey)).toBe("finding:custom-finding");
  });
});
