"""seed_achievement_definitions

Revision ID: d41ecac2caf1
Revises: f370682185e5
Create Date: 2026-01-08 13:10:10.541288+00:00

"""

from collections.abc import Sequence
from uuid import uuid4

from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "d41ecac2caf1"
down_revision: str | None = "f370682185e5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Achievement definitions matching engine.py
ACHIEVEMENTS = [
    # Milestone achievements (token count based)
    {
        "name": "First Steps",
        "description": "Use your first 1,000 tokens with AI tools.",
        "category": "milestone",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Getting Started",
        "description": "Use 10,000 tokens with AI tools.",
        "category": "milestone",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Serious User",
        "description": "Use 100,000 tokens with AI tools.",
        "category": "milestone",
        "rarity": "uncommon",
        "xp_reward": 100,
    },
    {
        "name": "Power User",
        "description": "Use 1 million tokens with AI tools.",
        "category": "milestone",
        "rarity": "rare",
        "xp_reward": 250,
    },
    {
        "name": "Token Titan",
        "description": "Use 10 million tokens with AI tools.",
        "category": "milestone",
        "rarity": "epic",
        "xp_reward": 500,
    },
    {
        "name": "Token Overlord",
        "description": "Use 100 million tokens with AI tools. You are legendary.",
        "category": "milestone",
        "rarity": "legendary",
        "xp_reward": 1000,
    },
    # Streak achievements (consecutive days)
    {
        "name": "Week Warrior",
        "description": "Maintain a 7-day usage streak.",
        "category": "streak",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Consistency King",
        "description": "Maintain a 30-day usage streak.",
        "category": "streak",
        "rarity": "uncommon",
        "xp_reward": 100,
    },
    {
        "name": "Unstoppable",
        "description": "Maintain a 100-day usage streak.",
        "category": "streak",
        "rarity": "rare",
        "xp_reward": 250,
    },
    {
        "name": "Legend",
        "description": "Maintain a 365-day usage streak. A full year of dedication.",
        "category": "streak",
        "rarity": "epic",
        "xp_reward": 500,
    },
    {
        "name": "Eternal",
        "description": "Maintain a 1000-day usage streak. Truly eternal.",
        "category": "streak",
        "rarity": "legendary",
        "xp_reward": 1000,
    },
    # Diversity achievements (unique models/sources)
    {
        "name": "Model Explorer",
        "description": "Use 3 different AI models.",
        "category": "diversity",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Polyglot",
        "description": "Use 5 different AI models.",
        "category": "diversity",
        "rarity": "uncommon",
        "xp_reward": 100,
    },
    {
        "name": "Tool Master",
        "description": "Use 3 different AI tools or sources.",
        "category": "diversity",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Multi-Tool",
        "description": "Use 5 different AI tools or sources.",
        "category": "diversity",
        "rarity": "uncommon",
        "xp_reward": 100,
    },
    # Efficiency achievements (cache usage)
    {
        "name": "Cache Novice",
        "description": "Achieve 10% average cache efficiency.",
        "category": "efficiency",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Cache Expert",
        "description": "Achieve 50% average cache efficiency.",
        "category": "efficiency",
        "rarity": "uncommon",
        "xp_reward": 100,
    },
    {
        "name": "Cache Master",
        "description": "Achieve 80% average cache efficiency.",
        "category": "efficiency",
        "rarity": "rare",
        "xp_reward": 250,
    },
    # Time-based achievements
    {
        "name": "Early Bird",
        "description": "Have 10+ AI sessions between 6-9 AM.",
        "category": "time",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Night Owl",
        "description": "Have 10+ AI sessions between 10 PM-2 AM.",
        "category": "time",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Weekend Warrior",
        "description": "Have 20+ AI sessions on weekends.",
        "category": "time",
        "rarity": "common",
        "xp_reward": 50,
    },
    # Special achievements
    {
        "name": "First Sync",
        "description": "Sync your first usage data to Burntop.",
        "category": "special",
        "rarity": "common",
        "xp_reward": 50,
    },
    {
        "name": "Early Adopter",
        "description": "Join Burntop within 30 days of launch.",
        "category": "special",
        "rarity": "rare",
        "xp_reward": 250,
        "is_hidden": False,
    },
]


def upgrade() -> None:
    """Seed achievement definitions into the database."""
    from alembic import op

    connection = op.get_bind()

    for achievement in ACHIEVEMENTS:
        achievement_id = str(uuid4())
        is_hidden = achievement.get("is_hidden", False)

        connection.execute(
            text("""
                INSERT INTO achievements (id, name, description, category, rarity, xp_reward, is_hidden, created_at, updated_at)
                VALUES (:id, :name, :description, :category, :rarity, :xp_reward, :is_hidden, NOW(), NOW())
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    category = EXCLUDED.category,
                    rarity = EXCLUDED.rarity,
                    xp_reward = EXCLUDED.xp_reward,
                    is_hidden = EXCLUDED.is_hidden,
                    updated_at = NOW()
            """),
            {
                "id": achievement_id,
                "name": achievement["name"],
                "description": achievement["description"],
                "category": achievement["category"],
                "rarity": achievement["rarity"],
                "xp_reward": achievement["xp_reward"],
                "is_hidden": is_hidden,
            },
        )


def downgrade() -> None:
    """Remove seeded achievement definitions."""
    from alembic import op

    connection = op.get_bind()

    achievement_names = [a["name"] for a in ACHIEVEMENTS]
    placeholders = ", ".join([f":name_{i}" for i in range(len(achievement_names))])
    params = {f"name_{i}": name for i, name in enumerate(achievement_names)}

    connection.execute(
        text(f"DELETE FROM achievements WHERE name IN ({placeholders})"),
        params,
    )
