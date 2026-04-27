from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from ..config import Settings

try:
    from google import genai
    from google.genai.types import HttpOptions
except ImportError:  # pragma: no cover - optional dependency until installed
    genai = None
    HttpOptions = None

try:
    from google.api_core.client_options import ClientOptions
    from google.cloud import documentai
except ImportError:  # pragma: no cover - optional dependency until installed
    ClientOptions = None
    documentai = None

try:
    from google.cloud.speech_v2 import SpeechClient
    from google.cloud.speech_v2.types import cloud_speech
except ImportError:  # pragma: no cover - optional dependency until installed
    SpeechClient = None
    cloud_speech = None


@dataclass
class GooglePipelineResult:
    extracted_text: str
    source_summary: str
    processing_mode: str


class GoogleIntelligencePipeline:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._speech_client = SpeechClient() if SpeechClient and settings.google_enabled else None
        self._document_client = self._create_document_client()
        self._genai_client = self._create_genai_client()

    def transcribe_voice(self, audio_bytes: bytes, mime_type: str | None) -> GooglePipelineResult:
        if not self._speech_client or not cloud_speech or not self.settings.google_cloud_project:
            return GooglePipelineResult(
                extracted_text="",
                source_summary="Demo transcription fallback: Speech-to-Text not configured",
                processing_mode="demo",
            )

        config = cloud_speech.RecognitionConfig(
            auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
            language_codes=list(self.settings.speech_language_codes),
            model=self.settings.speech_model,
        )
        request = cloud_speech.RecognizeRequest(
            recognizer=f"projects/{self.settings.google_cloud_project}/locations/global/recognizers/_",
            config=config,
            content=audio_bytes,
        )

        response = self._speech_client.recognize(request=request)
        transcript = " ".join(
            result.alternatives[0].transcript.strip()
            for result in response.results
            if result.alternatives and result.alternatives[0].transcript.strip()
        )

        return GooglePipelineResult(
            extracted_text=transcript,
            source_summary="Transcribed with Google Speech-to-Text",
            processing_mode="google" if transcript else "demo",
        )

    def extract_from_image(self, image_bytes: bytes, mime_type: str | None) -> GooglePipelineResult:
        if (
            not self._document_client
            or not documentai
            or not self.settings.google_cloud_project
            or not self.settings.document_ai_processor_id
        ):
            return GooglePipelineResult(
                extracted_text="",
                source_summary="Demo OCR fallback: Document AI not configured",
                processing_mode="demo",
            )

        processor_name = self._document_client.processor_path(
            self.settings.google_cloud_project,
            self.settings.document_ai_location,
            self.settings.document_ai_processor_id,
        )
        raw_document = documentai.RawDocument(
            content=image_bytes,
            mime_type=mime_type or "image/jpeg",
        )
        request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)
        result = self._document_client.process_document(request=request)
        extracted_text = result.document.text.strip() if result.document and result.document.text else ""

        return GooglePipelineResult(
            extracted_text=extracted_text,
            source_summary="Extracted with Google Document AI OCR",
            processing_mode="google" if extracted_text else "demo",
        )

    def structure_report(self, text: str, source_type: str) -> tuple[dict[str, Any], str]:
        if not text.strip():
            return {}, "No text available for structuring"

        if not self._genai_client:
            return {}, "Demo structuring fallback: Gemini not configured"

        schema = {
            "type": "OBJECT",
            "properties": {
                "category": {
                    "type": "STRING",
                    "enum": ["food", "medical", "shelter", "education", "water", "other"],
                },
                "urgency_level": {"type": "INTEGER"},
                "people_affected": {"type": "INTEGER"},
                "location_label": {"type": "STRING"},
                "coordinates": {
                    "type": "OBJECT",
                    "properties": {
                        "lat": {"type": "NUMBER"},
                        "lng": {"type": "NUMBER"}
                    },
                    "required": ["lat", "lng"]
                },
                "required_skills": {"type": "ARRAY", "items": {"type": "STRING"}},
                "summary": {"type": "STRING"},
                "suggested_supplies": {"type": "ARRAY", "items": {"type": "STRING"}},
                "facility_type_needed": {"type": "STRING"}
            },
            "required": [
                "category",
                "urgency_level",
                "people_affected",
                "location_label",
                "coordinates",
                "required_skills",
                "summary",
            ],
        }

        prompt = (
            "You are helping an NGO operations platform structure community reports. "
            "Read the field report and return JSON only. "
            "Infer the most likely category, urgency from 1 to 5, people affected, "
            "best locality label, exact GPS coordinates (lat and lng) for that location as floats, required volunteer skills, and a short operational summary. "
            "Also deeply analyze the incident and provide an EXTENSIVE, hyper-specific list of 'suggested_supplies' (e.g., instead of just 'medical', specify exactly: 'Burn cream', 'Sterile bandages', 'Antibiotics', 'Fire extinguisher', 'Blankets', 'Water purification tablets', etc.). "
            "If a specific facility is needed, strictly provide 'facility_type_needed' (must be exactly 'hospital', 'pharmacy', 'medical_clinic', 'police', 'fire_station', or null).\n\n"
            f"Source type: {source_type}\n"
            f"Field report text:\n{text.strip()}"
        )

        response = self._genai_client.models.generate_content(
            model=self.settings.vertex_fast_model,
            contents=prompt,
            config={
                "temperature": 0,
                "response_mime_type": "application/json",
                "response_schema": schema,
            },
        )
        parsed = json.loads(response.text)

        facility_type = parsed.get("facility_type_needed")
        if facility_type and self.settings.google_maps_api_key:
            coords = parsed.get("coordinates")
            if coords and "lat" in coords and "lng" in coords:
                try:
                    import httpx
                    url = "https://places.googleapis.com/v1/places:searchNearby"
                    headers = {
                        "X-Goog-Api-Key": self.settings.google_maps_api_key,
                        "X-Goog-FieldMask": "places.displayName,places.location,places.shortFormattedAddress",
                    }
                    data = {
                        "includedTypes": [facility_type],
                        "maxResultCount": 3,
                        "locationRestriction": {
                            "circle": {
                                "center": {
                                    "latitude": coords["lat"],
                                    "longitude": coords["lng"]
                                },
                                "radius": 5000.0
                            }
                        }
                    }
                    with httpx.Client() as client:
                        resp = client.post(url, headers=headers, json=data, timeout=10.0)
                        if resp.status_code == 200:
                            places = resp.json().get("places", [])
                            facilities = []
                            for p in places:
                                facilities.append({
                                    "name": p.get("displayName", {}).get("text", "Unknown"),
                                    "lat": p.get("location", {}).get("latitude", 0),
                                    "lng": p.get("location", {}).get("longitude", 0),
                                    "address": p.get("shortFormattedAddress")
                                })
                            parsed["nearby_facilities"] = facilities
                except Exception as e:
                    print(f"Maps API Error: {e}")

        return parsed, f"Structured with Vertex AI {self.settings.vertex_fast_model}"

    def verify_completion_image(self, image_bytes: bytes, mime_type: str) -> tuple[bool, int, str]:
        if not self._genai_client:
            return True, 0, "Demo mode: AI not configured"

        try:
            from google.genai.types import Part
            part = Part.from_bytes(data=image_bytes, mime_type=mime_type)

            schema = {
                "type": "OBJECT",
                "properties": {
                    "is_valid_delivery": {"type": "BOOLEAN"},
                    "verified_people": {"type": "INTEGER"},
                    "reasoning": {"type": "STRING"}
                },
                "required": ["is_valid_delivery", "verified_people", "reasoning"]
            }

            prompt = (
                "You are an expert NGO auditor. Analyze this photo submitted as proof of an emergency relief delivery or rescue mission. "
                "1. Determine if this is a legitimate photo of aid distribution, rescue work, or disaster relief. If it is just a photo of text, a random object, a selfie without context, or unrelated to aid, set 'is_valid_delivery' to false. "
                "2. If valid, estimate the exact number of people actively receiving aid or being rescued in the photo. "
                "3. Provide a short reasoning for your decision."
            )

            response = self._genai_client.models.generate_content(
                model=self.settings.vertex_fast_model,
                contents=[prompt, part],
                config={
                    "temperature": 0,
                    "response_mime_type": "application/json",
                    "response_schema": schema,
                }
            )
            parsed = json.loads(response.text)
            return parsed.get("is_valid_delivery", True), parsed.get("verified_people", 0), parsed.get("reasoning", "")
        except Exception as e:
            logger.error("AI verification failed due to an exception.")
            return False, 0, "AI verification failed: Internal processing error"

    def _create_genai_client(self):
        if not genai or not HttpOptions or not self.settings.google_enabled:
            return None

        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")
        if self.settings.google_cloud_project:
            os.environ.setdefault("GOOGLE_CLOUD_PROJECT", self.settings.google_cloud_project)
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", self.settings.google_cloud_location)
        return genai.Client(http_options=HttpOptions(api_version="v1"))

    def _create_document_client(self):
        if not ClientOptions or not documentai or not self.settings.google_enabled or not self.settings.document_ai_processor_id:
            return None

        endpoint = f"{self.settings.document_ai_location}-documentai.googleapis.com"
        return documentai.DocumentProcessorServiceClient(
            client_options=ClientOptions(api_endpoint=endpoint)
        )
