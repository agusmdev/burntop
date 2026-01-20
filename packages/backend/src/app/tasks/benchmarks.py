"""Background task for updating community benchmarks.

This module contains the scheduled task that computes community-wide statistics
from usage data and updates the CommunityBenchmark table. Runs hourly to keep
benchmark data current for user insights and comparisons.
"""

import logging

from app.benchmark.repository import CommunityBenchmarkRepository
from app.benchmark.service import BenchmarkService
from app.database import async_session_factory

logger = logging.getLogger(__name__)


async def update_community_benchmarks() -> None:
    """Update community benchmarks with fresh statistics.

    This task computes community-wide aggregate statistics for all time periods
    (all, month, week) and upserts them into the CommunityBenchmark table for
    fast queries and user insights.

    Statistics Computed:
        - total_users: Number of active users with usage records
        - avg_tokens: Average tokens used per user
        - median_tokens: Median tokens used per user
        - total_community_tokens: Total tokens across all users
        - avg_cost: Average cost per user (USD)
        - avg_streak: Average current streak length
        - avg_unique_tools: Average number of unique sources/tools used
        - avg_cache_efficiency: Average cache hit rate percentage

    Time Periods:
        - all: All-time statistics
        - month: Last 30 days
        - week: Last 7 days
    """
    logger.info("Starting community benchmarks update")

    try:
        # Create a new session for the background task
        async with async_session_factory() as session:
            repository = CommunityBenchmarkRepository(session)
            service = BenchmarkService(repository, session)

            # Update benchmarks for all periods
            for period in ["all", "month", "week"]:
                logger.info(f"Computing benchmarks for period: {period}")

                # Calculate and update benchmarks using service
                benchmark = await service.update_benchmarks(period)

                logger.info(
                    f"Updated benchmark for {period}: "
                    f"{benchmark.total_users} users, "
                    f"avg {benchmark.avg_tokens} tokens"
                )

            logger.info("Community benchmarks update completed successfully")

    except Exception as e:
        logger.error(f"Error updating community benchmarks: {e}")
        raise
