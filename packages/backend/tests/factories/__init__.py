"""
Test factories for creating model instances with faker data.

Uses factory_boy to generate realistic test data for all models.
"""

from tests.factories.activity import ActivityFactory
from tests.factories.auth import AccountFactory, SessionFactory, VerificationFactory
from tests.factories.benchmark import CommunityBenchmarkFactory
from tests.factories.follow import FollowFactory
from tests.factories.leaderboard import LeaderboardCacheFactory
from tests.factories.streak import StreakFactory
from tests.factories.usage_record import UsageRecordFactory
from tests.factories.user import UserFactory

__all__ = [
    "AccountFactory",
    "ActivityFactory",
    "CommunityBenchmarkFactory",
    "FollowFactory",
    "LeaderboardCacheFactory",
    "SessionFactory",
    "StreakFactory",
    "UsageRecordFactory",
    "UserFactory",
    "VerificationFactory",
]
