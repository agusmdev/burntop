"""Follow dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.follow.repository import FollowRepository
from app.follow.service import FollowService


def get_follow_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> FollowRepository:
    """
    Get FollowRepository instance.

    Args:
        session: Database session from dependency injection

    Returns:
        FollowRepository instance
    """
    return FollowRepository(session)


def get_follow_service(
    repository: Annotated[FollowRepository, Depends(get_follow_repository)],
) -> FollowService:
    """
    Get FollowService instance.

    Args:
        repository: FollowRepository from dependency injection

    Returns:
        FollowService instance
    """
    return FollowService(repository=repository)


# Type aliases for dependency injection
FollowServiceDep = Annotated[FollowService, Depends(get_follow_service)]
FollowRepositoryDep = Annotated[FollowRepository, Depends(get_follow_repository)]
