"""Streak dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.streak.repository import StreakRepository
from app.streak.service import StreakService


def get_streak_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> StreakRepository:
    """
    Get StreakRepository instance.

    Args:
        session: Database session from dependency injection

    Returns:
        StreakRepository instance
    """
    return StreakRepository(session)


def get_streak_service(
    repository: Annotated[StreakRepository, Depends(get_streak_repository)],
) -> StreakService:
    """
    Get StreakService instance.

    Args:
        repository: StreakRepository from dependency injection

    Returns:
        StreakService instance
    """
    return StreakService(repository=repository)


# Type aliases for dependency injection
StreakServiceDep = Annotated[StreakService, Depends(get_streak_service)]
StreakRepositoryDep = Annotated[StreakRepository, Depends(get_streak_repository)]
