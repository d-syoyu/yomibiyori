"""Tests for X posting script's category rotation logic."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

import pytest

# Add project root to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.post_theme_to_x import (
    DEFAULT_WEEKDAY_CATEGORY_SCHEDULE,
    get_weekday_category_schedule,
    get_category_for_today,
    generate_tweet_text,
)


class TestWeekdayCategorySchedule:
    """Tests for get_weekday_category_schedule function."""

    def test_default_schedule(self):
        """Test that default schedule is returned when no env var is set."""
        with patch.dict(os.environ, {}, clear=True):
            # Ensure env var is not set
            if "X_POST_CATEGORY_SCHEDULE" in os.environ:
                del os.environ["X_POST_CATEGORY_SCHEDULE"]

            schedule = get_weekday_category_schedule()

            assert schedule == DEFAULT_WEEKDAY_CATEGORY_SCHEDULE
            assert schedule[0] == "romance"   # Monday
            assert schedule[1] == "season"    # Tuesday
            assert schedule[2] == "daily"     # Wednesday
            assert schedule[3] == "romance"   # Thursday
            assert schedule[4] == "daily"     # Friday
            assert schedule[5] == "humor"     # Saturday
            assert schedule[6] == "humor"     # Sunday

    def test_custom_schedule_from_env(self):
        """Test that custom schedule can be set via environment variable."""
        custom_schedule = {
            "0": "daily",
            "1": "daily",
            "2": "romance",
            "3": "romance",
            "4": "season",
            "5": "season",
            "6": "humor",
        }

        with patch.dict(os.environ, {"X_POST_CATEGORY_SCHEDULE": json.dumps(custom_schedule)}):
            schedule = get_weekday_category_schedule()

            assert schedule[0] == "daily"
            assert schedule[1] == "daily"
            assert schedule[2] == "romance"
            assert schedule[6] == "humor"

    def test_invalid_json_falls_back_to_default(self):
        """Test that invalid JSON falls back to default schedule."""
        with patch.dict(os.environ, {"X_POST_CATEGORY_SCHEDULE": "not valid json"}):
            schedule = get_weekday_category_schedule()

            assert schedule == DEFAULT_WEEKDAY_CATEGORY_SCHEDULE


class TestGetCategoryForToday:
    """Tests for get_category_for_today function."""

    def test_monday_returns_romance(self):
        """Test Monday returns romance category."""
        # Monday = weekday 0
        monday = datetime(2025, 12, 8, 10, 0, 0, tzinfo=timezone(timedelta(hours=9)))

        with patch("scripts.post_theme_to_x.datetime") as mock_datetime:
            mock_datetime.now.return_value = monday
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

            category = get_category_for_today()
            assert category == "romance"

    def test_tuesday_returns_season(self):
        """Test Tuesday returns season category."""
        # Tuesday = weekday 1
        tuesday = datetime(2025, 12, 9, 10, 0, 0, tzinfo=timezone(timedelta(hours=9)))

        with patch("scripts.post_theme_to_x.datetime") as mock_datetime:
            mock_datetime.now.return_value = tuesday
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

            category = get_category_for_today()
            assert category == "season"

    def test_wednesday_returns_daily(self):
        """Test Wednesday returns daily category."""
        # Wednesday = weekday 2
        wednesday = datetime(2025, 12, 10, 10, 0, 0, tzinfo=timezone(timedelta(hours=9)))

        with patch("scripts.post_theme_to_x.datetime") as mock_datetime:
            mock_datetime.now.return_value = wednesday
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

            category = get_category_for_today()
            assert category == "daily"

    def test_thursday_returns_romance(self):
        """Test Thursday returns romance category."""
        # Thursday = weekday 3
        thursday = datetime(2025, 12, 11, 10, 0, 0, tzinfo=timezone(timedelta(hours=9)))

        with patch("scripts.post_theme_to_x.datetime") as mock_datetime:
            mock_datetime.now.return_value = thursday
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

            category = get_category_for_today()
            assert category == "romance"

    def test_friday_returns_daily(self):
        """Test Friday returns daily category."""
        # Friday = weekday 4
        friday = datetime(2025, 12, 12, 10, 0, 0, tzinfo=timezone(timedelta(hours=9)))

        with patch("scripts.post_theme_to_x.datetime") as mock_datetime:
            mock_datetime.now.return_value = friday
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

            category = get_category_for_today()
            assert category == "daily"

    def test_saturday_returns_humor(self):
        """Test Saturday returns humor category."""
        # Saturday = weekday 5
        saturday = datetime(2025, 12, 13, 10, 0, 0, tzinfo=timezone(timedelta(hours=9)))

        with patch("scripts.post_theme_to_x.datetime") as mock_datetime:
            mock_datetime.now.return_value = saturday
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

            category = get_category_for_today()
            assert category == "humor"

    def test_sunday_returns_humor(self):
        """Test Sunday returns humor category."""
        # Sunday = weekday 6
        sunday = datetime(2025, 12, 14, 10, 0, 0, tzinfo=timezone(timedelta(hours=9)))

        with patch("scripts.post_theme_to_x.datetime") as mock_datetime:
            mock_datetime.now.return_value = sunday
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)

            category = get_category_for_today()
            assert category == "humor"


class TestGenerateTweetText:
    """Tests for generate_tweet_text function."""

    def test_tweet_contains_app_promo(self):
        """Test that tweet contains app promotion message."""
        # Create a mock theme
        mock_theme = MagicMock()
        mock_theme.category = "romance"
        mock_theme.date = datetime(2025, 12, 11, tzinfo=timezone(timedelta(hours=9)))
        mock_theme.sponsored = False
        mock_theme.sponsor_company_name = None

        tweet_text = generate_tweet_text(mock_theme)

        # Check that the promotion message is included
        assert "ほかのお題もよみびよりアプリで" in tweet_text
        assert "apps.apple.com" in tweet_text

    def test_tweet_contains_category_hashtag(self):
        """Test that tweet contains appropriate category hashtag."""
        mock_theme = MagicMock()
        mock_theme.category = "season"
        mock_theme.date = datetime(2025, 12, 11, tzinfo=timezone(timedelta(hours=9)))
        mock_theme.sponsored = False
        mock_theme.sponsor_company_name = None

        tweet_text = generate_tweet_text(mock_theme)

        assert "#季節" in tweet_text
        assert "#よみびより" in tweet_text

    def test_sponsored_theme_includes_sponsor_name(self):
        """Test that sponsored theme includes sponsor company name."""
        mock_theme = MagicMock()
        mock_theme.category = "daily"
        mock_theme.date = datetime(2025, 12, 11, tzinfo=timezone(timedelta(hours=9)))
        mock_theme.sponsored = True
        mock_theme.sponsor_company_name = "テスト株式会社"

        tweet_text = generate_tweet_text(mock_theme)

        assert "テスト株式会社" in tweet_text
        assert "提供" in tweet_text
