"""User router with endpoints for user profiles and management."""

from typing import Annotated, cast

from fastapi import APIRouter, Depends, status
from fastapi_pagination import Page, Params
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user, get_current_user_optional
from app.auth.schemas import SessionUserResponse
from app.dashboard.dependencies import get_dashboard_service
from app.dashboard.schemas import DashboardModelsResponse, DashboardToolsResponse
from app.dashboard.service import DashboardService, calculate_ai_native_badge
from app.dependencies import get_db
from app.follow.dependencies import get_follow_service
from app.follow.schemas import FollowerResponse, FollowResponse, FollowStatsResponse
from app.follow.service import FollowService
from app.usage_record.repository import UsageRecordRepository
from app.usage_record.service import UsageRecordService
from app.user.dependencies import get_user_service, get_user_service_full
from app.user.schemas import (
    ComparisonResponse,
    UserPublicResponse,
    UserResponse,
    UserStatsResponse,
    UserUpdate,
)
from app.user.service import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{username}", response_model=UserPublicResponse | UserResponse)
async def get_user_profile(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[SessionUserResponse | None, Depends(get_current_user_optional)] = None,
) -> UserPublicResponse | UserResponse:
    """
    Get user profile by username.

    Returns full profile (UserResponse) if viewing own profile,
    or limited public profile (UserPublicResponse) if viewing another user's profile.

    Args:
        username: Username to retrieve
        user_service: User service instance
        session: Database session for usage record queries
        current_user: Optional authenticated user

    Returns:
        UserPublicResponse or UserResponse depending on authorization

    Raises:
        NotFoundError: If user not found (404)
    """
    user = await user_service.get_by_username_or_raise(username)

    # Calculate rolling 30-day tokens for AI Native tier badge
    usage_record_service = UsageRecordService(repository=UsageRecordRepository(session))
    monthly_tokens = await usage_record_service.get_user_rolling_30_day_tokens(user.id)
    monthly_badge = calculate_ai_native_badge(monthly_tokens)

    # If viewing own profile, return full UserResponse with monthly badge
    if current_user and current_user.id == user.id:
        # Build response with monthly data
        response_data = {
            "id": user.id,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "email": user.email,
            "email_verified": user.email_verified,
            "username": user.username,
            "name": user.name,
            "bio": user.bio,
            "location": user.location,
            "region": user.region,
            "website_url": user.website_url,
            "is_public": user.is_public,
            "image": user.image,
            "monthly_badge": monthly_badge,
            "monthly_tokens": monthly_tokens,
        }
        return UserResponse.model_validate(response_data)

    # Otherwise return limited public profile with monthly data
    public_response_data = {
        "id": user.id,
        "created_at": user.created_at,
        "updated_at": user.updated_at,
        "username": user.username,
        "name": user.name,
        "bio": user.bio,
        "location": user.location,
        "region": user.region,
        "website_url": user.website_url,
        "is_public": user.is_public,
        "image": user.image,
        "monthly_badge": monthly_badge,
        "monthly_tokens": monthly_tokens,
    }
    return UserPublicResponse.model_validate(public_response_data)


