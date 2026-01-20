"""Unit tests for pricing engine.

Tests the pricing calculation logic for AI model token usage.
"""

from decimal import Decimal

from app.usage_record.pricing import (
    DEFAULT_PRICING,
    MODEL_PRICING,
    ModelPricing,
    calculate_cache_efficiency,
    calculate_cost,
    get_model_pricing,
)


class TestModelPricing:
    """Tests for ModelPricing class."""

    def test_model_pricing_initialization(self) -> None:
        """Test ModelPricing initializes with correct defaults."""
        pricing = ModelPricing(
            input_per_million=Decimal("3.00"),
            output_per_million=Decimal("15.00"),
        )

        assert pricing.input_per_million == Decimal("3.00")
        assert pricing.output_per_million == Decimal("15.00")
        # Cache read defaults to 10% of input (90% discount)
        assert pricing.cache_read_per_million == Decimal("0.30")
        # Cache write defaults to 125% of input (25% premium)
        assert pricing.cache_write_per_million == Decimal("3.75")

    def test_model_pricing_explicit_cache_pricing(self) -> None:
        """Test ModelPricing with explicit cache pricing (like LiteLLM data)."""
        pricing = ModelPricing(
            input_per_million=Decimal("5.00"),
            output_per_million=Decimal("10.00"),
            cache_read_per_million=Decimal("0.50"),  # Explicit pricing
            cache_write_per_million=Decimal("6.25"),
        )

        assert pricing.cache_read_per_million == Decimal("0.50")
        assert pricing.cache_write_per_million == Decimal("6.25")


