"""Platform statistics service."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.benchmark.models import CommunityBenchmark
from app.stats.schemas import PlatformStatsResponse
from app.usage_record.models import UsageRecord

# Supported AI tools/sources
SUPPORTED_TOOLS = [
    "cursor",
    "claude-code",
    "web",
    "gemini-cli",
    "aider",
    "continue",
]


class StatsService:
    """Service for platform-wide statistics."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_platform_stats(self) -> PlatformStatsResponse:
        """
        Get platform-wide statistics for public display.

        Returns aggregated metrics from CommunityBenchmark (period='all')
        and counts distinct tools from usage records.
        """
        # Get community benchmark for all-time stats
        benchmark_query = select(CommunityBenchmark).where(
            CommunityBenchmark.period == "all"
        )
        result = await self._session.execute(benchmark_query)
        benchmark = result.scalar_one_or_none()

        # Get distinct tools count from actual usage
        tools_query = select(func.count(func.distinct(UsageRecord.source)))
        tools_result = await self._session.execute(tools_query)
        distinct_tools = tools_result.scalar() or 0

        # Use max of actual distinct tools or supported tools count
        total_tools = max(distinct_tools, len(SUPPORTED_TOOLS))

        # Default values if no benchmark exists yet
        total_tokens = 0
        total_users = 0

        if benchmark:
            total_tokens = benchmark.total_community_tokens or 0
            total_users = benchmark.total_users or 0

        return PlatformStatsResponse(
            total_tokens=total_tokens,
            total_users=total_users,
            total_tools=total_tools,
        )
