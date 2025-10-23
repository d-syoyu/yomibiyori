"""Logging configuration for the application."""

import logging
import sys

# Configure logging format for structured output
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

# Create application logger
logger = logging.getLogger("yomibiyori")
logger.setLevel(logging.INFO)
