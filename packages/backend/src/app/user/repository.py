"""User repository with entity-specific queries."""

from collections.abc import Sequence

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.common import PostgresRepository
from app.user.models import User
from app.user.schemas import UserCreate, UserUpdate


class UserRepository(PostgresRepository[User, UserCreate, UserUpdate]):
    """
    Repository for User entity.

    Provides user-specific query methods beyond standard CRUD:
    - Get by username/email
    - Search users
    - Get public users
    - Eager load relationships (streak, etc.)
    """

    def __init__(self, session: AsyncSession):
        """Initialize User repository."""
        super().__init__(session, User)

    async def get_by_username(self, username: str) -> User | None:
        """
        Get user by username (case-sensitive).

        Args:
            username: Username to search for

        Returns:
            User if found, None otherwise
        """
        return await self.get_by_field("username", username)

    async def get_by_email(self, email: str) -> User | None:
        """
        Get user by email (case-sensitive).

        Args:
            email: Email address to search for

        Returns:
            User if found, None otherwise
        """
        return await self.get_by_field("email", email)

    async def get_public_users(self, skip: int = 0, limit: int = 100) -> Sequence[User]:
        """
        Get all users with public profiles.

        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of users with is_public=True
        """
        query = self._base_query().where(User.is_public.is_(True)).offset(skip).limit(limit)
        result = await self._session.execute(query)
        return result.scalars().all()

    async def search_users(
        self, search_term: str, skip: int = 0, limit: int = 20
    ) -> Sequence[User]:
        """
        Search users by username or name (case-insensitive).

        Only returns users with public profiles.

        Args:
            search_term: Term to search for in username or name
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of matching users
        """
        search_pattern = f"%{search_term}%"
        query = (
            self._base_query()
            .where(User.is_public.is_(True))
            .where(User.username.ilike(search_pattern) | User.name.ilike(search_pattern))
            .offset(skip)
            .limit(limit)
        )
        result = await self._session.execute(query)
        return result.scalars().all()

    async def get_with_streak(self, user_id) -> User | None:
        """
        Get user with streak relationship eagerly loaded.

        Useful when you need user and streak data together to avoid N+1 queries.

        Args:
            user_id: User UUID

        Returns:
            User with streak loaded, or None if not found
        """
        query = self._base_query().options(joinedload(User.streak)).where(User.id == user_id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def create_with_password(
        self,
        email: str,
        username: str,
        password: str,
        name: str | None = None,
        email_verified: bool = False,
    ) -> User:
        """
        Create a new user with email/password registration.

        Handles password hashing internally.

        Args:
            email: User email address
            username: Unique username
            password: Plain text password (will be hashed)
            name: Optional display name
            email_verified: Whether email is verified (default False)

        Returns:
            Created User instance
        """
        user = User(
            email=email,
            username=username,
            name=name,
            email_verified=email_verified,
        )
        user.set_password(password)
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def create_oauth_user(
        self,
        email: str,
        username: str,
        name: str | None = None,
        email_verified: bool = True,
        image: str | None = None,
    ) -> User:
        """
        Create a new user from OAuth registration.

        No password is set for OAuth-only users.

        Args:
            email: User email address (may be synthetic for providers without email)
            username: Unique username (generated from provider data)
            name: Optional display name
            email_verified: Whether email is verified (default True for OAuth)
            image: Optional profile image URL

        Returns:
            Created User instance
        """
        user = User(
            email=email,
            username=username,
            name=name,
            email_verified=email_verified,
            image=image,
        )
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def verify_password(self, user_id, password: str) -> bool:
        """
        Verify a password for a user.

        Args:
            user_id: User UUID
            password: Plain text password to verify

        Returns:
            True if password matches, False otherwise
        """
        user = await self.get_by_id(user_id)
        if not user:
            return False
        return user.verify_password(password)

    async def has_password(self, user_id) -> bool:
        """
        Check if user has a password set.

        Args:
            user_id: User UUID

        Returns:
            True if user has password_hash set, False otherwise
        """
        user = await self.get_by_id(user_id)
        if not user:
            return False
        return user.password_hash is not None
