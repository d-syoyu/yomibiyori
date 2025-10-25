"""FastAPI application entry point."""

from fastapi import FastAPI, Request

from app.db.session import clear_request_user_context
from app.routes.api import api_router

app = FastAPI(title="Yomibiyori API", version="1.0.0")


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


app.include_router(api_router, prefix="/api/v1")
