"""Background task for updating leaderboard cache."""

import logging

from sqlalchemy import select

from app.database import async_session_factory
from app.leaderboard.models import LeaderboardCache
from app.leaderboard.repository import LeaderboardRepository
from app.leaderboard.service import LeaderboardService

logger = logging.getLogger(__name__)


async def update_leaderboard_cache() -> None:
    logger.info("Starting leaderboard cache update")

    try:
        async with async_session_factory() as session:
            repository = LeaderboardRepository(session)
            service = LeaderboardService(repository)

            for period in ["all", "month", "week"]:
                logger.info(f"Computing rankings for period: {period}")

                previous_ranks = await _get_previous_ranks(session, period)
                rankings = await service.compute_rankings(period=period)

                for entry in rankings:
                    user_id = str(entry["user_id"])
                    previous_rank = previous_ranks.get(user_id)
                    if previous_rank is not None:
                        entry["rank_change"] = previous_rank - entry["rank"]
                    else:
                        entry["rank_change"] = None

                await repository.bulk_update_cache(rankings)
                logger.info(f"Updated {len(rankings)} entries for period: {period}")

            logger.info("Leaderboard cache update completed successfully")

    except Exception as e:
        logger.error(f"Error updating leaderboard cache: {e}")
        raise


async def _get_previous_ranks(session, period: str) -> dict[str, int]:
    query = select(LeaderboardCache.user_id, LeaderboardCache.rank).where(
        LeaderboardCache.period == period
    )

    result = await session.execute(query)
    return {str(user_id): rank for user_id, rank in result.all()}