class TestGetModelPricing:
    """Tests for get_model_pricing function."""

    def test_get_model_pricing_claude_3_5_sonnet(self) -> None:
        """Test retrieving pricing for Claude 3.5 Sonnet."""
        pricing = get_model_pricing("claude-3-5-sonnet-20241022")

        assert pricing.input_per_million == Decimal("3.00")
        assert pricing.output_per_million == Decimal("15.00")

    def test_get_model_pricing_claude_3_5_haiku(self) -> None:
        """Test retrieving pricing for Claude 3.5 Haiku."""
        pricing = get_model_pricing("claude-3-5-haiku-20241022")

        assert pricing.input_per_million == Decimal("1.00")
        assert pricing.output_per_million == Decimal("5.00")

    def test_get_model_pricing_claude_3_opus(self) -> None:
        """Test retrieving pricing for Claude 3 Opus (most expensive)."""
        pricing = get_model_pricing("claude-3-opus-20240229")

        assert pricing.input_per_million == Decimal("15.00")
        assert pricing.output_per_million == Decimal("75.00")

    def test_get_model_pricing_claude_3_haiku(self) -> None:
        """Test retrieving pricing for Claude 3 Haiku (cheapest Claude)."""
        pricing = get_model_pricing("claude-3-haiku-20240307")

        assert pricing.input_per_million == Decimal("0.25")
        assert pricing.output_per_million == Decimal("1.25")

    def test_get_model_pricing_gpt_4o(self) -> None:
        """Test retrieving pricing for GPT-4o."""
        pricing = get_model_pricing("gpt-4o")

        assert pricing.input_per_million == Decimal("2.50")
        assert pricing.output_per_million == Decimal("10.00")

    def test_get_model_pricing_gpt_4o_mini(self) -> None:
        """Test retrieving pricing for GPT-4o-mini."""
        pricing = get_model_pricing("gpt-4o-mini")

        assert pricing.input_per_million == Decimal("0.15")
        assert pricing.output_per_million == Decimal("0.60")

    def test_get_model_pricing_gpt_4_turbo(self) -> None:
        """Test retrieving pricing for GPT-4 Turbo."""
        pricing = get_model_pricing("gpt-4-turbo")

        assert pricing.input_per_million == Decimal("10.00")
        assert pricing.output_per_million == Decimal("30.00")

    def test_get_model_pricing_gpt_4(self) -> None:
        """Test retrieving pricing for GPT-4."""
        pricing = get_model_pricing("gpt-4")

        assert pricing.input_per_million == Decimal("30.00")
        assert pricing.output_per_million == Decimal("60.00")

    def test_get_model_pricing_gpt_3_5_turbo(self) -> None:
        """Test retrieving pricing for GPT-3.5 Turbo."""
        pricing = get_model_pricing("gpt-3.5-turbo")

        assert pricing.input_per_million == Decimal("0.50")
        assert pricing.output_per_million == Decimal("1.50")

    def test_get_model_pricing_gemini_2_0_flash(self) -> None:
        """Test retrieving pricing for Gemini 2.0 Flash (free preview)."""
        pricing = get_model_pricing("gemini-2.0-flash-exp")

        assert pricing.input_per_million == Decimal("0.00")
        assert pricing.output_per_million == Decimal("0.00")

    def test_get_model_pricing_gemini_1_5_pro(self) -> None:
        """Test retrieving pricing for Gemini 1.5 Pro."""
        pricing = get_model_pricing("gemini-1.5-pro")

        assert pricing.input_per_million == Decimal("1.25")
        assert pricing.output_per_million == Decimal("5.00")

    def test_get_model_pricing_gemini_1_5_flash(self) -> None:
        """Test retrieving pricing for Gemini 1.5 Flash."""
        pricing = get_model_pricing("gemini-1.5-flash")

        assert pricing.input_per_million == Decimal("0.075")
        assert pricing.output_per_million == Decimal("0.30")

    def test_get_model_pricing_unknown_model_returns_default(self) -> None:
        """Test that unknown model returns DEFAULT_PRICING ($0 to avoid incorrect charges)."""
        pricing = get_model_pricing("unknown-model-xyz")

        assert pricing == DEFAULT_PRICING
        assert pricing.input_per_million == Decimal("0.00")
        assert pricing.output_per_million == Decimal("0.00")

    def test_get_model_pricing_case_sensitive(self) -> None:
        """Test that model names are case-sensitive."""
        # Uppercase version should not match
        pricing = get_model_pricing("CLAUDE-3-5-SONNET-20241022")

        assert pricing == DEFAULT_PRICING  # Falls back to default

    def test_all_models_in_pricing_dict(self) -> None:
        """Test that MODEL_PRICING dict contains all expected models."""
        expected_models = {
            "claude-3-5-sonnet-20241022",
            "claude-3-5-sonnet-20240620",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-4",
            "gpt-3.5-turbo",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
        }

        assert set(MODEL_PRICING.keys()) == expected_models


