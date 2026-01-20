"""Pricing engine for AI model token usage cost calculations.

This module fetches pricing from LiteLLM (like Tokscale) and provides utilities
for calculating costs based on token usage with explicit cache token pricing.
"""

from __future__ import annotations

from decimal import Decimal

from app.usage_record.pricing_fetcher import find_model_in_litellm


class ModelPricing:
    """Model pricing information for token usage calculations."""

    def __init__(
        self,
        input_per_million: Decimal,
        output_per_million: Decimal,
        cache_read_per_million: Decimal | None = None,
        cache_write_per_million: Decimal | None = None,
    ):
        """Initialize model pricing.

        Args:
            input_per_million: Cost per million input tokens (USD)
            output_per_million: Cost per million output tokens (USD)
            cache_read_per_million: Explicit cost per million cache read tokens (USD).
                                   If None, defaults to 10% of input cost.
            cache_write_per_million: Explicit cost per million cache write tokens (USD).
                                    If None, defaults to 125% of input cost.
        """
        self.input_per_million = input_per_million
        self.output_per_million = output_per_million
        # Use explicit cache pricing if provided, otherwise calculate defaults
        self.cache_read_per_million = (
            cache_read_per_million
            if cache_read_per_million is not None
            else input_per_million * Decimal("0.1")  # 90% discount = pay 10%
        )
        self.cache_write_per_million = (
            cache_write_per_million
            if cache_write_per_million is not None
            else input_per_million * Decimal("1.25")  # 25% premium
        )


# Pricing data for supported AI models (as of 2026-01-06)
# Prices in USD per million tokens
MODEL_PRICING: dict[str, ModelPricing] = {
    # Claude 3.5 models
    "claude-3-5-sonnet-20241022": ModelPricing(
        input_per_million=Decimal("3.00"),
        output_per_million=Decimal("15.00"),
    ),
    "claude-3-5-sonnet-20240620": ModelPricing(
        input_per_million=Decimal("3.00"),
        output_per_million=Decimal("15.00"),
    ),
    "claude-3-5-haiku-20241022": ModelPricing(
        input_per_million=Decimal("1.00"),
        output_per_million=Decimal("5.00"),
    ),
    # Claude 3 models
    "claude-3-opus-20240229": ModelPricing(
        input_per_million=Decimal("15.00"),
        output_per_million=Decimal("75.00"),
    ),
    "claude-3-sonnet-20240229": ModelPricing(
        input_per_million=Decimal("3.00"),
        output_per_million=Decimal("15.00"),
    ),
    "claude-3-haiku-20240307": ModelPricing(
        input_per_million=Decimal("0.25"),
        output_per_million=Decimal("1.25"),
    ),
    # GPT-4 models
    "gpt-4o": ModelPricing(
        input_per_million=Decimal("2.50"),
        output_per_million=Decimal("10.00"),
    ),
    "gpt-4o-mini": ModelPricing(
        input_per_million=Decimal("0.15"),
        output_per_million=Decimal("0.60"),
    ),
    "gpt-4-turbo": ModelPricing(
        input_per_million=Decimal("10.00"),
        output_per_million=Decimal("30.00"),
    ),
    "gpt-4": ModelPricing(
        input_per_million=Decimal("30.00"),
        output_per_million=Decimal("60.00"),
    ),
    # GPT-3.5 models
    "gpt-3.5-turbo": ModelPricing(
        input_per_million=Decimal("0.50"),
        output_per_million=Decimal("1.50"),
    ),
    # Gemini models
    "gemini-2.0-flash-exp": ModelPricing(
        input_per_million=Decimal("0.00"),  # Free during preview
        output_per_million=Decimal("0.00"),
    ),
    "gemini-1.5-pro": ModelPricing(
        input_per_million=Decimal("1.25"),
        output_per_million=Decimal("5.00"),
    ),
    "gemini-1.5-flash": ModelPricing(
        input_per_million=Decimal("0.075"),
        output_per_million=Decimal("0.30"),
    ),
}

# Default pricing for unknown models - set to $0 to avoid incorrect charges
DEFAULT_PRICING = ModelPricing(
    input_per_million=Decimal("0.00"),
    output_per_million=Decimal("0.00"),
)


