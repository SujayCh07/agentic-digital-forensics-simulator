"use client";

import { useEffect, useRef } from "react";
import type {
  RadioExchange,
  RadioStatus,
  UseRadioReturn,
} from "@/hooks/useRadio";
import type { NipsAgentInstance } from "@/types/investigation";

// ---------------------------------------------------------------------------
// RadioButton — compact HUD toggle
// ---------------------------------------------------------------------------

export function RadioButton({
  isOpen,
  status,
  onClick,
}: {
  isOpen: boolean;
  status: RadioStatus;
  onClick: () => void;
}) {
  const isActive = status !== "idle";

  return (
    <button
      type="button"
      onClick={onClick}
      className="rpg-panel px-2.5 py-1.5 text-[8px] font-mono uppercase tracking-widest transition-all hover:opacity-80 flex items-center gap-1.5"
      style={{
        color: isOpen ? "#00ff88" : isActive ? "#f59e0b" : "#4a6580",
        border: `1px solid ${isOpen ? "#00ff88" : isActive ? "#f59e0b" : "#1e3d5a"}`,
        boxShadow: isActive
          ? "0 0 8px rgba(245,158,11,0.3)"
          : isOpen
            ? "0 0 8px rgba(0,255,136,0.2)"
            : undefined,
      }}
    >
      {isActive && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full animate-pulse"
          style={{ background: "#f59e0b" }}
        />
      )}
      RADIO
    </button>
  );
}

// ---------------------------------------------------------------------------
// Status indicator
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  RadioStatus,
  { label: string; color: string; pulse: boolean }
> = {
  idle: { label: "STANDBY", color: "#2a5070", pulse: false },
  listening: { label: "LISTENING", color: "#ff3a3a", pulse: true },
  transcribing: { label: "TRANSCRIBING", color: "#f59e0b", pulse: true },
  thinking: { label: "AGENT THINKING", color: "#b06fff", pulse: true },
  speaking: { label: "RECEIVING", color: "#00ff88", pulse: true },
};

