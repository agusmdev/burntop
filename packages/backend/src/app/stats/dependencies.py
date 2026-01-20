"""Stats module dependencies."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.stats.service import StatsService


async def get_stats_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> StatsService:
    """Get StatsService instance with database session."""
    return StatsService(session)
