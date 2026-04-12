"use client";

// TODO: Wire to real SystemNode + EvidenceArtifact data once backend is migrated.
// Currently renders mock data for a selected building/system node.

import type { EvidenceArtifact, SystemNode } from "@/types/investigation";

interface BuildingInspectorProps {
  node?: SystemNode;
  onClose?: () => void;
}

const STATUS_COLOR: Record<SystemNode["status"], string> = {
  clean: "#00ff88",
  suspicious: "#f59e0b",
  compromised: "#ff3a3a",
  offline: "#4a6580",
  recovered: "#00d4ff",
};

const STATUS_LABEL: Record<SystemNode["status"], string> = {
  clean: "CLEAN",
  suspicious: "SUSPICIOUS",
  compromised: "COMPROMISED",
  offline: "OFFLINE",
  recovered: "RECOVERED",
};

const ARTIFACT_ICON: Record<EvidenceArtifact["type"], string> = {
  log_entry:      "▷",
  deleted_file:   "▣",
  registry_key:   "◈",
  steg_payload:   "◆",
  network_packet: "~",
  process_record: "■",
  timeline_event: "○",
};

const AGENT_COLOR: Record<string, string> = {
  logis:  "#c9d8e8",
  nexus:  "#00d4ff",
  filer:  "#f59e0b",
  chrono: "#b06fff",
  echo:   "#00ff88",
};

// Mock node shown when nothing is selected
const MOCK_NODE: SystemNode = {
  id: "MAIL-01",
  label: "Mail Server 01",
  type: "server",
  status: "compromised",
  x: 12,
  y: 8,
  firstAlertAt: "2024-01-15T00:03:12Z",
  lastCleanAt: "2024-01-14T22:00:00Z",
  artifacts: [
    {
      id: "a1",
      nodeId: "MAIL-01",
      type: "log_entry",
      timestamp: "2024-01-15T00:03:12Z",
      summary: "Failed login from 192.168.4.21 — 47 attempts in 90s",
      confidence: 0.95,
      agentId: "logis",
      tags: ["brute_force", "auth_failure"],
    },
    {
      id: "a2",
      nodeId: "MAIL-01",
      type: "deleted_file",
      timestamp: "2024-01-15T01:02:09Z",
      summary: "auth.log deleted — partial recovery shows 312 lines",
      raw: "...recovered fragment: Jan 15 01:01:44 mail sshd[4821]: Accepted...",
      confidence: 0.78,
      agentId: "filer",
      tags: ["log_tampering", "evidence_destruction"],
    },
    {
      id: "a3",
      nodeId: "MAIL-01",
      type: "steg_payload",
      timestamp: "2024-01-15T00:42:00Z",
      summary: "Hidden payload in company-logo.png — 4.2KB encoded data",
      confidence: 0.62,
      agentId: "filer",
      tags: ["steganography", "exfiltration"],
    },
  ],
};

function ArtifactRow({ artifact }: { artifact: EvidenceArtifact }) {
  const confidencePct = Math.round(artifact.confidence * 100);
  const confColor =
    confidencePct >= 80 ? "#00ff88" : confidencePct >= 50 ? "#f59e0b" : "#ff3a3a";

  return (
    <div
      className="px-2 py-1.5"
      style={{ borderBottom: "1px solid #0d1520" }}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-[10px] font-mono mt-px" style={{ color: "#4a6580" }}>
          {ARTIFACT_ICON[artifact.type]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-mono leading-snug" style={{ color: "#c9d8e8" }}>
            {artifact.summary}
          </p>
          {artifact.raw && (
            <p
              className="mt-0.5 text-[8px] font-mono truncate"
              style={{ color: "#2a5070" }}
              title={artifact.raw}
            >
              {artifact.raw}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            {artifact.agentId && (
              <span
                className="text-[7px] font-mono uppercase"
                style={{ color: AGENT_COLOR[artifact.agentId] ?? "#4a6580" }}
              >
                {artifact.agentId}
              </span>
            )}
            <span className="text-[7px] font-mono" style={{ color: confColor }}>
              {confidencePct}% conf
            </span>
            {artifact.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[7px] font-mono px-1 rounded"
                style={{ background: "#0d1520", color: "#2a5070", border: "1px solid #1e3d5a" }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BuildingInspector({ node = MOCK_NODE, onClose }: BuildingInspectorProps) {
  const statusColor = STATUS_COLOR[node.status];

  return (
    <div
      className="rpg-panel flex flex-col"
      style={{ width: 360, maxHeight: 480 }}
      data-testid="building-inspector"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[8px] font-mono uppercase tracking-widest"
            style={{ color: "#00d4ff" }}
          >
            ◈ System Inspector
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[9px] font-mono transition-opacity hover:opacity-60"
            style={{ color: "#4a6580" }}
          >
            [X]
          </button>
        )}
      </div>

      {/* Node info */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono font-bold" style={{ color: "#c9d8e8" }}>
            {node.label}
          </span>
          <span
            className="text-[8px] font-mono px-2 py-0.5 rounded"
            style={{
              color: statusColor,
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}40`,
              textShadow: `0 0 6px ${statusColor}60`,
            }}
          >
            {STATUS_LABEL[node.status]}
          </span>
        </div>

        <div className="flex gap-4 text-[8px] font-mono">
          <div>
            <span style={{ color: "#2a5070" }}>ID: </span>
            <span style={{ color: "#4a6580" }}>{node.id}</span>
          </div>
          <div>
            <span style={{ color: "#2a5070" }}>Type: </span>
            <span style={{ color: "#4a6580" }}>{node.type}</span>
          </div>
          <div>
            <span style={{ color: "#2a5070" }}>Pos: </span>
            <span style={{ color: "#4a6580" }}>{node.x},{node.y}</span>
          </div>
        </div>

        {node.firstAlertAt && (
          <div className="mt-1 text-[8px] font-mono">
            <span style={{ color: "#2a5070" }}>First alert: </span>
            <span style={{ color: "#f59e0b" }}>
              {new Date(node.firstAlertAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Artifacts */}
      <div
        className="px-2 py-1.5 shrink-0"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>
            Evidence ({node.artifacts.length})
          </span>
          {/* TODO: add filter by artifact type */}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {node.artifacts.length === 0 ? (
          <div
            className="flex h-20 items-center justify-center text-[9px] font-mono"
            style={{ color: "#1e3d5a" }}
          >
            No artifacts recovered
          </div>
        ) : (
          node.artifacts.map((artifact) => (
            <ArtifactRow key={artifact.id} artifact={artifact} />
          ))
        )}
      </div>

      {/* TODO: connect to real SystemNode on building click via EventBridge */}
      <div
        className="px-3 py-1.5 shrink-0 text-[7px] font-mono"
        style={{ borderTop: "1px solid #1e3d5a", color: "#1e3d5a" }}
      >
        [Mock data — wire to EventBridge sim:building-click]
      </div>
    </div>
  );
}
