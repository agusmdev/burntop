"""Activity service for business logic."""

from typing import TYPE_CHECKING
from uuid import UUID

from fastapi_pagination import Params
from fastapi_pagination.bases import AbstractPage

from app.activity.repository import ActivityRepository
from app.activity.schemas import ActivityCreate, ActivityUpdate
from app.core import BaseService

if TYPE_CHECKING:
    from app.activity.models import Activity


class ActivityService(BaseService["Activity", ActivityCreate, ActivityUpdate]):
    """
    Service for managing activities.

    Activities are public events that appear in feeds, such as streak milestones,
    badge earned, rank changes, and other notable actions. They are visible to followers.
    """

    def __init__(self, repository: ActivityRepository):
        """Initialize the service with a repository."""
        super().__init__(repository)

    async def create_activity(
        self,
        user_id: UUID,
        activity_type: str,
        data: dict | None = None,
    ) -> "Activity":
        """
        Create a new activity for a user.

        Args:
            user_id: ID of the user who performed the activity
            activity_type: Type of activity (streak_milestone, badge_earned, rank_change, etc.)
            data: Optional additional data (JSONB)

        Returns:
            The created Activity instance

        Example:
            >>> activity = await service.create_activity(
            ...     user_id=user.id,
            ...     activity_type="streak_milestone",
            ...     data={"days": 30, "milestone": "1_month"},
            ... )
        """
        activity_in = ActivityCreate(
            user_id=user_id,
            type=activity_type,
            data=data,
        )
        return await self.create(activity_in)

    async def get_feed(
        self,
        user_id: UUID,
        params: Params | None = None,
    ) -> AbstractPage["Activity"]:
        """
        Get activity feed for a user (activities from users they follow).

        Args:
            user_id: ID of the user requesting the feed
            params: Pagination parameters (default: page 1, size 50)

        Returns:
            Paginated list of activities from followed users

        Note:
            Activities are ordered by created_at DESC (most recent first).
            User information is eagerly loaded to avoid N+1 queries.
        """
        return await self._repository.get_feed_for_user(user_id, params)

    async def get_user_activities(
        self,
        user_id: UUID,
        params: Params | None = None,
    ) -> AbstractPage["Activity"]:
        """
        Get all activities for a specific user.

        Args:
            user_id: ID of the user
            params: Pagination parameters (default: page 1, size 50)

        Returns:
            Paginated list of activities for the user

        Note:
            Activities are ordered by created_at DESC (most recent first).
            User information is eagerly loaded to avoid N+1 queries.
        """
        return await self._repository.get_user_activities(user_id, params)
