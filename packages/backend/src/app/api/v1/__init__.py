"""API v1 router aggregation.

Aggregates all feature routers and includes them under /api/v1 prefix.
"""

from fastapi import APIRouter

from app.activity.router import router as activity_router
from app.auth.router import router as auth_router
from app.benchmark.router import router as benchmark_router
from app.dashboard.router import router as dashboard_router
from app.health.router import router as health_router
from app.leaderboard.router import router as leaderboard_router
from app.project.router import router as project_router, user_projects_router
from app.stats.router import router as stats_router
from app.usage_record.router import router as usage_record_router
from app.user.router import router as user_router

# Create API v1 router
api_router = APIRouter()

# Authentication and user management
# Note: Routers already have their prefixes defined, so we don't add them here
api_router.include_router(auth_router)
api_router.include_router(user_router)

# User projects (mounted under /users prefix for /users/{username}/projects endpoint)
api_router.include_router(user_projects_router, prefix="/users")

# Usage tracking and sync
api_router.include_router(usage_record_router)

# Gamification
api_router.include_router(leaderboard_router)

# Social features
api_router.include_router(activity_router)

# Portfolio and projects
api_router.include_router(project_router)

# Analytics and insights
api_router.include_router(benchmark_router)
api_router.include_router(dashboard_router)
api_router.include_router(stats_router)

# Health check (no prefix, mounted at /health)
api_router.include_router(health_router)

__all__ = ["api_router"]
