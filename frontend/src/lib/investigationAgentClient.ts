/**
 * EchoLocate investigator client — wraps Socket.IO communication with the backend
 * for streamed agent chat, recruiting, and session management.
 *
 * Note: the underlying Socket.IO event names still use the historical `nips_`
 * prefix for compatibility with the existing backend transport layer.
 */

import { io, type Socket } from "socket.io-client";
import type {
  NipsAgentInstance,
  NipsEvidenceUpdate,
  NipsMarketplaceOffer,
  NipsToolActivity,
} from "@/types/investigation";

const API_BASE = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Callback interfaces
// ---------------------------------------------------------------------------

export interface NipsSessionCallbacks {
  onSessionReady: (data: {
    funds: number;
    agents: NipsAgentInstance[];
    marketplace: NipsMarketplaceOffer[];
    next_refresh: number;
  }) => void;
  onError: (message: string) => void;
}

export interface NipsChatCallbacks {
  onThoughtChunk: (text: string) => void;
  onToolActivity: (activity: NipsToolActivity) => void;
  onAssistantChunk: (text: string) => void;
  onEvidenceUpdate: (evidence: NipsEvidenceUpdate) => void;
  onChatDone: (data: {
    agent_instance_id: string;
    interaction_id: string;
    full_answer: string;
    evidence_updates: NipsEvidenceUpdate[];
    funds: number;
  }) => void;
  onError: (message: string) => void;
}

export interface NipsMarketplaceCallbacks {
  onAgentPurchased: (data: { agent: NipsAgentInstance; funds: number }) => void;
  onMarketplaceRefreshed: (data: {
    marketplace: NipsMarketplaceOffer[];
    next_refresh: number;
  }) => void;
  onAgentsList: (data: { agents: NipsAgentInstance[]; funds: number }) => void;
  onError: (message: string) => void;
}

// ---------------------------------------------------------------------------
// Singleton connection manager
// ---------------------------------------------------------------------------

let _socket: Socket | null = null;
let _sessionCallbacks: NipsSessionCallbacks | null = null;
let _chatCallbacks: NipsChatCallbacks | null = null;
let _marketplaceCallbacks: NipsMarketplaceCallbacks | null = null;

