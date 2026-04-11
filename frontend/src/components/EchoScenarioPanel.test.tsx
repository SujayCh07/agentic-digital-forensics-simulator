import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EchoScenarioPanel } from "./EchoScenarioPanel";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("EchoScenarioPanel", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("renders scenario data from the backend", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({
        scenario_id: "midnight-exfiltration",
        name: "The Midnight Exfiltration",
        incident: "A breach unfolded overnight.",
        ground_truth: {
          origin_building: "warehouse-7",
          attack_path: ["warehouse-7"],
          payload_type: "ransomware",
          responsible_pid: "pid-4481",
        },
        evidence_nodes: [
          {
            id: "warehouse-7",
            name: "Warehouse 7",
            building_type: "server_warehouse",
            clues: [{ description: "maintenance login" }],
          },
        ],
        network_graph: [],
        timeline: [],
        red_herrings: [],
        agents: [
          {
            id: "logis",
            name: "LOGIS",
            specialization: "log_analysis",
            confidence: 0.7,
            findings: [],
            memory: [],
            sprite_position: [1, 1],
            state: "idle",
          },
        ],
      }),
    });

    render(<EchoScenarioPanel />);

    await waitFor(() => {
      expect(screen.getByText("The Midnight Exfiltration")).toBeInTheDocument();
      expect(screen.getByText("Warehouse 7")).toBeInTheDocument();
      expect(screen.getByText("maintenance login")).toBeInTheDocument();
    });
  });
});
