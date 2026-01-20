"""Alembic environment configuration for async SQLAlchemy migrations."""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import get_settings
from app.core.models import Base

# Import all models here to ensure they're registered with Base.metadata
# This is crucial for autogenerate to detect all tables
from app.activity.models import Activity  # noqa: F401
from app.auth.models import Account, Session, Verification  # noqa: F401
from app.benchmark.models import CommunityBenchmark  # noqa: F401
from app.follow.models import Follow  # noqa: F401
from app.leaderboard.models import LeaderboardCache  # noqa: F401
from app.streak.models import Streak  # noqa: F401
from app.usage_record.models import UsageRecord  # noqa: F401
from app.user.models import User  # noqa: F401

# Alembic Config object
config = context.config

# Get settings from pydantic-settings
settings = get_settings()

# Set the database URL from settings
config.set_main_option("sqlalchemy.url", str(settings.database_url))

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine,
    allowing us to generate SQL scripts without a live database.

    Usage: alembic upgrade head --sql
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with the given connection."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Run migrations in async mode.

    Creates an async engine and runs migrations within a connection.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    Uses asyncio to run migrations with a live database connection.
    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
