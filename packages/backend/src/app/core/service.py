"""Base service class for business logic layer."""

from collections.abc import Sequence
from uuid import UUID

from fastapi_filter.contrib.sqlalchemy import Filter
from fastapi_pagination import Params
from fastapi_pagination.bases import AbstractPage
from pydantic import BaseModel

from app.core.models import Base
from app.core.repository import AbstractRepository


class BaseService[ModelType: Base, CreateSchemaType: BaseModel, UpdateSchemaType: BaseModel]:
    """
    Base service class providing standard CRUD operations.

    Services:
    - Wrap repository operations
    - Contain business logic
    - Orchestrate multiple repository calls
    - Handle cross-cutting concerns (logging, events, etc.)

    Services should NOT:
    - Write SQL queries (delegate to repository)
    - Handle HTTP concerns (that's the router's job)
    - Access the database session directly

    Type Parameters:
        ModelType: SQLAlchemy model class
        CreateSchemaType: Pydantic schema for create operations
        UpdateSchemaType: Pydantic schema for update operations

    Usage:
        class ItemService(BaseService[Item, ItemCreate, ItemUpdate]):
            pass
    """

    def __init__(
        self,
        repository: AbstractRepository[ModelType, CreateSchemaType, UpdateSchemaType],
    ) -> None:
        """
        Initialize service with repository.

        Args:
            repository: Repository instance for data access
        """
        self._repository = repository

    # ==================== Basic CRUD ====================

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new record.

        Override to add business logic before/after creation.

        Args:
            obj_in: Creation data

        Returns:
            Created model instance
        """
        return await self._repository.create(obj_in)

    async def get_by_id(self, id: UUID) -> ModelType | None:
        """
        Get a single record by ID.

        Args:
            id: UUID of the record

        Returns:
            Model instance if found, None otherwise
        """
        return await self._repository.get_by_id(id)

    async def get_all(self) -> Sequence[ModelType]:
        """
        Get all records.

        Returns:
            Sequence of model instances
        """
        return await self._repository.get_all()

    async def update(
        self,
        id: UUID,
        obj_in: UpdateSchemaType,
        exclude_unset: bool = True,
    ) -> ModelType | None:
        """
        Update an existing record.

        Override to add business logic before/after update.

        Args:
            id: UUID of record to update
            obj_in: Update data
            exclude_unset: Only update explicitly set fields

        Returns:
            Updated model instance if found, None otherwise
        """
        return await self._repository.update(id, obj_in, exclude_unset)

    async def delete(self, id: UUID) -> bool:
        """
        Permanently delete a record.

        Args:
            id: UUID of record to delete

        Returns:
            True if deleted, False if not found
        """
        return await self._repository.delete(id)

    # ==================== Pagination & Filtering ====================

    async def get_paginated(
        self,
        params: Params,
        filter_spec: Filter | None = None,
    ) -> AbstractPage[ModelType]:
        """
        Get paginated records with optional filtering.

        This method receives the filter from the router layer and
        passes it to the repository.

        Args:
            params: Pagination parameters
            filter_spec: Optional filter specification

        Returns:
            Paginated result
        """
        return await self._repository.get_paginated(params, filter_spec)

    async def get_filtered(
        self,
        filter_spec: Filter,
    ) -> Sequence[ModelType]:
        """
        Get all records matching filter.

        Args:
            filter_spec: Filter specification

        Returns:
            Matching records
        """
        return await self._repository.get_filtered(filter_spec)

    async def count(self, filter_spec: Filter | None = None) -> int:
        """
        Count records.

        Args:
            filter_spec: Optional filter specification

        Returns:
            Number of matching records
        """
        return await self._repository.count(filter_spec)

    # ==================== Bulk Operations ====================

    async def bulk_create(
        self,
        objs_in: Sequence[CreateSchemaType],
    ) -> Sequence[ModelType]:
        """
        Create multiple records.

        Args:
            objs_in: Sequence of creation data

        Returns:
            Created model instances
        """
        return await self._repository.bulk_create(objs_in)

    async def bulk_upsert(
        self,
        objs_in: Sequence[CreateSchemaType],
        index_elements: Sequence[str],
        update_fields: Sequence[str] | None = None,
    ) -> Sequence[ModelType]:
        """
        Upsert multiple records.

        Args:
            objs_in: Records to upsert
            index_elements: Unique constraint columns
            update_fields: Fields to update on conflict

        Returns:
            Upserted model instances
        """
        return await self._repository.bulk_upsert(objs_in, index_elements, update_fields)

    async def bulk_delete(self, ids: Sequence[UUID]) -> int:
        """
        Delete multiple records.

        Args:
            ids: UUIDs to delete

        Returns:
            Number deleted
        """
        return await self._repository.bulk_delete(ids)

    # ==================== Soft Delete ====================

    async def soft_delete(self, id: UUID) -> bool:
        """
        Soft delete a record.

        Args:
            id: UUID of record

        Returns:
            True if soft deleted
        """
        return await self._repository.soft_delete(id)

    async def restore(self, id: UUID) -> bool:
        """
        Restore a soft-deleted record.

        Args:
            id: UUID of record

        Returns:
            True if restored
        """
        return await self._repository.restore(id)

    async def get_by_id_with_deleted(self, id: UUID) -> ModelType | None:
        """
        Get record including soft-deleted.

        Args:
            id: UUID of record

        Returns:
            Model instance if found
        """
        return await self._repository.get_by_id_with_deleted(id)

    # ==================== Utility ====================

    async def exists(self, id: UUID) -> bool:
        """
        Check if record exists.

        Args:
            id: UUID to check

        Returns:
            True if exists
        """
        return await self._repository.exists(id)

    async def get_by_ids(self, ids: Sequence[UUID]) -> Sequence[ModelType]:
        """
        Get multiple records by IDs.

        Args:
            ids: UUIDs to fetch

        Returns:
            Found model instances
        """
        return await self._repository.get_by_ids(ids)
