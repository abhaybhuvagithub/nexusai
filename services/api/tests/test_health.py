from fastapi.testclient import TestClient

from nexus_api.db import get_db
from nexus_api.main import app

client = TestClient(app)


def test_liveness() -> None:
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "alive"}
    assert response.headers["x-content-type-options"] == "nosniff"


def test_readiness_reports_missing_provider_without_claiming_ready() -> None:
    response = client.get("/api/v1/health/ready")
    assert response.status_code in (200, 503)
    assert "provider_configured" in response.json()


def test_chat_rejects_empty_messages() -> None:
    async def fake_db():
        yield None

    app.dependency_overrides[get_db] = fake_db
    try:
        response = client.post("/api/v1/chat/completions", json={"messages": []})
        assert response.status_code == 422
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_chat_requires_oidc_bearer_when_identity_is_configured() -> None:
    from nexus_api.config import Settings

    protected = Settings(
        oidc_issuer="https://identity.example.com/",
        oidc_audience="nexus-api",
        oidc_jwks_url="https://identity.example.com/.well-known/jwks.json",
    )
    original_settings = app.state.settings
    app.state.settings = protected
    try:
        response = client.post(
            "/api/v1/chat/completions",
            json={"messages": [{"role": "user", "content": "hello"}]},
        )
        assert response.status_code == 401
    finally:
        app.state.settings = original_settings
