from functools import lru_cache

from redis.asyncio import Redis

from nexus_api.config import get_settings


@lru_cache(maxsize=1)
def _redis() -> Redis | None:
    url = get_settings().redis_url
    return Redis.from_url(url, decode_responses=True) if url else None


async def enforce_rate_limit(user_id: str) -> None:
    settings = get_settings()
    redis = _redis()
    if redis is None:
        if settings.app_env.lower() == "production":
            raise RuntimeError("Rate limiting service is not configured")
        return
    key = f"nexus:rate:{user_id}"
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, 60, nx=True)
    result = await pipe.execute()
    count = int(result[0])
    if count > settings.rate_limit_per_minute:
        from fastapi import HTTPException

        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again shortly.")


async def check_redis() -> bool:
    redis = _redis()
    if redis is None:
        return False
    return bool(await redis.ping())


async def close_redis() -> None:
    redis = _redis()
    if redis is not None:
        await redis.aclose()
