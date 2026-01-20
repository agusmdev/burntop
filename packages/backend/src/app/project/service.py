"""Project service with OG metadata fetching logic."""

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING
from urllib.parse import urljoin, urlparse
from uuid import UUID

import httpx
from bs4 import BeautifulSoup

from app.core import BaseService
from app.exceptions import BadRequestError, ConflictError, ForbiddenError, NotFoundError
from app.project.models import Project
from app.project.repository import ProjectRepository
from app.project.schemas import ProjectCreate, ProjectUpdate

if TYPE_CHECKING:
    from app.user.service import UserService


@dataclass
class OGMetadata:
    """
    Open Graph metadata extracted from a URL.

    Stores the OG metadata fields that we extract from web pages.
    """

    title: str | None = None
    description: str | None = None
    og_image_url: str | None = None
    og_description: str | None = None
    favicon_url: str | None = None


class ProjectService(BaseService[Project, ProjectCreate, ProjectUpdate]):
    """
    Service for Project entity with business logic.

    Implements:
    - Project CRUD with authorization checks
    - Open Graph metadata fetching from URLs
    - Favicon extraction
    """

    # HTTP client settings
    DEFAULT_TIMEOUT = 10.0  # seconds
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB max for HTML content
    USER_AGENT = (
        "Mozilla/5.0 (compatible; BurntopBot/1.0; +https://burntop.dev)"
    )

    def __init__(
        self,
        repository: ProjectRepository,
        user_service: "UserService | None" = None,
    ):
        """
        Initialize ProjectService.

        Args:
            repository: Project repository instance
            user_service: User service for user lookups
        """
        super().__init__(repository)
        self._repository: ProjectRepository = repository
        self._user_service = user_service

    async def create_project(
        self,
        obj_in: ProjectCreate,
        user_id: UUID,
        fetch_metadata: bool = True,
    ) -> Project:
        """
        Create a new project for a user with optional OG metadata fetching.

        Args:
            obj_in: Project creation data
            user_id: UUID of the user creating the project
            fetch_metadata: Whether to fetch OG metadata from URL

        Returns:
            Created Project instance

        Raises:
            ConflictError: If user already has a project with this URL
            BadRequestError: If URL is invalid or unreachable
        """
        # Check for duplicate URL for this user
        existing = await self._repository.get_by_url_and_user(obj_in.url, user_id)
        if existing:
            raise ConflictError(
                resource="Project",
                field="url",
                value=obj_in.url,
                message="You already have a project with this URL",
            )

        # Prepare data for creation
        data = obj_in.model_dump()

        # Fetch OG metadata if requested
        if fetch_metadata:
            metadata = await self.fetch_og_metadata(obj_in.url)

            # Use fetched metadata for fields not provided by user
            if metadata.title and not data.get("title"):
                data["title"] = metadata.title
            if metadata.description and not data.get("description"):
                data["description"] = metadata.description

            # Always set OG-specific fields from fetched data
            data["og_image_url"] = metadata.og_image_url
            data["og_description"] = metadata.og_description
            data["favicon_url"] = metadata.favicon_url

        # Create project with enhanced data
        enhanced_input = ProjectCreate(**data)
        return await self._repository.create_with_user(enhanced_input, user_id)

    async def get_projects_by_user_id(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Project]:
        """
        Get all projects for a specific user.

        Args:
            user_id: UUID of the user
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of projects belonging to the user
        """
        projects = await self._repository.get_by_user_id(user_id, skip, limit)
        return list(projects)

    async def get_projects_by_username(
        self,
        username: str,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Project]:
        """
        Get all projects for a user by username.

        Args:
            username: Username of the user
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of projects belonging to the user

        Raises:
            NotFoundError: If user not found
        """
        if not self._user_service:
            raise NotFoundError(resource="User", field="username", value=username)

        user = await self._user_service.get_by_username(username)
        if not user:
            raise NotFoundError(resource="User", field="username", value=username)

        return await self.get_projects_by_user_id(user.id, skip, limit)

    async def update_project(
        self,
        project_id: UUID,
        obj_in: ProjectUpdate,
        current_user_id: UUID,
        refetch_metadata: bool = False,
    ) -> Project:
        """
        Update a project with authorization check.

        Args:
            project_id: UUID of the project to update
            obj_in: Update data
            current_user_id: UUID of the authenticated user
            refetch_metadata: Whether to refetch OG metadata if URL changed

        Returns:
            Updated Project instance

        Raises:
            NotFoundError: If project not found
            ForbiddenError: If user doesn't own the project
        """
        # Get existing project
        project = await self._repository.get_by_id(project_id)
        if not project:
            raise NotFoundError(resource="Project", id=project_id)

        # Check ownership
        if project.user_id != current_user_id:
            raise ForbiddenError(
                message="You can only update your own projects",
                resource="Project",
                action="update",
            )

        # Prepare update data
        update_data = obj_in.model_dump(exclude_unset=True)

        # Check if URL is being updated and we need to refetch metadata
        url_changed = "url" in update_data and update_data["url"] != project.url
        if url_changed:
            # Check for duplicate URL
            existing = await self._repository.get_by_url_and_user(
                update_data["url"], current_user_id
            )
            if existing and existing.id != project_id:
                raise ConflictError(
                    resource="Project",
                    field="url",
                    value=update_data["url"],
                    message="You already have a project with this URL",
                )

            # Refetch metadata for new URL if requested
            if refetch_metadata:
                metadata = await self.fetch_og_metadata(update_data["url"])
                update_data["og_image_url"] = metadata.og_image_url
                update_data["og_description"] = metadata.og_description
                update_data["favicon_url"] = metadata.favicon_url

                # Update title/description if not explicitly provided
                if "title" not in update_data and metadata.title:
                    update_data["title"] = metadata.title
                if "description" not in update_data and metadata.description:
                    update_data["description"] = metadata.description

        # Create update schema with processed data
        processed_update = ProjectUpdate(**update_data)
        result = await self._repository.update(project_id, processed_update, exclude_unset=True)

        if not result:
            raise NotFoundError(resource="Project", id=project_id)

        return result

    async def delete_project(
        self,
        project_id: UUID,
        current_user_id: UUID,
    ) -> bool:
        """
        Delete a project with authorization check.

        Uses soft delete to preserve data integrity.

        Args:
            project_id: UUID of the project to delete
            current_user_id: UUID of the authenticated user

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If project not found
            ForbiddenError: If user doesn't own the project
        """
        # Get existing project
        project = await self._repository.get_by_id(project_id)
        if not project:
            raise NotFoundError(resource="Project", id=project_id)

        # Check ownership
        if project.user_id != current_user_id:
            raise ForbiddenError(
                message="You can only delete your own projects",
                resource="Project",
                action="delete",
            )

        return await self._repository.soft_delete(project_id)

    async def get_project_by_id(
        self,
        project_id: UUID,
        current_user_id: UUID | None = None,
    ) -> Project:
        """
        Get a project by ID with optional ownership check.

        Args:
            project_id: UUID of the project
            current_user_id: Optional UUID of the authenticated user for ownership check

        Returns:
            Project instance

        Raises:
            NotFoundError: If project not found
            ForbiddenError: If current_user_id provided and doesn't match owner
        """
        project = await self._repository.get_by_id(project_id)
        if not project:
            raise NotFoundError(resource="Project", id=project_id)

        # If current_user_id provided, verify ownership
        if current_user_id is not None and project.user_id != current_user_id:
            raise ForbiddenError(
                message="You can only access your own projects",
                resource="Project",
                action="read",
            )

        return project

    async def refresh_project_metadata(
        self,
        project_id: UUID,
        current_user_id: UUID,
    ) -> Project:
        """
        Refresh OG metadata for an existing project.

        Args:
            project_id: UUID of the project
            current_user_id: UUID of the authenticated user

        Returns:
            Updated Project instance with fresh metadata

        Raises:
            NotFoundError: If project not found
            ForbiddenError: If user doesn't own the project
        """
        # Get existing project
        project = await self._repository.get_by_id(project_id)
        if not project:
            raise NotFoundError(resource="Project", id=project_id)

        # Check ownership
        if project.user_id != current_user_id:
            raise ForbiddenError(
                message="You can only refresh metadata for your own projects",
                resource="Project",
                action="refresh",
            )

        # Fetch fresh metadata
        metadata = await self.fetch_og_metadata(project.url)

        # Update project with new metadata
        update_data = ProjectUpdate(
            og_image_url=metadata.og_image_url,
            og_description=metadata.og_description,
            favicon_url=metadata.favicon_url,
        )

        # Only update title/description if they were originally from OG
        # (i.e., if they're None or match the OG values)
        if not project.title and metadata.title:
            update_data.title = metadata.title
        if not project.description and metadata.description:
            update_data.description = metadata.description

        result = await self._repository.update(project_id, update_data, exclude_unset=True)
        if not result:
            raise NotFoundError(resource="Project", id=project_id)

        return result

    async def fetch_og_metadata(self, url: str) -> OGMetadata:
        """
        Fetch Open Graph metadata from a URL.

        Uses httpx for async HTTP requests and BeautifulSoup for HTML parsing.
        Extracts og:title, og:description, og:image, and favicon.

        Args:
            url: URL to fetch metadata from

        Returns:
            OGMetadata with extracted data (fields may be None if not found)

        Raises:
            BadRequestError: If URL is unreachable or invalid
        """
        parsed_url = urlparse(url)
        base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"

        try:
            async with httpx.AsyncClient(
                timeout=self.DEFAULT_TIMEOUT,
                follow_redirects=True,
                headers={"User-Agent": self.USER_AGENT},
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

                # Check content type
                content_type = response.headers.get("content-type", "")
                if "text/html" not in content_type.lower():
                    # Not HTML, return basic metadata
                    return OGMetadata(
                        title=parsed_url.netloc,
                        favicon_url=self._get_default_favicon_url(base_url),
                    )

                # Check content length
                content_length = response.headers.get("content-length")
                if content_length and int(content_length) > self.MAX_CONTENT_LENGTH:
                    return OGMetadata(
                        title=parsed_url.netloc,
                        favicon_url=self._get_default_favicon_url(base_url),
                    )

                html_content = response.text

        except httpx.TimeoutException:
            # Return basic metadata on timeout instead of failing
            return OGMetadata(
                title=parsed_url.netloc,
                favicon_url=self._get_default_favicon_url(base_url),
            )
        except httpx.HTTPStatusError as e:
            raise BadRequestError(
                message=f"Failed to fetch URL: HTTP {e.response.status_code}",
                details={"url": url, "status_code": e.response.status_code},
            ) from e
        except httpx.RequestError as e:
            raise BadRequestError(
                message=f"Failed to fetch URL: {type(e).__name__}",
                details={"url": url, "error": str(e)},
            ) from e

        # Parse HTML and extract metadata
        return self._parse_og_metadata(html_content, base_url)

    def _parse_og_metadata(self, html_content: str, base_url: str) -> OGMetadata:
        """
        Parse HTML content and extract OG metadata.

        Args:
            html_content: Raw HTML content
            base_url: Base URL for resolving relative URLs

        Returns:
            OGMetadata with extracted data
        """
        soup = BeautifulSoup(html_content, "html.parser")

        # Extract OG metadata
        og_title = self._get_meta_content(soup, "og:title")
        og_description = self._get_meta_content(soup, "og:description")
        og_image = self._get_meta_content(soup, "og:image")

        # Fallback to standard meta tags if OG not found
        title = og_title or self._get_page_title(soup)
        description = og_description or self._get_meta_content(soup, "description")

        # Get favicon
        favicon_url = self._extract_favicon(soup, base_url)

        # Resolve relative URLs to absolute
        if og_image:
            og_image = urljoin(base_url, og_image)
        if favicon_url:
            favicon_url = urljoin(base_url, favicon_url)

        return OGMetadata(
            title=self._clean_text(title),
            description=self._clean_text(description),
            og_image_url=og_image,
            og_description=self._clean_text(og_description),
            favicon_url=favicon_url,
        )

    def _get_meta_content(self, soup: BeautifulSoup, name: str) -> str | None:
        """
        Get content from a meta tag by property or name.

        Args:
            soup: BeautifulSoup object
            name: Meta property or name to search for

        Returns:
            Meta content value or None
        """
        # Try property attribute (for OG tags)
        tag = soup.find("meta", property=name)
        if tag and tag.get("content"):
            return str(tag.get("content"))

        # Try name attribute (for standard meta tags)
        tag = soup.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            return str(tag.get("content"))

        return None

    def _get_page_title(self, soup: BeautifulSoup) -> str | None:
        """
        Get the page title from the <title> tag.

        Args:
            soup: BeautifulSoup object

        Returns:
            Page title or None
        """
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            return str(title_tag.string)
        return None

    def _extract_favicon(self, soup: BeautifulSoup, base_url: str) -> str | None:
        """
        Extract favicon URL from HTML.

        Searches for:
        1. <link rel="icon" href="...">
        2. <link rel="shortcut icon" href="...">
        3. <link rel="apple-touch-icon" href="...">
        4. Default /favicon.ico

        Args:
            soup: BeautifulSoup object
            base_url: Base URL for default favicon

        Returns:
            Favicon URL or default /favicon.ico
        """
        # List of rel values that indicate a favicon
        favicon_rels = [
            "icon",
            "shortcut icon",
            "apple-touch-icon",
            "apple-touch-icon-precomposed",
        ]

        for rel in favicon_rels:
            # Handle both single value and list values for rel attribute
            # Use default argument to capture current value of rel in loop
            link = soup.find("link", rel=lambda x, r=rel: x and r in (x if isinstance(x, list) else [x]))
            if link and link.get("href"):
                return str(link.get("href"))

        # Default favicon location
        return self._get_default_favicon_url(base_url)

    def _get_default_favicon_url(self, base_url: str) -> str:
        """
        Get the default favicon URL for a base URL.

        Args:
            base_url: Base URL (scheme + host)

        Returns:
            Default favicon URL
        """
        return urljoin(base_url, "/favicon.ico")

    def _clean_text(self, text: str | None) -> str | None:
        """
        Clean and normalize text content.

        - Strips whitespace
        - Collapses multiple spaces
        - Removes control characters
        - Truncates to reasonable length

        Args:
            text: Raw text content

        Returns:
            Cleaned text or None
        """
        if not text:
            return None

        # Strip whitespace
        cleaned = text.strip()

        # Collapse multiple whitespace
        cleaned = re.sub(r"\s+", " ", cleaned)

        # Remove control characters (except newlines)
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)

        # Truncate to 2000 characters (reasonable limit for descriptions)
        if len(cleaned) > 2000:
            cleaned = cleaned[:1997] + "..."

        return cleaned if cleaned else None
