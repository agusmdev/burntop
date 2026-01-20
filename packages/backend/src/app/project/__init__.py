"""Project entity module.

Note: Router is not exported from this module to avoid circular imports.
Import directly from app.project.router when needed.
"""

from app.project.dependencies import (
    ProjectRepositoryDep,
    ProjectServiceBasicDep,
    ProjectServiceDep,
    get_project_repository,
    get_project_service,
    get_project_service_basic,
)
from app.project.models import Project
from app.project.repository import ProjectRepository
from app.project.schemas import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdate,
)
from app.project.service import ProjectService

__all__ = [
    "Project",
    "ProjectCreate",
    "ProjectListResponse",
    "ProjectRepository",
    "ProjectRepositoryDep",
    "ProjectResponse",
    "ProjectService",
    "ProjectServiceBasicDep",
    "ProjectServiceDep",
    "ProjectUpdate",
    "get_project_repository",
    "get_project_service",
    "get_project_service_basic",
]
