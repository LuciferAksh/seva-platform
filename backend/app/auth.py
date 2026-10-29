from __future__ import annotations
import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import get_settings
security = HTTPBearer(auto_error=False)

@dataclass
class AuthContext:
    uid: str
    email: str
    is_admin: bool
    auth_mode: str

def demo_token(role: str) -> str:
    settings = get_settings()
    if not settings.demo or role not in {'admin', 'volunteer'}:
        raise HTTPException(404, 'Demo access is unavailable')
    payload = base64.urlsafe_b64encode(json.dumps({'role': role, 'exp': int(time.time()) + 3600}).encode()).decode()
    sig = hmac.new(settings.demo_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f'{payload}.{sig}'

def get_auth_context(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> AuthContext:
    if not credentials:
        raise HTTPException(401, 'Sign in to continue', headers={'WWW-Authenticate': 'Bearer'})
    settings = get_settings()
    if settings.demo:
        try:
            payload, sig = credentials.credentials.rsplit('.', 1)
            expected = hmac.new(settings.demo_secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(sig, expected):
                raise ValueError()
            data = json.loads(base64.urlsafe_b64decode(payload))
            if data['exp'] < time.time() or data['role'] not in {'admin', 'volunteer'}:
                raise ValueError()
            role = data['role']
            return AuthContext('demo-' + role, 'coordinator@example.org' if role == 'admin' else 'asha@example.org', role == 'admin', 'demo')
        except (ValueError, KeyError, TypeError):
            raise HTTPException(401, 'Demo session expired; enter the demo again') from None
    try:
        # GoTrue validates signature, expiry and issuer server-side.
        response = httpx.get(settings.supabase_url + '/auth/v1/user', headers={
            'apikey': settings.supabase_key, 'Authorization': 'Bearer ' + credentials.credentials,
        }, timeout=12)
        if response.status_code in {401, 403}:
            raise HTTPException(401, 'Session expired; sign in again')
        response.raise_for_status()
        user = response.json()
    except httpx.HTTPError:
        raise HTTPException(503, 'Identity service is temporarily unavailable') from None
    if not user.get('email_confirmed_at'):
        raise HTTPException(403, 'Verify your email before continuing')
    email = user.get('email', '').lower()
    return AuthContext(user['id'], email, email in settings.admin_emails, 'supabase')

def require_admin(context: AuthContext = Depends(get_auth_context)) -> AuthContext:
    if not context.is_admin:
        raise HTTPException(403, 'Coordinator access required')
    return context
