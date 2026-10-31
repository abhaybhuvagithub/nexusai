import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from nexus_api.config import get_settings
from nexus_api.providers import OpenAIProvider
from nexus_api.schemas import ChatRequest, ChatResponse

settings = get_settings()
logging.basicConfig(level=settings.log_level.upper())
logger = logging.getLogger("nexus_api")

@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("Starting %s", settings.app_name)
    yield
    logger.info("Stopping %s", settings.app_name)

app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins, allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type", "X-Request-ID"])

@app.get("/api/v1/health/live", tags=["health"])
async def liveness() -> dict[str, str]:
    return {"status": "alive"}

@app.get("/api/v1/health/ready", tags=["health"])
async def readiness() -> dict[str, str]:
    return {"status": "ready", "environment": settings.app_env}

@app.post("/api/v1/chat/completions", response_model=ChatResponse, tags=["chat"])
async def chat_completion(payload: ChatRequest, request: Request) -> ChatResponse:
    try:
        answer = await OpenAIProvider(settings).complete(payload.messages, payload.model)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Model provider request failed", extra={"path": request.url.path})
        raise HTTPException(status_code=502, detail="Model provider request failed") from exc
    return ChatResponse(answer=answer, model=payload.model or settings.openai_model, provider="openai")
