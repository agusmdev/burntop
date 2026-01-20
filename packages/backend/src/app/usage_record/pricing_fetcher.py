"""Fetches pricing data from LiteLLM with caching.

This module implements the Tokscale approach of fetching pricing from
LiteLLM's model_prices_and_context_window.json with disk caching.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING

import httpx

if TYPE_CHECKING:
    from collections.abc import Iterable

logger = logging.getLogger(__name__)

LITELLM_PRICING_URL = (
    "https://raw.githubusercontent.com/BerriAI/litellm/main/"
    "model_prices_and_context_window.json"
)
CACHE_PATH = Path.home() / ".cache" / "burntop" / "litellm-pricing.json"
CACHE_TTL = timedelta(hours=1)

# Original providers preferred over resellers
PREFERRED_PROVIDERS = ["xai/", "anthropic/", "openai/", "google/", "mistral/"]
RESELLER_PROVIDERS = ["azure_ai/", "bedrock/", "vertex_ai/"]


async def fetch_litellm_pricing() -> dict:
    """Fetch pricing from LiteLLM with 1-hour disk cache.

    Returns:
        Dictionary of model pricing data.
    """
    # Check cache
    if CACHE_PATH.exists():
        cache_mtime = datetime.fromtimestamp(CACHE_PATH.stat().st_mtime, tz=UTC)
        cache_age = datetime.now(tz=UTC) - cache_mtime
        if cache_age < CACHE_TTL:
            try:
                return json.loads(CACHE_PATH.read_text())
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Failed to read pricing cache: %s", e)

    # Fetch fresh data
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(LITELLM_PRICING_URL)
            resp.raise_for_status()
            data = resp.json()

        # Cache to disk
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(json.dumps(data))
        logger.info("Updated LiteLLM pricing cache with %d models", len(data))
        return data
    except (httpx.HTTPError, OSError) as e:
        logger.warning("Failed to fetch LiteLLM pricing: %s", e)
        # Try to use stale cache if available
        if CACHE_PATH.exists():
            try:
                return json.loads(CACHE_PATH.read_text())
            except (json.JSONDecodeError, OSError):
                pass
        return {}


def _normalize_version(model: str) -> str:
    """Handle version format variations: claude-3-5-sonnet ↔ claude-3.5-sonnet."""
    # Replace hyphens between numbers with dots
    return re.sub(r"(\d)-(\d)", r"\1.\2", model)


def _provider_priority(model: str) -> int:
    """Get provider priority (lower = better). Prefer original creators over resellers."""
    for i, prefix in enumerate(PREFERRED_PROVIDERS):
        if model.startswith(prefix):
            return i
    for i, prefix in enumerate(RESELLER_PROVIDERS):
        if model.startswith(prefix):
            return 100 + i
    return 50  # Unknown provider


def _fuzzy_match(query: str, candidates: Iterable[str]) -> list[str]:
    """Find models containing all words from query."""
    words = query.lower().replace("-", " ").replace(".", " ").split()
    matches = []
    for candidate in candidates:
        candidate_lower = candidate.lower()
        if all(word in candidate_lower for word in words):
            matches.append(candidate)
    return matches


def find_model_in_litellm(model: str, litellm_data: dict) -> tuple[str, dict] | None:
    """Multi-step model resolution like Tokscale.

    Resolution strategy:
    1. Exact match
    2. Version normalization (claude-3-5-sonnet ↔ claude-3.5-sonnet)
    3. Provider prefix matching (prefer original creators)
    4. Fuzzy match with word boundaries

    Args:
        model: Model name to look up (e.g., "grok-code", "claude-3-5-sonnet")
        litellm_data: LiteLLM pricing data dictionary

    Returns:
        Tuple of (matched_model_name, pricing_data) or None if not found.
    """
    # Build list of candidate model names to try
    candidates: list[str] = []

    # 1. Exact match
    candidates.append(model)

    # 2. Version normalization (claude-3-5-sonnet ↔ claude-3.5-sonnet)
    normalized = _normalize_version(model)
    if normalized != model:
        candidates.append(normalized)

    # Also try the reverse: claude-3.5-sonnet → claude-3-5-sonnet
    denormalized = re.sub(r"(\d)\.(\d)", r"\1-\2", model)
    if denormalized != model:
        candidates.append(denormalized)

    # 3. Provider prefix matching (prefer original creators)
    for prefix in PREFERRED_PROVIDERS:
        candidates.append(f"{prefix}{model}")
        if normalized != model:
            candidates.append(f"{prefix}{normalized}")

    # Try all candidates in order
    for candidate in candidates:
        if candidate in litellm_data:
            return candidate, litellm_data[candidate]

    # 4. Fuzzy match with word boundaries (last resort)
    matches = _fuzzy_match(model, litellm_data.keys())
    if matches:
        # Sort by provider preference (original creators first)
        matches.sort(key=_provider_priority)
        return matches[0], litellm_data[matches[0]]

    return None
