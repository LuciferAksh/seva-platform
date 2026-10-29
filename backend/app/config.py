from __future__ import annotations
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

@dataclass(frozen=True)
class Settings:
    mode: str
    supabase_url: str
    supabase_key: str
    supabase_bucket: str
    groq_key: str
    text_model: str
    vision_model: str
    speech_model: str
    admin_emails: tuple[str, ...]
    allowed_origins: tuple[str, ...]
    local_upload_dir: Path
    demo_secret: str
    brevo_key: str
    mail_sender: str
    frontend_url: str
    turnstile_secret: str
    max_upload_bytes: int = 10 * 1024 * 1024
    @property
    def demo(self) -> bool:
        return self.mode == 'demo'

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    from dotenv import load_dotenv
    root = Path(__file__).resolve().parents[2]
    # Deliberately ignore legacy Google .env files.
    load_dotenv(root / '.env.local')
    mode = os.getenv('APP_MODE', 'demo').strip().lower()
    if mode not in {'demo', 'connected'}:
        raise ValueError('APP_MODE must be demo or connected')
    import secrets
    settings = Settings(
        mode=mode,
        supabase_url=os.getenv('SUPABASE_URL', '').rstrip('/'),
        supabase_key=os.getenv('SUPABASE_SERVICE_ROLE_KEY', ''),
        supabase_bucket=os.getenv('SUPABASE_STORAGE_BUCKET', 'seva-media'),
        groq_key=os.getenv('GROQ_API_KEY', ''),
        text_model=os.getenv('GROQ_TEXT_MODEL', 'openai/gpt-oss-20b'),
        vision_model=os.getenv('GROQ_VISION_MODEL', 'qwen/qwen3.8-27b'),
        speech_model=os.getenv('GROQ_SPEECH_MODEL', 'whisper-large-v3-turbo'),
        admin_emails=tuple(e.strip().lower() for e in os.getenv('ADMIN_EMAILS', '').split(',') if e.strip()),
        allowed_origins=tuple(o.strip() for o in os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173').split(',') if o.strip()),
        local_upload_dir=root / '.data' / 'uploads',
        demo_secret=os.getenv('DEMO_SESSION_SECRET') or secrets.token_hex(32),
        brevo_key=os.getenv('BREVO_API_KEY', ''),
        mail_sender=os.getenv('MAIL_SENDER', ''),
        frontend_url=os.getenv('FRONTEND_URL', 'http://localhost:5173').rstrip('/'),
        turnstile_secret=os.getenv('TURNSTILE_SECRET_KEY', ''),
    )
    if not settings.demo and (not settings.supabase_url.startswith('https://') or not settings.supabase_key):
        raise ValueError('Connected mode requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    if '*' in settings.allowed_origins:
        raise ValueError('Use explicit ALLOWED_ORIGINS, not a wildcard')
    return settings
