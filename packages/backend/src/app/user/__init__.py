"""User entity module.

Note: Router is not exported from this module to avoid circular imports.
Import directly from app.user.router when needed.
"""

from app.user.dependencies import (
    UserRepositoryDep,
    UserServiceDep,
    get_user_repository,
    get_user_service,
)
from app.user.filters import UserFilter
from app.user.models import User
from app.user.repository import UserRepository
from app.user.schemas import (
    ComparisonResponse,
    UserComparisonDataResponse,
    UserCreate,
    UserPublicResponse,
    UserResponse,
    UserStatsResponse,
    UserUpdate,
)
from app.user.service import UserService

__all__ = [
    "ComparisonResponse",
    "User",
    "UserComparisonDataResponse",
    "UserCreate",
    "UserFilter",
    "UserPublicResponse",
    "UserRepository",
    "UserRepositoryDep",
    "UserResponse",
    "UserService",
    "UserServiceDep",
    "UserStatsResponse",
    "UserUpdate",
    "get_user_repository",
    "get_user_service",
]
