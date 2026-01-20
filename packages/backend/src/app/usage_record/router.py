"""UsageRecord API router for sync endpoint.

This module provides the POST /sync endpoint that CLI clients use to sync usage data.
"""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.auth.dependencies import get_current_user_id
from app.usage_record.dependencies import get_usage_record_service
from app.usage_record.schemas import SyncRequest, SyncResponse
from app.usage_record.service import UsageRecordService

router = APIRouter(prefix="/sync", tags=["Sync"])


@router.post(
    "",
    response_model=SyncResponse,
    status_code=status.HTTP_200_OK,
    summary="Sync usage data",
    description="""
    Sync usage records from CLI clients.

    This endpoint accepts usage records aggregated by date, source, and model.
    It performs the following operations:
    1. Deduplicates records (merges records for same date/source/model)
    2. Calculates costs using the pricing engine
    3. Upserts records to database (using unique constraint on user_id, date, source, model, machine_id)
    4. Updates user streak
    5. Returns comprehensive sync response with stats

    The machine_id field enables multi-machine sync - different machines can sync
    data for the same user without overwriting each other's records.

    Rate limiting will be added via middleware in a future task.
    """,
)
async def sync_usage(
    sync_request: SyncRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    service: Annotated[UsageRecordService, Depends(get_usage_record_service)],
) -> SyncResponse:
    """
    Sync usage records from CLI client.

    Args:
        sync_request: Sync request payload from CLI
        user_id: Authenticated user ID (from Bearer token)
        service: UsageRecord service instance

    Returns:
        SyncResponse with processing statistics and new achievements

    Raises:
        HTTPException: 401 Unauthorized if Bearer token is invalid
        HTTPException: 422 Unprocessable Entity if validation fails
    """
    # Process sync request
    response = await service.process_sync(
        user_id=user_id,
        records=sync_request.records,
        _synced_at=sync_request.synced_at,
        machine_id=sync_request.machine_id,
    )

    return response
