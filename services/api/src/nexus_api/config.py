from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "NEXUS AI API"
    app_env: str = "local"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:8081"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

@lru_cache
def get_settings() -> Settings:
    return Settings()
