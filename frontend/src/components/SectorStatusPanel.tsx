"use client";

import { useState } from "react";
import {
  CYBER_CITY_LINKS,
  DOMAIN_LABEL_BY_SECTOR,
} from "@/data/cyberCitySectors";
import { getPrimaryCase } from "@/data/sectorCases";
import { audioManager } from "@/lib/audioManager";
import type { RemediationResult, SectorId } from "@/types/investigation";
import { SECTOR_COLORS } from "@/types/sectors";

// ---------------------------------------------------------------------------
// Case nodes — hardcoded for midnight_exfil
// ---------------------------------------------------------------------------

interface CaseNode {
  id: string;
  name: string;
  domain: string;
  baseThreat: number; // starting compromise level (reflects case truth)
  description: {
    compromised: string;
    recovering: string;
    contained: string;
  };
}

const CASE_NODES: CaseNode[] = [
  {
    id: "DB-02",
    name: "Financial Database",
    domain: "Database / Storage",
    baseThreat: 95,
    description: {
      compromised:
        "47 GB SELECT dump executed at 03:46. pg_dump exfiltrated via SSH tunnel to EXT-01. bash_history cleared.",
      recovering:
        "Exfil path cut. Database access locked. Dump integrity unknown — restore recommended.",
      contained: "Isolated. Export activity halted. Forensic copy preserved.",
    },
  },
  {
    id: "MAIL-01",
    name: "Mail Gateway",
    domain: "Mail / SMTP",
    baseThreat: 85,
    description: {
      compromised:
        "Forwarding rule created at 03:44 → ext-relay. 2,411 messages bulk-sent. .pst spool 480 MB.",
      recovering:
        "Forwarding rule removed. Outbound SMTP rate-limited. Credential reset in progress.",
      contained:
        "SMTP egress blocked. Admin session terminated. Rules audited.",
    },
  },
  {
    id: "GW-01",
    name: "API Gateway",
    domain: "Gateway / API",
    baseThreat: 75,
    description: {
      compromised:
        "API key rotated by attacker at 03:40. Rate limiter disabled 03:55. Internal routes to DB-02 exposed.",
      recovering:
        "Rate limiter re-enabled. API keys revoked. OAuth tokens reissued.",
      contained:
        "Egress on port 443 blocked. Config restored from clean backup.",
    },
  },
  {
    id: "WS-03",
    name: "Dev Workstation",
    domain: "Endpoint / Workstation",
    baseThreat: 78,
    description: {
      compromised:
        "mimikatz.exe executed at 03:35 — 14 credentials harvested. Lateral SSH to DB-02 and MAIL-01.",
      recovering:
        "RDP session terminated. mimikatz binary quarantined. Credential reset underway.",
      contained:
        "Workstation isolated. clean.bat execution prevented. Disk imaged.",
    },
  },
  {
    id: "EXT-01",
    name: "External C2 Server",
    domain: "External / Threat Actor",
    baseThreat: 90,
    description: {
      compromised:
        "Receiving C2 beacons from WS-03 since 03:28. 47.2 GB received on port 443. Staging at /var/exfil/.",
      recovering:
        "Egress to EXT-01 blocked at FW-01. Beacon interrupted. Staging not yet wiped.",
      contained:
        "All outbound routes to 198.51.100.42 blocked. TLS channel severed.",
    },
  },
  {
    id: "BACKUP-01",
    name: "Backup Server",
    domain: "Backup / Recovery",
    baseThreat: 62,
    description: {
      compromised:
        "VSS shadow copies deleted at 03:52. Retention policy changed 30d → 1d. Anti-forensics sweep at 03:55.",
      recovering:
        "Retention policy restored. New snapshot initiated. IMAP sync from MAIL-01 suspended.",
      contained: "Backup integrity verified from offsite copy. VSS rebuilt.",
    },
  },
  {
    id: "FW-01",
    name: "Perimeter Firewall",
    domain: "Firewall / Perimeter",
    baseThreat: 52,
    description: {
      compromised:
        "Allow-rule added at 03:30 enabling DB-02 → EXT-01 on port 443. 47.2 GB passed before auto-expire.",
      recovering:
        "Rogue allow-rule removed. Egress policy hardened. Logs archived.",
      contained:
        "Ruleset audited. Default-deny egress enforced. Config hash verified.",
    },
  },
];

