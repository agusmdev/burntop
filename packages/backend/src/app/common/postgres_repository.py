from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi_filter.contrib.sqlalchemy import Filter
from fastapi_pagination import Params
from fastapi_pagination.bases import AbstractPage
from fastapi_pagination.ext.sqlalchemy import paginate
from pydantic import BaseModel
from sqlalchemy import delete, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models import Base, SoftDeleteMixin
from app.core.repository import AbstractRepository


class PostgresRepository[ModelType: Base, CreateSchemaType: BaseModel, UpdateSchemaType: BaseModel](
    AbstractRepository[ModelType, CreateSchemaType, UpdateSchemaType]
):
    """
    PostgreSQL implementation of the abstract repository.

    Provides full CRUD operations with:
    - Automatic soft delete filtering
    - PostgreSQL-specific bulk upsert (ON CONFLICT)
    - fastapi-pagination integration
    - fastapi-filter integration

    Usage:
        class ItemRepository(PostgresRepository[Item, ItemCreate, ItemUpdate]):
            pass
    """

    def __init__(self, session: AsyncSession, model: type[ModelType]):
        """
        Initialize repository with database session and model class.

        Args:
            session: SQLAlchemy async session
            model: SQLAlchemy model class
        """
        self._session = session
        self._model = model

    @property
    def _has_soft_delete(self) -> bool:
        """Check if model supports soft delete."""
        return issubclass(self._model, SoftDeleteMixin)

    def _base_query(self, include_deleted: bool = False):
        """
        Create base SELECT query with optional soft delete filtering.

        Args:
            include_deleted: If True, include soft-deleted records

        Returns:
            SQLAlchemy select statement
        """
        query = select(self._model)
        if self._has_soft_delete and not include_deleted:
            query = query.where(self._model.deleted_at.is_(None))
        return query

    # ==================== Basic CRUD ====================

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        """Create a new record."""
        data = obj_in.model_dump()
        instance = self._model(**data)
        self._session.add(instance)
        await self._session.commit()
        await self._session.refresh(instance)
        return instance

    async def get_by_id(self, id: UUID) -> ModelType | None:
        """Get a single record by ID (excludes soft-deleted)."""
        query = self._base_query().where(self._model.id == id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self) -> Sequence[ModelType]:
        """Get all records (excludes soft-deleted)."""
        query = self._base_query()
        result = await self._session.execute(query)
        return result.scalars().all()

    async def update(
        self,
        id: UUID,
        obj_in: UpdateSchemaType,
        exclude_unset: bool = True,
    ) -> ModelType | None:
        """Update an existing record."""
        # First check if record exists
        instance = await self.get_by_id(id)
        if not instance:
            return None

        # Get update data
        data = obj_in.model_dump(exclude_unset=True) if exclude_unset else obj_in.model_dump()

        # Update attributes
        for field, value in data.items():
            setattr(instance, field, value)

        await self._session.commit()
        await self._session.refresh(instance)
        return instance

    async def delete(self, id: UUID) -> bool:
        """Permanently delete a record (hard delete)."""
        query = delete(self._model).where(self._model.id == id)
        result = await self._session.execute(query)
        await self._session.commit()
        return result.rowcount > 0  # type: ignore[return-value]

    # ==================== Pagination & Filtering ====================

    async def get_paginated(
        self,
        params: Params,
        filter_spec: Filter | None = None,
    ) -> AbstractPage[ModelType]:
        """Get paginated records with optional filtering."""
        query = self._base_query()

        if filter_spec is not None:
            query = filter_spec.filter(query)
            query = filter_spec.sort(query)

        return await paginate(self._session, query, params)  # type: ignore[return-value,arg-type]

    async def get_filtered(
        self,
        filter_spec: Filter,
    ) -> Sequence[ModelType]:
        """Get all records matching filter criteria."""
        query = self._base_query()
        query = filter_spec.filter(query)
        query = filter_spec.sort(query)
        result = await self._session.execute(query)
        return result.scalars().all()

    async def count(self, filter_spec: Filter | None = None) -> int:
        """Count records matching optional filter."""
        query = select(func.count()).select_from(self._model)

        if self._has_soft_delete:
            query = query.where(self._model.deleted_at.is_(None))

        if filter_spec is not None:
            # Apply filter to a subquery
            subquery = self._base_query()
            subquery = filter_spec.filter(subquery)
            query = select(func.count()).select_from(subquery.subquery())

        result = await self._session.execute(query)
        return result.scalar_one()

    # ==================== Bulk Operations ====================

    async def bulk_create(
        self,
        objs_in: Sequence[CreateSchemaType],
    ) -> Sequence[ModelType]:
        """Create multiple records in a single operation."""
        if not objs_in:
            return []

        data = [obj.model_dump() for obj in objs_in]
        stmt = insert(self._model).values(data).returning(self._model)
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.scalars().all()

    async def bulk_upsert(
        self,
        objs_in: Sequence[CreateSchemaType],
        index_elements: Sequence[str],
        update_fields: Sequence[str] | None = None,
    ) -> Sequence[ModelType]:
        """
        Insert or update multiple records using PostgreSQL ON CONFLICT.

        Args:
            objs_in: Records to upsert
            index_elements: Columns forming the unique constraint
            update_fields: Fields to update on conflict (None = all except index)
        """
        if not objs_in:
            return []

        data = [obj.model_dump() for obj in objs_in]

        stmt = insert(self._model).values(data)

        # Determine which fields to update on conflict
        if update_fields is None:
            # Update all fields except the index elements
            update_fields = [key for key in data[0] if key not in index_elements]

        # Filter update_fields to only include fields that are actually in the data
        # This prevents errors when trying to access stmt.excluded for fields not in the INSERT
        available_fields = set(data[0].keys())
        valid_update_fields = [field for field in update_fields if field in available_fields]

        # Build the ON CONFLICT DO UPDATE clause
        # stmt.excluded refers to the EXCLUDED table in PostgreSQL's ON CONFLICT clause
        # We access columns as attributes (e.g., stmt.excluded.field_name)

        # Token fields that should accumulate, not replace
        # This prevents tokens from decreasing when syncing multiple times on the same day
        ACCUMULATIVE_FIELDS = {
            "input_tokens",
            "output_tokens",
            "cache_read_tokens",
            "cache_write_tokens",
            "reasoning_tokens",
            "cost",  # Cost should also accumulate since it's derived from tokens
        }

        update_dict = {}
        for field in valid_update_fields:
            try:
                if field in ACCUMULATIVE_FIELDS:
                    # Accumulate: add new value to existing value
                    current_value = getattr(self._model, field)
                    new_value = getattr(stmt.excluded, field)
                    update_dict[field] = current_value + new_value
                else:
                    # Replace: normal update behavior for timestamps, etc.
                    update_dict[field] = getattr(stmt.excluded, field)
            except AttributeError:
                # Field doesn't exist in EXCLUDED table (shouldn't happen if field is in data)
                # But skip it to be safe
                continue

        # Add updated_at if model has it
        if hasattr(self._model, "updated_at"):
            update_dict["updated_at"] = func.now()

        stmt = stmt.on_conflict_do_update(
            index_elements=index_elements,
            set_=update_dict,
        ).returning(self._model)

        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.scalars().all()

    async def bulk_delete(self, ids: Sequence[UUID]) -> int:
        """Permanently delete multiple records."""
        if not ids:
            return 0

        query = delete(self._model).where(self._model.id.in_(ids))
        result = await self._session.execute(query)
        await self._session.commit()
        return result.rowcount  # type: ignore[return-value]

    # ==================== Soft Delete ====================

    async def soft_delete(self, id: UUID) -> bool:
        """Soft delete a record by setting deleted_at timestamp."""
        if not self._has_soft_delete:
            raise NotImplementedError(f"Model {self._model.__name__} does not support soft delete")

        query = (
            update(self._model)
            .where(self._model.id == id)
            .where(self._model.deleted_at.is_(None))
            .values(deleted_at=datetime.now(UTC))
        )
        result = await self._session.execute(query)
        await self._session.commit()
        return result.rowcount > 0  # type: ignore[return-value]

    async def restore(self, id: UUID) -> bool:
        """Restore a soft-deleted record."""
        if not self._has_soft_delete:
            raise NotImplementedError(f"Model {self._model.__name__} does not support soft delete")

        query = (
            update(self._model)
            .where(self._model.id == id)
            .where(self._model.deleted_at.is_not(None))
            .values(deleted_at=None)
        )
        result = await self._session.execute(query)
        await self._session.commit()
        return result.rowcount > 0  # type: ignore[return-value]

    async def get_by_id_with_deleted(self, id: UUID) -> ModelType | None:
        """Get a record by ID, including soft-deleted records."""
        query = self._base_query(include_deleted=True).where(self._model.id == id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_all_with_deleted(self) -> Sequence[ModelType]:
        """Get all records including soft-deleted ones."""
        query = self._base_query(include_deleted=True)
        result = await self._session.execute(query)
        return result.scalars().all()

    # ==================== Utility Methods ====================

    async def exists(self, id: UUID) -> bool:
        """Check if a record exists (excludes soft-deleted)."""
        query = select(func.count()).select_from(self._model).where(self._model.id == id)
        if self._has_soft_delete:
            query = query.where(self._model.deleted_at.is_(None))

        result = await self._session.execute(query)
        return result.scalar_one() > 0

    async def get_by_ids(self, ids: Sequence[UUID]) -> Sequence[ModelType]:
        """Get multiple records by their IDs."""
        if not ids:
            return []

        query = self._base_query().where(self._model.id.in_(ids))
        result = await self._session.execute(query)
        return result.scalars().all()

    async def get_by_field(
        self,
        field: str,
        value: Any,
    ) -> ModelType | None:
        """Get a single record by a specific field value."""
        column = getattr(self._model, field)
        query = self._base_query().where(column == value)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_all_by_field(
        self,
        field: str,
        value: Any,
    ) -> Sequence[ModelType]:
        """Get all records matching a specific field value."""
        column = getattr(self._model, field)
        query = self._base_query().where(column == value)
        result = await self._session.execute(query)
        return result.scalars().all()
