"""Dashboard dependencies for FastAPI dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dashboard.repository import DashboardRepository
from app.dashboard.service import DashboardService
from app.dependencies import get_db


async def get_dashboard_repository(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardRepository:
    """
    Get DashboardRepository instance.

    Args:
        db: Async database session

    Returns:
        DashboardRepository instance
    """
    return DashboardRepository(db)


async def get_dashboard_service(
    repository: Annotated[DashboardRepository, Depends(get_dashboard_repository)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> DashboardService:
    """
    Get DashboardService instance with required dependencies.

    Creates entity services internally to avoid circular dependency issues.

    Args:
        repository: Dashboard repository for UsageRecord data access
        session: Database session for creating entity services

    Returns:
        DashboardService instance with all entity service dependencies
    """
    # Import here to avoid circular dependency at module level
    from app.streak.repository import StreakRepository  # noqa: PLC0415
    from app.streak.service import StreakService  # noqa: PLC0415
    from app.user.repository import UserRepository  # noqa: PLC0415
    from app.user.service import UserService  # noqa: PLC0415

    # Create repositories
    streak_repository = StreakRepository(session)
    user_repository = UserRepository(session)

    # Create services
    streak_service = StreakService(repository=streak_repository)
    user_service = UserService(repository=user_repository)

    return DashboardService(
        repository=repository,
        streak_service=streak_service,
        user_service=user_service,
    )