// Nodes that should show as higher threat regardless (attack chain order)
const NODE_COLOR: Record<string, string> = {
  "DB-02": "#ef4444",
  "MAIL-01": "#f59e0b",
  "GW-01": "#f97316",
  "WS-03": "#a78bfa",
  "EXT-01": "#ef4444",
  "BACKUP-01": "#facc15",
  "FW-01": "#22d3ee",
};

// ---------------------------------------------------------------------------
// Sector threat data (used in "no active investigation" mode)
// ---------------------------------------------------------------------------

interface SectorStatus {
  sectorId: SectorId;
  threat: number;
}

const SECTOR_SEED: Record<SectorId, number> = {
  "EDU-01": 0.17,
  "MED-02": 0.43,
  "FIN-03": 0.61,
  "NET-04": 0.29,
  "AUTH-05": 0.72,
  "PWR-06": 0.38,
  "CLOUD-07": 0.54,
  "CIV-08": 0.11,
};

const THREAT_BLURBS: Record<
  SectorId,
  { secure: string; suspicious: string; alert: string; breached: string }
> = {
  "EDU-01": {
    secure: "All research systems nominal. No anomalous traffic detected.",
    suspicious: "Unusual late-night access patterns on faculty VPN endpoints.",
    alert:
      "Outbound data spikes from the AI research cluster. CI pipeline flagged.",
    breached:
      "Unauthorized commit deployed. Build runner phoning home to external C2.",
  },
  "NET-04": {
    secure: "ISP backbone routing cleanly. No packet anomalies.",
    suspicious: "Minor BGP route fluctuations on upstream peers.",
    alert:
      "Abnormal traffic volumes on core switching fabric. Spoofed packets detected.",
    breached:
      "DNS poisoning confirmed. Backbone redirecting traffic to rogue endpoints.",
  },
  "AUTH-05": {
    secure:
      "Identity gateway fully operational. MFA enforced across all users.",
    suspicious: "Elevated failed login attempts from off-campus IPs.",
    alert:
      "Credential stuffing underway. Multiple accounts temporarily suspended.",
    breached:
      "Admin tokens exfiltrated. Threat actor has lateral movement capability.",
  },
  "FIN-03": {
    secure: "Core banking systems stable. All transactions validated.",
    suspicious: "High-frequency micro-transactions flagged by fraud detection.",
    alert:
      "SWIFT bridge logs show unauthorized query patterns. Audit mode enabled.",
    breached:
      "Ransomware payload executing. Financial records being encrypted.",
  },
  "PWR-06": {
    secure: "Grid control systems nominal. All substations responding.",
    suspicious:
      "HMI interface accessed from unrecognised maintenance terminal.",
    alert: "SCADA commands being replayed from spoofed controller address.",
    breached: "Cascading shutdowns initiated by malicious PLC instruction set.",
  },
  "CIV-08": {
    secure: "Transit and civic operations running on schedule.",
    suspicious:
      "Civic database returning unexpected NULL fields on audit queries.",
    alert: "Emergency dispatch routing compromised. Calls being redirected.",
    breached:
      "Mission control uplink severed. Manual override protocols engaged.",
  },
  "CLOUD-07": {
    secure: "Cloud archive fully replicated. All backups verified.",
    suspicious: "Storage bucket ACL drift detected on three archive nodes.",
    alert:
      "Large-scale data reads on cold storage. Exfiltration risk elevated.",
    breached:
      "Backup encryption keys exposed. Archive integrity cannot be guaranteed.",
  },
  "MED-02": {
    secure: "Patient systems and diagnostics operating normally.",
    suspicious: "After-hours access to diagnostics DB from staff credentials.",
    alert:
      "Alert queue flooded with synthetic alarms masking privilege escalation.",
    breached:
      "Patient monitoring feeds compromised. Real alerts being suppressed.",
  },
};