function StatusIndicator({ status }: { status: RadioStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-1.5 w-1.5 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.color }}
      />
      <span
        className="text-[7px] font-mono uppercase tracking-widest"
        style={{ color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgentSelector
// ---------------------------------------------------------------------------

function AgentSelector({
  agents,
  selected,
  onSelect,
}: {
  agents: NipsAgentInstance[];
  selected: NipsAgentInstance | null;
  onSelect: (agent: NipsAgentInstance) => void;
}) {
  const archetypeColor: Record<string, string> = {
    LOGIS: "#22d3ee",
    NEXUS: "#a78bfa",
    FILER: "#f59e0b",
    CHRONO: "#34d399",
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {agents.map((agent) => {
        const isSelected = selected?.instance_id === agent.instance_id;
        const color = archetypeColor[agent.archetype] ?? "#4a6580";
        return (
          <button
            type="button"
            key={agent.instance_id}
            onClick={() => onSelect(agent)}
            className="px-2 py-1 rounded text-[8px] font-mono transition-all"
            style={{
              background: isSelected ? `${color}20` : "rgba(13,21,32,0.6)",
              border: `1px solid ${isSelected ? color : "#1e3d5a"}`,
              color: isSelected ? color : "#4a6580",
              boxShadow: isSelected ? `0 0 6px ${color}30` : undefined,
            }}
          >
            <span className="font-bold">{agent.archetype}</span>
            <span className="ml-1 opacity-60">{agent.display_name}</span>
          </button>
        );
      })}
      {agents.length === 0 && (
        <span className="text-[8px] font-mono" style={{ color: "#2a5070" }}>
          No agents deployed
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PushToTalkButton
// ---------------------------------------------------------------------------

function PushToTalkButton({
  status,
  isRecording,
  disabled,
  onPressStart,
  onPressEnd,
}: {
  status: RadioStatus;
  isRecording: boolean;
  disabled: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
}) {
  const busy = status !== "idle" && status !== "listening";

  return (
    <button
      type="button"
      disabled={disabled || busy}
      onPointerDown={disabled || busy ? undefined : onPressStart}
      onPointerUp={disabled || busy ? undefined : onPressEnd}
      onPointerLeave={isRecording ? onPressEnd : undefined}
      className="relative w-full py-3 rounded font-mono text-[10px] uppercase tracking-widest transition-all select-none touch-none"
      style={{
        background: isRecording
          ? "rgba(255,58,58,0.15)"
          : busy
            ? "rgba(176,111,255,0.08)"
            : disabled
              ? "rgba(13,21,32,0.6)"
              : "rgba(0,212,255,0.08)",
        border: `1px solid ${
          isRecording
            ? "#ff3a3a"
            : busy
              ? "#b06fff40"
              : disabled
                ? "#1e3d5a"
                : "#00d4ff40"
        }`,
        color: isRecording
          ? "#ff3a3a"
          : busy
            ? "#b06fff"
            : disabled
              ? "#2a5070"
              : "#00d4ff",
        cursor: disabled || busy ? "not-allowed" : "pointer",
        boxShadow: isRecording
          ? "0 0 16px rgba(255,58,58,0.2), inset 0 0 20px rgba(255,58,58,0.05)"
          : undefined,
      }}
    >
      {isRecording ? (
        <span className="flex items-center justify-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#ff3a3a] animate-pulse" />
          TRANSMITTING — RELEASE TO SEND
        </span>
      ) : busy ? (
        `${STATUS_CONFIG[status].label}...`
      ) : disabled ? (
        "SELECT AN AGENT FIRST"
      ) : (
        "HOLD TO TRANSMIT"
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// RadioTranscriptLog
// ---------------------------------------------------------------------------

function RadioTranscriptLog({
  exchanges,
  currentTranscript,
  currentResponse,
  status,
}: {
  exchanges: RadioExchange[];
  currentTranscript: string;
  currentResponse: string;
  status: RadioStatus;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  });

  const hasLiveContent =
    currentTranscript || currentResponse || status === "listening";

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2 scrollbar-thin"
      style={{ minHeight: 0 }}
    >
      {/* Live exchange */}
      {hasLiveContent && (
        <div
          className="rounded px-2 py-1.5"
          style={{
            background: "rgba(0,212,255,0.04)",
            border: "1px solid #1e3d5a",
          }}
        >
          {currentTranscript && (
            <div className="mb-1">
              <span
                className="text-[7px] font-mono uppercase tracking-widest"
                style={{ color: "#00d4ff" }}
              >
                YOU
              </span>
              <p
                className="text-[9px] font-mono mt-0.5 leading-relaxed"
                style={{ color: "#c9d8e8" }}
              >
                {currentTranscript}
              </p>
            </div>
          )}
          {status === "listening" && !currentTranscript && (
            <p
              className="text-[8px] font-mono animate-pulse"
              style={{ color: "#ff3a3a" }}
            >
              Listening...
            </p>
          )}
          {status === "transcribing" && (
            <p
              className="text-[8px] font-mono animate-pulse"
              style={{ color: "#f59e0b" }}
            >
              Transcribing audio...
            </p>
          )}
          {status === "thinking" && (
            <p
              className="text-[8px] font-mono animate-pulse"
              style={{ color: "#b06fff" }}
            >
              Agent processing...
            </p>
          )}
          {currentResponse && (
            <div
              className="mt-1 pt-1"
              style={{ borderTop: "1px solid #1e3d5a" }}
            >
              <span
                className="text-[7px] font-mono uppercase tracking-widest"
                style={{ color: "#00ff88" }}
              >
                AGENT
              </span>
              <p
                className="text-[9px] font-mono mt-0.5 leading-relaxed"
                style={{ color: "#c9d8e8" }}
              >
                {currentResponse}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Past exchanges */}
      {exchanges.map((ex) => (
        <div
          key={ex.id}
          className="rounded px-2 py-1.5"
          style={{ background: "rgba(13,21,32,0.5)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-[7px] font-mono uppercase tracking-widest"
              style={{ color: "#4a6580" }}
            >
              {ex.agentArchetype} — {ex.agentName}
            </span>
            <span
              className="text-[7px] font-mono tabular-nums"
              style={{ color: "#1e3d5a" }}
            >
              {new Date(ex.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="mb-1">
            <span
              className="text-[7px] font-mono"
              style={{ color: "#00d4ff80" }}
            >
              YOU:{" "}
            </span>
            <span className="text-[8px] font-mono" style={{ color: "#4a6580" }}>
              {ex.userTranscript}
            </span>
          </div>
          <div>
            <span
              className="text-[7px] font-mono"
              style={{ color: "#00ff8880" }}
            >
              AGENT:{" "}
            </span>
            <span className="text-[8px] font-mono" style={{ color: "#c9d8e8" }}>
              {ex.agentResponse.length > 200
                ? `${ex.agentResponse.slice(0, 200)}...`
                : ex.agentResponse}
            </span>
          </div>
        </div>
      ))}

      {!hasLiveContent && exchanges.length === 0 && (
        <div className="flex h-full items-center justify-center">
          <span
            className="text-[8px] font-mono uppercase tracking-widest"
            style={{ color: "#1e3d5a" }}
          >
            No transmissions yet
          </span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RadioPanel — main comms panel
// ---------------------------------------------------------------------------

export function RadioPanel({
  radio,
  agents,
}: {
  radio: UseRadioReturn;
  agents: NipsAgentInstance[];
}) {
  if (!radio.isOpen) return null;

  return (
    <div
      className="fixed bottom-0 left-1/2 z-[90] flex flex-col animate-[slideUp_200ms_ease-out]"
      style={{
        transform: "translateX(-50%)",
        width: 420,
        maxHeight: "45vh",
        background: "rgba(8,12,18,0.97)",
        border: "1px solid #1e3d5a",
        borderBottom: "none",
        borderRadius: "8px 8px 0 0",
        boxShadow: "0 -4px 30px rgba(0,0,0,0.6), 0 0 1px rgba(0,212,255,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid #1e3d5a" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-mono font-bold tracking-wide"
            style={{ color: "#00d4ff" }}
          >
            ◈ COMMS RADIO
          </span>
          <StatusIndicator status={radio.status} />
        </div>
        <button
          type="button"
          onClick={() => radio.setIsOpen(false)}
          className="text-[9px] font-mono transition-opacity hover:opacity-60"
          style={{ color: "#4a6580" }}
        >
          [CLOSE]
        </button>
      </div>

      {/* Agent selector */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: "1px solid #0d1520" }}
      >
        <div
          className="text-[7px] font-mono uppercase tracking-widest mb-1"
          style={{ color: "#2a5070" }}
        >
          CHANNEL
        </div>
        <AgentSelector
          agents={agents}
          selected={radio.selectedAgent}
          onSelect={radio.setSelectedAgent}
        />
      </div>

      {/* Permission denied warning */}
      {radio.permissionDenied && (
        <div
          className="mx-3 mt-2 px-2 py-1.5 rounded text-[8px] font-mono"
          style={{
            background: "rgba(255,58,58,0.08)",
            border: "1px solid #ff3a3a40",
            color: "#ff3a3a",
          }}
        >
          Microphone access denied. Please allow microphone permission and try
          again.
        </div>
      )}

      {radio.lastError && (
        <div
          className="mx-3 mt-2 px-2 py-1.5 rounded text-[8px] font-mono leading-relaxed"
          style={{
            background: "rgba(245,158,11,0.08)",
            border: "1px solid #f59e0b40",
            color: "#f59e0b",
          }}
        >
          <div className="flex justify-between gap-2">
            <span>{radio.lastError}</span>
            <button
              type="button"
              onClick={() => radio.clearLastError()}
              className="shrink-0 underline opacity-70 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Transcript log */}
      <RadioTranscriptLog
        exchanges={radio.exchanges}
        currentTranscript={radio.currentTranscript}
        currentResponse={radio.currentResponse}
        status={radio.status}
      />

      {/* PTT button */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderTop: "1px solid #1e3d5a" }}
      >
        <PushToTalkButton
          status={radio.status}
          isRecording={radio.isRecording}
          disabled={!radio.selectedAgent}
          onPressStart={radio.startRecording}
          onPressEnd={radio.stopRecording}
        />
      </div>

      {/* Radio static decoration */}
      <div
        className="h-px shrink-0"
        style={{
          background:
            "repeating-linear-gradient(90deg, #1e3d5a 0px, #1e3d5a 2px, transparent 2px, transparent 6px)",
        }}
      />
    </div>
  );
}
