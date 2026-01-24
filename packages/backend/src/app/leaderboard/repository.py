"""Leaderboard repository for cached ranking queries."""

from collections.abc import Sequence
from datetime import date, timedelta
from typing import Any

from pydantic import BaseModel
from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import selectinload

from app.common.postgres_repository import PostgresRepository
from app.follow.models import Follow
from app.leaderboard.models import LeaderboardCache
from app.streak.models import Streak
from app.usage_record.models import UsageRecord
from app.user.models import User


class LeaderboardCacheCreate(BaseModel):
    pass


class LeaderboardCacheUpdate(BaseModel):
    pass


class LeaderboardRepository(
    PostgresRepository[LeaderboardCache, LeaderboardCacheCreate, LeaderboardCacheUpdate]
):
    def __init__(self, session):
        super().__init__(session, LeaderboardCache)

    async def get_rankings(
        self,
        period: str = "all",
        skip: int = 0,
        limit: int = 100,
    ) -> Sequence[LeaderboardCache]:
        query = (
            select(LeaderboardCache)
            .join(User, LeaderboardCache.user_id == User.id)
            .options(selectinload(LeaderboardCache.user))
            .where(
                and_(
                    LeaderboardCache.period == period,
                    User.deleted_at.is_(None),
                )
            )
            .order_by(LeaderboardCache.rank.asc())
            .offset(skip)
            .limit(limit)
        )

        result = await self._session.execute(query)
        return result.scalars().all()

    async def get_user_rank(
        self,
        user_id: str,
        period: str = "all",
    ) -> LeaderboardCache | None:
        query = (
            select(LeaderboardCache)
            .join(User, LeaderboardCache.user_id == User.id)
            .options(selectinload(LeaderboardCache.user))
            .where(
                and_(
                    LeaderboardCache.user_id == user_id,
                    LeaderboardCache.period == period,
                    User.deleted_at.is_(None),
                )
            )
        )

        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def bulk_update_cache(self, entries: list[dict[str, Any]]) -> None:
        if not entries:
            return

        stmt = insert(LeaderboardCache).values(entries)

        update_dict = {
            "rank": stmt.excluded.rank,
            "total_tokens": stmt.excluded.total_tokens,
            "total_cost": stmt.excluded.total_cost,
            "streak_days": stmt.excluded.streak_days,
            "rank_change": stmt.excluded.rank_change,
        }

        stmt = stmt.on_conflict_do_update(
            constraint="uq_leaderboard_cache_user_period",
            set_=update_dict,
        )

        await self._session.execute(stmt)
        await self._session.commit()

    async def count_rankings(self, period: str) -> int:
        count_query = select(func.count()).where(LeaderboardCache.period == period)
        result = await self._session.execute(count_query)
        return result.scalar_one()

    def _get_date_filter(self, period: str) -> date | None:
        if period == "month":
            return date.today() - timedelta(days=30)
        elif period == "week":
            return date.today() - timedelta(days=7)
        return None

    async def get_ranking_data(
        self,
        period: str = "all",
        limit: int = 1000,
    ) -> Sequence[Any]:
        # Define the total tokens expression once to use in both SELECT and ORDER BY
        total_tokens_expr = (
            UsageRecord.input_tokens
            + UsageRecord.output_tokens
            + func.coalesce(UsageRecord.cache_read_tokens, 0)
            + func.coalesce(UsageRecord.cache_write_tokens, 0)
            + func.coalesce(UsageRecord.reasoning_tokens, 0)
        )

        query = select(
            UsageRecord.user_id,
            func.sum(total_tokens_expr).label("total_tokens"),
            func.sum(UsageRecord.cost).label("total_cost"),
        )

        cutoff_date = self._get_date_filter(period)
        if cutoff_date is not None:
            query = query.where(UsageRecord.date >= cutoff_date)

        # Use the full expression in ORDER BY to ensure proper ordering
        query = query.group_by(UsageRecord.user_id).order_by(func.sum(total_tokens_expr).desc()).limit(limit)

        result = await self._session.execute(query)
        return result.all()

    async def get_streak_data(self, user_ids: list[str]) -> dict[str, int]:
        if not user_ids:
            return {}

        query = select(Streak.user_id, Streak.current_streak).where(Streak.user_id.in_(user_ids))
        result = await self._session.execute(query)
        return {str(row.user_id): row.current_streak for row in result.all()}

    async def get_usage_record_count(self) -> int:
        query = select(func.count()).select_from(UsageRecord)
        result = await self._session.execute(query)
        return result.scalar_one()

    async def get_unique_users_count(self) -> int:
        query = select(func.count(func.distinct(UsageRecord.user_id)))
        result = await self._session.execute(query)
        return result.scalar_one()

    async def get_top_users_by_tokens(self, limit: int = 10) -> Sequence[Any]:
        query = (
            select(
                UsageRecord.user_id,
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + func.coalesce(UsageRecord.cache_read_tokens, 0)
                    + func.coalesce(UsageRecord.cache_write_tokens, 0)
                    + func.coalesce(UsageRecord.reasoning_tokens, 0)
                ).label("total_tokens"),
            )
            .group_by(UsageRecord.user_id)
            .order_by(
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + func.coalesce(UsageRecord.cache_read_tokens, 0)
                    + func.coalesce(UsageRecord.cache_write_tokens, 0)
                    + func.coalesce(UsageRecord.reasoning_tokens, 0)
                ).desc()
            )
            .limit(limit)
        )
        result = await self._session.execute(query)
        return result.all()

    async def get_cache_entry_count(self) -> int:
        query = select(func.count()).select_from(LeaderboardCache)
        result = await self._session.execute(query)
        return result.scalar_one()

    async def get_preferred_tools(self, user_ids: list[str]) -> dict[str, str]:
        """Get the preferred tool (source with most tokens) for each user.

        Args:
            user_ids: List of user IDs to query.

        Returns:
            Dictionary mapping user_id to their preferred tool (source).
        """
        if not user_ids:
            return {}

        # Subquery to get total tokens per user per source
        tokens_subq = (
            select(
                UsageRecord.user_id,
                UsageRecord.source,
                func.sum(
                    UsageRecord.input_tokens
                    + UsageRecord.output_tokens
                    + func.coalesce(UsageRecord.cache_read_tokens, 0)
                    + func.coalesce(UsageRecord.cache_write_tokens, 0)
                    + func.coalesce(UsageRecord.reasoning_tokens, 0)
                ).label("total_tokens"),
            )
            .where(UsageRecord.user_id.in_(user_ids))
            .group_by(UsageRecord.user_id, UsageRecord.source)
            .subquery()
        )

        # Get max tokens per user
        max_tokens_subq = (
            select(
                tokens_subq.c.user_id,
                func.max(tokens_subq.c.total_tokens).label("max_tokens"),
            )
            .group_by(tokens_subq.c.user_id)
            .subquery()
        )

        # Join to get the source with max tokens for each user
        query = (
            select(tokens_subq.c.user_id, tokens_subq.c.source)
            .join(
                max_tokens_subq,
                and_(
                    tokens_subq.c.user_id == max_tokens_subq.c.user_id,
                    tokens_subq.c.total_tokens == max_tokens_subq.c.max_tokens,
                ),
            )
            .distinct()
        )

        result = await self._session.execute(query)
        return {str(row.user_id): row.source for row in result.all()}

    async def get_followers_counts(self, user_ids: list[str]) -> dict[str, int]:
        """Get followers count for each user.

        Args:
            user_ids: List of user IDs to query.

        Returns:
            Dictionary mapping user_id to their followers count.
        """
        if not user_ids:
            return {}

        query = (
            select(
                Follow.following_id,
                func.count(Follow.follower_id).label("followers_count"),
            )
            .where(Follow.following_id.in_(user_ids))
            .group_by(Follow.following_id)
        )

        result = await self._session.execute(query)
        return {str(row.following_id): row.followers_count for row in result.all()}

    async def get_is_following_batch(
        self, current_user_id: str, target_user_ids: list[str]
    ) -> dict[str, bool]:
        """Check if current user is following each of the target users.

        Args:
            current_user_id: ID of the current user.
            target_user_ids: List of user IDs to check.

        Returns:
            Dictionary mapping target user_id to whether the current user follows them.
        """
        if not target_user_ids or not current_user_id:
            return {}

        query = select(Follow.following_id).where(
            and_(
                Follow.follower_id == current_user_id,
                Follow.following_id.in_(target_user_ids),
            )
        )

        result = await self._session.execute(query)
        following_ids = {str(row.following_id) for row in result.all()}
        return {user_id: user_id in following_ids for user_id in target_user_ids}
