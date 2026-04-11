from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_echo_scenario_endpoint_returns_scenario():
    response = client.get("/echo/scenario")
    assert response.status_code == 200
    payload = response.json()
    assert payload["scenario_id"] == "midnight-exfiltration"
    assert payload["agents"][0]["name"] == "LOGIS"
    assert payload["evidence_nodes"][0]["clues"]