class TestCalculateCost:
    """Tests for calculate_cost function."""

    def test_calculate_cost_input_tokens_only(self) -> None:
        """Test cost calculation with only input tokens."""
        # Claude 3.5 Sonnet: $3/M input
        # 100,000 tokens = $0.30
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            input_tokens=100_000,
        )

        assert cost == Decimal("0.3000")

    def test_calculate_cost_output_tokens_only(self) -> None:
        """Test cost calculation with only output tokens."""
        # Claude 3.5 Sonnet: $15/M output
        # 50,000 tokens = $0.75
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            output_tokens=50_000,
        )

        assert cost == Decimal("0.7500")

    def test_calculate_cost_input_and_output(self) -> None:
        """Test cost calculation with both input and output tokens."""
        # Claude 3.5 Sonnet: $3/M input, $15/M output
        # 100,000 input = $0.30
        # 20,000 output = $0.30
        # Total = $0.60
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            input_tokens=100_000,
            output_tokens=20_000,
        )

        assert cost == Decimal("0.6000")

    def test_calculate_cost_with_cache_read_tokens(self) -> None:
        """Test cost calculation with cache read tokens (90% discount = pay 10%)."""
        # Claude 3.5 Sonnet: $3/M input
        # Cache read = 10% of input cost = $0.30/M
        # 100,000 cache read tokens = 100K * $0.30/1M = $0.03
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            cache_read_tokens=100_000,
        )

        assert cost == Decimal("0.0300")

    def test_calculate_cost_with_cache_write_tokens(self) -> None:
        """Test cost calculation with cache write tokens (25% premium)."""
        # Claude 3.5 Sonnet: $3/M input
        # Cache write gets 25% premium: $3.75/M (125% of $3)
        # 100,000 cache write tokens = $0.375
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            cache_write_tokens=100_000,
        )

        assert cost == Decimal("0.3750")

    def test_calculate_cost_with_reasoning_tokens(self) -> None:
        """Test cost calculation with reasoning tokens (priced as output)."""
        # Claude 3.5 Sonnet: $15/M output
        # Reasoning tokens priced same as output
        # 30,000 reasoning tokens = $0.45
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            reasoning_tokens=30_000,
        )

        assert cost == Decimal("0.4500")

    def test_calculate_cost_all_token_types(self) -> None:
        """Test cost calculation with all token types combined."""
        # Claude 3.5 Sonnet: $3/M input, $15/M output
        # Cache read = 10% of input = $0.30/M
        # Cache write = 125% of input = $3.75/M
        #
        # 50,000 input = 50K * $3/1M = $0.15
        # 10,000 output = 10K * $15/1M = $0.15
        # 100,000 cache read = 100K * $0.30/1M = $0.03
        # 20,000 cache write = 20K * $3.75/1M = $0.075
        # 5,000 reasoning = 5K * $15/1M = $0.075 (priced as output)
        # Total = $0.15 + $0.15 + $0.03 + $0.075 + $0.075 = $0.48
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            input_tokens=50_000,
            output_tokens=10_000,
            cache_read_tokens=100_000,
            cache_write_tokens=20_000,
            reasoning_tokens=5_000,
        )

        assert cost == Decimal("0.4800")

    def test_calculate_cost_zero_tokens(self) -> None:
        """Test cost calculation with zero tokens."""
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            input_tokens=0,
            output_tokens=0,
        )

        assert cost == Decimal("0.0000")

    def test_calculate_cost_large_numbers(self) -> None:
        """Test cost calculation with large token counts."""
        # GPT-4: $30/M input, $60/M output
        # 5,000,000 input = $150
        # 2,000,000 output = $120
        # Total = $270
        cost = calculate_cost(
            model="gpt-4",
            input_tokens=5_000_000,
            output_tokens=2_000_000,
        )

        assert cost == Decimal("270.0000")

    def test_calculate_cost_small_numbers(self) -> None:
        """Test cost calculation with small token counts."""
        # Claude 3 Haiku: $0.25/M input, $1.25/M output
        # 100 input = $0.000025
        # 100 output = $0.000125
        # Total = $0.00015 (rounded to 4 decimals)
        cost = calculate_cost(
            model="claude-3-haiku-20240307",
            input_tokens=100,
            output_tokens=100,
        )

        assert cost == Decimal("0.0002")  # Rounded from 0.00015

    def test_calculate_cost_free_model(self) -> None:
        """Test cost calculation with free model (Gemini 2.0 Flash)."""
        cost = calculate_cost(
            model="gemini-2.0-flash-exp",
            input_tokens=1_000_000,
            output_tokens=500_000,
        )

        assert cost == Decimal("0.0000")

    def test_calculate_cost_unknown_model_uses_default(self) -> None:
        """Test that unknown model uses DEFAULT_PRICING ($0)."""
        # DEFAULT_PRICING: $0/M input, $0/M output (unknown models = free)
        # 100,000 input = $0.00
        cost = calculate_cost(
            model="unknown-model",
            input_tokens=100_000,
        )

        assert cost == Decimal("0.0000")

    def test_calculate_cost_decimal_precision(self) -> None:
        """Test that cost is rounded to 4 decimal places."""
        # GPT-4o-mini: $0.15/M input
        # 123 tokens = $0.00001845
        # Should round to $0.0000
        cost = calculate_cost(
            model="gpt-4o-mini",
            input_tokens=123,
        )

        # Verify it has exactly 4 decimal places
        assert cost.as_tuple().exponent == -4
        assert cost == Decimal("0.0000")

    def test_calculate_cost_cache_efficiency_scenario(self) -> None:
        """Test realistic scenario with high cache efficiency."""
        # Cache read = 10% of input = $0.30/M (huge savings!)
        # 1M cache read tokens: 1M * $0.30/1M = $0.30
        # 100K input tokens: 100K * $3/1M = $0.30
        # 200K output tokens: 200K * $15/1M = $3.00
        # Total with cache: $0.30 + $0.30 + $3.00 = $3.60
        # Without cache (1.1M input, 200K output): $3.30 + $3.00 = $6.30
        # Savings: $2.70 (43% reduction!)
        cost = calculate_cost(
            model="claude-3-5-sonnet-20241022",
            input_tokens=100_000,
            output_tokens=200_000,
            cache_read_tokens=1_000_000,
        )

        assert cost == Decimal("3.6000")


