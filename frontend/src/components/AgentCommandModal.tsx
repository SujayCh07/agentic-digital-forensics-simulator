"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendNipsChat, setChatCallbacks } from "@/lib/investigationAgentClient";
import type {
  NipsAgentInstance,
  NipsChatMessage,
  NipsEvidenceUpdate,
  NipsToolActivity,
} from "@/types/investigation";

interface AgentCommandModalProps {
  agent: NipsAgentInstance;
  nodeContext: string;
  onClose: () => void;
  onEvidenceUpdate?: (ev: NipsEvidenceUpdate) => void;
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AgentCommandModal({
  agent,
  nodeContext,
  onClose,
  onEvidenceUpdate,
}: AgentCommandModalProps) {
  const [messages, setMessages] = useState<NipsChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [thoughtText, setThoughtText] = useState("");
  const [pendingText, setPendingText] = useState("");
  const [toolActivities, setToolActivities] = useState<NipsToolActivity[]>([]);
  const [showThoughts, setShowThoughts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setChatCallbacks({
      onThoughtChunk: (text) => {
        setThoughtText((prev) => prev + text);
      },
      onToolActivity: (activity) => {
        setToolActivities((prev) => [...prev, activity]);
      },
      onAssistantChunk: (text) => {
        setPendingText((prev) => prev + text);
      },
      onEvidenceUpdate: (ev) => {
        onEvidenceUpdate?.(ev);
      },
      onChatDone: (data) => {
        const finalText = data.full_answer || "";
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: finalText,
            createdAt: Date.now(),
          },
        ]);
        setIsStreaming(false);
        setThoughtText("");
        setPendingText("");
        setToolActivities([]);
      },
      onError: (msg) => {
        setError(msg);
        setIsStreaming(false);
        setThoughtText("");
        setPendingText("");
        setToolActivities([]);
      },
    });
  }, [onEvidenceUpdate]);

  const send = useCallback(() => {
    const value = input.trim();
    if (!value || isStreaming) return;

    setMessages((prev) => [
      ...prev,
      { id: uid(), role: "user", content: value, createdAt: Date.now() },
    ]);
    setInput("");
    setIsStreaming(true);
    setError(null);
    setThoughtText("");
    setPendingText("");
    setToolActivities([]);

    sendNipsChat(agent.instance_id, value, nodeContext);
  }, [input, isStreaming, agent.instance_id, nodeContext]);

  const statBar = (label: string, value: number) => {
    const pct = Math.round(value * 100);
    return (
      <div className="flex items-center gap-2">
        <span className="w-24 text-[9px] font-mono uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <div className="h-1.5 flex-1 rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[var(--accent-cyan)]"
            style={{ width: `${pct}%`, opacity: 0.5 + value * 0.5 }}
          />
        </div>
        <span className="w-8 text-right text-[9px] font-mono text-[var(--muted)]">
          {pct}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        tabIndex={-1}
        onClick={onClose}
      />

      <div className="rpg-panel relative flex h-[min(820px,94vh)] w-full max-w-5xl overflow-hidden">
        {/* LEFT: Profile panel */}
        <div className="w-72 shrink-0 overflow-y-auto border-r border-white/10 px-4 py-4">
          <div className="mb-3">
            <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
              {agent.archetype}
            </p>
            <h2 className="mt-1 text-base font-pixel">{agent.display_name}</h2>
            <p className="text-[10px] font-mono text-[var(--muted)]">
              {agent.codename} &middot; {agent.role_level}
            </p>
          </div>

          <div className="mb-3 rounded border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-cyan)]">
              Bio
            </p>
            <p className="mt-1 text-[10px] font-mono leading-relaxed text-[var(--foreground)]">
              {agent.bio}
            </p>
          </div>

          <div className="mb-3 space-y-1">
            <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-cyan)]">
              Stats
            </p>
            {statBar("Thorough", agent.thoroughness)}
            {statBar("Speed", agent.speed)}
            {statBar("Reliable", agent.reliability)}
            {statBar("Creative", agent.creativity)}
            {statBar("Caution", agent.caution)}
            {statBar("Confidence", agent.confidence_level)}
            {statBar("Resilience", agent.pressure_resilience)}
          </div>

          <div className="mb-3">
            <p className="text-[9px] font-mono uppercase tracking-wider text-[var(--accent-cyan)]">
              Specialties
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {agent.primary_specialties.map((s) => (
                <span
                  key={s}
                  className="rounded border border-[var(--accent-cyan)]/30 px-1.5 py-0.5 text-[8px] font-mono text-[var(--foreground)]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <p className="text-[9px] font-mono uppercase tracking-wider text-red-400/80">
              Weak Areas
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {agent.weak_areas.map((w) => (
                <span
                  key={w}
                  className="rounded border border-red-400/20 px-1.5 py-0.5 text-[8px] font-mono text-[var(--muted)]"
                >
                  {w}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {agent.profile_tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-white/5 px-1.5 py-0.5 text-[8px] font-mono text-[var(--muted)]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="text-[9px] font-mono text-[var(--muted)]">
            <p>Exp: {agent.years_experience} years</p>
            <p>Style: {agent.personality_type}</p>
            <p>Comm: {agent.communication_style}</p>
          </div>
        </div>

        {/* RIGHT: Chat panel */}
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
                Command Channel — {agent.display_name}
              </p>
              {nodeContext && (
                <p className="mt-0.5 text-[9px] font-mono text-[var(--muted)]">
                  Context: {nodeContext}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/15 px-3 py-1.5 text-[10px] font-mono uppercase hover:bg-white/5"
            >
              Close
            </button>
          </div>

          {/* Starter prompts */}
          <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-4 py-2">
            {agent.starter_prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isStreaming}
                onClick={() => {
                  setInput(prompt);
                  textareaRef.current?.focus();
                }}
                className="rounded border border-[var(--accent-cyan)]/30 px-2 py-1 text-[9px] font-mono text-[var(--foreground)] hover:bg-[var(--accent-cyan)]/10 disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === "user"
                      ? "flex justify-end"
                      : msg.role === "system"
                        ? "flex justify-center"
                        : "flex justify-start"
                  }
                >
                  <div
                    className={`max-w-[88%] rounded border px-3 py-2 ${
                      msg.role === "user"
                        ? "border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan)]/8"
                        : msg.role === "system"
                          ? "border-amber-400/30 bg-amber-400/10 text-center"
                          : "border-white/12 bg-white/4"
                    }`}
                  >
                    <div
                      className="mb-1 text-[9px] font-mono uppercase tracking-[0.18em]"
                      style={{
                        color:
                          msg.role === "user"
                            ? "var(--accent-cyan)"
                            : msg.role === "system"
                              ? "#fbbf24"
                              : "#f0f4f8",
                      }}
                    >
                      {msg.role === "user"
                        ? "Operator"
                        : msg.role === "system"
                          ? "System"
                          : agent.codename}
                    </div>
                    <p className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed text-[var(--foreground)]">
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* Streaming state */}
              {isStreaming && (
                <div className="space-y-2">
                  {/* Thinking section */}
                  {thoughtText && (
                    <div className="rounded border border-purple-400/20 bg-purple-400/5 px-3 py-2">
                      <button
                        type="button"
                        className="mb-1 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.18em] text-purple-300"
                        onClick={() => setShowThoughts((p) => !p)}
                      >
                        <span className="inline-block animate-pulse">
                          &#x25CF;
                        </span>
                        Thinking...
                        <span className="text-[8px] text-purple-300/60">
                          {showThoughts ? "▼" : "▶"}
                        </span>
                      </button>
                      {showThoughts && (
                        <p className="whitespace-pre-wrap text-[10px] font-mono leading-relaxed text-purple-200/70">
                          {thoughtText}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Tool activity */}
                  {toolActivities.length > 0 && (
                    <div className="space-y-1">
                      {toolActivities.map((ta, i) => (
                        <div
                          key={`${ta.tool}-${i}`}
                          className="flex items-center gap-2 rounded border border-amber-400/20 bg-amber-400/5 px-3 py-1.5"
                        >
                          <span
                            className={`text-[9px] font-mono ${
                              ta.status === "started"
                                ? "animate-pulse text-amber-300"
                                : "text-green-300"
                            }`}
                          >
                            {ta.status === "started" ? "⟳" : "✓"}
                          </span>
                          <span className="text-[9px] font-mono text-amber-200">
                            {ta.tool}
                            {ta.status === "started" ? "..." : ""}
                          </span>
                          {ta.status === "completed" && ta.severity && (
                            <span className="ml-auto text-[8px] font-mono uppercase text-[var(--muted)]">
                              {ta.severity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Streaming answer text */}
                  {pendingText && (
                    <div className="flex justify-start">
                      <div className="max-w-[88%] rounded border border-white/12 bg-white/4 px-3 py-2">
                        <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#f0f4f8]">
                          {agent.codename}
                        </div>
                        <p className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed text-[var(--foreground)]">
                          {pendingText}
                          <span className="animate-pulse">▊</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Loading indicator when nothing has appeared yet */}
                  {!thoughtText &&
                    !pendingText &&
                    toolActivities.length === 0 && (
                      <div className="flex justify-start">
                        <div className="rounded border border-white/12 bg-white/4 px-3 py-2">
                          <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                            {agent.codename}
                          </div>
                          <p className="text-[11px] font-mono text-[var(--muted)] animate-pulse">
                            Processing request...
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div ref={endRef} />
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-white/10 px-4 py-3">
            {error && (
              <div className="mb-2 text-[10px] font-mono text-red-300">
                {error}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                className="min-h-[56px] flex-1 resize-none rounded border border-white/15 bg-transparent px-3 py-2 text-[11px] font-mono text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
                placeholder={`Ask ${agent.codename} a question or request an investigation action...`}
              />
              <button
                type="button"
                onClick={send}
                disabled={isStreaming || !input.trim()}
                className="rounded border border-[var(--accent-cyan)] px-4 py-2 text-[10px] font-mono uppercase text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/10 disabled:opacity-40"
              >
                Send
              </button>
            </div>
            <div className="mt-1.5 text-[8px] font-mono uppercase tracking-[0.16em] text-[var(--muted)]">
              Enter to send &middot; Shift+Enter for newline &middot; Esc to
              close
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
