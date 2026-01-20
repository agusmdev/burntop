"""Background task scheduler configuration using APScheduler.

This module configures APScheduler with AsyncIOScheduler for running
background tasks such as leaderboard updates, benchmark calculations,
and notification delivery.
"""

import logging

from apscheduler.executors.asyncio import AsyncIOExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.tasks.benchmarks import update_community_benchmarks
from app.tasks.leaderboard import update_leaderboard_cache

# Create a logger for the scheduler
logger = logging.getLogger(__name__)

# Configure job stores and executors
jobstores = {
    "default": MemoryJobStore(),
}

executors = {
    "default": AsyncIOExecutor(),
}

# Configure job defaults
job_defaults = {
    "coalesce": True,  # Combine missed runs into single run
    "max_instances": 1,  # Prevent concurrent runs of same job
    "misfire_grace_time": 60,  # Allow 60 second grace period for missed jobs
}

# Create scheduler instance
scheduler = AsyncIOScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults,
    timezone="UTC",  # Use UTC for consistent scheduling
)


def add_job_with_logging(func, trigger, **kwargs) -> None:
    """Add a job to the scheduler with logging.

    Args:
        func: The async function to schedule
        trigger: The trigger type (e.g., "interval", "cron")
        **kwargs: Additional arguments for scheduler.add_job()

    Example:
        >>> from apscheduler.triggers.cron import CronTrigger
        >>> add_job_with_logging(
        ...     my_task_function,
        ...     CronTrigger(hour=0, minute=0),  # Run daily at midnight
        ...     id="my_task",
        ...     name="My Background Task",
        ... )
    """
    job_id = kwargs.get("id", func.__name__)
    try:
        scheduler.add_job(func, trigger, **kwargs)
        logger.info(f"Registered background job: {job_id}")
    except Exception as e:
        logger.error(f"Failed to register job {job_id}: {e}")
        raise


def _register_tasks() -> None:
    """Register all background tasks with the scheduler.

    This function is called during scheduler startup to register all
    periodic background tasks.
    """
    # Register leaderboard cache update task (runs every minute)
    add_job_with_logging(
        update_leaderboard_cache,
        CronTrigger(minute="*"),  # Run every minute
        id="update_leaderboard_cache",
        name="Update Leaderboard Cache",
        replace_existing=True,
    )

    # Register community benchmarks update task (runs hourly at minute 5)
    add_job_with_logging(
        update_community_benchmarks,
        CronTrigger(minute=5),  # Run every hour at 5 minutes past
        id="update_community_benchmarks",
        name="Update Community Benchmarks",
        replace_existing=True,
    )


async def start_scheduler() -> None:
    """Start the APScheduler instance.

    This function should be called during FastAPI application startup.
    It starts the scheduler and logs the initialization.

    Note:
        Background task functions should be registered before calling this function.
        Use scheduler.add_job() to register tasks with cron or interval triggers.
    """
    try:
        # Register background tasks
        _register_tasks()

        scheduler.start()
        logger.info("APScheduler started successfully")
    except Exception as e:
        logger.error(f"Failed to start APScheduler: {e}")
        raise


async def shutdown_scheduler() -> None:
    """Shutdown the APScheduler instance.

    This function should be called during FastAPI application shutdown.
    It gracefully shuts down the scheduler, allowing running jobs to complete.
    """
    try:
        scheduler.shutdown(wait=True)  # Wait for running jobs to complete
        logger.info("APScheduler shut down successfully")
    except Exception as e:
        logger.error(f"Failed to shutdown APScheduler: {e}")
        raise
