"""Project router with endpoints for project management.

Provides CRUD endpoints for managing user projects:
- POST /projects - Create a new project (authenticated)
- GET /projects/{id} - Get a project by ID (public)
- PATCH /projects/{id} - Update a project (authenticated, owner only)
- DELETE /projects/{id} - Delete a project (authenticated, owner only)
- POST /projects/{id}/refresh - Refresh OG metadata (authenticated, owner only)

Additionally, provides a user_projects_router for mounting on the users router:
- GET /users/{username}/projects - Get all projects for a user (public)
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.auth.dependencies import get_current_user
from app.auth.schemas import SessionUserResponse
from app.project.dependencies import ProjectServiceDep
from app.project.schemas import ProjectCreate, ProjectResponse, ProjectUpdate

# Main project router for project-centric operations
router = APIRouter(prefix="/projects", tags=["projects"])

# Secondary router for user-scoped project endpoints (to be mounted on /users)
user_projects_router = APIRouter(tags=["projects"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ProjectResponse,
)
async def create_project(
    project_in: ProjectCreate,
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
    project_service: ProjectServiceDep,
) -> ProjectResponse:
    """
    Create a new project for the authenticated user.

    Automatically fetches OG metadata (title, description, image, favicon) from the URL.
    User can optionally override title and description.

    Args:
        project_in: Project creation data with required URL
        current_user: Authenticated user
        project_service: Project service instance

    Returns:
        Created project with OG metadata

    Raises:
        UnauthorizedError: If not authenticated (401)
        BadRequestError: If URL is invalid or unreachable (400)
        ConflictError: If user already has a project with this URL (409)
    """
    project = await project_service.create_project(
        obj_in=project_in,
        user_id=current_user.id,
        fetch_metadata=True,
    )
    return ProjectResponse.model_validate(project)


@user_projects_router.get(
    "/{username}/projects",
    response_model=list[ProjectResponse],
)
async def get_user_projects(
    username: str,
    project_service: ProjectServiceDep,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 100,
) -> list[ProjectResponse]:
    """
    Get all projects for a user by username.

    Returns projects ordered by display_order and created_at.
    This is a public endpoint - anyone can view a user's projects.

    Note: This endpoint is mounted on the users router at /users/{username}/projects.

    Args:
        username: Username to get projects for
        project_service: Project service instance
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return (max 100)

    Returns:
        List of projects belonging to the user

    Raises:
        NotFoundError: If user not found (404)
    """
    projects = await project_service.get_projects_by_username(
        username=username,
        skip=skip,
        limit=limit,
    )
    return [ProjectResponse.model_validate(p) for p in projects]


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
)
async def get_project(
    project_id: UUID,
    project_service: ProjectServiceDep,
) -> ProjectResponse:
    """
    Get a single project by ID.

    This is a public endpoint - anyone can view a project.

    Args:
        project_id: UUID of the project
        project_service: Project service instance

    Returns:
        Project details

    Raises:
        NotFoundError: If project not found (404)
    """
    project = await project_service.get_project_by_id(project_id)
    return ProjectResponse.model_validate(project)


@router.patch(
    "/{project_id}",
    response_model=ProjectResponse,
)
async def update_project(
    project_id: UUID,
    project_in: ProjectUpdate,
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
    project_service: ProjectServiceDep,
    refetch_metadata: Annotated[bool, Query()] = False,
) -> ProjectResponse:
    """
    Update a project.

    Only the project owner can update it. If the URL is changed and
    refetch_metadata is True, OG metadata will be refetched.

    Args:
        project_id: UUID of the project to update
        project_in: Project update data (all fields optional)
        current_user: Authenticated user
        project_service: Project service instance
        refetch_metadata: Whether to refetch OG metadata if URL changed

    Returns:
        Updated project

    Raises:
        UnauthorizedError: If not authenticated (401)
        ForbiddenError: If user doesn't own the project (403)
        NotFoundError: If project not found (404)
        ConflictError: If new URL already exists for this user (409)
    """
    project = await project_service.update_project(
        project_id=project_id,
        obj_in=project_in,
        current_user_id=current_user.id,
        refetch_metadata=refetch_metadata,
    )
    return ProjectResponse.model_validate(project)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_project(
    project_id: UUID,
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
    project_service: ProjectServiceDep,
) -> None:
    """
    Delete a project (soft delete).

    Only the project owner can delete it.

    Args:
        project_id: UUID of the project to delete
        current_user: Authenticated user
        project_service: Project service instance

    Returns:
        None (204 No Content)

    Raises:
        UnauthorizedError: If not authenticated (401)
        ForbiddenError: If user doesn't own the project (403)
        NotFoundError: If project not found (404)
    """
    await project_service.delete_project(
        project_id=project_id,
        current_user_id=current_user.id,
    )


@router.post(
    "/{project_id}/refresh",
    response_model=ProjectResponse,
)
async def refresh_project_metadata(
    project_id: UUID,
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
    project_service: ProjectServiceDep,
) -> ProjectResponse:
    """
    Refresh OG metadata for an existing project.

    Refetches og:image, og:description, and favicon from the project URL.
    Only updates metadata fields if they were originally empty.

    Args:
        project_id: UUID of the project
        current_user: Authenticated user
        project_service: Project service instance

    Returns:
        Updated project with fresh metadata

    Raises:
        UnauthorizedError: If not authenticated (401)
        ForbiddenError: If user doesn't own the project (403)
        NotFoundError: If project not found (404)
        BadRequestError: If URL is unreachable (400)
    """
    project = await project_service.refresh_project_metadata(
        project_id=project_id,
        current_user_id=current_user.id,
    )
    return ProjectResponse.model_validate(project)
