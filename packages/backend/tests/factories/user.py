"""
Factory for User model testing.

Generates realistic user data with faker for comprehensive testing.
"""

from datetime import UTC, datetime
from uuid import uuid4

import factory
from factory import Faker, LazyAttribute, LazyFunction, post_generation
from faker import Faker as FakerInstance

from app.user.models import User

fake = FakerInstance()


class UserFactory(factory.Factory):
    """
    Factory for creating User model instances.

    Usage:
        # Create user with default data
        user = UserFactory.build()

        # Create user with custom fields
        user = UserFactory.build(email="custom@example.com")

        # Create user with hashed password
        user = UserFactory.build(password="mypassword")
    """

    class Meta:
        model = User

    # Primary key and timestamps
    id = LazyFunction(lambda: str(uuid4()))
    created_at = LazyFunction(lambda: datetime.now(UTC))
    updated_at = LazyFunction(lambda: datetime.now(UTC))
    deleted_at = None

    # Basic profile fields
    name = Faker("name")
    email = Faker("email")
    email_verified = True
    image = Faker("image_url")

    # Extended profile fields
    username = LazyAttribute(
        lambda obj: fake.user_name()[:30]  # Ensure max length 30
    )
    bio = Faker("text", max_nb_chars=200)
    location = Faker("city")
    region = Faker("country_code", representation="alpha-2")
    website_url = Faker("url")

    # Privacy
    is_public = True

    # Authentication (password_hash is None by default for OAuth-only users)
    password_hash = None

    @post_generation
    def password(self, create, extracted, **kwargs):
        """
        Post-generation hook to set password.

        Usage:
            user = UserFactory.build(password="mypassword")

        This will call user.set_password("mypassword") to hash the password.
        """
        if extracted:
            # If password parameter is provided, hash it
            self.set_password(extracted)
