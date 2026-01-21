"""SyncedMessageId dependency injection functions."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.synced_message.repository import SyncedMessageIdRepository


def get_synced_message_id_repository(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> SyncedMessageIdRepository:
    """
    Provide SyncedMessageIdRepository instance.

    Args:
        session: Database session from get_db dependency

    Returns:
        SyncedMessageIdRepository instance
    """
    return SyncedMessageIdRepository(session)