function getSocket(): Socket {
  if (_socket?.connected) return _socket;

  _socket = io(API_BASE, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Session events
  _socket.on("nips_session_ready", (data) => {
    _sessionCallbacks?.onSessionReady(data);
  });

  // Chat streaming events
  _socket.on("nips_thought_chunk", (data: { text: string }) => {
    _chatCallbacks?.onThoughtChunk(data.text);
  });
  _socket.on("nips_tool_activity", (data: NipsToolActivity) => {
    _chatCallbacks?.onToolActivity(data);
  });
  _socket.on("nips_assistant_chunk", (data: { text: string }) => {
    _chatCallbacks?.onAssistantChunk(data.text);
  });
  _socket.on("nips_evidence_update", (data: NipsEvidenceUpdate) => {
    _chatCallbacks?.onEvidenceUpdate(data);
  });
  _socket.on("nips_chat_done", (data) => {
    _chatCallbacks?.onChatDone(data);
  });

  // Marketplace events
  _socket.on("nips_agent_purchased", (data) => {
    _marketplaceCallbacks?.onAgentPurchased(data);
  });
  _socket.on("nips_marketplace_refreshed", (data) => {
    _marketplaceCallbacks?.onMarketplaceRefreshed(data);
  });
  _socket.on("nips_agents_list", (data) => {
    _marketplaceCallbacks?.onAgentsList(data);
  });

  // Error
  _socket.on("nips_error", (data: { message: string }) => {
    _chatCallbacks?.onError(data.message);
    _sessionCallbacks?.onError(data.message);
    _marketplaceCallbacks?.onError(data.message);
  });

  return _socket;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function initNipsSession(
  callbacks: NipsSessionCallbacks,
  caseId = "midnight_exfil",
  starterArchetype = "LOGIS",
): () => void {
  _sessionCallbacks = callbacks;
  const socket = getSocket();

  const onConnect = () => {
    socket.emit("nips_init_session", {
      case_id: caseId,
      starter_archetype: starterArchetype,
    });
  };

  if (socket.connected) {
    onConnect();
  } else {
    socket.on("connect", onConnect);
  }

  return () => {
    socket.off("connect", onConnect);
  };
}

export function setChatCallbacks(callbacks: NipsChatCallbacks): void {
  _chatCallbacks = callbacks;
}

export function setMarketplaceCallbacks(
  callbacks: NipsMarketplaceCallbacks,
): void {
  _marketplaceCallbacks = callbacks;
}

export function sendNipsChat(
  agentInstanceId: string,
  message: string,
  nodeContext = "",
): void {
  const socket = getSocket();
  socket.emit("nips_chat", {
    agent_instance_id: agentInstanceId,
    message,
    node_context: nodeContext,
  });
}

export function buyNipsAgent(offerId: string): void {
  const socket = getSocket();
  socket.emit("nips_buy_agent", { offer_id: offerId });
}

export function requestNipsMarketplaceRefresh(): void {
  const socket = getSocket();
  socket.emit("nips_refresh_marketplace");
}

export function requestNipsAgentsList(): void {
  const socket = getSocket();
  socket.emit("nips_list_agents");
}

export function disconnectNips(): void {
  _socket?.disconnect();
  _socket = null;
  _sessionCallbacks = null;
  _chatCallbacks = null;
  _marketplaceCallbacks = null;
}

/**
 * Legacy wrapper for AgentCommandModal compatibility.
 * Sends a chat message and returns a promise-like result via streaming.
 */
export async function chatWithInvestigationAgent(params: {
  agentId: string;
  message: string;
  previousInteractionId?: string;
  currentObjective?: string;
  agentStatus?: string;
  selectedNode?: { id: string; name: string } | null;
  completedFindings?: unknown[];
  recentEvents?: unknown[];
}): Promise<{
  reply: string;
  interactionId: string;
  dispatchedTask?: { taskType: string; nodeId: string; agentId: string } | null;
}> {
  return new Promise((resolve, reject) => {
    const nodeContext = params.selectedNode
      ? `Selected node: ${params.selectedNode.name} (${params.selectedNode.id})`
      : "";

    let fullAnswer = "";
    let interactionId = "";

    const prevChat = _chatCallbacks;

    const tempCallbacks: NipsChatCallbacks = {
      onThoughtChunk: (text) => prevChat?.onThoughtChunk(text),
      onToolActivity: (activity) => prevChat?.onToolActivity(activity),
      onAssistantChunk: (text) => {
        fullAnswer += text;
        prevChat?.onAssistantChunk(text);
      },
      onEvidenceUpdate: (ev) => prevChat?.onEvidenceUpdate(ev),
      onChatDone: (data) => {
        _chatCallbacks = prevChat;
        interactionId = data.interaction_id;
        fullAnswer = data.full_answer || fullAnswer;
        resolve({
          reply: fullAnswer,
          interactionId,
          dispatchedTask: null,
        });
      },
      onError: (message) => {
        _chatCallbacks = prevChat;
        reject(new Error(message));
      },
    };

    _chatCallbacks = tempCallbacks;
    sendNipsChat(params.agentId, params.message, nodeContext);
  });
}

/**
 * Stream assistant text via NIPS (Socket.IO) and invoke onDelta for each chunk.
 * Use for radio: start TTS before the full reply finishes.
 */
export async function streamInvestigationAgentChat(
  params: {
    agentId: string;
    message: string;
    selectedNode?: { id: string; name: string } | null;
  },
  onDelta: (delta: string, fullText: string) => void,
): Promise<{ reply: string; interactionId: string }> {
  return new Promise((resolve, reject) => {
    const nodeContext = params.selectedNode
      ? `Selected node: ${params.selectedNode.name} (${params.selectedNode.id})`
      : "";

    let fullAnswer = "";
    let interactionId = "";
    const prevChat = _chatCallbacks;

    const tempCallbacks: NipsChatCallbacks = {
      onThoughtChunk: (text) => prevChat?.onThoughtChunk(text),
      onToolActivity: (activity) => prevChat?.onToolActivity(activity),
      onAssistantChunk: (text) => {
        fullAnswer += text;
        onDelta(text, fullAnswer);
        prevChat?.onAssistantChunk(text);
      },
      onEvidenceUpdate: (ev) => prevChat?.onEvidenceUpdate(ev),
      onChatDone: (data) => {
        _chatCallbacks = prevChat;
        interactionId = data.interaction_id;
        fullAnswer = data.full_answer || fullAnswer;
        resolve({
          reply: fullAnswer,
          interactionId,
        });
      },
      onError: (message) => {
        _chatCallbacks = prevChat;
        reject(new Error(message));
      },
    };

    _chatCallbacks = tempCallbacks;
    sendNipsChat(params.agentId, params.message, nodeContext);
  });
}