def get_model_pricing(model: str, litellm_data: dict | None = None) -> ModelPricing:
    """Get pricing information for a specific model.

    Uses LiteLLM pricing data if provided, otherwise falls back to local pricing.
    This implements the Tokscale approach of fetching real-time pricing from
    LiteLLM's model_prices_and_context_window.json.

    Args:
        model: Model identifier (e.g., "claude-3-5-sonnet-20241022", "grok-code")
        litellm_data: Optional LiteLLM pricing data dictionary. If provided,
                     will be searched first using multi-step resolution.

    Returns:
        ModelPricing instance with pricing details
    """
    # Try LiteLLM data first if provided
    if litellm_data:
        result = find_model_in_litellm(model, litellm_data)
        if result:
            _matched_name, entry = result
            return _litellm_entry_to_pricing(entry)

    # Fall back to local pricing
    return MODEL_PRICING.get(model, DEFAULT_PRICING)


def _litellm_entry_to_pricing(entry: dict) -> ModelPricing:
    """Convert a LiteLLM pricing entry to ModelPricing.

    LiteLLM uses cost per token, we need cost per million tokens.

    Args:
        entry: LiteLLM pricing entry dict

    Returns:
        ModelPricing instance
    """
    # LiteLLM stores cost per token, convert to per million
    input_cost = entry.get("input_cost_per_token", 0)
    output_cost = entry.get("output_cost_per_token", 0)
    cache_read_cost = entry.get("cache_read_input_token_cost")

    input_per_million = Decimal(str(input_cost)) * Decimal("1000000")
    output_per_million = Decimal(str(output_cost)) * Decimal("1000000")

    # Use explicit cache pricing if available
    cache_read_per_million = None
    if cache_read_cost is not None:
        cache_read_per_million = Decimal(str(cache_read_cost)) * Decimal("1000000")

    return ModelPricing(
        input_per_million=input_per_million,
        output_per_million=output_per_million,
        cache_read_per_million=cache_read_per_million,
    )


def calculate_cost(
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
    reasoning_tokens: int = 0,
    litellm_data: dict | None = None,
) -> Decimal:
    """Calculate total cost for token usage.

    Uses LiteLLM pricing data if provided for accurate, up-to-date pricing.

    Args:
        model: Model identifier (e.g., "grok-code", "claude-3-5-sonnet-20241022")
        input_tokens: Number of input tokens
        output_tokens: Number of output tokens
        cache_read_tokens: Number of cache read tokens
        cache_write_tokens: Number of cache write tokens
        reasoning_tokens: Number of reasoning tokens (priced as output)
        litellm_data: Optional LiteLLM pricing data for real-time pricing

    Returns:
        Total cost in USD as Decimal with 4 decimal places
    """
    pricing = get_model_pricing(model, litellm_data)

    # Calculate base input/output costs
    input_cost = (Decimal(input_tokens) / Decimal(1_000_000)) * pricing.input_per_million
    output_cost = (Decimal(output_tokens) / Decimal(1_000_000)) * pricing.output_per_million

    # Calculate cache costs using explicit pricing (not discount multipliers)
    cache_read_cost = (
        Decimal(cache_read_tokens) / Decimal(1_000_000)
    ) * pricing.cache_read_per_million
    cache_write_cost = (
        Decimal(cache_write_tokens) / Decimal(1_000_000)
    ) * pricing.cache_write_per_million

    # Reasoning tokens are priced the same as output tokens
    reasoning_cost = (Decimal(reasoning_tokens) / Decimal(1_000_000)) * pricing.output_per_million

    # Total cost
    total = input_cost + output_cost + cache_read_cost + cache_write_cost + reasoning_cost

    # Round to 4 decimal places for USD currency precision
    return total.quantize(Decimal("0.0001"))


def calculate_cache_efficiency(
    cache_read_tokens: int = 0,
    input_tokens: int = 0,
) -> Decimal:
    """Calculate cache efficiency percentage.

    Efficiency is the percentage of input tokens that were served from cache.

    Args:
        cache_read_tokens: Number of tokens served from cache
        input_tokens: Number of regular input tokens

    Returns:
        Cache efficiency percentage (0-100) as Decimal with 2 decimal places
    """
    total_input = cache_read_tokens + input_tokens

    if total_input == 0:
        return Decimal("0.00")

    efficiency = (Decimal(cache_read_tokens) / Decimal(total_input)) * Decimal(100)
    return efficiency.quantize(Decimal("0.01"))