class TestCalculateCacheEfficiency:
    """Tests for calculate_cache_efficiency function."""

    def test_calculate_cache_efficiency_zero_tokens(self) -> None:
        """Test cache efficiency with zero tokens."""
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=0,
            input_tokens=0,
        )

        assert efficiency == Decimal("0.00")

    def test_calculate_cache_efficiency_no_cache(self) -> None:
        """Test cache efficiency with no cache reads."""
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=0,
            input_tokens=100_000,
        )

        assert efficiency == Decimal("0.00")

    def test_calculate_cache_efficiency_all_cache(self) -> None:
        """Test cache efficiency with 100% cache hits."""
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=100_000,
            input_tokens=0,
        )

        assert efficiency == Decimal("100.00")

    def test_calculate_cache_efficiency_50_percent(self) -> None:
        """Test cache efficiency with 50% cache hits."""
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=50_000,
            input_tokens=50_000,
        )

        assert efficiency == Decimal("50.00")

    def test_calculate_cache_efficiency_high_90_percent(self) -> None:
        """Test cache efficiency with 90% cache hits."""
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=90_000,
            input_tokens=10_000,
        )

        assert efficiency == Decimal("90.00")

    def test_calculate_cache_efficiency_low_10_percent(self) -> None:
        """Test cache efficiency with 10% cache hits."""
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=10_000,
            input_tokens=90_000,
        )

        assert efficiency == Decimal("10.00")

    def test_calculate_cache_efficiency_decimal_precision(self) -> None:
        """Test that efficiency is rounded to 2 decimal places."""
        # 33,333 cache / 100,000 total = 33.333%
        # Should round to 33.33%
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=33_333,
            input_tokens=66_667,
        )

        # Verify it has exactly 2 decimal places
        assert efficiency.as_tuple().exponent == -2
        assert efficiency == Decimal("33.33")

    def test_calculate_cache_efficiency_large_numbers(self) -> None:
        """Test cache efficiency with large token counts."""
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=7_500_000,
            input_tokens=2_500_000,
        )

        assert efficiency == Decimal("75.00")

    def test_calculate_cache_efficiency_realistic_scenario(self) -> None:
        """Test realistic cache efficiency calculation."""
        # Typical scenario: 800K cache, 200K input = 80% efficiency
        efficiency = calculate_cache_efficiency(
            cache_read_tokens=800_000,
            input_tokens=200_000,
        )

        assert efficiency == Decimal("80.00")


