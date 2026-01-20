"""User filters for query parameter filtering."""

from fastapi_filter.contrib.sqlalchemy import Filter

from app.user.models import User


class UserFilter(Filter):
    """
    Filter for user queries.

    Supports filtering by:
    - username: Exact match or partial match
    - region: Exact match for geographical filtering
    - is_public: Filter public/private profiles
    """

    username: str | None = None
    username__ilike: str | None = None
    region: str | None = None
    region__ilike: str | None = None
    is_public: bool | None = None

    class Constants(Filter.Constants):  # type: ignore[name-defined]
        """Filter configuration."""

        model = User
        ordering_field_name = "order_by"
        search_field_name = "search"
        search_model_fields = ["username", "name", "bio"]  # noqa: RUF012


__all__ = ["UserFilter"]
