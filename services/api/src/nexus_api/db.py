from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from nexus_api.config import get_settings

_url = get_settings().database_url
_engine = create_async_engine(_url, pool_pre_ping=True, pool_size=5, max_overflow=10) if _url else None
_session_factory = async_sessionmaker(_engine, expire_on_commit=False) if _engine else None


async def get_db() -> AsyncIterator[AsyncSession]:
    if _session_factory is None:
        raise RuntimeError("Database is not configured")
    async with _session_factory() as session:
        yield session


async def check_database() -> bool:
    if _engine is None:
        return False
    async with _engine.connect() as connection:
        await connection.exec_driver_sql("SELECT 1")
    return True


async def close_database() -> None:
    if _engine is not None:
        await _engine.dispose()