const SECTOR_ORDER: SectorId[] = [
  "EDU-01",
  "NET-04",
  "AUTH-05",
  "FIN-03",
  "PWR-06",
  "CIV-08",
  "CLOUD-07",
  "MED-02",
];

function computeThreats(
  activeSectorId: SectorId | null,
  pressureLevel: number,
): SectorStatus[] {
  const suspiciousNeighbors = new Set<SectorId>();
  if (activeSectorId) {
    for (const link of CYBER_CITY_LINKS) {
      if (!link.suspicious) continue;
      if (link.sourceId === activeSectorId)
        suspiciousNeighbors.add(link.targetId);
      if (link.targetId === activeSectorId)
        suspiciousNeighbors.add(link.sourceId);
    }
  }
  return SECTOR_ORDER.map((sectorId) => {
    const seed = SECTOR_SEED[sectorId] ?? 0.5;
    const p = Math.min(pressureLevel / 10, 1);
    let threat: number;
    if (sectorId === activeSectorId) {
      threat = 70 + p * 25;
    } else if (suspiciousNeighbors.has(sectorId)) {
      threat = 30 + seed * 15 + p * 20;
    } else {
      threat = 3 + seed * 12 + p * 15;
    }
    return { sectorId, threat: Math.min(Math.round(threat), 100) };
  });
}

// ---------------------------------------------------------------------------
// Node threat computation
// ---------------------------------------------------------------------------

function computeNodeThreat(
  node: CaseNode,
  discoveredNodes: string[],
  remediations: RemediationResult[],
): number {
  let threat = node.baseThreat;
  // Evidence found → confirms compromise (no change, already high)
  const found = discoveredNodes.includes(node.id);
  if (!found) threat = Math.round(threat * 0.6); // unknown = lower displayed threat

  // Each successful remediation on this node reduces threat
  const nodeRemeds = remediations.filter(
    (r) => r.target_node === node.id && r.success,
  );
  for (const rem of nodeRemeds) {
    threat = Math.max(5, Math.round(threat - rem.progress_delta * 2.5));
  }

  return Math.min(100, Math.max(0, threat));
}

function nodeStatusLabel(threat: number): { text: string; color: string } {
  if (threat >= 70) return { text: "COMPROMISED", color: "#ef4444" };
  if (threat >= 40) return { text: "DEGRADED", color: "#f59e0b" };
  if (threat >= 20) return { text: "RECOVERING", color: "#facc15" };
  return { text: "CONTAINED", color: "#34d399" };
}

