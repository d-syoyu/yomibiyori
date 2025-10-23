"""Tests for ranking fairness algorithms."""

from __future__ import annotations

import pytest

from app.services.ranking import bayesian_average, wilson_lower_bound


def test_bayesian_average_low_sample_high_rate() -> None:
    """Low sample size with high like rate should be pulled down by prior."""
    likes, impressions = 5, 10  # 50% observed rate
    result = bayesian_average(likes, impressions)
    
    # Should be between prior (5%) and observed (50%), closer to prior
    assert 0.05 < result < 0.50
    assert result < 0.15  # Much closer to prior than observed


def test_bayesian_average_low_sample_low_rate() -> None:
    """Low sample size with low like rate should be pulled up by prior."""
    likes, impressions = 0, 10  # 0% observed rate
    result = bayesian_average(likes, impressions)
    
    # Should be between observed (0%) and prior (5%), closer to prior
    assert 0.0 < result < 0.05
    assert result > 0.03  # Closer to prior than observed


def test_bayesian_average_high_sample_converges() -> None:
    """High sample size should converge to observed rate."""
    likes, impressions = 50, 1000  # 5% observed rate
    result = bayesian_average(likes, impressions)
    
    # Should be very close to observed rate
    assert abs(result - 0.05) < 0.01


def test_bayesian_vs_wilson_high_sample() -> None:
    """Compare Bayesian and Wilson for high sample size."""
    likes, impressions = 50, 1000
    bayes = bayesian_average(likes, impressions)
    wilson = wilson_lower_bound(likes, impressions)
    
    # Both should be reasonable, Wilson is more conservative
    assert 0.03 < bayes < 0.07
    assert 0.03 < wilson < 0.05
    assert wilson < bayes  # Wilson is lower bound


def test_time_fairness_bayesian() -> None:
    """Bayesian average reduces unfairness between early and late posts."""
    # Same like rate (10%), different sample sizes
    early_likes, early_impressions = 10, 100  # Early post
    late_likes, late_impressions = 1, 10      # Late post
    
    early_score = bayesian_average(early_likes, early_impressions)
    late_score = bayesian_average(late_likes, late_impressions)
    
    # Scores should be relatively close (within 3 percentage points)
    assert abs(early_score - late_score) < 0.03
    
    # Without Bayesian (raw rate), difference would be zero, but confidence differs
    # Bayesian helps by accounting for uncertainty


def test_bayesian_zero_impressions() -> None:
    """Zero impressions should return prior mean."""
    result = bayesian_average(0, 0)
    assert result == 0.05  # Prior mean


def test_bayesian_custom_prior() -> None:
    """Test with custom prior parameters."""
    likes, impressions = 5, 10
    result = bayesian_average(likes, impressions, prior_mean=0.10, prior_confidence=50)
    
    # With different prior, result should differ
    default_result = bayesian_average(likes, impressions)
    assert result != default_result


def test_wilson_score_bounds() -> None:
    """Wilson score should be between 0 and 1."""
    test_cases = [
        (0, 10),
        (5, 10),
        (10, 10),
        (50, 100),
        (100, 1000),
    ]
    
    for likes, impressions in test_cases:
        result = wilson_lower_bound(likes, impressions)
        assert 0.0 <= result <= 1.0


def test_wilson_score_zero_impressions() -> None:
    """Wilson score with zero impressions should return 0."""
    result = wilson_lower_bound(0, 0)
    assert result == 0.0