@router.patch("/me", response_model=UserResponse)
async def update_own_profile(
    profile_update: UserUpdate,
    user_service: Annotated[UserService, Depends(get_user_service)],
    session: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> UserResponse:
    """
    Update authenticated user's own profile.

    Args:
        profile_update: Profile fields to update (all optional for PATCH)
        user_service: User service instance
        session: Database session for usage record queries
        current_user: Authenticated user

    Returns:
        Updated user profile

    Raises:
        UnauthorizedError: If not authenticated (401)
    """
    updated_user = await user_service.update_profile(
        user_id=current_user.id,
        current_user_id=current_user.id,
        obj_in=profile_update,
    )

    # Calculate rolling 30-day tokens for AI Native tier badge
    usage_record_service = UsageRecordService(repository=UsageRecordRepository(session))
    monthly_tokens = await usage_record_service.get_user_rolling_30_day_tokens(current_user.id)
    monthly_badge = calculate_ai_native_badge(monthly_tokens)

    # Build response with monthly data
    response_data = {
        "id": updated_user.id,
        "created_at": updated_user.created_at,
        "updated_at": updated_user.updated_at,
        "email": updated_user.email,
        "email_verified": updated_user.email_verified,
        "username": updated_user.username,
        "name": updated_user.name,
        "bio": updated_user.bio,
        "location": updated_user.location,
        "region": updated_user.region,
        "website_url": updated_user.website_url,
        "is_public": updated_user.is_public,
        "image": updated_user.image,
        "monthly_badge": monthly_badge,
        "monthly_tokens": monthly_tokens,
    }
    return UserResponse.model_validate(response_data)


@router.get("/{username}/stats", response_model=UserStatsResponse)
async def get_user_stats(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service_full)],
) -> UserStatsResponse:
    """
    Get aggregated statistics for a user.

    Returns token usage, cost, streak, and achievement statistics.

    Args:
        username: Username to get stats for
        user_service: User service instance

    Returns:
        User statistics

    Raises:
        NotFoundError: If user not found (404)
    """
    # get_user_stats raises NotFoundError if user doesn't exist
    return await user_service.get_user_stats(username)


@router.get("/{username}/tools", response_model=DashboardToolsResponse)
async def get_user_tools(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    dashboard_service: Annotated[DashboardService, Depends(get_dashboard_service)],
) -> DashboardToolsResponse:
    """
    Get tool/source usage breakdown for a user.

    Returns public breakdown of tools/sources used by the user.

    Args:
        username: Username to get tools for
        user_service: User service instance
        dashboard_service: Dashboard service instance

    Returns:
        Tool usage breakdown

    Raises:
        NotFoundError: If user not found (404)
    """
    # Verify user exists and get user ID
    user = await user_service.get_by_username_or_raise(username)
    return await dashboard_service.get_tools_breakdown(user_id=user.id)


@router.get("/{username}/models", response_model=DashboardModelsResponse)
async def get_user_models(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    dashboard_service: Annotated[DashboardService, Depends(get_dashboard_service)],
) -> DashboardModelsResponse:
    """
    Get AI model usage breakdown for a user.

    Returns public breakdown of AI models used by the user.

    Args:
        username: Username to get models for
        user_service: User service instance
        dashboard_service: Dashboard service instance

    Returns:
        Model usage breakdown

    Raises:
        NotFoundError: If user not found (404)
    """
    # Verify user exists and get user ID
    user = await user_service.get_by_username_or_raise(username)
    return await dashboard_service.get_models_breakdown(user_id=user.id)


@router.get("/{username}/follow-stats", response_model=FollowStatsResponse)
async def get_user_follow_stats(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    follow_service: Annotated[FollowService, Depends(get_follow_service)],
    current_user: Annotated[SessionUserResponse | None, Depends(get_current_user_optional)] = None,
) -> FollowStatsResponse:
    """
    Get follow statistics for a user.

    Returns follower and following counts, plus relationship status for authenticated users.

    Args:
        username: Username to get follow stats for
        user_service: User service instance
        follow_service: Follow service instance
        current_user: Optional authenticated user

    Returns:
        Follow statistics including follower/following counts and relationship status

    Raises:
        NotFoundError: If user not found (404)
    """
    # Verify user exists and get user ID
    user = await user_service.get_by_username_or_raise(username)

    # Get follow stats with relationship status if authenticated
    return await follow_service.get_follow_stats(
        user_id=user.id,
        current_user_id=current_user.id if current_user else None,
    )


