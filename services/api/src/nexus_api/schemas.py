from pydantic import BaseModel, ConfigDict, Field

from nexus_api.config import get_settings


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=32000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    messages: list[ChatMessage] = Field(min_length=1, max_length=100)
    model: str | None = Field(default=None, max_length=100)

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
