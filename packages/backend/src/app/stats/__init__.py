"""Platform statistics module."""

from app.stats.router import router
from app.stats.schemas import PlatformStatsResponse
from app.stats.service import StatsService

__all__ = ["PlatformStatsResponse", "StatsService", "router"]
