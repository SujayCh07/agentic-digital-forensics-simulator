"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chatWithInvestigationAgent } from "@/lib/investigationAgentClient";
import type {
  AgentDefinition,
  AgentResult,
  InvestigationAgentSession,
  InvestigationRecentEvent,
  InvestigationTaskDispatch,
  SystemNode,
} from "@/types/investigation";

interface AgentCommandModalProps {
  agent: AgentDefinition;
  session: InvestigationAgentSession;
  currentObjective: string;
  selectedNode: SystemNode | null;
  completedFindings: AgentResult[];
  recentEvents: InvestigationRecentEvent[];
  onClose: () => void;
  onSessionChange: (session: InvestigationAgentSession) => void;
  onDispatchTask: (dispatch: InvestigationTaskDispatch) => string | null;
}

function createMessage(
  role: InvestigationAgentSession["messages"][number]["role"],
  content: string,
) {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: Date.now(),
  };
}

export function AgentCommandModal({
  agent,
  session,
  currentObjective,
  selectedNode,
  completedFindings,
  recentEvents,
  onClose,
  onSessionChange,
  onDispatchTask,
}: AgentCommandModalProps) {
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const statusLabel = useMemo(() => {
    return agent.currentStatus.replaceAll("_", " ");
  }, [agent.currentStatus]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when transcript changes
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages.length, isThinking]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const send = useCallback(async () => {
    const value = input.trim();
    if (!value || isThinking) return;

    const userMessage = createMessage("user", value);
    const pendingSession = {
      interactionId: session.interactionId,
      messages: [...session.messages, userMessage],
    };

    onSessionChange(pendingSession);
    setInput("");
    setIsThinking(true);
    setError(null);

    try {
      const response = await chatWithInvestigationAgent({
        agentId: agent.id,
        message: value,
        previousInteractionId: session.interactionId,
        currentObjective,
        agentStatus: agent.currentStatus,
        selectedNode,
        completedFindings,
        recentEvents,
      });

      const nextMessages = [
        ...pendingSession.messages,
        createMessage("agent", response.reply),
      ];

      if (response.dispatchedTask) {
        const dispatchError = onDispatchTask(response.dispatchedTask);
        if (dispatchError) {
          nextMessages.push(createMessage("system", dispatchError));
        } else {
          nextMessages.push(
            createMessage(
              "system",
              `${agent.name} dispatched ${response.dispatchedTask.taskType} on ${
                selectedNode?.name ?? "the selected system"
              }. Findings will stream into the evidence feed.`,
            ),
          );
        }
      }

      onSessionChange({
        interactionId: response.interactionId,
        messages: nextMessages,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Agent response failed.";
      setError(message);
      onSessionChange({
        interactionId: session.interactionId,
        messages: [
          ...pendingSession.messages,
          createMessage("system", message),
        ],
      });
    } finally {
      setIsThinking(false);
      textareaRef.current?.focus();
    }
  }, [
    agent.currentStatus,
    agent.id,
    agent.name,
    completedFindings,
    currentObjective,
    input,
    isThinking,
    onDispatchTask,
    onSessionChange,
    recentEvents,
    selectedNode,
    session.interactionId,
    session.messages,
  ]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 px-4 py-6">
      <button
        type="button"
        aria-label={`Close ${agent.name} command channel`}
        className="absolute inset-0"
        tabIndex={-1}
        onClick={onClose}
      />
      <div className="rpg-panel relative flex h-[min(760px,92vh)] w-full max-w-3xl flex-col overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[var(--accent-cyan)]">
                {agent.name} / {agent.title}
              </p>
              <h2 className="mt-1 text-lg font-pixel">{agent.specialty}</h2>
              <p className="mt-2 max-w-2xl text-[11px] font-mono text-[var(--muted)]">
                {agent.personality} {agent.communicationStyle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/15 px-3 py-2 text-[10px] font-mono uppercase"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--muted)]">
            <span className="rounded border border-white/10 px-2 py-1">
              {agent.experienceYears} years experience
            </span>
            <span className="rounded border border-white/10 px-2 py-1">
              status: {statusLabel}
            </span>
            <span className="rounded border border-white/10 px-2 py-1">
              target: {selectedNode?.name ?? "none selected"}
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)]">
            <div className="rounded border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                Current Objective
              </p>
              <p className="mt-1 text-[11px] font-mono text-[var(--foreground)]">
                {currentObjective}
              </p>
            </div>
            <div className="rounded border border-white/10 bg-black/20 px-3 py-2">
              <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--accent-cyan)]">
                Expertise
              </p>
              <p className="mt-1 text-[11px] font-mono text-[var(--foreground)]">
                {agent.expertiseAreas.join(" • ")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {agent.starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isThinking}
                onClick={() => {
                  setInput(prompt);
                  textareaRef.current?.focus();
                }}
                className="rounded border border-[var(--accent-cyan)]/40 px-2 py-1 text-[10px] font-mono text-[var(--foreground)] disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {session.messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "flex justify-end"
                    : message.role === "system"
                      ? "flex justify-center"
                      : "flex justify-start"
                }
              >
                <div
                  className={
                    message.role === "system"
                      ? "max-w-[92%] rounded border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center"
                      : "max-w-[88%] rounded border px-3 py-2"
                  }
                  style={
                    message.role === "user"
                      ? {
                          background: "rgba(0, 212, 255, 0.08)",
                          borderColor: "rgba(0, 212, 255, 0.4)",
                        }
                      : message.role === "agent"
                        ? {
                            background: "rgba(255, 255, 255, 0.04)",
                            borderColor: "rgba(255, 255, 255, 0.12)",
                          }
                        : undefined
                  }
                >
                  <div
                    className="mb-1 text-[9px] font-mono uppercase tracking-[0.2em]"
                    style={{
                      color:
                        message.role === "user"
                          ? "var(--accent-cyan)"
                          : message.role === "agent"
                            ? "#f0f4f8"
                            : "#fbbf24",
                    }}
                  >
                    {message.role === "user"
                      ? "Operator"
                      : message.role === "agent"
                        ? agent.name
                        : "System"}
                  </div>
                  <p className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed text-[var(--foreground)]">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded border border-white/12 bg-white/5 px-3 py-2">
                  <div className="mb-1 text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--accent-cyan)]">
                    {agent.name}
                  </div>
                  <p className="text-[11px] font-mono text-[var(--muted)]">
                    Reasoning through the request...
                  </p>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3">
          {error && (
            <div className="mb-2 text-[10px] font-mono text-red-300">
              {error}
            </div>
          )}
          <div className="mb-2 text-[10px] font-mono text-[var(--muted)]">
            The agent will answer conversationally, refuse out-of-scope asks, or
            dispatch a matching investigation task when Gemini decides the
            request is actionable.
          </div>
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={3}
              className="min-h-[74px] flex-1 resize-none rounded border border-white/15 bg-transparent px-3 py-2 text-[11px] font-mono text-[var(--foreground)] outline-none"
              placeholder={
                selectedNode
                  ? `Ask ${agent.name} about ${selectedNode.name}, or request a task in their specialty...`
                  : `Ask ${agent.name} a question, or select a system before requesting hands-on work...`
              }
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={isThinking || !input.trim()}
              className="rounded border border-[var(--accent-cyan)] px-4 py-2 text-[10px] font-mono uppercase disabled:opacity-50"
            >
              Send
            </button>
          </div>
          <div className="mt-2 text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--muted)]">
            Enter to send · Shift+Enter for newline · Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}
