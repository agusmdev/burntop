"""Health dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.health.repository import HealthRepository
from app.health.service import HealthService


def get_health_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> HealthRepository:
    """
    Get HealthRepository instance.

    Args:
        session: Database session from dependency injection

    Returns:
        HealthRepository instance
    """
    return HealthRepository(session)


def get_health_service(
    repository: Annotated[HealthRepository, Depends(get_health_repository)],
) -> HealthService:
    """
    Get HealthService instance.

    Args:
        repository: HealthRepository from dependency injection

    Returns:
        HealthService instance
    """
    return HealthService(repository=repository)


# Type aliases for dependency injection
HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]
HealthRepositoryDep = Annotated[HealthRepository, Depends(get_health_repository)]
