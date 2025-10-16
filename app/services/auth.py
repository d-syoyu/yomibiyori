
"""Authentication helpers for Supabase-issued JWTs."""

from __future__ import annotations

from typing import Any

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings

_bearer_scheme = HTTPBearer(auto_error=False)


class JWKSCache:
    """Simple JWKS cache with optional ETag handling."""

    def __init__(self) -> None:
        self._keys: dict[str, Any] | None = None
        self._etag: str | None = None

    def get_keys(self) -> dict[str, Any]:
        settings = get_settings()
        headers = {"If-None-Match": self._etag} if self._etag else {}
        try:
            response = requests.get(settings.supabase_jwks_url, headers=headers, timeout=5)
        except requests.RequestException as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="JWKS fetch failed") from exc

        if response.status_code == 304 and self._keys is not None:
            return self._keys

        response.raise_for_status()
        self._etag = response.headers.get("ETag")
        self._keys = response.json()
        return self._keys


_jwks_cache = JWKSCache()


def _decode_with_jwks(token: str, settings) -> dict[str, Any]:  # type: ignore[no-untyped-def]
    jwks = _jwks_cache.get_keys()
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")
    keys = jwks.get("keys", []) if isinstance(jwks, dict) else []
    for key in keys:
        if key.get("kid") == kid:
            return jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                audience=settings.supabase_jwt_audience,
                issuer=f"https://{settings.supabase_project_ref}.supabase.co/auth/v1",
                options={"verify_sub": True},
            )
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")


def _decode_jwt(token: str) -> dict[str, Any]:
    settings = get_settings()
    secret = settings.supabase_jwt_secret
    if secret:
        try:
            return jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except JWTError:
            pass

    return _decode_with_jwks(token, settings)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Return the authenticated user identifier from the Authorization header."""

    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = credentials.credentials
    try:
        payload: dict[str, Any] = _decode_jwt(token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Token missing subject")

    role = payload.get("role", "authenticated")
    if role not in {"authenticated", "service_role"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

    return str(user_id)
