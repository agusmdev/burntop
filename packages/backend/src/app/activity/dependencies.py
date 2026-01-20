"""Activity dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.activity.repository import ActivityRepository
from app.activity.service import ActivityService
from app.dependencies import get_db


def get_activity_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ActivityRepository:
    """
    Get ActivityRepository instance.

    Args:
        session: Database session from dependency injection

    Returns:
        ActivityRepository instance
    """
    return ActivityRepository(session)


def get_activity_service(
    repository: Annotated[ActivityRepository, Depends(get_activity_repository)],
) -> ActivityService:
    """
    Get ActivityService instance.

    Args:
        repository: ActivityRepository from dependency injection

    Returns:
        ActivityService instance
    """
    return ActivityService(repository)
