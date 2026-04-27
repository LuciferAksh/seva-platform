from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    google_cloud_project: str | None
    google_cloud_location: str
    upload_bucket: str | None
    local_upload_dir: Path
    vertex_fast_model: str
    vertex_pro_model: str
    speech_language_codes: tuple[str, ...]
    speech_model: str
    document_ai_location: str
    document_ai_processor_id: str | None
    firebase_project_id: str | None
    firebase_credentials_path: str | None
    google_maps_api_key: str | None
    allow_anonymous_auth: bool
    admin_emails: list[str]
    allowed_origins: list[str]

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_cloud_project)

    @property
    def firebase_enabled(self) -> bool:
        return bool(self.firebase_project_id)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
        
    root = Path(__file__).resolve().parents[2]
    language_codes = tuple(
        code.strip()
        for code in os.getenv("SPEECH_LANGUAGE_CODES", "en-US,hi-IN").split(",")
        if code.strip()
    )

    return Settings(
        google_cloud_project=os.getenv("GOOGLE_CLOUD_PROJECT", os.getenv("FIREBASE_PROJECT_ID")),
        google_cloud_location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
        upload_bucket=os.getenv("UPLOAD_BUCKET"),
        local_upload_dir=root / os.getenv("LOCAL_UPLOAD_DIR", "uploads"),
        vertex_fast_model=os.getenv("VERTEX_MODEL_FAST", "gemini-2.5-flash"),
        vertex_pro_model=os.getenv("VERTEX_MODEL_PRO", "gemini-2.5-pro"),
        speech_language_codes=language_codes or ("en-US",),
        speech_model=os.getenv("SPEECH_MODEL", "short"),
        document_ai_location=os.getenv("DOCUMENT_AI_LOCATION", "us"),
        document_ai_processor_id=os.getenv("DOCUMENT_AI_PROCESSOR_ID"),
        firebase_project_id=os.getenv("FIREBASE_PROJECT_ID"),
        firebase_credentials_path=os.getenv("FIREBASE_CREDENTIALS_PATH"),
        google_maps_api_key=os.getenv("GOOGLE_MAPS_API_KEY"),
        allow_anonymous_auth=_bool_env("ALLOW_ANONYMOUS_AUTH", True),
        admin_emails=[e.strip().lower() for e in os.getenv("ADMIN_EMAILS", "coordinator@seva.org").split(",") if e.strip()],
        allowed_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()],
    )
