import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from nexus_api.auth import require_user
from nexus_api.config import get_settings
from nexus_api.providers import OpenAIProvider
from nexus_api.schemas import ChatRequest, ChatResponse

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("nexus_api")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting %s in %s mode", settings.app_name, settings.app_env)
    yield
    logger.info("Stopping %s", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    lifespan=lifespan,
    docs_url=None if settings.app_env.lower() == "production" else "/docs",
    redoc_url=None if settings.app_env.lower() == "production" else "/redoc",
)
app.state.settings = settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):  # type: ignore[no-untyped-def]
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if settings.app_env.lower() == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


@app.get("/api/v1/health/live", tags=["health"])
async def liveness() -> dict[str, str]:
    return {"status": "alive"}


@app.get("/api/v1/health/ready", tags=["health"])
async def readiness() -> JSONResponse:
    provider_configured = bool(settings.openai_api_key.get_secret_value())
    identity_configured = settings.authentication_configured
    status_code = 200 if provider_configured and (identity_configured or settings.app_env.lower() != "production") else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if status_code == 200 else "not_ready",
            "environment": settings.app_env,
            "provider_configured": provider_configured,
            "identity_configured": identity_configured,
        },
    )


@app.post("/api/v1/chat/completions", response_model=ChatResponse, tags=["chat"])
async def chat_completion(
    payload: ChatRequest,
    request: Request,
    _: Annotated[dict[str, Any] | None, Depends(require_user)],
) -> ChatResponse:
    try:
        payload.enforce_runtime_limits()
        answer = await OpenAIProvider(settings).complete(payload.messages, payload.model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Model provider request failed", extra={"path": request.url.path})
        raise HTTPException(status_code=502, detail="Model provider request failed") from exc
    return ChatResponse(answer=answer, model=payload.model or settings.openai_model, provider="openai")
