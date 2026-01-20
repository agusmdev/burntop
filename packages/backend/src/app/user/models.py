"""User model definition."""

from typing import TYPE_CHECKING

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core import Base, SoftDeleteMixin, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.activity.models import Activity
    from app.auth.models import Account, Session
    from app.follow.models import Follow
    from app.leaderboard.models import LeaderboardCache
    from app.project.models import Project
    from app.streak.models import Streak
    from app.usage_record.models import UsageRecord


# Initialize Argon2 password hasher
_password_hasher = PasswordHasher()


class User(UUIDMixin, TimestampMixin, SoftDeleteMixin, Base):
    """
    User model representing a user in the system.

    Tracks basic profile information and authentication details.
    Users can make their profiles public or keep them private.
    """

    __tablename__ = "users"

    # Basic profile fields
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Extended profile fields
    username: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    location: Mapped[str | None] = mapped_column(String(100), nullable=True)
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Privacy
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Password hash (nullable for OAuth-only users)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships (using string references to avoid circular imports)
    sessions: Mapped[list["Session"]] = relationship(
        "Session", back_populates="user", lazy="selectin"
    )
    accounts: Mapped[list["Account"]] = relationship(
        "Account", back_populates="user", lazy="selectin"
    )
    usage_records: Mapped[list["UsageRecord"]] = relationship(
        "UsageRecord", back_populates="user", lazy="selectin"
    )
    streak: Mapped["Streak | None"] = relationship(
        "Streak", back_populates="user", uselist=False, lazy="selectin"
    )
    followers: Mapped[list["Follow"]] = relationship(
        "Follow",
        foreign_keys="[Follow.following_id]",
        back_populates="following",
        lazy="selectin",
    )
    following: Mapped[list["Follow"]] = relationship(
        "Follow",
        foreign_keys="[Follow.follower_id]",
        back_populates="follower",
        lazy="selectin",
    )
    leaderboard_cache: Mapped[list["LeaderboardCache"]] = relationship(
        "LeaderboardCache", back_populates="user", lazy="selectin"
    )
    activities: Mapped[list["Activity"]] = relationship(
        "Activity", back_populates="user", lazy="selectin"
    )
    projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="user", lazy="selectin"
    )

    # Password hashing methods
    def set_password(self, password: str) -> None:
        """
        Hash and set the user's password using Argon2.

        Args:
            password: Plain text password to hash
        """
        self.password_hash = _password_hasher.hash(password)

    def verify_password(self, password: str) -> bool:
        """
        Verify a password against the stored hash.

        Args:
            password: Plain text password to verify

        Returns:
            True if password matches, False otherwise
        """
        if not self.password_hash:
            return False
        try:
            _password_hasher.verify(self.password_hash, password)
            # Check if password needs rehashing (Argon2 parameters changed)
            if _password_hasher.check_needs_rehash(self.password_hash):
                self.set_password(password)
            return True
        except VerifyMismatchError:
            return False

    def __repr__(self) -> str:
        """String representation of User."""
        return f"<User(id={self.id!r}, username={self.username!r}, email={self.email!r})>"
