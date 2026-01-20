"""Leaderboard router for leaderboard API endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.auth import get_current_user_optional
from app.leaderboard.dependencies import get_leaderboard_service
from app.leaderboard.schemas import (
    DebugStatsResponse,
    LeaderboardEntryResponse,
    LeaderboardResponse,
)
from app.leaderboard.service import LeaderboardService
from app.tasks.leaderboard import update_leaderboard_cache
from app.user.models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])


class RefreshResponse(BaseModel):
    success: bool
    message: str


@router.get("/", response_model=LeaderboardResponse)
async def get_leaderboard(
    service: Annotated[LeaderboardService, Depends(get_leaderboard_service)],
    current_user: Annotated[User | None, Depends(get_current_user_optional)],
    period: str = Query(
        "all",
        description="Time period (all, month, week)",
        pattern="^(all|month|week)$",
    ),
    sort_by: str = Query(
        "tokens",
        description="Sort field (tokens, cost, streak)",
        pattern="^(tokens|cost|streak)$",
    ),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of entries to return"),
    offset: int = Query(0, ge=0, description="Number of entries to skip for pagination"),
) -> LeaderboardResponse:
    return await service.get_rankings(
        period=period,
        sort_by=sort_by,
        limit=limit,
        offset=offset,
        current_user_id=str(current_user.id) if current_user else None,
    )


@router.get("/{username}", response_model=LeaderboardEntryResponse | None)
async def get_user_leaderboard_rank(
    username: str,  # noqa: ARG001
    service: Annotated[LeaderboardService, Depends(get_leaderboard_service)],  # noqa: ARG001
    period: str = Query(  # noqa: ARG001
        "all",
        description="Time period",
        pattern="^(all|month|week)$",
    ),
) -> LeaderboardEntryResponse | None:
    return None


@router.get("/debug", response_model=DebugStatsResponse)
async def debug_leaderboard(
    service: Annotated[LeaderboardService, Depends(get_leaderboard_service)],
) -> DebugStatsResponse:
    return await service.get_debug_stats()


@router.post("/refresh", response_model=RefreshResponse)
async def refresh_leaderboard() -> RefreshResponse:
    try:
        logger.info("Manual leaderboard refresh triggered")
        await update_leaderboard_cache()
        return RefreshResponse(
            success=True,
            message="Leaderboard cache updated successfully",
        )
    except Exception as e:
        logger.error(f"Failed to refresh leaderboard cache: {e}")
        return RefreshResponse(
            success=False,
            message=f"Failed to refresh leaderboard: {e!s}",
        )
