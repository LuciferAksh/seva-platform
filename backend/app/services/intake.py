from __future__ import annotations

import logging
from dataclasses import dataclass

from fastapi import UploadFile

from ..config import Settings
from .google_pipeline import GoogleIntelligencePipeline
from .storage import MediaStorageService

logger = logging.getLogger("intake")


@dataclass
class ProcessedSubmission:
    text: str
    media_uri: str | None
    source_summary: str
    structured: dict
    processing_mode: str


class SubmissionProcessor:
    def __init__(self, settings: Settings) -> None:
        self.pipeline = GoogleIntelligencePipeline(settings)
        self.storage = MediaStorageService(settings)

    async def process(
        self,
        *,
        source_type: str,
        text: str,
        upload: UploadFile | None,
    ) -> ProcessedSubmission:
        media_uri: str | None = None
        extracted_text = text.strip()
        source_summary = "Direct text submission"
        processing_mode = "demo"

        if upload is not None:
            file_bytes = await upload.read()
            if file_bytes:
                stored = self.storage.save_bytes(
                    data=file_bytes,
                    source_type=source_type,
                    filename=upload.filename,
                    content_type=upload.content_type,
                )
                media_uri = stored.uri

                if source_type == "voice":
                    result = self.pipeline.transcribe_voice(file_bytes, upload.content_type)
                    extracted_text = result.extracted_text or extracted_text
                    source_summary = result.source_summary
                    processing_mode = result.processing_mode
                elif source_type == "image":
                    result = self.pipeline.extract_from_image(file_bytes, upload.content_type)
                    extracted_text = result.extracted_text or extracted_text
                    source_summary = result.source_summary
                    processing_mode = result.processing_mode
                else:
                    source_summary = "File stored for reference; using provided text"

        structured, structuring_summary = self._structure(extracted_text or text, source_type)
        if structuring_summary:
            source_summary = f"{source_summary}. {structuring_summary}".strip(". ")
            if "Vertex AI" in structuring_summary:
                processing_mode = "google"

        return ProcessedSubmission(
            text=(extracted_text or text).strip(),
            media_uri=media_uri,
            source_summary=source_summary,
            structured=structured,
            processing_mode=processing_mode,
        )

    def _structure(self, text: str, source_type: str) -> tuple[dict, str]:
        try:
            return self.pipeline.structure_report(text, source_type)
        except Exception as exc:  # pragma: no cover - external API behavior
            logger.error("Structuring fallback used after Google pipeline error.")
            return {}, "Structuring fallback used after Google pipeline error"