class TestModelPricingConsistency:
    """Tests for pricing consistency and edge cases."""

    def test_all_models_have_positive_pricing(self) -> None:
        """Test that all models have non-negative pricing."""
        for model_name, pricing in MODEL_PRICING.items():
            assert pricing.input_per_million >= Decimal("0.00"), (
                f"{model_name} has negative input pricing"
            )
            assert pricing.output_per_million >= Decimal("0.00"), (
                f"{model_name} has negative output pricing"
            )

    def test_cache_read_pricing_is_valid(self) -> None:
        """Test that cache read pricing is non-negative and less than input."""
        for model_name, pricing in MODEL_PRICING.items():
            assert pricing.cache_read_per_million >= Decimal("0"), (
                f"{model_name} has negative cache read pricing"
            )
            # Cache reads should be cheaper than regular input
            assert pricing.cache_read_per_million <= pricing.input_per_million, (
                f"{model_name} has cache read more expensive than input"
            )

    def test_cache_write_pricing_is_valid(self) -> None:
        """Test that cache write pricing is non-negative."""
        for model_name, pricing in MODEL_PRICING.items():
            assert pricing.cache_write_per_million >= Decimal("0"), (
                f"{model_name} has negative cache write pricing"
            )

    def test_output_pricing_higher_than_input(self) -> None:
        """Test that output tokens cost more than input tokens (except free models)."""
        for model_name, pricing in MODEL_PRICING.items():
            # Skip free models
            if pricing.input_per_million == Decimal("0.00"):
                continue

            assert pricing.output_per_million >= pricing.input_per_million, (
                f"{model_name} has cheaper output than input"
            )


class TestLiteLLMIntegration:
    """Tests for LiteLLM pricing data integration."""

    def test_get_model_pricing_with_litellm_data(self) -> None:
        """Test that LiteLLM data is used when provided."""
        # Mock LiteLLM data for grok-code model
        litellm_data = {
            "xai/grok-code-fast-1": {
                "input_cost_per_token": 2e-07,  # $0.20/M
                "output_cost_per_token": 1.5e-06,  # $1.50/M
                "cache_read_input_token_cost": 2e-08,  # $0.02/M
            }
        }

        pricing = get_model_pricing("grok-code", litellm_data)

        assert pricing.input_per_million == Decimal("0.2")
        assert pricing.output_per_million == Decimal("1.5")
        assert pricing.cache_read_per_million == Decimal("0.02")

    def test_get_model_pricing_falls_back_without_litellm(self) -> None:
        """Test fallback to local pricing when LiteLLM data not provided."""
        pricing = get_model_pricing("unknown-model")

        assert pricing == DEFAULT_PRICING

    def test_calculate_cost_with_litellm_grok_code(self) -> None:
        """Test cost calculation for grok-code using LiteLLM pricing."""
        # Real LiteLLM data for grok-code-fast-1
        litellm_data = {
            "xai/grok-code-fast-1": {
                "input_cost_per_token": 2e-07,  # $0.20/M
                "output_cost_per_token": 1.5e-06,  # $1.50/M
                "cache_read_input_token_cost": 2e-08,  # $0.02/M (90% discount)
            }
        }

        # Test case from user's screenshot:
        # input_tokens: 338,210
        # output_tokens: 4,434
        # cache_read_tokens: 303,680
        # Expected cost (with correct pricing):
        # input: 338,210 * $0.20/1M = $0.0676
        # output: 4,434 * $1.50/1M = $0.0067
        # cache: 303,680 * $0.02/1M = $0.0061
        # Total: ~$0.08
        cost = calculate_cost(
            model="grok-code",
            input_tokens=338_210,
            output_tokens=4_434,
            cache_read_tokens=303_680,
            litellm_data=litellm_data,
        )

        # Should be much less than $1.90 (the buggy value)
        assert cost < Decimal("0.10")
        assert cost == Decimal("0.0804")

    def test_litellm_data_without_cache_pricing(self) -> None:
        """Test handling LiteLLM data without explicit cache pricing."""
        litellm_data = {
            "some-model": {
                "input_cost_per_token": 3e-06,  # $3/M
                "output_cost_per_token": 1.5e-05,  # $15/M
                # No cache_read_input_token_cost
            }
        }

        pricing = get_model_pricing("some-model", litellm_data)

        # Should default to 10% of input for cache read
        assert pricing.cache_read_per_million == Decimal("0.3")
