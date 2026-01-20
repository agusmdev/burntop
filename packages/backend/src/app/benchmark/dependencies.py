"""Benchmark dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.benchmark.repository import CommunityBenchmarkRepository
from app.benchmark.service import BenchmarkService
from app.dependencies import get_db


async def get_benchmark_repository(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CommunityBenchmarkRepository:
    """
    Dependency to get benchmark repository instance.

    Args:
        db: Async database session from get_db dependency

    Returns:
        CommunityBenchmarkRepository instance
    """
    return CommunityBenchmarkRepository(db)


async def get_benchmark_service(
    repository: Annotated[CommunityBenchmarkRepository, Depends(get_benchmark_repository)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> BenchmarkService:
    """
    Dependency to get benchmark service instance.

    Creates UserService internally to avoid circular dependency issues.

    Args:
        repository: Benchmark repository from get_benchmark_repository dependency
        session: Database session for creating entity services

    Returns:
        BenchmarkService instance with all entity service dependencies
    """
    # Import here to avoid circular dependency at module level
    from app.user.repository import UserRepository  # noqa: PLC0415
    from app.user.service import UserService  # noqa: PLC0415

    # Create user service
    user_repository = UserRepository(session)
    user_service = UserService(repository=user_repository)

    return BenchmarkService(repository, user_service)
