"""Project repository with entity-specific queries."""

from collections.abc import Sequence
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common import PostgresRepository
from app.project.models import Project
from app.project.schemas import ProjectCreate, ProjectUpdate


class ProjectRepository(PostgresRepository[Project, ProjectCreate, ProjectUpdate]):
    """
    Repository for Project entity.

    Provides project-specific query methods beyond standard CRUD:
    - Get projects by user_id
    - Get featured projects by user
    - Get projects ordered by display_order
    """

    def __init__(self, session: AsyncSession):
        """Initialize Project repository."""
        super().__init__(session, Project)

    async def get_by_user_id(
        self, user_id: UUID, skip: int = 0, limit: int = 100
    ) -> Sequence[Project]:
        """
        Get all projects for a specific user, ordered by display_order.

        Args:
            user_id: UUID of the user
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of projects belonging to the user, ordered by display_order
        """
        query = (
            self._base_query()
            .where(Project.user_id == user_id)
            .order_by(Project.display_order.asc(), Project.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(query)
        return result.scalars().all()

    async def get_featured_by_user_id(self, user_id: UUID) -> Sequence[Project]:
        """
        Get featured projects for a specific user.

        Args:
            user_id: UUID of the user

        Returns:
            List of featured projects belonging to the user
        """
        query = (
            self._base_query()
            .where(Project.user_id == user_id)
            .where(Project.is_featured.is_(True))
            .order_by(Project.display_order.asc(), Project.created_at.desc())
        )
        result = await self._session.execute(query)
        return result.scalars().all()

    async def count_by_user_id(self, user_id: UUID) -> int:
        """
        Count total projects for a specific user.

        Args:
            user_id: UUID of the user

        Returns:
            Number of projects belonging to the user
        """
        query = (
            select(func.count())
            .select_from(Project)
            .where(Project.user_id == user_id)
            .where(Project.deleted_at.is_(None))
        )
        result = await self._session.execute(query)
        return result.scalar_one()

    async def get_by_url_and_user(self, url: str, user_id: UUID) -> Project | None:
        """
        Get a project by URL and user_id.

        Useful for checking if a user already has a project with the same URL.

        Args:
            url: Project URL
            user_id: UUID of the user

        Returns:
            Project if found, None otherwise
        """
        query = (
            self._base_query()
            .where(Project.url == url)
            .where(Project.user_id == user_id)
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_max_display_order(self, user_id: UUID) -> int:
        """
        Get the maximum display_order for a user's projects.

        Useful for setting display_order for new projects.

        Args:
            user_id: UUID of the user

        Returns:
            Maximum display_order value, or 0 if user has no projects
        """
        query = (
            select(func.max(Project.display_order))
            .where(Project.user_id == user_id)
            .where(Project.deleted_at.is_(None))
        )
        result = await self._session.execute(query)
        max_order = result.scalar_one()
        return max_order if max_order is not None else 0

    async def create_with_user(
        self, obj_in: ProjectCreate, user_id: UUID
    ) -> Project:
        """
        Create a new project for a specific user.

        Sets the user_id and optionally auto-increments display_order.

        Args:
            obj_in: Project creation data
            user_id: UUID of the user who owns the project

        Returns:
            Created Project instance
        """
        data = obj_in.model_dump()
        data["user_id"] = user_id

        # If display_order is 0 (default), auto-increment to put at end
        if data.get("display_order", 0) == 0:
            max_order = await self.get_max_display_order(user_id)
            data["display_order"] = max_order + 1

        instance = Project(**data)
        self._session.add(instance)
        await self._session.commit()
        await self._session.refresh(instance)
        return instance
