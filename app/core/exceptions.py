"""Custom exceptions and global error handlers for FastAPI."""

from __future__ import annotations

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.analytics import EventNames, track_event


class ErrorDetail(BaseModel):
    """Standard error response schema."""

    detail: str
    """Human-readable error message"""

    error_code: str | None = None
    """Machine-readable error code (optional)"""

    field: str | None = None
    """Field name for validation errors (optional)"""


class ErrorResponse(BaseModel):
    """Standard error response wrapper."""

    error: ErrorDetail


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions with a consistent format.

    Args:
        request: The incoming request
        exc: The HTTP exception to handle

    Returns:
        JSONResponse with standardized error format
    """
    # Track API errors (4xx and 5xx)
    if exc.status_code >= 400:
        track_event(
            distinct_id="system",
            event_name=EventNames.API_ERROR,
            properties={
                "status_code": exc.status_code,
                "detail": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                "path": str(request.url.path),
                "method": request.method,
                "error_type": "http_exception",
            },
            prehashed_distinct_id=True,
        )

    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                detail=exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                error_code=None,
            )
        ).model_dump(),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle validation errors with a consistent format.

    Args:
        request: The incoming request
        exc: The validation error to handle

    Returns:
        JSONResponse with standardized error format
    """
    # Extract the first error for simplicity
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        field = ".".join(str(loc) for loc in first_error["loc"])
        message = first_error["msg"]
        detail = f"Validation error in {field}: {message}"
    else:
        detail = "Validation error occurred"
        field = None

    # Track validation errors
    track_event(
        distinct_id="system",
        event_name=EventNames.API_ERROR,
        properties={
            "status_code": 422,
            "detail": detail,
            "path": str(request.url.path),
            "method": request.method,
            "error_type": "validation_error",
            "field": field,
        },
        prehashed_distinct_id=True,
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            error=ErrorDetail(
                detail=detail,
                error_code="validation_error",
                field=field if errors else None,
            )
        ).model_dump(),
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions with a consistent format.

    Args:
        request: The incoming request
        exc: The exception to handle

    Returns:
        JSONResponse with standardized error format
    """
    from app.core.logging import logger

    # Log the error for debugging
    logger.error(f"Unexpected error: {exc}", exc_info=True)

    # Track internal server errors
    track_event(
        distinct_id="system",
        event_name=EventNames.API_ERROR,
        properties={
            "status_code": 500,
            "detail": str(exc),
            "path": str(request.url.path),
            "method": request.method,
            "error_type": "internal_error",
            "exception_class": exc.__class__.__name__,
        },
        prehashed_distinct_id=True,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(
                detail="An internal server error occurred. Please try again later.",
                error_code="internal_error",
            )
        ).model_dump(),
    )
