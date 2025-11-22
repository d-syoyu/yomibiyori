"""FastAPI application entry point."""

from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.core.exceptions import (
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.db.session import clear_request_user_context
from app.routes.api import api_router

app = FastAPI(title="Yomibiyori API", version="1.0.0")

# CORS configuration for local development and production
# Allow both http and https for yomibiyori.com to support redirects
# Updated: 2025-11-22 to fix sponsor theme submission CORS issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",  # Expo web dev server
        "http://localhost:19006",  # Alternative Expo port
        "https://yomibiyori-production.up.railway.app",  # Production domain
        "https://www.yomibiyori.com",  # Marketing/admin site (https)
        "http://www.yomibiyori.com",  # Marketing/admin site (http)
        "https://yomibiyori.com",  # Marketing/admin site without www (https)
        "http://yomibiyori.com",  # Marketing/admin site without www (http)
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Register global error handlers
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


@app.middleware("http")
async def clear_user_context_middleware(request: Request, call_next):
    """Middleware to ensure request user context is cleared after each request.

    This prevents ContextVar values from leaking between requests,
    which is critical for Row Level Security.
    """
    try:
        response = await call_next(request)
        return response
    finally:
        # Always clear context, even if request fails
        clear_request_user_context()


@app.get("/")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Yomibiyori API is running"}


@app.get("/reset-password")
def password_reset_page():
    """Serve password reset HTML page."""
    template_path = Path(__file__).parent / "templates" / "reset_password.html"
    if not template_path.exists():
        raise HTTPException(status_code=404, detail="Password reset page not found")
    return FileResponse(template_path, media_type="text/html")


app.include_router(api_router, prefix="/api/v1")


# Handle OPTIONS requests for CORS preflight (must be after routers)
@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handle OPTIONS requests for CORS preflight."""
    return {"status": "ok"}
