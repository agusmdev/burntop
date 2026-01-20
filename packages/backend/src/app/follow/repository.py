"""Follow repository for managing user follow relationships."""

from uuid import UUID

from fastapi_pagination import Page, Params
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.follow.models import Follow
from app.follow.schemas import FollowerResponse, FollowResponse


class FollowCreate(BaseModel):
    """Placeholder schema for Follow creation."""

    follower_id: UUID
    following_id: UUID


class FollowUpdate(BaseModel):
    """Placeholder schema for Follow updates (not used for Follow)."""

    pass


class FollowRepository:
    """
    Repository for Follow entity.

    Note: Follow model uses composite primary key (follower_id, following_id)
    instead of UUID id, so it doesn't extend PostgresRepository.
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize repository with database session.

        Args:
            session: SQLAlchemy async session
        """
        self._session = session

    async def create(self, follower_id: UUID, following_id: UUID) -> FollowResponse:
        """
        Create a new follow relationship.

        Args:
            follower_id: User who is following
            following_id: User being followed

        Returns:
            Created FollowResponse schema
        """
        follow = Follow(follower_id=follower_id, following_id=following_id)
        self._session.add(follow)
        await self._session.commit()
        await self._session.refresh(follow)
        return FollowResponse(
            follower_id=follow.follower_id,
            following_id=follow.following_id,
            created_at=follow.created_at,
        )

    async def delete(self, follower_id: UUID, following_id: UUID) -> bool:
        """
        Delete a follow relationship (unfollow).

        Args:
            follower_id: User who is unfollowing
            following_id: User being unfollowed

        Returns:
            True if relationship was deleted, False if it didn't exist
        """
        stmt = delete(Follow).where(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        )
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.rowcount > 0

    async def is_following(self, follower_id: UUID, following_id: UUID) -> bool:
        """
        Check if a user is following another user.

        Args:
            follower_id: User who might be following
            following_id: User who might be followed

        Returns:
            True if follower is following, False otherwise
        """
        stmt = (
            select(func.count())
            .select_from(Follow)
            .where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
        )
        result = await self._session.execute(stmt)
        count = result.scalar_one()
        return count > 0

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
        stmt = (
            select(Follow)
            .options(joinedload(Follow.follower))
            .where(Follow.following_id == user_id)
            .order_by(Follow.created_at.desc())
        )

        if params is not None:
            count_stmt = select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
            total_result = await self._session.execute(count_stmt)
            total = total_result.scalar_one()

            offset = (params.page - 1) * params.size
            paginated_stmt = stmt.offset(offset).limit(params.size)
            result = await self._session.execute(paginated_stmt)
            follows = result.unique().scalars().all()

            transformed_items = [
                FollowerResponse(
                    id=follow.follower.id,
                    username=follow.follower.username,
                    name=follow.follower.name,
                    image=follow.follower.image,
                    bio=follow.follower.bio,
                    followed_at=follow.created_at,
                )
                for follow in follows
            ]

            pages = (total + params.size - 1) // params.size if params.size > 0 else 0
            return Page[FollowerResponse].model_validate(
                {
                    "items": transformed_items,
                    "total": total,
                    "page": params.page,
                    "size": params.size,
                    "pages": pages,
                }
            )

        result = await self._session.execute(stmt)
        follows = result.scalars().all()
        return [
            FollowerResponse(
                id=follow.follower.id,
                username=follow.follower.username,
                name=follow.follower.name,
                image=follow.follower.image,
                bio=follow.follower.bio,
                followed_at=follow.created_at,
            )
            for follow in follows
        ]

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
        stmt = (
            select(Follow)
            .options(joinedload(Follow.following))
            .where(Follow.follower_id == user_id)
            .order_by(Follow.created_at.desc())
        )

        if params is not None:
            count_stmt = select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
            total_result = await self._session.execute(count_stmt)
            total = total_result.scalar_one()

            offset = (params.page - 1) * params.size
            paginated_stmt = stmt.offset(offset).limit(params.size)
            result = await self._session.execute(paginated_stmt)
            follows = result.unique().scalars().all()

            transformed_items = [
                FollowerResponse(
                    id=follow.following.id,
                    username=follow.following.username,
                    name=follow.following.name,
                    image=follow.following.image,
                    bio=follow.following.bio,
                    followed_at=follow.created_at,
                )
                for follow in follows
            ]

            pages = (total + params.size - 1) // params.size if params.size > 0 else 0
            return Page[FollowerResponse].model_validate(
                {
                    "items": transformed_items,
                    "total": total,
                    "page": params.page,
                    "size": params.size,
                    "pages": pages,
                }
            )

        result = await self._session.execute(stmt)
        follows = result.scalars().all()
        return [
            FollowerResponse(
                id=follow.following.id,
                username=follow.following.username,
                name=follow.following.name,
                image=follow.following.image,
                bio=follow.following.bio,
                followed_at=follow.created_at,
            )
            for follow in follows
        ]

    async def get_followers_count(self, user_id: UUID) -> int:
        """
        Get count of users following the specified user.

        Args:
            user_id: User whose follower count to retrieve

        Returns:
            Number of followers
        """
        stmt = select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_following_count(self, user_id: UUID) -> int:
        """
        Get count of users that the specified user is following.

        Args:
            user_id: User whose following count to retrieve

        Returns:
            Number of users being followed
        """
        stmt = select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()
