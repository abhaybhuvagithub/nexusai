import httpx
from nexus_api.config import Settings
from nexus_api.schemas import ChatMessage

class OpenAIProvider:
    """Server-side provider adapter. Provider credentials never leave the API."""
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def complete(self, messages: list[ChatMessage], model: str | None = None) -> str:
        if not self.settings.openai_api_key:
            raise RuntimeError("No model provider is configured")
        payload = {"model": model or self.settings.openai_model, "messages": [m.model_dump() for m in messages]}
        headers = {"Authorization": f"Bearer {self.settings.openai_api_key}"}
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0)) as client:
            response = await client.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError("Provider returned no completion choices")
        return str(choices[0]["message"]["content"])
