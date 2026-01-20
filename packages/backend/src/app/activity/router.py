"""Activity router for feed endpoints."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi_pagination import Page, Params

from app.activity.dependencies import get_activity_service
from app.activity.schemas import ActivityResponse
from app.activity.service import ActivityService
from app.auth.dependencies import get_current_user_id

router = APIRouter(prefix="/feed", tags=["Feed"])


@router.get(
    "",
    response_model=Page[ActivityResponse],
    summary="Get activity feed",
    description="Get activity feed for the authenticated user (activities from users they follow)",
)
async def get_feed(
    current_user_id: Annotated[UUID, Depends(get_current_user_id)],
    service: Annotated[ActivityService, Depends(get_activity_service)],
    params: Params = Depends(),
) -> Page[ActivityResponse]:
    """
    Get activity feed for the authenticated user.

    Returns activities from users that the authenticated user follows,
    ordered by created_at DESC (most recent first).

    The feed includes:
    - Achievement unlocks
    - Level ups
    - Streak milestones
    - Other notable user actions

    Pagination is supported via query parameters:
    - page: Page number (default: 1)
    - size: Items per page (default: 50, max: 100)
    """
    activities_page = await service.get_feed(current_user_id, params)
    return activities_page  # type: ignore
