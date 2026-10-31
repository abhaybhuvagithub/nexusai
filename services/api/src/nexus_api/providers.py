import httpx

from nexus_api.config import Settings
from nexus_api.schemas import ChatMessage


class OpenAIProvider:
    """Server-side provider adapter. Provider credentials never leave the API."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def complete(self, messages: list[ChatMessage], model: str | None = None) -> str:
        api_key = self.settings.openai_api_key.get_secret_value()
        if not api_key:
            raise RuntimeError("No model provider is configured")
        selected_model = model or self.settings.openai_model
        if selected_model not in self.settings.allowed_model_names:
            raise ValueError("Requested model is not enabled for this deployment")
        payload = {
            "model": selected_model,
            "messages": [message.model_dump() for message in messages],
            "max_tokens": self.settings.max_completion_tokens,
        }
        headers = {"Authorization": f"Bearer {api_key}"}
        timeout = httpx.Timeout(self.settings.provider_timeout_seconds, connect=5.0)
        limits = httpx.Limits(max_connections=50, max_keepalive_connections=20)
        async with httpx.AsyncClient(timeout=timeout, limits=limits) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
        choices = data.get("choices", [])
        if not choices or not choices[0].get("message", {}).get("content"):
            raise RuntimeError("Provider returned no completion content")
        return str(choices[0]["message"]["content"])
