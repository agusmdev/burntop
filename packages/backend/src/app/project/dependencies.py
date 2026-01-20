"""Project dependencies for dependency injection."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.project.repository import ProjectRepository
from app.project.service import ProjectService
from app.user.dependencies import get_user_service
from app.user.service import UserService


def get_project_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ProjectRepository:
    """
    Get ProjectRepository instance.

    Args:
        session: Database session from dependency injection

    Returns:
        ProjectRepository instance
    """
    return ProjectRepository(session)


def get_project_service(
    repository: Annotated[ProjectRepository, Depends(get_project_repository)],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> ProjectService:
    """
    Get ProjectService instance with dependencies.

    Includes UserService for user lookups (e.g., get_projects_by_username).

    Args:
        repository: ProjectRepository from dependency injection
        user_service: UserService for user lookups

    Returns:
        ProjectService instance
    """
    return ProjectService(repository=repository, user_service=user_service)


def get_project_service_basic(
    repository: Annotated[ProjectRepository, Depends(get_project_repository)],
) -> ProjectService:
    """
    Get ProjectService instance without optional dependencies.

    Use this for operations that don't require user lookups by username.
    This version avoids potential circular dependency issues.

    Args:
        repository: ProjectRepository from dependency injection

    Returns:
        ProjectService instance
    """
    return ProjectService(repository=repository)


# Type aliases for dependency injection
ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]
ProjectServiceBasicDep = Annotated[ProjectService, Depends(get_project_service_basic)]
ProjectRepositoryDep = Annotated[ProjectRepository, Depends(get_project_repository)]
