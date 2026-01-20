"""Leaderboard service for computing and querying rankings."""

from decimal import Decimal

from app.leaderboard.repository import LeaderboardRepository
from app.leaderboard.schemas import (
    DebugRankingEntry,
    DebugStatsResponse,
    LeaderboardEntryResponse,
    LeaderboardResponse,
    PaginationMeta,
)


class LeaderboardService:
    def __init__(self, repository: LeaderboardRepository):
        self.repository = repository

    async def get_rankings(
        self,
        period: str = "all",
        sort_by: str = "tokens",
        limit: int = 100,
        offset: int = 0,
        current_user_id: str | None = None,
    ) -> LeaderboardResponse:
        if limit < 1 or limit > 1000:
            raise ValueError("Limit must be between 1 and 1000")

        entries = await self.repository.get_rankings(
            period=period,
            skip=offset,
            limit=limit + 1,
        )

        has_more = len(entries) > limit
        entries_to_process = entries[:limit]

        # Get preferred tools for all users in the leaderboard
        user_ids = [str(entry.user_id) for entry in entries_to_process]
        preferred_tools = await self.repository.get_preferred_tools(user_ids)

        # Get followers counts for all users
        followers_counts = await self.repository.get_followers_counts(user_ids)

        # Get is_following status if current user is authenticated
        is_following_map: dict[str, bool] = {}
        if current_user_id:
            is_following_map = await self.repository.get_is_following_batch(
                current_user_id, user_ids
            )

        response_entries = [
            LeaderboardEntryResponse(
                id=entry.id,
                created_at=entry.created_at,
                updated_at=entry.updated_at,
                user_id=str(entry.user_id),
                username=entry.user.username if entry.user else "unknown",
                display_name=entry.user.name if entry.user else None,
                image=entry.user.image if entry.user else None,
                rank=entry.rank,
                rank_change=entry.rank_change,
                total_tokens=entry.total_tokens,
                total_cost=Decimal(str(entry.total_cost)) if entry.total_cost is not None else None,
                streak_days=entry.streak_days,
                preferred_tool=preferred_tools.get(str(entry.user_id)),
                followers_count=followers_counts.get(str(entry.user_id), 0),
                is_following=is_following_map.get(str(entry.user_id))
                if current_user_id
                else None,
            )
            for entry in entries_to_process
        ]

        total = await self.repository.count_rankings(period=period)

        pagination = PaginationMeta(
            total=total,
            limit=limit,
            offset=offset,
            has_more=has_more,
        )

        return LeaderboardResponse(
            entries=response_entries,
            pagination=pagination,
            period=period,
            sort_by=sort_by,
        )

    async def get_user_rank(
        self,
        user_id: str,
        period: str = "all",
    ) -> LeaderboardEntryResponse | None:
        entry = await self.repository.get_user_rank(
            user_id=user_id,
            period=period,
        )

        if not entry:
            return None

        # Get preferred tool for this user
        preferred_tools = await self.repository.get_preferred_tools([str(entry.user_id)])
        preferred_tool = preferred_tools.get(str(entry.user_id))

        return LeaderboardEntryResponse(
            id=entry.id,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
            user_id=str(entry.user_id),
            username=entry.user.username if entry.user else "unknown",
            display_name=entry.user.name if entry.user else None,
            image=entry.user.image if entry.user else None,
            rank=entry.rank,
            rank_change=entry.rank_change,
            total_tokens=entry.total_tokens,
            total_cost=Decimal(str(entry.total_cost)) if entry.total_cost is not None else None,
            streak_days=entry.streak_days,
            preferred_tool=preferred_tool,
        )

    async def get_debug_stats(self) -> DebugStatsResponse:
        record_count = await self.repository.get_usage_record_count()
        unique_users = await self.repository.get_unique_users_count()
        top_users_data = await self.repository.get_top_users_by_tokens(limit=10)
        cache_count = await self.repository.get_cache_entry_count()

        top_users = [
            DebugRankingEntry(
                user_id=str(row.user_id),
                total_tokens=int(row.total_tokens or 0),
                rank=idx + 1,
            )
            for idx, row in enumerate(top_users_data)
        ]

        return DebugStatsResponse(
            usage_record_count=record_count,
            unique_users=unique_users,
            top_users=top_users,
            cache_entry_count=cache_count,
        )

    async def compute_rankings(self, period: str = "all") -> list[dict]:
        rows = await self.repository.get_ranking_data(period=period)

        user_ids = [str(row.user_id) for row in rows]
        streak_data = await self.repository.get_streak_data(user_ids)

        rankings = [
            {
                "user_id": str(row.user_id),
                "period": period,
                "rank": idx + 1,
                "total_tokens": int(row.total_tokens or 0),
                "total_cost": float(row.total_cost) if row.total_cost else None,
                "streak_days": streak_data.get(str(row.user_id), 0),
                "rank_change": 0,
            }
            for idx, row in enumerate(rows)
        ]

        return rankings
