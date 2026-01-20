"""Health repository for database connectivity checks."""

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.logging import get_logger

logger = get_logger(__name__)


class HealthRepository:
    """Repository for health check database operations."""

    def __init__(self, session: AsyncSession):
        """
        Initialize HealthRepository with async session.

        Args:
            session: Async database session
        """
        self._session = session

    async def check_database_connectivity(self) -> bool:
        """
        Check database connectivity by executing a simple query.

        Returns:
            True if database is reachable, False otherwise
        """
        try:
            await self._session.execute(text("SELECT 1"))
            logger.info("Database health check passed")
            return True
        except SQLAlchemyError as e:
            logger.error(f"Database health check failed: {e}")
            return False
        except OSError as e:
            # Catch connection-level errors (e.g., ConnectionRefusedError)
            # These are raised by asyncpg before SQLAlchemy can handle them
            logger.error(f"Database connection error: {e}")
            return False
        except Exception as e:
            # Catch any other unexpected errors to prevent 500 responses
            logger.error(f"Unexpected error during database health check: {e}")
            return False
