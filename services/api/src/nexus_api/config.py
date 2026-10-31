from functools import lru_cache

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NEXUS AI API"
    app_env: str = "local"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:8081"
    openai_api_key: SecretStr = SecretStr("")
    openai_model: str = "gpt-4.1-mini"
    allowed_models: str = "gpt-4.1-mini"
    oidc_issuer: str = ""
    oidc_audience: str = ""
    oidc_jwks_url: str = ""
    max_request_messages: int = Field(default=50, ge=1, le=100)
    max_message_chars: int = Field(default=16000, ge=1, le=32000)
    max_completion_tokens: int = Field(default=2048, ge=128, le=8192)
    provider_timeout_seconds: float = Field(default=45.0, ge=5.0, le=120.0)

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=False)

    @property
    def allowed_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def allowed_model_names(self) -> set[str]:
        return {item.strip() for item in self.allowed_models.split(",") if item.strip()}

    @property
    def authentication_configured(self) -> bool:
        return bool(self.oidc_issuer and self.oidc_audience and self.oidc_jwks_url)

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.app_env.lower() == "production":
            if not self.openai_api_key.get_secret_value():
                raise ValueError("OPENAI_API_KEY is required in production")
            if not self.authentication_configured:
                raise ValueError("OIDC_ISSUER, OIDC_AUDIENCE and OIDC_JWKS_URL are required in production")
            if not self.allowed_origins or "*" in self.allowed_origins:
                raise ValueError("Production CORS_ORIGINS must contain explicit trusted origins")
            if not self.allowed_model_names or self.openai_model not in self.allowed_model_names:
                raise ValueError("OPENAI_MODEL must be included in ALLOWED_MODELS")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
