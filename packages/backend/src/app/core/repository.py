from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Any
from uuid import UUID

from fastapi_filter.contrib.sqlalchemy import Filter
from fastapi_pagination import Params
from fastapi_pagination.bases import AbstractPage
from pydantic import BaseModel

from app.core.models import Base


class AbstractRepository[ModelType: Base, CreateSchemaType: BaseModel, UpdateSchemaType: BaseModel](
    ABC
):
    """
    Abstract base repository defining the interface for data access.

    This is the ONLY place where SQL/database operations should be defined.
    All methods are async and work with SQLAlchemy models.

    Type Parameters:
        ModelType: SQLAlchemy model class
        CreateSchemaType: Pydantic schema for create operations
        UpdateSchemaType: Pydantic schema for update operations
    """

    # ==================== Basic CRUD ====================

    @abstractmethod
    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record.

        Args:
            obj_in: Pydantic schema with creation data

        Returns:
            Created model instance with generated id and timestamps
        """
        ...

    @abstractmethod
    async def get_by_id(self, id: UUID) -> ModelType | None:
        """
        Get a single record by ID.

        Args:
            id: UUID primary key

        Returns:
            Model instance if found, None otherwise

        Note:
            Excludes soft-deleted records by default.
        """
        ...

    @abstractmethod
    async def get_all(self) -> Sequence[ModelType]:
        """
        Get all records.

        Returns:
            Sequence of all model instances

        Note:
            Excludes soft-deleted records by default.
            For large datasets, use get_paginated instead.
        """
        ...

    @abstractmethod
    async def update(
        self,
        id: UUID,
        obj_in: UpdateSchemaType,
        exclude_unset: bool = True,
    ) -> ModelType | None:
        """
        Update an existing record.

        Args:
            id: UUID of record to update
            obj_in: Pydantic schema with update data
            exclude_unset: If True, only update fields that were explicitly set

        Returns:
            Updated model instance if found, None otherwise
        """
        ...

    @abstractmethod
    async def delete(self, id: UUID) -> bool:
        """
        Permanently delete a record (hard delete).

        Args:
            id: UUID of record to delete

        Returns:
            True if deleted, False if not found

        Warning:
            This permanently removes the record. Consider soft_delete instead.
        """
        ...

    # ==================== Pagination & Filtering ====================

    @abstractmethod
    async def get_paginated(
        self,
        params: Params,
        filter_spec: Filter | None = None,
    ) -> AbstractPage[ModelType]:
        """
        Get paginated records with optional filtering.

        Args:
            params: Pagination parameters (page, size)
            filter_spec: Optional fastapi-filter specification

        Returns:
            Page object containing items, total, page info

        Note:
            Excludes soft-deleted records by default.
        """
        ...

    @abstractmethod
    async def get_filtered(
        self,
        filter_spec: Filter,
    ) -> Sequence[ModelType]:
        """
        Get all records matching filter criteria.

        Args:
            filter_spec: fastapi-filter specification

        Returns:
            Sequence of matching model instances

        Note:
            Excludes soft-deleted records by default.
            For large result sets, use get_paginated instead.
        """
        ...

    @abstractmethod
    async def count(self, filter_spec: Filter | None = None) -> int:
        """
        Count records matching optional filter.

        Args:
            filter_spec: Optional fastapi-filter specification

        Returns:
            Number of matching records
        """
        ...

    # ==================== Bulk Operations ====================

    @abstractmethod
    async def bulk_create(
        self,
        objs_in: Sequence[CreateSchemaType],
    ) -> Sequence[ModelType]:
        """
        Create multiple records in a single operation.

        Args:
            objs_in: Sequence of Pydantic schemas with creation data

        Returns:
            Sequence of created model instances
        """
        ...

    @abstractmethod
    async def bulk_upsert(
        self,
        objs_in: Sequence[CreateSchemaType],
        index_elements: Sequence[str],
        update_fields: Sequence[str] | None = None,
    ) -> Sequence[ModelType]:
        """
        Insert or update multiple records based on unique constraint.

        Uses PostgreSQL's ON CONFLICT clause for atomic upsert.

        Args:
            objs_in: Sequence of Pydantic schemas
            index_elements: Columns that form the unique constraint
            update_fields: Fields to update on conflict (None = update all)

        Returns:
            Sequence of upserted model instances

        Example:
            # Upsert users by email, update name on conflict
            await repo.bulk_upsert(
                users,
                index_elements=["email"],
                update_fields=["name", "updated_at"]
            )
        """
        ...

    @abstractmethod
    async def bulk_delete(self, ids: Sequence[UUID]) -> int:
        """
        Permanently delete multiple records.

        Args:
            ids: Sequence of UUIDs to delete

        Returns:
            Number of records deleted
        """
        ...

    # ==================== Soft Delete ====================

    @abstractmethod
    async def soft_delete(self, id: UUID) -> bool:
        """
        Soft delete a record by setting deleted_at timestamp.

        Args:
            id: UUID of record to soft delete

        Returns:
            True if soft deleted, False if not found
        """
        ...

    @abstractmethod
    async def restore(self, id: UUID) -> bool:
        """
        Restore a soft-deleted record.

        Args:
            id: UUID of record to restore

        Returns:
            True if restored, False if not found or not deleted
        """
        ...

    @abstractmethod
    async def get_by_id_with_deleted(self, id: UUID) -> ModelType | None:
        """
        Get a record by ID, including soft-deleted records.

        Args:
            id: UUID primary key

        Returns:
            Model instance if found (even if deleted), None otherwise
        """
        ...

    @abstractmethod
    async def get_all_with_deleted(self) -> Sequence[ModelType]:
        """
        Get all records including soft-deleted ones.

        Returns:
            Sequence of all model instances (including deleted)
        """
        ...

    # ==================== Utility Methods ====================

    @abstractmethod
    async def exists(self, id: UUID) -> bool:
        """
        Check if a record exists.

        Args:
            id: UUID to check

        Returns:
            True if exists and not soft-deleted, False otherwise
        """
        ...

    @abstractmethod
    async def get_by_ids(self, ids: Sequence[UUID]) -> Sequence[ModelType]:
        """
        Get multiple records by their IDs.

        Args:
            ids: Sequence of UUIDs to fetch

        Returns:
            Sequence of found model instances (may be fewer than requested)
        """
        ...

    @abstractmethod
    async def get_by_field(
        self,
        field: str,
        value: Any,
    ) -> ModelType | None:
        """
        Get a single record by a specific field value.

        Args:
            field: Name of the field to query
            value: Value to match

        Returns:
            First matching model instance, or None

        Example:
            user = await repo.get_by_field("email", "user@example.com")
        """
        ...

    @abstractmethod
    async def get_all_by_field(
        self,
        field: str,
        value: Any,
    ) -> Sequence[ModelType]:
        """
        Get all records matching a specific field value.

        Args:
            field: Name of the field to query
            value: Value to match

        Returns:
            Sequence of matching model instances
        """
        ...
