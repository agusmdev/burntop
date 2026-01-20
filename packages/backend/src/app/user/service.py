"""User service with business logic for user management."""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from app.core import BaseService
from app.exceptions import ForbiddenError, NotFoundError
from app.user.models import User
from app.user.repository import UserRepository
from app.user.schemas import (
    ComparisonResponse,
    UserComparisonDataResponse,
    UserCreate,
    UserStatsResponse,
    UserUpdate,
)

if TYPE_CHECKING:
    from app.follow.service import FollowService
    from app.streak.service import StreakService
    from app.usage_record.service import UsageRecordService


class UserService(BaseService[User, UserCreate, UserUpdate]):
    """
    Service for User entity with business logic.

    Implements:
    - User profile management with privacy checks
    - User statistics aggregation
    - Follow status checking
    """

    def __init__(
        self,
        repository: UserRepository,
        streak_service: "StreakService | None" = None,
        usage_record_service: "UsageRecordService | None" = None,
        follow_service: "FollowService | None" = None,
    ):
        """
        Initialize UserService.

        Args:
            repository: User repository instance
            streak_service: Streak service for streak lookups
            usage_record_service: Usage record service for stats
            follow_service: Follow service for follow operations
        """
        super().__init__(repository)
        self._repository: UserRepository = repository
        self._streak_service = streak_service
        self._usage_record_service = usage_record_service
        self._follow_service = follow_service

    async def get_by_username_or_raise(self, username: str) -> User:
        """
        Get user by username or raise NotFoundError.

        Args:
            username: Username to search for

        Returns:
            User if found

        Raises:
            NotFoundError: If user not found
        """
        user = await self._repository.get_by_username(username)
        if not user:
            raise NotFoundError(resource="User", field="username", value=username)
        return user

    async def get_by_email(self, email: str) -> User | None:
        """
        Get user by email.

        Args:
            email: Email address to search for

        Returns:
            User if found, None otherwise
        """
        return await self._repository.get_by_email(email)

    async def get_by_username(self, username: str) -> User | None:
        """
        Get user by username.

        Args:
            username: Username to search for

        Returns:
            User if found, None otherwise
        """
        return await self._repository.get_by_username(username)

    async def create_with_password(
        self,
        email: str,
        username: str,
        password: str,
        name: str | None = None,
        email_verified: bool = False,
    ) -> User:
        """
        Create a new user with email/password registration.

        Args:
            email: User email address
            username: Unique username
            password: Plain text password (will be hashed)
            name: Optional display name
            email_verified: Whether email is verified

        Returns:
            Created User instance
        """
        return await self._repository.create_with_password(
            email=email,
            username=username,
            password=password,
            name=name,
            email_verified=email_verified,
        )

    async def create_oauth_user(
        self,
        email: str,
        username: str,
        name: str | None = None,
        email_verified: bool = True,
        image: str | None = None,
    ) -> User:
        """
        Create a new user from OAuth registration.

        Args:
            email: User email address
            username: Unique username
            name: Optional display name
            email_verified: Whether email is verified
            image: Optional profile image URL

        Returns:
            Created User instance
        """
        return await self._repository.create_oauth_user(
            email=email,
            username=username,
            name=name,
            email_verified=email_verified,
            image=image,
        )

    async def update_profile(
        self,
        user_id: UUID,
        current_user_id: UUID,
        obj_in: UserUpdate,
    ) -> User | None:
        """
        Update user profile with authorization check.

        Only allows users to update their own profile.

        Args:
            user_id: ID of user to update
            current_user_id: ID of authenticated user
            obj_in: Update data

        Returns:
            Updated user if found

        Raises:
            ForbiddenError: If user_id != current_user_id
        """
        if user_id != current_user_id:
            raise ForbiddenError(message="Cannot update another user's profile")

        return await self.update(user_id, obj_in, exclude_unset=True)

    async def get_user_stats(self, username: str) -> UserStatsResponse:
        """
        Get aggregated statistics for a user.

        Computes:
        - Total tokens used across all sources/models
        - Total cost spent
        - Current and longest streaks
        - Achievements unlocked count
        - Unique days with activity
        - Average cache efficiency

        Args:
            username: Username to get stats for

        Returns:
            UserStatsResponse with aggregated data

        Raises:
            NotFoundError: If user not found
        """
        # Get user
        user = await self._repository.get_by_username(username)
        if not user:
            raise NotFoundError(resource="User", field="username", value=username)

        # Get streak data
        current_streak = 0
        longest_streak = 0
        if self._streak_service:
            streak = await self._streak_service.get_by_user_id(user.id)
            if streak:
                current_streak = streak.current_streak
                longest_streak = streak.longest_streak

        # Get usage aggregates
        total_tokens = 0
        total_cost = 0.0
        unique_days = 0
        cache_efficiency = None
        monthly_tokens = 0
        if self._usage_record_service:
            usage_stats = await self._usage_record_service.get_user_stats_aggregates(str(user.id))
            total_tokens = usage_stats["total_tokens"]
            total_cost = usage_stats["total_cost"]
            unique_days = usage_stats["unique_days"]
            cache_efficiency = usage_stats["cache_efficiency"]

            # Get rolling 30-day tokens for AI Native tier badge
            monthly_tokens = await self._usage_record_service.get_user_rolling_30_day_tokens(
                user.id
            )

        # Calculate AI Native badge based on 30-day rolling tokens
        # Import here to avoid circular import
        from app.dashboard.service import calculate_ai_native_badge  # noqa: PLC0415

        monthly_badge = calculate_ai_native_badge(monthly_tokens)

        return UserStatsResponse(
            id=user.id,
            created_at=user.created_at,
            updated_at=user.updated_at,
            username=user.username,
            total_tokens=total_tokens,
            total_cost=total_cost,
            current_streak=current_streak,
            longest_streak=longest_streak,
            achievements_unlocked=0,  # Achievement system removed
            unique_days=unique_days,
            cache_efficiency=cache_efficiency,
            monthly_tokens=monthly_tokens,
            monthly_badge=monthly_badge,
        )

    async def get_follow_status(
        self,
        follower_id: UUID,
        following_id: UUID,
    ) -> dict[str, bool]:
        """
        Get follow relationship status between two users.

        Args:
            follower_id: ID of potential follower
            following_id: ID of potential following

        Returns:
            Dict with keys:
            - is_following: True if follower_id follows following_id
            - follows_back: True if following_id follows follower_id
        """
        if not self._follow_service:
            return {
                "is_following": False,
                "follows_back": False,
            }

        # Check if follower_id follows following_id
        is_following = await self._follow_service.is_following(follower_id, following_id)

        # Check if following_id follows follower_id (follows back)
        follows_back = await self._follow_service.is_following(following_id, follower_id)

        return {
            "is_following": is_following,
            "follows_back": follows_back,
        }

    async def get_comparison_data(
        self,
        username_a: str,
        username_b: str,
    ) -> ComparisonResponse:
        """
        Get comparison data for two users.

        Both users must have public profiles.

        Args:
            username_a: First username
            username_b: Second username

        Returns:
            ComparisonResponse with data for both users

        Raises:
            NotFoundError: If either user not found or has private profile
        """
        # Get both users
        user_a = await self._repository.get_by_username(username_a)
        if not user_a or not user_a.is_public:
            raise NotFoundError(resource="User", field="username", value=username_a)

        user_b = await self._repository.get_by_username(username_b)
        if not user_b or not user_b.is_public:
            raise NotFoundError(resource="User", field="username", value=username_b)

        # Get data for user A
        user_a_data = await self._get_user_comparison_data(user_a)

        # Get data for user B
        user_b_data = await self._get_user_comparison_data(user_b)

        return ComparisonResponse(
            id=user_a.id,
            created_at=user_a.created_at,
            updated_at=user_a.updated_at,
            user_a=user_a_data,
            user_b=user_b_data,
        )

    async def _get_user_comparison_data(self, user: User) -> UserComparisonDataResponse:
        """
        Get comparison data for a single user.

        Args:
            user: User instance

        Returns:
            UserComparisonDataResponse with user stats and top models/sources
        """
        # Get streak data
        current_streak = 0
        longest_streak = 0
        if self._streak_service:
            streak = await self._streak_service.get_by_user_id(user.id)
            if streak:
                current_streak = streak.current_streak
                longest_streak = streak.longest_streak

        # Get usage aggregates and top models/sources
        total_tokens = 0
        total_cost = 0.0
        top_models: list[dict] = []
        top_sources: list[dict] = []
        if self._usage_record_service:
            usage_stats = await self._usage_record_service.get_user_comparison_aggregates(
                str(user.id)
            )
            total_tokens = usage_stats["total_tokens"]
            total_cost = usage_stats["total_cost"]

            # Get top 3 models and sources by cost
            top_models = await self._usage_record_service.get_top_models_by_cost(
                str(user.id), limit=3
            )
            top_sources = await self._usage_record_service.get_top_sources_by_cost(
                str(user.id), limit=3
            )

        return UserComparisonDataResponse(
            id=user.id,
            created_at=user.created_at,
            updated_at=user.updated_at,
            username=user.username,
            name=user.name,
            image=user.image,
            tokens={"total": total_tokens},
            cost={"total": str(total_cost)},
            streak={
                "current": current_streak,
                "longest": longest_streak,
            },
            top_models=top_models,
            top_sources=top_sources,
        )

    async def get_user_created_at(self, user_id: UUID) -> datetime | None:
        """Get user's created_at timestamp.

        Args:
            user_id: User ID

        Returns:
            User's created_at timestamp, or None if user not found
        """
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        return user.created_at

    async def verify_password(self, user_id: UUID, password: str) -> bool:
        """
        Verify a password for a user.

        Delegates to repository which handles the password verification
        using the User model's verify_password method.

        Args:
            user_id: User UUID
            password: Plain text password to verify

        Returns:
            True if password matches, False otherwise
        """
        return await self._repository.verify_password(user_id, password)

    async def has_password(self, user_id: UUID) -> bool:
        """
        Check if user has a password set.

        Used to determine if password authentication is available
        for a user (OAuth-only users don't have passwords).

        Args:
            user_id: User UUID

        Returns:
            True if user has password_hash set, False otherwise
        """
        return await self._repository.has_password(user_id)
