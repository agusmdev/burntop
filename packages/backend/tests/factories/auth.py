"""
Factories for Auth models (Session, Account, Verification) testing.

Generates realistic authentication data with faker.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import factory
from factory import Faker, LazyAttribute, LazyFunction

from app.auth.models import Account, Session, Verification


class SessionFactory(factory.Factory):
    """
    Factory for creating Session model instances.

    Usage:
        # Create session with default data
        session = SessionFactory.build()

        # Create session for specific user
        session = SessionFactory.build(user_id=user.id)
    """

    class Meta:
        model = Session

    # Primary key (custom string ID format)
    id = LazyAttribute(lambda obj: f"s_{uuid4().hex}")

    # Foreign key to User
    user_id = LazyFunction(lambda: str(uuid4()))

    # Session fields
    token = LazyFunction(lambda: uuid4().hex)
    expires_at = LazyFunction(lambda: datetime.now(UTC) + timedelta(days=7))

    # Optional tracking fields
    ip_address = Faker("ipv4")
    user_agent = Faker("user_agent")

    # Timestamps
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))


class AccountFactory(factory.Factory):
    """
    Factory for creating OAuth Account model instances.

    Usage:
        # Create GitHub account
        account = AccountFactory.build(provider_id="github")

        # Create account linked to specific user
        account = AccountFactory.build(user_id=user.id)
    """

    class Meta:
        model = Account

    # Primary key
    id = LazyFunction(lambda: str(uuid4()))

    # Foreign key to User
    user_id = LazyFunction(lambda: str(uuid4()))

    # OAuth provider fields
    account_id = Faker("uuid4")
    provider_id = "github"

    # OAuth tokens
    access_token = LazyFunction(lambda: uuid4().hex)
    refresh_token = LazyFunction(lambda: uuid4().hex)
    access_token_expires_at = LazyFunction(lambda: datetime.now(UTC) + timedelta(hours=1))

    # Timestamps
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))


class VerificationFactory(factory.Factory):
    """
    Factory for creating Verification model instances.

    Usage:
        # Create email verification
        verification = VerificationFactory.build(verification_type="email")

        # Create password reset code
        verification = VerificationFactory.build(verification_type="password_reset")
    """

    class Meta:
        model = Verification

    # Primary key
    id = LazyFunction(lambda: str(uuid4()))

    # Verification fields
    identifier = Faker("email")
    value = LazyFunction(lambda: uuid4().hex[:8].upper())  # 8-char code
    expires_at = LazyFunction(lambda: datetime.now(UTC) + timedelta(hours=24))
    verification_type = "email"  # email, phone, password_reset

    # Timestamps
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))
