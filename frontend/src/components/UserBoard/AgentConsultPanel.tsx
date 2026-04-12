"use client";

/**
 * EchoLocate agent consultation panel.
 *
 * Right sidebar for the case board. Shows:
 * - Selected items summary
 * - Agent selector for consultation
 * - Consultation history
 */

import { useState } from "react";
import type { AgentId, AgentResult, ConsultationResponse } from "@/types/investigation";

const AGENTS: { id: AgentId; name: string; color: string; specialty: string }[] = [
  { id: "logis", name: "LOGIS", color: "#c9d8e8", specialty: "Logs & Auth" },
  { id: "nexus", name: "NEXUS", color: "#00d4ff", specialty: "Network Traces" },
  { id: "filer", name: "FILER", color: "#f59e0b", specialty: "Files & Artifacts" },
  { id: "chrono", name: "CHRONO", color: "#b06fff", specialty: "Timeline" },
];

const TONE_LABEL: Record<string, { icon: string; color: string }> = {
  agreement:     { icon: "✓", color: "#00ff88" },
  skepticism:    { icon: "?", color: "#f59e0b" },
  contradiction: { icon: "✕", color: "#ff3a3a" },
  nuance:        { icon: "~", color: "#00d4ff" },
  suggestion:    { icon: "→", color: "#b06fff" },
};

interface AgentConsultPanelProps {
  selectedFindings: AgentResult[];
  consultations: ConsultationResponse[];
  onConsult: (agentId: AgentId) => void;
  lockedAgents?: AgentId[];
}

export function AgentConsultPanel({
  selectedFindings,
  consultations,
  onConsult,
  lockedAgents = [],
}: AgentConsultPanelProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <h3 className="text-[11px] font-mono uppercase tracking-[0.18em]" style={{ color: "#b06fff" }}>
          Agent Consultation
        </h3>
      </div>

      {/* Selected items summary */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2" style={{ color: "#2a5070" }}>
          {selectedFindings.length > 0
            ? `${selectedFindings.length} finding${selectedFindings.length !== 1 ? "s" : ""} selected`
            : "Select findings to consult"
          }
        </div>

        {selectedFindings.length > 0 && (
          <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
            {selectedFindings.map((f) => (
              <div
                key={`${f.nodeId}:${f.taskType}`}
                className="text-[10px] font-mono px-2 py-1.5 rounded truncate"
                style={{ color: "#4a6580", background: "#1e3d5a20" }}
              >
                {f.agentName} → {f.nodeName}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Agent buttons */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2" style={{ color: "#2a5070" }}>
          Ask Agent
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AGENTS.map((agent) => {
            const isLocked = lockedAgents.includes(agent.id);
            const canConsult = selectedFindings.length > 0 && !isLocked;

            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => canConsult && onConsult(agent.id)}
                disabled={!canConsult}
                className="flex flex-col items-start p-2.5 rounded transition-all text-left"
                style={{
                  background: canConsult ? `${agent.color}08` : "#0d1520",
                  border: `1px solid ${canConsult ? `${agent.color}40` : "#1e3d5a"}`,
                  cursor: canConsult ? "pointer" : "not-allowed",
                  opacity: canConsult ? 1 : 0.5,
                }}
              >
                <span
                  className="text-[11px] font-mono font-bold"
                  style={{ color: isLocked ? "#2a5070" : agent.color }}
                >
                  {agent.name}
                </span>
                <span className="text-[9px] font-mono" style={{ color: "#2a5070" }}>
                  {isLocked ? "🔒 Locked" : agent.specialty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Consultation history */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2" style={{ color: "#2a5070" }}>
          Consultation Log
        </div>

        {consultations.length === 0 && (
          <div className="text-[11px] font-mono italic leading-relaxed" style={{ color: "#1e3d5a" }}>
            No consultations yet. Select evidence and ask an agent.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {[...consultations].reverse().map((c, i) => {
            const toneInfo = TONE_LABEL[c.tone] ?? TONE_LABEL.nuance;
            const idx = consultations.length - 1 - i;
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={c.timestamp}
                className="rounded cursor-pointer transition-all"
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                style={{
                  background: "rgba(8,12,18,0.8)",
                  border: "1px solid #1e3d5a",
                  padding: "10px 12px",
                }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[12px] font-mono" style={{ color: toneInfo.color }}>
                    {toneInfo.icon}
                  </span>
                  <span
                    className="text-[11px] font-mono font-bold"
                    style={{ color: AGENTS.find(a => a.id === c.agentId)?.color ?? "#4a6580" }}
                  >
                    {c.agentName}
                  </span>
                  <span className="text-[9px] font-mono uppercase" style={{ color: toneInfo.color }}>
                    {c.tone}
                  </span>
                </div>
                <p
                  className={`text-[10px] font-mono leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`}
                  style={{ color: "#4a6580" }}
                >
                  {c.message}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
