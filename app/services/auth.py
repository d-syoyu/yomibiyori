
"""Authentication helpers for Supabase-issued JWTs and Supabase user management."""

from __future__ import annotations

from datetime import datetime, timezone
from time import monotonic
from typing import Any

import requests
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.analytics import track_event, identify_user, EventNames
from app.db.session import set_request_user_context
from app.models import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    OAuthCallbackRequest,
    OAuthCallbackResponse,
    OAuthUrlResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    SessionToken,
    SignUpRequest,
    SignUpResponse,
    UpdatePasswordRequest,
    UpdatePasswordResponse,
    UserProfileResponse,
    VerifyTokenAndUpdatePasswordRequest,
)

_bearer_scheme = HTTPBearer(auto_error=False)


class JWKSCache:
    """Simple JWKS cache with optional ETag handling."""

    def __init__(self) -> None:
        self._keys: dict[str, Any] | None = None
        self._etag: str | None = None
        self._expires_at: float = 0.0

    def get_keys(self) -> dict[str, Any]:
        settings = get_settings()
        now = monotonic()
        if self._keys is not None and now < self._expires_at:
            return self._keys

        headers = {"If-None-Match": self._etag} if self._etag else {}
        try:
            response = requests.get(
                settings.supabase_jwks_url,
                headers=headers,
                timeout=settings.supabase_request_timeout,
            )
        except requests.RequestException as exc:
            if self._keys is not None:
                return self._keys
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="JWKS fetch failed") from exc

        if response.status_code == 304 and self._keys is not None:
            self._expires_at = now + settings.supabase_jwks_cache_ttl_seconds
            return self._keys

        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            if self._keys is not None:
                return self._keys
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="JWKS fetch failed") from exc

        self._etag = response.headers.get("ETag")
        try:
            payload = response.json()
        except ValueError as exc:
            if self._keys is not None:
                return self._keys
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Invalid JWKS payload") from exc

        if not isinstance(payload, dict):
            if self._keys is not None:
                return self._keys
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Invalid JWKS payload")

        self._keys = payload
        self._expires_at = now + settings.supabase_jwks_cache_ttl_seconds
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
                options={
                    "verify_aud": False,
                    "verify_signature": True,
                    "verify_exp": True,  # Verify expiration
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_iss": False,  # Don't verify issuer for now
                },
            )
        except jwt.ExpiredSignatureError:
            # Token has expired - client should refresh token or re-login
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please refresh your token or login again.",
            )
        except JWTError as e:
            # Other JWT errors - try JWKS fallback
            import logging
            logging.warning(f"HS256 JWT decode failed: {e}. Falling back to JWKS (RS256).")
            pass

    return _decode_with_jwks(token, settings)


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Return the authenticated user identifier from the Authorization header.

    This function also sets the request user context for Row Level Security (RLS)
    to work correctly in PostgreSQL.
    """
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

    # Set request context for RLS policies
    set_request_user_context(str(user_id), role)

    return str(user_id)


def _extract_supabase_error(response: requests.Response) -> str:
    """Return a human friendly error message from a Supabase HTTP response."""

    try:
        payload = response.json()
    except ValueError:
        return "Supabase request failed"

    if isinstance(payload, dict):
        for key in ("message", "msg", "error_description", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value:
                return value
    return "Supabase request failed"


def _upsert_user_record(
    session: Session,
    *,
    user_id: str,
    email: str,
    display_name: str | None,
) -> User:
    """Synchronise the Supabase user with the local database."""

    now = datetime.now(timezone.utc)
    user = session.get(User, user_id)

    # Use display_name if provided, otherwise use existing name, or extract from email
    if display_name:
        name = display_name
    elif user and user.name:
        name = user.name
    else:
        # Extract username from email (part before @)
        name = email.split("@")[0] if "@" in email else email

    if user:
        user.name = name
        user.email = email
        user.updated_at = now
    else:
        user = User(
            id=user_id,
            name=name,
            email=email,
            created_at=now,
            updated_at=now,
        )
        session.add(user)

    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered") from exc

    session.refresh(user)
    return user


def signup_user(session: Session, *, payload: SignUpRequest) -> SignUpResponse:
    """Create a user through Supabase Auth and persist it locally."""

    settings = get_settings()
    api_key = settings.supabase_anon_key or settings.service_role_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase anon key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")
    request_body: dict[str, Any] = {"email": payload.email, "password": payload.password}
    if payload.display_name:
        request_body["data"] = {"display_name": payload.display_name}

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{supabase_url}/auth/v1/signup",
            json=request_body,
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase signup failed") from exc

    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        payload_json = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid response from Supabase") from exc

    user_payload = payload_json.get("user") or {}
    user_id = user_payload.get("id")
    email = user_payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Supabase response missing user data")

    metadata = user_payload.get("user_metadata") or {}
    display_name = metadata.get("display_name") or payload.display_name

    user = _upsert_user_record(session, user_id=user_id, email=email, display_name=display_name)

    # Track user registration event
    try:
        identify_user(
            distinct_id=str(user.id),
            properties={
                "email": user.email,
                "display_name": user.name,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }
        )
        track_event(
            distinct_id=str(user.id),
            event_name=EventNames.USER_REGISTERED,
            properties={
                "email": user.email,
                "has_display_name": bool(user.name),
            }
        )
    except Exception as e:
        print(f"[Analytics] Failed to track signup: {e}")

    # Supabase may return session data either nested under "session" key or at root level
    session_payload = payload_json.get("session") or payload_json
    access_token = session_payload.get("access_token")
    session_token = (
        SessionToken(
            access_token=access_token,
            refresh_token=session_payload.get("refresh_token"),
            token_type=session_payload.get("token_type", "bearer"),
            expires_in=session_payload.get("expires_in"),
        )
        if access_token
        else None
    )

    return SignUpResponse(
        user_id=str(user.id),
        email=user.email,
        display_name=user.name,
        session=session_token,
    )


def login_user(session: Session, *, payload: LoginRequest) -> LoginResponse:
    """Authenticate user through Supabase Auth and return session."""

    settings = get_settings()
    api_key = settings.supabase_anon_key or settings.service_role_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase anon key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")
    request_body: dict[str, Any] = {
        "email": payload.email,
        "password": payload.password,
        "grant_type": "password",
    }

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{supabase_url}/auth/v1/token?grant_type=password",
            json=request_body,
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase login failed") from exc

    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        payload_json = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid response from Supabase") from exc

    user_payload = payload_json.get("user") or {}
    user_id = user_payload.get("id")
    email = user_payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Supabase response missing user data")

    metadata = user_payload.get("user_metadata") or {}
    display_name = metadata.get("display_name")

    # Sync user record if needed
    user = _upsert_user_record(session, user_id=user_id, email=email, display_name=display_name)

    # Track user login event
    try:
        track_event(
            distinct_id=str(user.id),
            event_name=EventNames.USER_LOGGED_IN,
            properties={
                "email": user.email,
            }
        )
    except Exception as e:
        print(f"[Analytics] Failed to track login: {e}")

    access_token = payload_json.get("access_token")
    session_token = (
        SessionToken(
            access_token=access_token,
            refresh_token=payload_json.get("refresh_token"),
            token_type=payload_json.get("token_type", "bearer"),
            expires_in=payload_json.get("expires_in"),
        )
        if access_token
        else None
    )

    return LoginResponse(
        user_id=str(user.id),
        email=user.email,
        display_name=user.name,
        session=session_token,
    )


def get_user_profile(session: Session, *, user_id: str) -> UserProfileResponse:
    """Return the locally stored profile for the authenticated user."""

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    return UserProfileResponse(user_id=str(user.id), email=user.email, display_name=user.name)


def sync_user_profile(session: Session, *, user_id: str) -> UserProfileResponse:
    """Refresh the local profile using Supabase Auth admin API."""

    settings = get_settings()
    service_key = settings.service_role_key
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service role key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }

    try:
        response = requests.get(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase profile sync failed") from exc

    if response.status_code == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in Supabase")

    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid response from Supabase") from exc

    email = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Supabase response missing user data")

    metadata = payload.get("user_metadata") or {}
    display_name = metadata.get("display_name")

    user = _upsert_user_record(session, user_id=user_id, email=email, display_name=display_name)

    return UserProfileResponse(user_id=str(user.id), email=user.email, display_name=user.name)


def refresh_access_token(*, refresh_token: str) -> SessionToken:
    """Refresh the access token using a refresh token."""

    settings = get_settings()
    api_key = settings.supabase_anon_key or settings.service_role_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase anon key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")
    request_body: dict[str, Any] = {
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{supabase_url}/auth/v1/token?grant_type=refresh_token",
            json=request_body,
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase token refresh failed") from exc

    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        payload_json = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid response from Supabase") from exc

    access_token = payload_json.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Supabase response missing token data")

    return SessionToken(
        access_token=access_token,
        refresh_token=payload_json.get("refresh_token"),
        token_type=payload_json.get("token_type", "bearer"),
        expires_in=payload_json.get("expires_in"),
    )


def request_password_reset(*, payload: PasswordResetRequest) -> PasswordResetResponse:
    """Send password reset email via Supabase Auth."""

    settings = get_settings()
    api_key = settings.supabase_anon_key or settings.service_role_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase anon key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")
    request_body: dict[str, Any] = {"email": payload.email}

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{supabase_url}/auth/v1/recover",
            json=request_body,
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase password reset request failed",
        ) from exc

    # Supabase returns 200 even if email doesn't exist (security best practice)
    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    return PasswordResetResponse()


def update_password(*, access_token: str, payload: UpdatePasswordRequest) -> UpdatePasswordResponse:
    """Update user password using access token."""

    settings = get_settings()
    api_key = settings.supabase_anon_key or settings.service_role_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase anon key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")
    request_body: dict[str, Any] = {"password": payload.new_password}

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.put(
            f"{supabase_url}/auth/v1/user",
            json=request_body,
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase password update failed",
        ) from exc

    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    return UpdatePasswordResponse()


def verify_token_and_update_password(*, payload: VerifyTokenAndUpdatePasswordRequest) -> UpdatePasswordResponse:
    """Verify token and update password."""

    settings = get_settings()
    api_key = settings.supabase_anon_key or settings.service_role_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase anon key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")

    headers = {
        "apikey": api_key,
        "Content-Type": "application/json",
    }

    # Check if token looks like an OTP code (short numeric token from {{ .Token }})
    token = payload.access_token.strip()
    if len(token) < 20 and token.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "トークンが無効です。Supabaseのメールテンプレートで {{ .Token }} ではなく "
                "{{ .TokenHash }} を使用してください。詳細は docs/supabase_email_template_setup.md を参照してください。"
            ),
        )

    # Step 1: Try to verify token first (in case it's a token_hash or recovery token)
    verify_body: dict[str, Any] = {
        "token_hash": token,
        "type": "recovery",
    }

    access_token = None

    try:
        verify_response = requests.post(
            f"{supabase_url}/auth/v1/verify",
            json=verify_body,
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )

        if verify_response.status_code == 200:
            # Token verification succeeded, get access_token
            verify_data = verify_response.json()
            access_token = verify_data.get("access_token")
        elif verify_response.status_code >= 400:
            # Log verification error for debugging
            error_detail = _extract_supabase_error(verify_response)
            import logging

            logging.warning(f"Token verification failed: {error_detail}")

            # If it's a token format error, provide helpful message
            if "署名" in error_detail or "segment" in error_detail.lower() or "jwt" in error_detail.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"パスワードリセットトークンの検証に失敗しました: {error_detail}\n\n"
                        "Supabaseのメールテンプレートで {{ .TokenHash }} を使用していることを確認してください。"
                    ),
                )
    except requests.RequestException:
        # Verification failed, might already be an access token
        pass

    # If verification failed or didn't return token, use the provided token as-is
    if not access_token:
        access_token = token

    # Step 2: Update password with access token
    update_body: dict[str, Any] = {"password": payload.new_password}

    headers_with_auth = {
        "apikey": api_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.put(
            f"{supabase_url}/auth/v1/user",
            json=update_body,
            headers=headers_with_auth,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Password update failed",
        ) from exc

    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    return UpdatePasswordResponse()


def get_google_oauth_url(*, redirect_to: str | None = None) -> OAuthUrlResponse:
    """Generate Google OAuth authorization URL."""

    settings = get_settings()
    api_key = settings.supabase_anon_key or settings.service_role_key
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase anon key not configured",
        )

    supabase_url = settings.supabase_url.rstrip("/")

    # Build OAuth URL
    # Reference: https://supabase.com/docs/guides/auth/social-login/auth-google
    oauth_url = f"{supabase_url}/auth/v1/authorize?provider=google"

    # Add redirect_to parameter if provided
    if redirect_to:
        from urllib.parse import quote
        oauth_url += f"&redirect_to={quote(redirect_to)}"

    return OAuthUrlResponse(url=oauth_url, provider="google")


def process_oauth_callback(session: Session, *, payload: OAuthCallbackRequest) -> OAuthCallbackResponse:
    """Process OAuth callback and synchronize user to local database."""

    settings = get_settings()
    service_key = settings.service_role_key
    if not service_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service role key not configured",
        )

    # Decode the access token to get user ID
    try:
        token_payload: dict[str, Any] = _decode_jwt(payload.access_token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired token") from exc

    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token missing subject")

    # Fetch user details from Supabase using admin API
    supabase_url = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }

    try:
        response = requests.get(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers=headers,
            timeout=settings.supabase_request_timeout,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase user fetch failed") from exc

    if response.status_code == 404:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in Supabase")

    if response.status_code >= 400:
        detail = _extract_supabase_error(response)
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        user_data = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Invalid response from Supabase") from exc

    email = user_data.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Supabase response missing user data")

    # Extract display name from user metadata or identities
    metadata = user_data.get("user_metadata") or {}
    display_name = metadata.get("display_name") or metadata.get("full_name") or metadata.get("name")

    # If no display name in metadata, try to get from identities (OAuth provider data)
    if not display_name:
        identities = user_data.get("identities", [])
        for identity in identities:
            identity_data = identity.get("identity_data", {})
            display_name = identity_data.get("full_name") or identity_data.get("name")
            if display_name:
                break

    # Synchronize user to local database
    user = _upsert_user_record(session, user_id=user_id, email=email, display_name=display_name)

    # Track user OAuth login event
    try:
        identify_user(
            distinct_id=str(user.id),
            properties={
                "email": user.email,
                "display_name": user.name,
            }
        )
        track_event(
            distinct_id=str(user.id),
            event_name=EventNames.USER_LOGGED_IN,
            properties={
                "email": user.email,
                "auth_method": "google_oauth",
            }
        )
    except Exception as e:
        print(f"[Analytics] Failed to track OAuth login: {e}")

    # Return session token
    session_token = (
        SessionToken(
            access_token=payload.access_token,
            refresh_token=payload.refresh_token,
            token_type="bearer",
            expires_in=3600,  # Default to 1 hour, Supabase tokens typically expire in 1 hour
        )
        if payload.access_token
        else None
    )

    return OAuthCallbackResponse(
        user_id=str(user.id),
        email=user.email,
        display_name=user.name,
        session=session_token,
    )