function nodeConditionText(node: CaseNode, threat: number): string {
  if (threat >= 40) return node.description.compromised;
  if (threat >= 20) return node.description.recovering;
  return node.description.contained;
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function ThreatBar({ threat, color }: { threat: number; color: string }) {
  const fill =
    threat >= 70
      ? "#ef4444"
      : threat >= 40
        ? "#f59e0b"
        : threat >= 20
          ? "#facc15"
          : color;
  return (
    <div
      className="relative h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: "#0f1927" }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${threat}%`,
          background: fill,
          boxShadow: threat >= 40 ? `0 0 6px ${fill}88` : "none",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sector tooltip (pre-investigation)
// ---------------------------------------------------------------------------

function SectorTooltip({
  sectorId,
  threat,
  isActive,
}: {
  sectorId: SectorId;
  threat: number;
  isActive: boolean;
}) {
  const color = SECTOR_COLORS[sectorId] ?? "#00d4ff";
  const tier =
    threat >= 70
      ? "breached"
      : threat >= 40
        ? "alert"
        : threat >= 20
          ? "suspicious"
          : ("secure" as const);
  const blurb = THREAT_BLURBS[sectorId]?.[tier] ?? "";
  const fill =
    threat >= 70
      ? "#ef4444"
      : threat >= 40
        ? "#f59e0b"
        : threat >= 20
          ? "#facc15"
          : color;
  const statusText =
    threat >= 70
      ? "BREACHED"
      : threat >= 40
        ? "ALERT"
        : threat >= 20
          ? "SUSPICIOUS"
          : "SECURE";
  const caseData = isActive ? getPrimaryCase(sectorId) : null;

  return (
    <div
      className="pointer-events-none absolute right-full top-0 z-50 mr-2 w-52 overflow-hidden rounded-lg"
      style={{
        background: "#07111e",
        border: `1px solid ${color}44`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.7)`,
      }}
    >
      <div
        className="px-3 py-2"
        style={{
          borderBottom: `1px solid ${color}22`,
          background: `${color}0a`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[9px] font-mono tracking-widest"
            style={{ color }}
          >
            {sectorId}
          </span>
          <span className="text-[8px] font-mono" style={{ color: fill }}>
            {statusText}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] font-mono font-semibold text-white leading-tight">
          {caseData ? caseData.title : DOMAIN_LABEL_BY_SECTOR[sectorId]}
        </div>
      </div>
      <div
        className="px-3 py-2"
        style={{ borderBottom: `1px solid ${color}11` }}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[8px] font-mono" style={{ color: "#4a6580" }}>
            THREAT
          </span>
          <span
            className="ml-auto text-[8px] font-mono tabular-nums"
            style={{ color: fill }}
          >
            {threat}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "#0f1927" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${threat}%`, background: fill }}
          />
        </div>
      </div>
      <div className="px-3 py-2">
        <p
          className="text-[9px] font-mono leading-[1.55]"
          style={{ color: "#6f87a1" }}
        >
          {blurb}
        </p>
        {isActive && (
          <div
            className="mt-2 text-[8px] font-mono tracking-wider"
            style={{ color }}
          >
            › INVESTIGATION ACTIVE
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node tooltip (during investigation)
// ---------------------------------------------------------------------------

function NodeTooltip({ node, threat }: { node: CaseNode; threat: number }) {
  const color = NODE_COLOR[node.id] ?? "#00d4ff";
  const status = nodeStatusLabel(threat);
  const condition = nodeConditionText(node, threat);
  const fill =
    threat >= 70
      ? "#ef4444"
      : threat >= 40
        ? "#f59e0b"
        : threat >= 20
          ? "#facc15"
          : "#34d399";

  return (
    <div
      className="pointer-events-none absolute right-full top-0 z-50 mr-2 w-60 overflow-hidden rounded-lg"
      style={{
        background: "#07111e",
        border: `1px solid ${color}44`,
        boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
      }}
    >
      <div
        className="px-3 py-2"
        style={{
          borderBottom: `1px solid ${color}22`,
          background: `${color}0a`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[9px] font-mono tracking-widest font-bold"
            style={{ color }}
          >
            {node.id}
          </span>
          <span
            className="text-[8px] font-mono"
            style={{ color: status.color }}
          >
            {status.text}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] font-mono font-semibold text-white">
          {node.name}
        </div>
        <div className="text-[8px] font-mono" style={{ color: "#2a5070" }}>
          {node.domain}
        </div>
      </div>
      <div
        className="px-3 py-2"
        style={{ borderBottom: `1px solid ${color}11` }}
      >
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[8px] font-mono" style={{ color: "#4a6580" }}>
            COMPROMISE
          </span>
          <span
            className="text-[8px] font-mono tabular-nums"
            style={{ color: fill }}
          >
            {threat}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "#0f1927" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${threat}%`, background: fill }}
          />
        </div>
      </div>
      <div className="px-3 py-2">
        <p
          className="text-[9px] font-mono leading-[1.55]"
          style={{ color: "#6f87a1" }}
        >
          {condition}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SectorStatusPanelProps {
  activeSectorId: SectorId | null;
  pressureLevel: number;
  discoveredNodes: string[];
  remediations: RemediationResult[];
  onSectorClick: (sectorId: SectorId) => void;
  onOpenRemediation: () => void;
  proposalSubmitted: boolean;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SectorStatusPanel({
  activeSectorId,
  pressureLevel,
  discoveredNodes,
  remediations,
  onSectorClick,
  onOpenRemediation,
  proposalSubmitted,
}: SectorStatusPanelProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const isInvestigating = activeSectorId !== null;

  // Overall network integrity score
  const overallIntegrity = isInvestigating
    ? Math.max(
        0,
        Math.round(
          100 -
            CASE_NODES.reduce(
              (sum, n) =>
                sum +
                computeNodeThreat(n, discoveredNodes, remediations) /
                  CASE_NODES.length,
              0,
            ),
        ),
      )
    : Math.max(0, 100 - Math.round(pressureLevel * 9));

  const integrityColor =
    overallIntegrity >= 60
      ? "#34d399"
      : overallIntegrity >= 35
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div
      className="rpg-panel panel-slide-right flex h-full flex-col"
      style={{ width: 224 }}
    >
      {/* Header */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <h2
          className="text-[10px] font-mono uppercase tracking-[0.16em]"
          style={{ color: "#00d4ff" }}
        >
          {isInvestigating ? "Node Integrity" : "Sector Integrity"}
        </h2>
        <p
          className="mt-1 text-[9px] font-mono leading-4"
          style={{ color: "#2a5070" }}
        >
          {isInvestigating
            ? "Case: Midnight Exfiltration"
            : "Hover to inspect · Click to investigate"}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isInvestigating
          ? /* ── Node view ─────────────────────────────────────────────── */
            CASE_NODES.map((node) => {
              const threat = computeNodeThreat(
                node,
                discoveredNodes,
                remediations,
              );
              const status = nodeStatusLabel(threat);
              const color = NODE_COLOR[node.id] ?? "#00d4ff";
              const isHovered = hovered === node.id;
              const hasEvidence = discoveredNodes.includes(node.id);
              const remedCount = remediations.filter(
                (r) => r.target_node === node.id && r.success,
              ).length;

              return (
                <div key={node.id} className="relative">
                  {isHovered && <NodeTooltip node={node} threat={threat} />}
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: tooltip hover only */}
                  <div
                    className="w-full px-4 py-3 transition-all duration-150"
                    style={{
                      borderBottom: "1px solid #0e1824",
                      background: isHovered ? `${color}0d` : "transparent",
                    }}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Row 1: ID + status */}
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{
                            background: color,
                            boxShadow: isHovered ? `0 0 6px ${color}` : "none",
                          }}
                        />
                        <span
                          className="text-[10px] font-mono font-bold"
                          style={{ color: isHovered ? color : "#c9d8e8" }}
                        >
                          {node.id}
                        </span>
                      </div>
                      <span
                        className="text-[8px] font-mono tracking-wider"
                        style={{ color: status.color }}
                      >
                        {status.text}
                      </span>
                    </div>

                    {/* Node name */}
                    <div
                      className="mb-1 text-[8px] font-mono truncate"
                      style={{ color: "#4a6580" }}
                    >
                      {node.name}
                    </div>

                    {/* Threat bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ThreatBar threat={threat} color={color} />
                      </div>
                      <span
                        className="w-7 flex-shrink-0 text-right text-[8px] font-mono tabular-nums"
                        style={{ color: status.color }}
                      >
                        {threat}%
                      </span>
                    </div>

                    {/* Evidence / remediation badges */}
                    <div className="mt-1.5 flex gap-1.5">
                      {hasEvidence && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[7px] font-mono"
                          style={{
                            background: "rgba(0,212,255,0.08)",
                            color: "#00d4ff",
                          }}
                        >
                          evidence
                        </span>
                      )}
                      {remedCount > 0 && (
                        <span
                          className="rounded px-1.5 py-0.5 text-[7px] font-mono"
                          style={{
                            background: "rgba(52,211,153,0.08)",
                            color: "#34d399",
                          }}
                        >
                          {remedCount} fix{remedCount > 1 ? "es" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          : /* ── Sector view ────────────────────────────────────────────── */
            computeThreats(activeSectorId, pressureLevel).map(
              ({ sectorId, threat }) => {
                const color = SECTOR_COLORS[sectorId] ?? "#00d4ff";
                const isActive = sectorId === activeSectorId;
                const isHovered = hovered === sectorId;
                const statusColor =
                  threat >= 70
                    ? "#ef4444"
                    : threat >= 40
                      ? "#f59e0b"
                      : threat >= 20
                        ? "#facc15"
                        : "#34d399";
                const statusText =
                  threat >= 70
                    ? "BREACHED"
                    : threat >= 40
                      ? "ALERT"
                      : threat >= 20
                        ? "SUSPICIOUS"
                        : "SECURE";

                return (
                  <div key={sectorId} className="relative">
                    {isHovered && (
                      <SectorTooltip
                        sectorId={sectorId}
                        threat={threat}
                        isActive={isActive}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playButtonClick();
                        onSectorClick(sectorId);
                      }}
                      onMouseEnter={() => setHovered(sectorId)}
                      onMouseLeave={() => setHovered(null)}
                      className="w-full px-4 py-3 text-left transition-all duration-150"
                      style={{
                        borderBottom: "1px solid #0e1824",
                        background: isActive
                          ? `${color}18`
                          : isHovered
                            ? `${color}0d`
                            : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                            style={{
                              background: color,
                              boxShadow:
                                isActive || isHovered
                                  ? `0 0 6px ${color}`
                                  : "none",
                            }}
                          />
                          <span
                            className="text-[10px] font-mono font-bold"
                            style={{
                              color: isActive
                                ? color
                                : isHovered
                                  ? "#e2eaf2"
                                  : "#c9d8e8",
                            }}
                          >
                            {sectorId}
                          </span>
                        </div>
                        <span
                          className="text-[8px] font-mono tracking-wider"
                          style={{ color: statusColor }}
                        >
                          {statusText}
                        </span>
                      </div>
                      <div
                        className="mb-2 text-[8px] font-mono truncate"
                        style={{ color: "#4a6580" }}
                      >
                        {DOMAIN_LABEL_BY_SECTOR[sectorId]}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ThreatBar threat={threat} color={color} />
                        </div>
                        <span
                          className="w-8 flex-shrink-0 text-right text-[8px] font-mono tabular-nums"
                          style={{ color: statusColor }}
                        >
                          {threat}%
                        </span>
                      </div>
                    </button>
                  </div>
                );
              },
            )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid #1e3d5a" }}
      >
        {proposalSubmitted && isInvestigating && (
          <button
            type="button"
            onClick={onOpenRemediation}
            className="mb-3 w-full rounded py-2 text-[9px] font-mono uppercase tracking-widest transition-opacity hover:opacity-80"
            style={{
              background: "rgba(0,212,255,0.1)",
              border: "1px solid #00d4ff55",
              color: "#00d4ff",
            }}
          >
            ◈ Open Remediations
          </button>
        )}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[9px] font-mono" style={{ color: "#2a5070" }}>
            NETWORK INTEGRITY
          </span>
          <span
            className="text-[9px] font-mono tabular-nums"
            style={{ color: integrityColor }}
          >
            {overallIntegrity}%
          </span>
        </div>
        <div
          className="h-1 w-full overflow-hidden rounded-full"
          style={{ background: "#0f1927" }}
        >
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${overallIntegrity}%`,
              background: integrityColor,
            }}
          />
        </div>
      </div>
    </div>
  );
}