@router.post(
    "/{username}/follow", status_code=status.HTTP_201_CREATED, response_model=FollowResponse
)
async def follow_user(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    follow_service: Annotated[FollowService, Depends(get_follow_service)],
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> FollowResponse:
    """
    Follow a user.

    Creates a follow relationship between the authenticated user and the target user.

    Args:
        username: Username to follow
        user_service: User service instance
        follow_service: Follow service instance
        current_user: Authenticated user

    Returns:
        Follow relationship details

    Raises:
        UnauthorizedError: If not authenticated (401)
        NotFoundError: If user not found (404)
        BadRequestError: If user tries to follow themselves (400)
        ConflictError: If already following this user (409)
    """
    # Verify target user exists
    target_user = await user_service.get_by_username_or_raise(username)

    # Create follow relationship
    follow = await follow_service.follow(
        follower_id=current_user.id,
        following_id=target_user.id,
    )

    return FollowResponse.model_validate(follow)


@router.delete("/{username}/follow", status_code=status.HTTP_204_NO_CONTENT)
async def unfollow_user(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    follow_service: Annotated[FollowService, Depends(get_follow_service)],
    current_user: Annotated[SessionUserResponse, Depends(get_current_user)],
) -> None:
    """
    Unfollow a user.

    Removes the follow relationship between the authenticated user and the target user.

    Args:
        username: Username to unfollow
        user_service: User service instance
        follow_service: Follow service instance
        current_user: Authenticated user

    Returns:
        None (204 No Content)

    Raises:
        UnauthorizedError: If not authenticated (401)
        NotFoundError: If user not found (404)
        BadRequestError: If user tries to unfollow themselves (400)
    """
    # Verify target user exists
    target_user = await user_service.get_by_username_or_raise(username)

    # Remove follow relationship
    await follow_service.unfollow(
        follower_id=current_user.id,
        following_id=target_user.id,
    )


@router.get("/{username}/followers", response_model=Page[FollowerResponse])
async def get_user_followers(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    follow_service: Annotated[FollowService, Depends(get_follow_service)],
    params: Annotated[Params, Depends()],
) -> Page[FollowerResponse]:
    """
    Get list of users following this user.

    Args:
        username: Username to get followers for
        user_service: User service instance
        follow_service: Follow service instance
        params: Pagination parameters

    Returns:
        Paginated list of follower users

    Raises:
        NotFoundError: If user not found (404)
    """
    # Verify user exists and get user ID
    user = await user_service.get_by_username_or_raise(username)

    # Get paginated followers (already transformed to FollowerResponse by service)
    followers_page = await follow_service.get_followers(user.id, params)

    # Service returns Page[FollowerResponse] directly
    return cast("Page[FollowerResponse]", followers_page)


@router.get("/{username}/following", response_model=Page[FollowerResponse])
async def get_user_following(
    username: str,
    user_service: Annotated[UserService, Depends(get_user_service)],
    follow_service: Annotated[FollowService, Depends(get_follow_service)],
    params: Annotated[Params, Depends()],
) -> Page[FollowerResponse]:
    """
    Get list of users this user is following.

    Args:
        username: Username to get following list for
        user_service: User service instance
        follow_service: Follow service instance
        params: Pagination parameters

    Returns:
        Paginated list of following users

    Raises:
        NotFoundError: If user not found (404)
    """
    # Verify user exists and get user ID
    user = await user_service.get_by_username_or_raise(username)

    # Get paginated following (already transformed to FollowerResponse by service)
    following_page = await follow_service.get_following(user.id, params)

    # Service returns Page[FollowerResponse] directly
    return cast("Page[FollowerResponse]", following_page)


@router.get("/{username}/compare/{other_username}", response_model=ComparisonResponse)
async def compare_users(
    username: str,
    other_username: str,
    user_service: Annotated[UserService, Depends(get_user_service_full)],
) -> ComparisonResponse:
    """
    Compare two users' statistics and achievements.

    Both users must have public profiles.

    Args:
        username: First username
        other_username: Second username
        user_service: User service instance

    Returns:
        ComparisonResponse with data for both users

    Raises:
        NotFoundError: If either user not found or has private profile (404)
    """
    return await user_service.get_comparison_data(username, other_username)
