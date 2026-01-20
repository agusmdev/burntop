"""Unit tests for AI Native tier badge calculation logic.

This module tests the calculate_ai_native_badge function including:
- Below minimum threshold (no badge)
- Power User threshold (10M-100M tokens)
- AI Native threshold (100M-1B tokens)
- Token Titan threshold (>1B tokens)
- Boundary conditions at exact thresholds

Note: Badges are calculated based on rolling 30-day token usage.
"""

import pytest

from app.dashboard.service import (
    BADGE_THRESHOLD_AI_NATIVE,
    BADGE_THRESHOLD_POWER_USER,
    BADGE_THRESHOLD_TOKEN_TITAN,
    calculate_ai_native_badge,
)


class TestAINativeBadgeCalculation:
    """Test suite for calculate_ai_native_badge function."""

    def test_zero_tokens_returns_none(self):
        """Zero tokens should return no badge."""
        result = calculate_ai_native_badge(0)
        assert result is None

    def test_below_power_user_threshold_returns_none(self):
        """Usage below 10M tokens should return no badge."""
        # Test various values below threshold
        assert calculate_ai_native_badge(1) is None
        assert calculate_ai_native_badge(100_000) is None
        assert calculate_ai_native_badge(1_000_000) is None
        assert calculate_ai_native_badge(9_999_999) is None

    def test_exactly_at_power_user_threshold_returns_power_user(self):
        """Exactly 10M tokens should return Power User badge."""
        result = calculate_ai_native_badge(10_000_000)
        assert result == "Power User"

    def test_power_user_range(self):
        """Usage between 10M and 100M tokens should return Power User badge."""
        assert calculate_ai_native_badge(10_000_001) == "Power User"
        assert calculate_ai_native_badge(50_000_000) == "Power User"
        assert calculate_ai_native_badge(99_999_999) == "Power User"

    def test_exactly_at_ai_native_threshold_returns_ai_native(self):
        """Exactly 100M tokens should return AI Native badge."""
        result = calculate_ai_native_badge(100_000_000)
        assert result == "AI Native"

    def test_ai_native_range(self):
        """Usage between 100M and 1B tokens should return AI Native badge."""
        assert calculate_ai_native_badge(100_000_001) == "AI Native"
        assert calculate_ai_native_badge(500_000_000) == "AI Native"
        assert calculate_ai_native_badge(999_999_999) == "AI Native"

    def test_exactly_at_token_titan_threshold_returns_token_titan(self):
        """Exactly 1B tokens should return Token Titan badge."""
        result = calculate_ai_native_badge(1_000_000_000)
        assert result == "Token Titan"

    def test_above_token_titan_threshold_returns_token_titan(self):
        """Usage above 1B tokens should return Token Titan badge."""
        assert calculate_ai_native_badge(1_000_000_001) == "Token Titan"
        assert calculate_ai_native_badge(2_000_000_000) == "Token Titan"
        assert calculate_ai_native_badge(10_000_000_000) == "Token Titan"


class TestBadgeThresholdConstants:
    """Test that badge threshold constants are correctly defined."""

    def test_power_user_threshold_is_10_million(self):
        """Power User threshold should be 10 million tokens."""
        assert BADGE_THRESHOLD_POWER_USER == 10_000_000

    def test_ai_native_threshold_is_100_million(self):
        """AI Native threshold should be 100 million tokens."""
        assert BADGE_THRESHOLD_AI_NATIVE == 100_000_000

    def test_token_titan_threshold_is_1_billion(self):
        """Token Titan threshold should be 1 billion tokens."""
        assert BADGE_THRESHOLD_TOKEN_TITAN == 1_000_000_000

    def test_thresholds_are_in_ascending_order(self):
        """Thresholds should be in ascending order."""
        assert BADGE_THRESHOLD_POWER_USER < BADGE_THRESHOLD_AI_NATIVE
        assert BADGE_THRESHOLD_AI_NATIVE < BADGE_THRESHOLD_TOKEN_TITAN


class TestBadgeEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_one_below_power_user_threshold(self):
        """One token below Power User threshold should return None."""
        result = calculate_ai_native_badge(BADGE_THRESHOLD_POWER_USER - 1)
        assert result is None

    def test_one_below_ai_native_threshold(self):
        """One token below AI Native threshold should return Power User."""
        result = calculate_ai_native_badge(BADGE_THRESHOLD_AI_NATIVE - 1)
        assert result == "Power User"

    def test_one_below_token_titan_threshold(self):
        """One token below Token Titan threshold should return AI Native."""
        result = calculate_ai_native_badge(BADGE_THRESHOLD_TOKEN_TITAN - 1)
        assert result == "AI Native"

    def test_very_large_token_count(self):
        """Very large token counts should still return Token Titan."""
        # 1 trillion tokens
        result = calculate_ai_native_badge(1_000_000_000_000)
        assert result == "Token Titan"

    def test_negative_tokens_returns_none(self):
        """Negative token count (invalid data) should return None."""
        # This shouldn't happen in production, but testing defensive behavior
        result = calculate_ai_native_badge(-1)
        assert result is None

        result = calculate_ai_native_badge(-1_000_000)
        assert result is None
