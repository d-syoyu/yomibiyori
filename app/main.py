"""FastAPI application entry point."""

from fastapi import FastAPI

from app.routes.api import api_router

app = FastAPI(title="Yomibiyori API", version="1.0.0")

@app.get("/")
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "message": "Yomibiyori API is running"}

app.include_router(api_router, prefix="/api/v1")
