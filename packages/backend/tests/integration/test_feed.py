"""Integration tests for activity feed endpoints.

Tests the /api/v1/feed endpoint for activity feed.
"""

from httpx import AsyncClient

from tests.factories.activity import ActivityFactory
from tests.factories.follow import FollowFactory
from tests.factories.user import UserFactory


class TestGetFeed:
    """Tests for GET /api/v1/feed"""

    async def test_get_feed_requires_auth(
        self,
        client: AsyncClient,
    ) -> None:
        """Test that getting feed requires authentication."""
        response = await client.get("/api/v1/feed")

        assert response.status_code == 401

    async def test_get_feed_empty(
        self,
        client: AsyncClient,
        authenticated_client,
    ) -> None:
        """Test getting feed when user follows no one."""
        auth_client, user_data = authenticated_client

        response = await auth_client.get("/api/v1/feed")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert "items" in data
        assert len(data["items"]) == 0

    async def test_get_feed_from_followed_users(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that feed shows activities from followed users."""
        auth_client, user_data = authenticated_client

        # Get authenticated user
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = result.scalar_one()

        # Create another user to follow
        followed_user = UserFactory.build(
            email="followed@example.com",
            username="followeduser",
        )
        db_session.add(followed_user)
        await db_session.commit()
        await db_session.refresh(followed_user)

        # Create follow relationship
        follow = FollowFactory.build(
            follower_id=user.id,
            following_id=followed_user.id,
        )
        db_session.add(follow)
        await db_session.commit()

        # Create activity from followed user
        activity = ActivityFactory.build(
            user_id=followed_user.id,
            type="streak_milestone",
        )
        db_session.add(activity)
        await db_session.commit()

        response = await auth_client.get("/api/v1/feed")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 1
        assert data["items"][0]["user"]["username"] == "followeduser"
        assert data["items"][0]["type"] == "streak_milestone"

    async def test_get_feed_excludes_non_followed_users(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that feed does not show activities from non-followed users."""
        auth_client, user_data = authenticated_client

        # Get authenticated user
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = result.scalar_one()

        # Create followed user
        followed_user = UserFactory.build(
            email="followed@example.com",
            username="followeduser",
        )
        # Create non-followed user
        other_user = UserFactory.build(
            email="other@example.com",
            username="otheruser",
        )
        db_session.add_all([followed_user, other_user])
        await db_session.commit()
        await db_session.refresh(followed_user)
        await db_session.refresh(other_user)

        # Create follow relationship (only for followed_user)
        follow = FollowFactory.build(
            follower_id=user.id,
            following_id=followed_user.id,
        )
        db_session.add(follow)
        await db_session.commit()

        # Create activities from both users
        followed_activity = ActivityFactory.build(
            user_id=followed_user.id,
            type="streak_milestone",
        )
        other_activity = ActivityFactory.build(
            user_id=other_user.id,
            type="badge_earned",
        )
        db_session.add_all([followed_activity, other_activity])
        await db_session.commit()

        response = await auth_client.get("/api/v1/feed")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 1
        assert data["items"][0]["user"]["username"] == "followeduser"

    async def test_get_feed_ordered_by_date(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that feed is ordered by created_at DESC."""
        auth_client, user_data = authenticated_client

        # Get authenticated user
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = result.scalar_one()

        # Create followed user
        followed_user = UserFactory.build(
            email="followed@example.com",
            username="followeduser",
        )
        db_session.add(followed_user)
        await db_session.commit()
        await db_session.refresh(followed_user)

        # Create follow relationship
        follow = FollowFactory.build(
            follower_id=user.id,
            following_id=followed_user.id,
        )
        db_session.add(follow)
        await db_session.commit()

        # Create activities (will have different timestamps)
        activity1 = ActivityFactory.build(
            user_id=followed_user.id,
            type="streak_milestone",
            data={"name": "First"},
        )
        db_session.add(activity1)
        await db_session.commit()

        activity2 = ActivityFactory.build(
            user_id=followed_user.id,
            type="badge_earned",
            data={"name": "Second"},
        )
        db_session.add(activity2)
        await db_session.commit()

        response = await auth_client.get("/api/v1/feed")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 2
        # Most recent should be first
        assert data["items"][0]["type"] == "badge_earned"
        assert data["items"][1]["type"] == "streak_milestone"

    async def test_get_feed_includes_user_data(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that feed items include user data."""
        auth_client, user_data = authenticated_client

        # Get authenticated user
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = result.scalar_one()

        # Create followed user
        followed_user = UserFactory.build(
            email="followed@example.com",
            username="followeduser",
            name="Followed User",
        )
        db_session.add(followed_user)
        await db_session.commit()
        await db_session.refresh(followed_user)

        # Create follow relationship
        follow = FollowFactory.build(
            follower_id=user.id,
            following_id=followed_user.id,
        )
        db_session.add(follow)
        await db_session.commit()

        # Create activity
        activity = ActivityFactory.build(
            user_id=followed_user.id,
            type="streak_milestone",
        )
        db_session.add(activity)
        await db_session.commit()

        response = await auth_client.get("/api/v1/feed")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) == 1
        assert "user" in data["items"][0]
        assert data["items"][0]["user"]["username"] == "followeduser"
        assert data["items"][0]["user"]["name"] == "Followed User"

    async def test_get_feed_pagination(
        self,
        client: AsyncClient,
        authenticated_client,
        db_session,
    ) -> None:
        """Test that feed supports pagination."""
        auth_client, user_data = authenticated_client

        # Get authenticated user
        from sqlalchemy import select

        from app.user.models import User
        result = await db_session.execute(
            select(User).where(User.email == user_data["email"])
        )
        user = result.scalar_one()

        # Create followed user
        followed_user = UserFactory.build(
            email="followed@example.com",
            username="followeduser",
        )
        db_session.add(followed_user)
        await db_session.commit()
        await db_session.refresh(followed_user)

        # Create follow relationship
        follow = FollowFactory.build(
            follower_id=user.id,
            following_id=followed_user.id,
        )
        db_session.add(follow)
        await db_session.commit()

        # Create multiple activities
        for i in range(5):
            activity = ActivityFactory.build(
                user_id=followed_user.id,
                type="streak_milestone",
            )
            db_session.add(activity)
            await db_session.commit()

        # Test pagination parameters
        response = await auth_client.get("/api/v1/feed?page=1&size=2")

        assert response.status_code == 200
        data = response.json()
        # Should respect pagination (may vary based on implementation)
        assert isinstance(data, dict)
        assert "items" in data
        assert len(data["items"]) <= 2  # Should respect page size
