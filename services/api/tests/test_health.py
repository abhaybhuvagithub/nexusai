from fastapi.testclient import TestClient
from nexus_api.main import app

client = TestClient(app)

def test_liveness() -> None:
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}

def test_readiness() -> None:
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"

def test_chat_rejects_empty_messages() -> None:
    response = client.post("/api/v1/chat/completions", json={"messages": []})
    assert response.status_code == 422
