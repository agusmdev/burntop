"""Authentication repositories for session and account management.

This module contains repositories for:
- SessionRepository: Session token-based authentication
- AccountRepository: OAuth provider account management
- VerificationRepository: Email and other verification flows
"""

from collections.abc import Sequence
from datetime import UTC, datetime

from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.auth.models import Account, Session, Verification
from app.auth.schemas import (
    AccountCreate,
    SessionCreate,
    VerificationCreate,
)
from app.common.postgres_repository import PostgresRepository


# Placeholder update schemas (not needed yet)
class SessionUpdate(BaseModel):
    """Placeholder for SessionUpdate schema."""

    pass


class AccountUpdate(BaseModel):
    """Placeholder for AccountUpdate schema."""

    pass


class VerificationUpdate(BaseModel):
    """Placeholder for VerificationUpdate schema."""

    pass


class SessionRepository(PostgresRepository[Session, SessionCreate, SessionUpdate]):
    """
    Repository for Session model with authentication-specific queries.

    Extends PostgresRepository with custom methods for session management:
    - Get session with user relationship eagerly loaded
    - Get session by token for authentication
    - Delete expired sessions for cleanup
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize SessionRepository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, Session)

    async def get_with_user(self, session_id: str) -> Session | None:
        """
        Get session with user relationship eagerly loaded.

        Uses joinedload to avoid N+1 queries when accessing session.user.

        Args:
            session_id: Session ID to look up

        Returns:
            Session with user loaded, or None if not found
        """
        query = select(Session).options(joinedload(Session.user)).where(Session.id == session_id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_token(self, token: str) -> Session | None:
        """
        Get session by token for Bearer authentication.

        Args:
            token: Bearer token to look up

        Returns:
            Session if found, or None
        """
        query = select(Session).where(Session.token == token)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def delete(self, id: str) -> bool:  # type: ignore[override]
        """
        Delete a session by ID (hard delete).

        Override of PostgresRepository.delete() to accept str instead of UUID.

        Args:
            id: Session ID (string)

        Returns:
            True if session was deleted, False if not found
        """
        stmt = delete(Session).where(Session.id == id)
        result = await self._session.execute(stmt)
        await self._session.commit()
        return (result.rowcount or 0) > 0

    async def delete_expired(self) -> int:
        """
        Delete all expired sessions from the database.

        This is a hard delete (not soft delete) to clean up old sessions.

        Returns:
            Number of sessions deleted
        """
        now = datetime.now(UTC)
        stmt = delete(Session).where(Session.expires_at < now)
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.rowcount or 0


class AccountRepository(PostgresRepository[Account, AccountCreate, AccountUpdate]):
    """
    Repository for Account model with OAuth-specific queries.

    Extends PostgresRepository with custom methods for OAuth management:
    - Get account by provider and account ID
    - Get all accounts for a user
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize AccountRepository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, Account)

    async def get_by_provider(self, provider_id: str, account_id: str) -> Account | None:
        """
        Get account by provider ID and account ID.

        Used during OAuth callback to find existing account.

        Args:
            provider_id: Provider identifier (github)
            account_id: Provider-specific account ID

        Returns:
            Account if found, or None
        """
        query = (
            select(Account)
            .where(Account.provider_id == provider_id)
            .where(Account.account_id == account_id)
        )
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_user_accounts(self, user_id: str) -> Sequence[Account]:
        """
        Get all OAuth accounts for a user.

        Args:
            user_id: User ID to look up accounts for

        Returns:
            List of accounts for the user
        """
        query = select(Account).where(Account.user_id == user_id)
        result = await self._session.execute(query)
        return result.scalars().all()

    async def update_oauth_tokens(
        self,
        account: Account,
        access_token: str,
        access_token_expires_at: datetime,
    ) -> Account:
        """
        Update OAuth tokens for an existing account.

        Args:
            account: Account instance to update
            access_token: New access token
            access_token_expires_at: Token expiration timestamp

        Returns:
            Updated Account instance
        """
        account.access_token = access_token
        account.access_token_expires_at = access_token_expires_at
        await self._session.commit()
        await self._session.refresh(account)
        return account


class VerificationRepository(
    PostgresRepository[Verification, VerificationCreate, VerificationUpdate]
):
    """
    Repository for Verification model with verification-specific queries.

    Extends PostgresRepository with custom methods for verification flows:
    - Get verification by value (code/token)
    - Get active verifications for an identifier
    - Delete expired verifications
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize VerificationRepository.

        Args:
            session: SQLAlchemy async session
        """
        super().__init__(session, Verification)

    async def get_by_value(self, value: str) -> Verification | None:
        """
        Get verification by value (code or token).

        Args:
            value: Verification code or token

        Returns:
            Verification if found, or None
        """
        query = select(Verification).where(Verification.value == value)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_identifier(
        self, identifier: str, verification_type: str | None = None
    ) -> Sequence[Verification]:
        """
        Get all active verifications for an identifier.

        Args:
            identifier: Email, phone, or other identifier
            verification_type: Optional type filter (email, phone, password_reset)

        Returns:
            List of active verifications for the identifier
        """
        now = datetime.now(UTC)
        query = (
            select(Verification)
            .where(Verification.identifier == identifier)
            .where(Verification.expires_at > now)
        )
        if verification_type:
            query = query.where(Verification.verification_type == verification_type)
        result = await self._session.execute(query)
        return result.scalars().all()

    async def delete_expired(self) -> int:
        """
        Delete all expired verifications from the database.

        This is a hard delete to clean up old verification codes.

        Returns:
            Number of verifications deleted
        """
        now = datetime.now(UTC)
        stmt = delete(Verification).where(Verification.expires_at < now)
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.rowcount or 0
