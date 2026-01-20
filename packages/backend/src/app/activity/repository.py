"""Activity repository for managing activity records."""

from uuid import UUID

from fastapi_pagination import Params
from fastapi_pagination.bases import AbstractPage
from fastapi_pagination.ext.sqlalchemy import paginate
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.activity.models import Activity
from app.activity.schemas import ActivityCreate, ActivityUpdate
from app.common import PostgresRepository
from app.follow.models import Follow


class ActivityRepository(PostgresRepository[Activity, ActivityCreate, ActivityUpdate]):
    """
    Repository for managing Activity records.

    Provides methods for creating activities and generating activity feeds.
    """

    def __init__(self, session):
        """Initialize the repository with a database session."""
        super().__init__(session, Activity)

    async def get_feed_for_user(
        self,
        user_id: UUID,
        params: Params | None = None,
    ) -> AbstractPage[Activity]:
        """
        Get activity feed for a user (activities from users they follow).

        Args:
            user_id: The ID of the user requesting the feed
            params: Pagination parameters (default: page 1, size 50)

        Returns:
            Paginated list of activities from followed users

        Note:
            Activities are ordered by created_at DESC (most recent first).
        """
        # First, get the list of users that this user follows
        following_subquery = (
            select(Follow.following_id).where(Follow.follower_id == user_id).scalar_subquery()
        )

        # Then, get activities from those users
        query = (
            select(Activity)
            .where(Activity.user_id.in_(following_subquery))
            .order_by(Activity.created_at.desc())
            .options(selectinload(Activity.user))  # Eagerly load user for display
        )

        return await paginate(self._session, query, params)

    async def get_user_activities(
        self,
        user_id: UUID,
        params: Params | None = None,
    ) -> AbstractPage[Activity]:
        """
        Get all activities for a specific user.

        Args:
            user_id: The ID of the user
            params: Pagination parameters (default: page 1, size 50)

        Returns:
            Paginated list of activities for the user

        Note:
            Activities are ordered by created_at DESC (most recent first).
        """
        query = (
            select(Activity)
            .where(Activity.user_id == user_id)
            .order_by(Activity.created_at.desc())
            .options(selectinload(Activity.user))  # Eagerly load user for display
        )

        return await paginate(self._session, query, params)
