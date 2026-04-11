"use client";

// TODO: Wire to backend WebSocket once investigation domain is migrated.
// For now renders mock ECHO state and accepts static props.

import { useState } from "react";
import type { EchoHypothesis } from "@/types/investigation";

interface EchoPanelProps {
  hypothesis?: EchoHypothesis;
  /** 0–1 overall confidence */
  confidence?: number;
  isThinking?: boolean;
  onQuery?: (question: string) => void;
}

const MOCK_QUESTIONS = [
  "Which systems had activity after midnight?",
  "Where did NEXUS find the most suspicious traffic?",
  "What's your current theory?",
  "Which node was patient zero?",
];

function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75 ? "#00ff88" : pct >= 45 ? "#f59e0b" : "#ff3a3a";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: "#4a6580" }}>
        Confidence
      </span>
      <div
        className="flex-1 h-1.5 rounded-sm overflow-hidden"
        style={{ background: "#1e3d5a" }}
      >
        <div
          className="h-full rounded-sm transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>
      <span
        className="text-[9px] font-mono tabular-nums"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}

export function EchoPanel({
  hypothesis,
  confidence = 0,
  isThinking = false,
  onQuery,
}: EchoPanelProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (q: string) => {
    if (!q.trim()) return;
    onQuery?.(q.trim());
    setInput("");
  };

  return (
    <div className="rpg-panel flex flex-col h-full" data-testid="echo-panel">
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
            ◈ ECHO
          </span>
          {isThinking && (
            <span
              className="text-[8px] font-mono animate-pulse"
              style={{ color: "#4a6580" }}
            >
              thinking...
            </span>
          )}
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1">
          <div
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: isThinking ? "#f59e0b" : "#00ff88",
              boxShadow: `0 0 4px ${isThinking ? "#f59e0b" : "#00ff88"}`,
            }}
          />
          <span className="text-[7px] font-mono uppercase tracking-widest" style={{ color: "#2a5070" }}>
            {isThinking ? "processing" : "online"}
          </span>
        </div>
      </div>

      {/* Confidence meter */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
        <ConfidenceMeter value={confidence} />
      </div>

      {/* Hypothesis summary */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
        <div className="text-[8px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "#2a5070" }}>
          Current Hypothesis
        </div>
        {hypothesis ? (
          <div className="space-y-1">
            {hypothesis.originNodeId && (
              <div className="flex gap-1.5 text-[9px] font-mono">
                <span style={{ color: "#2a5070" }}>Origin:</span>
                <span style={{ color: "#c9d8e8" }}>{hypothesis.originNodeId}</span>
              </div>
            )}
            {hypothesis.payloadType && (
              <div className="flex gap-1.5 text-[9px] font-mono">
                <span style={{ color: "#2a5070" }}>Type:</span>
                <span style={{ color: "#f59e0b" }}>{hypothesis.payloadType}</span>
              </div>
            )}
            {hypothesis.attackPath.length > 0 && (
              <div className="flex gap-1.5 text-[9px] font-mono">
                <span style={{ color: "#2a5070" }}>Path:</span>
                <span style={{ color: "#c9d8e8" }}>{hypothesis.attackPath.join(" → ")}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[9px] font-mono italic" style={{ color: "#1e3d5a" }}>
            {/* TODO: replace with real hypothesis once backend wired */}
            Gathering evidence... no hypothesis yet.
          </p>
        )}
      </div>

      {/* Open questions */}
      {hypothesis?.openQuestions && hypothesis.openQuestions.length > 0 && (
        <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
          <div className="text-[8px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "#f59e0b" }}>
            ⚠ Open Questions
          </div>
          <ul className="space-y-1">
            {hypothesis.openQuestions.slice(0, 3).map((q, i) => (
              <li key={i} className="text-[9px] font-mono" style={{ color: "#4a6580" }}>
                — {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick query suggestions */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: "1px solid #1e3d5a" }}>
        <div className="text-[8px] font-mono uppercase tracking-widest mb-1.5" style={{ color: "#2a5070" }}>
          Quick Queries
        </div>
        <div className="flex flex-wrap gap-1">
          {MOCK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleSubmit(q)}
              className="text-[8px] font-mono px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
              style={{
                background: "rgba(0,212,255,0.06)",
                border: "1px solid #1e3d5a",
                color: "#4a6580",
              }}
            >
              {q.slice(0, 28)}…
            </button>
          ))}
        </div>
      </div>

      {/* Query input */}
      <div className="px-3 py-2 shrink-0 mt-auto">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit(input)}
            placeholder="Ask ECHO anything..."
            className="flex-1 bg-transparent text-[9px] font-mono outline-none px-2 py-1 rounded"
            style={{
              background: "#080c12",
              border: "1px solid #1e3d5a",
              color: "#c9d8e8",
              caretColor: "#00d4ff",
            }}
          />
          <button
            type="button"
            onClick={() => handleSubmit(input)}
            className="px-2 py-1 text-[8px] font-mono rounded transition-opacity hover:opacity-80"
            style={{
              background: "rgba(0,212,255,0.1)",
              border: "1px solid #1e3d5a",
              color: "#00d4ff",
            }}
          >
            ASK
          </button>
        </div>
        <p className="mt-1 text-[7px] font-mono" style={{ color: "#1e3d5a" }}>
          {/* TODO: connect to real ECHO LLM via WebSocket */}
          [ECHO responses not yet wired to backend]
        </p>
      </div>
    </div>
  );
}
