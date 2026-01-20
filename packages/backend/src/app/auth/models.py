"""Authentication models for session management and OAuth providers.

This module contains models for:
- Session: User session management with token-based authentication
- Account: OAuth provider accounts linked to users
- Verification: Email and other verification codes
"""

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base, TimestampMixin

if TYPE_CHECKING:
    from app.user.models import User


class Session(TimestampMixin, Base):
    """User session model for token-based authentication.

    Sessions are created on login and store the session token, expiration,
    and optional tracking information like IP address and user agent.
    """

    __tablename__ = "sessions"

    # Primary key is session ID (string token like "s_...")
    id: Mapped[str] = mapped_column(String(128), primary_key=True, index=True)

    # Foreign key to user (UUID type to match users.id)
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Session token (for Bearer authentication)
    token: Mapped[str] = mapped_column(String(256), nullable=False, unique=True, index=True)

    # Session expiration
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Optional tracking fields
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 max length
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="sessions", lazy="selectin")

    def __repr__(self) -> str:
        """String representation of Session."""
        return f"<Session(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"


class Account(TimestampMixin, Base):
    """OAuth account model linking users to external providers.

    Stores OAuth access tokens, refresh tokens, and provider-specific data
    for GitHub and other OAuth providers.
    """

    __tablename__ = "accounts"

    # Primary key
    id: Mapped[str] = mapped_column(String(128), primary_key=True, index=True)

    # Foreign key to user (UUID type to match users.id)
    user_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Provider account ID (unique per provider)
    account_id: Mapped[str] = mapped_column(String(256), nullable=False, index=True)

    # Provider identifier (github, etc.)
    provider_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # OAuth tokens
    access_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Ensure unique provider account per user
    __table_args__ = (
        # Unique constraint: one account per provider per user
        # (user can't link same GitHub account twice)
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="accounts", lazy="selectin")

    def __repr__(self) -> str:
        """String representation of Account."""
        return f"<Account(id={self.id}, user_id={self.user_id}, provider_id={self.provider_id})>"


class Verification(TimestampMixin, Base):
    """Verification code model for email and other verification flows.

    Used for email verification, password reset codes, and other
    one-time verification flows.
    """

    __tablename__ = "verifications"

    # Primary key
    id: Mapped[str] = mapped_column(String(128), primary_key=True, index=True)

    # Identifier (email, phone, etc.)
    identifier: Mapped[str] = mapped_column(String(256), nullable=False, index=True)

    # Verification value (code or token)
    value: Mapped[str] = mapped_column(String(256), nullable=False, unique=True, index=True)

    # Expiration timestamp
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Optional: verification type (email, phone, password_reset)
    verification_type: Mapped[str | None] = mapped_column(String(64), nullable=True)

    def __repr__(self) -> str:
        """String representation of Verification."""
        return f"<Verification(id={self.id}, identifier={self.identifier}, expires_at={self.expires_at})>"
