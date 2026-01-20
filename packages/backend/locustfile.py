"""
Locust load testing for FastAPI backend.

Usage:
    # Start FastAPI server first:
    uv run uvicorn src.app.main:app --reload

    # Run locust:
    uv run locust --host=http://localhost:8000

    # Or headless with specific parameters:
    uv run locust --host=http://localhost:8000 --users 100 --spawn-rate 10 --run-time 60s --headless
"""

import random
from datetime import UTC, datetime, timedelta

from locust import HttpUser, between, task


class BurntopUser(HttpUser):
    """Simulates a typical Burntop user interacting with the API."""

    wait_time = between(1, 3)  # Wait 1-3 seconds between tasks
    token: str | None = None
    username: str | None = None

    def on_start(self):
        """Register and login when user starts."""
        # Generate unique username for this user
        self.username = f"testuser_{random.randint(10000, 99999)}"

        # Register
        register_response = self.client.post(
            "/api/v1/auth/register",
            json={
                "email": f"{self.username}@example.com",
                "password": "testpassword123",
                "username": self.username,
                "name": f"Test User {self.username}",
            },
            name="/api/v1/auth/register",
        )

        if register_response.status_code == 201:
            data = register_response.json()
            self.token = data["session"]["id"]
        else:
            # If registration fails, try to login
            login_response = self.client.post(
                "/api/v1/auth/login",
                json={"email": f"{self.username}@example.com", "password": "testpassword123"},
                name="/api/v1/auth/login",
            )
            if login_response.status_code == 200:
                data = login_response.json()
                self.token = data["session"]["id"]

    def get_headers(self):
        """Get headers with auth token."""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    @task(10)
    def get_health(self):
        """Test health endpoint (highest weight - most common)."""
        self.client.get("/api/v1/health", name="/api/v1/health")

    @task(5)
    def get_current_user(self):
        """Test getting current user."""
        self.client.get("/api/v1/auth/me", headers=self.get_headers(), name="/api/v1/auth/me")

    @task(3)
    def get_dashboard_overview(self):
        """Test dashboard overview endpoint."""
        self.client.get(
            "/api/v1/dashboard/overview", headers=self.get_headers(), name="/api/v1/dashboard/overview"
        )

    @task(2)
    def get_dashboard_trends(self):
        """Test dashboard trends endpoint."""
        self.client.get("/api/v1/dashboard/trends", headers=self.get_headers(), name="/api/v1/dashboard/trends")

    @task(3)
    def get_leaderboard(self):
        """Test leaderboard endpoint."""
        self.client.get("/api/v1/leaderboard", name="/api/v1/leaderboard")

    @task(2)
    def get_achievements(self):
        """Test achievements endpoint."""
        self.client.get("/api/v1/achievements", name="/api/v1/achievements")

    @task(2)
    def get_user_profile(self):
        """Test user profile endpoint."""
        if self.username:
            self.client.get(
                f"/api/v1/users/{self.username}", headers=self.get_headers(), name="/api/v1/users/{username}"
            )

    @task(1)
    def get_notifications(self):
        """Test notifications endpoint."""
        self.client.get("/api/v1/notifications", headers=self.get_headers(), name="/api/v1/notifications")

    @task(1)
    def get_feed(self):
        """Test activity feed endpoint."""
        self.client.get("/api/v1/feed", headers=self.get_headers(), name="/api/v1/feed")

    @task(1)
    def sync_usage(self):
        """Test sync endpoint with usage data."""
        # Generate random usage data
        records = []
        for _ in range(random.randint(1, 5)):
            date = datetime.now(UTC).date() - timedelta(days=random.randint(0, 7))
            records.append(
                {
                    "date": str(date),
                    "source": random.choice(["cursor", "claude-code", "web"]),
                    "model": random.choice(
                        [
                            "claude-3-5-sonnet-20241022",
                            "claude-3-5-haiku-20241022",
                            "gpt-4",
                            "gpt-3.5-turbo",
                        ]
                    ),
                    "input_tokens": random.randint(100, 10000),
                    "output_tokens": random.randint(100, 5000),
                    "cache_read_tokens": random.randint(0, 5000),
                    "cache_write_tokens": random.randint(0, 1000),
                    "reasoning_tokens": random.randint(0, 2000),
                }
            )

        self.client.post(
            "/api/v1/sync",
            headers=self.get_headers(),
            json={"records": records},
            name="/api/v1/sync",
        )


class ReadOnlyUser(HttpUser):
    """Simulates a user who only reads data (no authentication)."""

    wait_time = between(0.5, 2)

    @task(10)
    def get_health(self):
        """Test health endpoint."""
        self.client.get("/api/v1/health", name="/api/v1/health")

    @task(5)
    def get_leaderboard(self):
        """Test leaderboard endpoint."""
        self.client.get("/api/v1/leaderboard", name="/api/v1/leaderboard")

    @task(3)
    def get_achievements(self):
        """Test achievements endpoint."""
        self.client.get("/api/v1/achievements", name="/api/v1/achievements")
