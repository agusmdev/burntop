"""User dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.user.repository import UserRepository
from app.user.service import UserService


def get_user_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UserRepository:
    """
    Get UserRepository instance.

    Args:
        session: Database session from dependency injection

    Returns:
        UserRepository instance
    """
    return UserRepository(session)


def get_user_service(
    repository: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    """
    Get UserService instance.

    This is a basic version without optional service dependencies.
    For operations requiring streak, usage record, achievement, or follow services,
    use get_user_service_full.

    Args:
        repository: UserRepository from dependency injection

    Returns:
        UserService instance
    """
    return UserService(repository=repository)


def get_user_service_full(
    repository: Annotated[UserRepository, Depends(get_user_repository)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UserService:
    """
    Get UserService instance with all optional service dependencies.

    This version injects streak, usage record, and follow services
    for operations that require them (e.g., get_user_stats, get_comparison_data).

    Note: Services are created here to avoid circular imports in module-level code.

    Args:
        repository: UserRepository from dependency injection
        session: Database session from dependency injection

    Returns:
        UserService instance with all dependencies
    """
    # Import here to avoid circular dependency
    from app.follow.repository import FollowRepository  # noqa: PLC0415
    from app.follow.service import FollowService  # noqa: PLC0415
    from app.streak.repository import StreakRepository  # noqa: PLC0415
    from app.streak.service import StreakService  # noqa: PLC0415
    from app.usage_record.repository import UsageRecordRepository  # noqa: PLC0415
    from app.usage_record.service import UsageRecordService  # noqa: PLC0415

    # Create repositories
    streak_repository = StreakRepository(session)
    usage_record_repository = UsageRecordRepository(session)
    follow_repository = FollowRepository(session)

    # Create services
    streak_service = StreakService(repository=streak_repository)
    usage_record_service = UsageRecordService(repository=usage_record_repository)
    follow_service = FollowService(repository=follow_repository)

    return UserService(
        repository=repository,
        streak_service=streak_service,
        usage_record_service=usage_record_service,
        follow_service=follow_service,
    )


# Type aliases for dependency injection
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
UserServiceFullDep = Annotated[UserService, Depends(get_user_service_full)]
UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]
