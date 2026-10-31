from pydantic import BaseModel, ConfigDict, Field, field_validator

from nexus_api.config import get_settings


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=32000)

    @field_validator("content")
    @classmethod
    def nonblank_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Message content cannot be blank")
        return value


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    model: str | None = Field(default=None, max_length=100)
    conversation_id: int | None = Field(default=None, ge=1)
    project_id: int | None = Field(default=None, ge=1)
    document_ids: list[int] = Field(default_factory=list, max_length=10)

    def enforce_runtime_limits(self) -> None:
        settings = get_settings()
        if len(self.messages) > settings.max_request_messages:
            raise ValueError("Too many messages in request")
        if any(len(message.content) > settings.max_message_chars for message in self.messages):
            raise ValueError("Message exceeds configured size limit")
        if self.model and self.model not in settings.allowed_model_names:
            raise ValueError("Requested model is not enabled for this deployment")


class ChatResponse(BaseModel):
    answer: str
    model: str
    provider: str
    conversation_id: int | None = None


class ProjectInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=4000)
    color: str = Field(default="green", pattern="^(green|blue|violet|amber|rose)$")

    @field_validator("name")
    @classmethod
    def nonblank_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Project name cannot be blank")
        return value.strip()


class AgentInput(BaseModel):
    agent: str = Field(pattern="^(architect|researcher|engineer|analyst|writer)$")
    prompt: str = Field(min_length=1, max_length=16000)
    model: str | None = Field(default=None, max_length=100)

    @field_validator("prompt")
    @classmethod
    def nonblank_prompt(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Agent prompt cannot be blank")
        return value


class KnowledgeInput(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=100000)

    @field_validator("title")
    @classmethod
    def nonblank_title(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Document title cannot be blank")
        return value.strip()

    @field_validator("content")
    @classmethod
    def nonblank_document(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Document content cannot be blank")
        return value


class AgentWorkflowInput(BaseModel):
    task: str = Field(min_length=1, max_length=12000)
    steps: list[str] = Field(default_factory=lambda: ["architect", "engineer", "analyst"], min_length=2, max_length=4)
    model: str | None = Field(default=None, max_length=100)
