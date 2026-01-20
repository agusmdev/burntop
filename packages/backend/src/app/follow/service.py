"""Follow service for managing user follow relationships."""

from uuid import UUID

from fastapi_pagination import Page, Params

from app.exceptions import BadRequestError, ConflictError
from app.follow.repository import FollowRepository
from app.follow.schemas import FollowerResponse, FollowResponse, FollowStatsResponse


class FollowService:
    """
    Service for Follow entity.

    Contains business logic for managing follow relationships.
    Delegates data access to the repository.
    """

    def __init__(self, repository: FollowRepository):
        """
        Initialize service with repository.

        Args:
            repository: FollowRepository instance
        """
        self._repository = repository

    async def follow(self, follower_id: UUID, following_id: UUID) -> FollowResponse:
        """
        Create a follow relationship between two users.

        Args:
            follower_id: ID of the user who is following
            following_id: ID of the user being followed

        Returns:
            Created FollowResponse schema

        Raises:
            BadRequestError: If user tries to follow themselves
            ConflictError: If follow relationship already exists
        """
        # Validate: user cannot follow themselves
        if follower_id == following_id:
            raise BadRequestError(message="Users cannot follow themselves")

        # Check if already following
        is_following = await self._repository.is_following(follower_id, following_id)
        if is_following:
            raise ConflictError(
                resource="Follow",
                field="following_id",
                value=str(following_id),
                message="Already following this user",
            )

        # Create follow relationship
        return await self._repository.create(follower_id, following_id)

    async def unfollow(self, follower_id: UUID, following_id: UUID) -> bool:
        """
        Remove a follow relationship between two users.

        Args:
            follower_id: ID of the user who is unfollowing
            following_id: ID of the user being unfollowed

        Returns:
            True if relationship was removed, False if it didn't exist

        Raises:
            BadRequestError: If user tries to unfollow themselves
        """
        # Validate: user cannot unfollow themselves
        if follower_id == following_id:
            raise BadRequestError(message="Users cannot unfollow themselves")

        # Delete follow relationship
        return await self._repository.delete(follower_id, following_id)

    async def get_followers(
        self,
        user_id: UUID,
        params: Params | None = None,
    ) -> Page[FollowerResponse] | list[FollowerResponse]:
        """
        Get users who are following the specified user.

        Args:
            user_id: User whose followers to retrieve
            params: Pagination parameters (optional)

        Returns:
            Paginated followers if params provided, otherwise all followers
        """
        return await self._repository.get_followers(user_id, params)

    async def get_following(
        self,
        user_id: UUID,
        params: Params | None = None,
    ) -> Page[FollowerResponse] | list[FollowerResponse]:
        """
        Get users that the specified user is following.

        Args:
            user_id: User whose following list to retrieve
            params: Pagination parameters (optional)

        Returns:
            Paginated following if params provided, otherwise all following
        """
        return await self._repository.get_following(user_id, params)

    async def is_following(self, follower_id: UUID, following_id: UUID) -> bool:
        """
        Check if a user is following another user.

        Args:
            follower_id: User who might be following
            following_id: User who might be followed

        Returns:
            True if follower is following, False otherwise
        """
        return await self._repository.is_following(follower_id, following_id)

    async def get_follow_stats(
        self,
        user_id: UUID,
        current_user_id: UUID | None = None,
    ) -> FollowStatsResponse:
        """
        Get follow statistics for a user.

        Args:
            user_id: User whose stats to retrieve
            current_user_id: ID of the current authenticated user (optional)

        Returns:
            Follow statistics including follower/following counts and relationship status
        """
        # Get counts
        followers_count = await self._repository.get_followers_count(user_id)
        following_count = await self._repository.get_following_count(user_id)

        # Get relationship status if current user is authenticated
        is_following = None
        follows_me = None

        if current_user_id is not None and current_user_id != user_id:
            is_following = await self._repository.is_following(current_user_id, user_id)
            follows_me = await self._repository.is_following(user_id, current_user_id)

        return FollowStatsResponse(
            followers_count=followers_count,
            following_count=following_count,
            is_following=is_following,
            follows_me=follows_me,
        )
