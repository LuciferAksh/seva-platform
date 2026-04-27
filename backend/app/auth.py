from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .config import Settings, get_settings

try:
    import firebase_admin
    from firebase_admin import auth, credentials
except ImportError:  # pragma: no cover - optional dependency until configured
    firebase_admin = None
    auth = None
    credentials = None


security = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    uid: str
    auth_mode: str
    email: str | None = None
    is_admin: bool = False


@lru_cache(maxsize=1)
def _firebase_app(project_id: str | None, credentials_path: str | None):
    if not firebase_admin or not project_id:
        return None

    if firebase_admin._apps:
        return firebase_admin.get_app()

    if credentials_path:
        credential = credentials.Certificate(credentials_path)
        return firebase_admin.initialize_app(credential, {"projectId": project_id})

    return firebase_admin.initialize_app(options={"projectId": project_id})


def get_auth_context(
    credentials_value: HTTPAuthorizationCredentials | None = Depends(security),
    settings: Settings = Depends(get_settings),
) -> AuthContext:
    if credentials_value is None:
        if settings.allow_anonymous_auth:
            return AuthContext(uid="demo-user", auth_mode="anonymous", is_admin=True)
        logger.warning("Authentication failed: No credentials provided.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    if not settings.firebase_enabled:
        if settings.allow_anonymous_auth:
            return AuthContext(uid="demo-user", auth_mode="anonymous", is_admin=True)
        logger.error("Authentication failed: Firebase auth not configured.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Firebase auth not configured")

    app = _firebase_app(settings.firebase_project_id, settings.firebase_credentials_path)
    if app is None or auth is None:
        logger.error("Authentication failed: Firebase admin SDK unavailable.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Firebase admin SDK unavailable")

    try:
        decoded = auth.verify_id_token(credentials_value.credentials, app=app)
    except Exception as exc:  # pragma: no cover - depends on external token verification
        logger.warning("Authentication failed: Invalid Firebase token.")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token") from exc

    email = decoded.get("email")
    is_admin = email is not None and email.lower() in settings.admin_emails

    return AuthContext(
        uid=decoded["uid"],
        email=email,
        auth_mode="firebase",
        is_admin=is_admin,
    )
