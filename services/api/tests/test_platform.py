import pytest
from pydantic import ValidationError

from nexus_api.agents import AGENTS
from nexus_api.config import Settings
from nexus_api.models import Base
from nexus_api.schemas import (
    AgentInput,
    AgentWorkflowInput,
    ChatRequest,
    KnowledgeInput,
    ProjectInput,
)


def test_production_requires_persistence_and_rate_limit_services() -> None:
    with pytest.raises(ValidationError, match="DATABASE_URL and REDIS_URL"):
        Settings(
            app_env="production",
            openai_api_key="test-key",
            oidc_issuer="https://identity.example.com/",
            oidc_audience="nexus-api",
            oidc_jwks_url="https://identity.example.com/.well-known/jwks.json",
            cors_origins="https://app.example.com",
            allowed_models="gpt-4.1-mini",
            openai_model="gpt-4.1-mini",
        )


def test_production_accepts_explicit_trusted_services() -> None:
    settings = Settings(
        app_env="production",
        openai_api_key="test-key",
        oidc_issuer="https://identity.example.com/",
        oidc_audience="nexus-api",
        oidc_jwks_url="https://identity.example.com/.well-known/jwks.json",
        database_url="postgresql://user:pass@db.example.com/nexus",
        redis_url="redis://cache.example.com:6379",
        cors_origins="https://app.example.com",
        allowed_models="gpt-4.1-mini",
        openai_model="gpt-4.1-mini",
    )
    assert settings.authentication_configured
    assert settings.allowed_origins == ["https://app.example.com"]


def test_chat_rejects_extra_fields_and_invalid_roles() -> None:
    with pytest.raises(ValidationError):
        ChatRequest.model_validate({"messages": [{"role": "tool", "content": "hello"}]})
    with pytest.raises(ValidationError):
        ChatRequest.model_validate({"messages": [{"role": "user", "content": "hello"}], "admin": True})


def test_workspace_schemas_enforce_bounds() -> None:
    with pytest.raises(ValidationError):
        ProjectInput(name=" ")
    with pytest.raises(ValidationError):
        KnowledgeInput(title="spec", content="")
    with pytest.raises(ValidationError):
        AgentInput(agent="root", prompt="do something")


def test_agent_catalog_and_tenant_models_exist() -> None:
    assert set(AGENTS) == {"architect", "researcher", "engineer", "analyst", "writer"}
    assert {"conversations", "conversation_messages", "projects", "knowledge_documents", "usage_events"} <= set(Base.metadata.tables)


def test_agent_workflow_bounds_number_of_steps() -> None:
    workflow = AgentWorkflowInput(task="Design a platform")
    assert workflow.steps == ["architect", "engineer", "analyst"]
    with pytest.raises(ValidationError):
        AgentWorkflowInput(task="task", steps=["architect"])
