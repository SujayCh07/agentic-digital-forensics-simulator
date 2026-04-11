export type EchoAgentId = "logis" | "nexus" | "filer" | "chrono" | "echo";

export type EchoClueType = "log_anomaly" | "network_flag" | "recovered_file" | "steg_content" | "timeline_event";

export interface EchoClue {
  id: string;
  type: EchoClueType;
  building_id: string;
  timestamp: string;
  description: string;
  raw_evidence: string;
  confidence: number;
  agent_id: Exclude<EchoAgentId, "echo">;
  is_red_herring: boolean;
}

export interface EchoHypothesis {
  origin_building: string | null;
  attack_path: string[];
  payload_type: string | null;
  responsible_pid: string | null;
  confidence: number;
  supporting_clues: EchoClue[];
  contradicting: EchoClue[];
  open_questions: string[];
}

export interface EchoAgentState {
  id: Exclude<EchoAgentId, "echo">;
  name: string;
  specialization: "log_analysis" | "network_analysis" | "file_analysis" | "timeline_reconstruction";
  confidence: number;
  findings: EchoClue[];
  memory: string[];
  sprite_position: [number, number];
  state: "idle" | "investigating" | "reporting" | "waiting";
}

export interface EchoScenario {
  scenario_id: string;
  name: string;
  incident: string;
  ground_truth: {
    origin_building: string;
    attack_path: string[];
    payload_type: string;
    responsible_pid: string;
  };
  evidence_nodes: Array<{
    id: string;
    name: string;
    building_type: string;
    clues: EchoClue[];
  }>;
  network_graph: Array<{
    source: string;
    target: string;
    traffic: string;
  }>;
  timeline: Array<{
    timestamp: string;
    building_id: string;
    event_type: string;
    description: string;
  }>;
  red_herrings: EchoClue[];
  agents: EchoAgentState[];
}

export interface EchoStreamMessage {
  type: "scenario" | "agent_update" | "clue" | "hypothesis" | "done" | "error";
  scenario_id?: string;
  agent?: EchoAgentState;
  clue?: EchoClue;
  hypothesis?: EchoHypothesis;
  message?: string;
}
