"""Leaderboard dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.leaderboard.repository import LeaderboardRepository
from app.leaderboard.service import LeaderboardService


async def get_leaderboard_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> LeaderboardRepository:
    """Provide leaderboard repository instance.

    Args:
        session: Database session from dependency injection

    Returns:
        LeaderboardRepository instance
    """
    return LeaderboardRepository(session)


async def get_leaderboard_service(
    repository: Annotated[LeaderboardRepository, Depends(get_leaderboard_repository)],
) -> LeaderboardService:
    """Provide leaderboard service instance.

    Args:
        repository: Leaderboard repository from dependency injection

    Returns:
        LeaderboardService instance
    """
    return LeaderboardService(repository)
