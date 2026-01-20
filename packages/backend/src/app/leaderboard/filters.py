"""Leaderboard filtering for API queries."""

from fastapi_filter.contrib.sqlalchemy import Filter

from app.leaderboard.models import LeaderboardCache


class LeaderboardFilter(Filter):
    period: str | None = None
    period__in: list[str] | None = None

    class Constants(Filter.Constants):  # type: ignore[name-defined]
        model = LeaderboardCache
        ordering_field_name = "order_by"
