from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from ..config import Settings

try:
    from google.cloud import storage
except ImportError:  # pragma: no cover - optional dependency until installed
    storage = None


@dataclass
class StoredObject:
    uri: str
    object_name: str
    content_type: str | None


class MediaStorageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = storage.Client() if storage and settings.upload_bucket else None

    def save_bytes(
        self,
        *,
        data: bytes,
        source_type: str,
        filename: str | None,
        content_type: str | None,
    ) -> StoredObject:
        object_name = self._build_object_name(source_type, filename)
        if self._client and self.settings.upload_bucket:
            bucket = self._client.bucket(self.settings.upload_bucket)
            blob = bucket.blob(object_name)
            blob.upload_from_string(data, content_type=content_type)
            return StoredObject(
                uri=f"gs://{self.settings.upload_bucket}/{object_name}",
                object_name=object_name,
                content_type=content_type,
            )

        local_path = self.settings.local_upload_dir / object_name
        local_path.parent.mkdir(parents=True, exist_ok=True)
        local_path.write_bytes(data)
        return StoredObject(
            uri=str(local_path.resolve()),
            object_name=object_name,
            content_type=content_type,
        )

    def _build_object_name(self, source_type: str, filename: str | None) -> str:
        suffix = Path(filename or f"{source_type}.bin").suffix or ".bin"
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        return f"{source_type}/{timestamp}-{uuid4().hex[:10]}{suffix}"
