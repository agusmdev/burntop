"""UsageRecord dependency injection functions."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.streak.dependencies import get_streak_repository
from app.streak.repository import StreakRepository
from app.streak.service import StreakService
from app.usage_record.repository import UsageRecordRepository
from app.usage_record.service import UsageRecordService


def get_usage_record_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UsageRecordRepository:
    """
    Provide UsageRecordRepository instance.

    Args:
        session: Database session from get_db dependency

    Returns:
        UsageRecordRepository instance
    """
    return UsageRecordRepository(session)


def get_usage_record_service(
    repository: Annotated[UsageRecordRepository, Depends(get_usage_record_repository)],
    streak_repository: Annotated[StreakRepository, Depends(get_streak_repository)],
) -> UsageRecordService:
    """
    Provide UsageRecordService instance with all dependencies.

    Args:
        repository: UsageRecord repository from get_usage_record_repository dependency
        streak_repository: StreakRepository for creating StreakService

    Returns:
        UsageRecordService instance
    """
    streak_service = StreakService(repository=streak_repository)

    return UsageRecordService(
        repository=repository,
        streak_service=streak_service,
    )
