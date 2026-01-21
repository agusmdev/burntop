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
    Sync usage records from CLI clients (v2.0.0).

    This endpoint accepts individual messages with unique IDs for message-level deduplication.
    Syncing the same data twice will NOT double-count tokens - only new messages are processed.

    It performs the following operations:
    1. Filters to only NEW messages (using message IDs for deduplication)
    2. Aggregates new messages by date/model
    3. Calculates costs using the pricing engine
    4. ADDs to daily records (accumulates only NEW tokens)
    5. Stores synced message IDs for future deduplication
    6. Updates user streak
    7. Returns comprehensive sync response with stats

    The machine_id field enables multi-machine sync - different machines can sync
    data for the same user without overwriting each other's records.

    Breaking change from v1.0.0:
    - Request now has `source` at payload level and `messages` array (not `records`)
    - Each message includes its unique ID for deduplication
    - Response includes `messagesReceived` and `messagesSynced` counts
    """,
)
async def sync_usage(
    sync_request: SyncRequest,
    user_id: Annotated[UUID, Depends(get_current_user_id)],
    service: Annotated[UsageRecordService, Depends(get_usage_record_service)],
) -> SyncResponse:
    """
    Sync usage records from CLI client with message-level deduplication.

    Args:
        sync_request: Sync request payload from CLI (v2.0.0 format)
        user_id: Authenticated user ID (from Bearer token)
        service: UsageRecord service instance

    Returns:
        SyncResponse with processing statistics

    Raises:
        HTTPException: 401 Unauthorized if Bearer token is invalid
        HTTPException: 422 Unprocessable Entity if validation fails
    """
    response = await service.process_sync(
        user_id=user_id,
        source=sync_request.source,
        messages=sync_request.messages,
        machine_id=sync_request.machine_id,
    )

    return response
