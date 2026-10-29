"""Provider boundary tests: no network calls, no secrets and no real reports."""
import os
import sys
import unittest
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi import HTTPException

os.environ['APP_MODE'] = 'demo'
os.environ['GROQ_API_KEY'] = ''
sys.path.insert(0, str(Path('backend').resolve()))
from app.services.intelligence import Intelligence


class IntelligenceBoundary(unittest.TestCase):
    def setUp(self):
        self.ai = Intelligence()
        self.ai.settings = replace(self.ai.settings, groq_key='synthetic-test-key')

    def response(self, content, status=200):
        return httpx.Response(status, request=httpx.Request('POST', 'https://api.groq.com'),
                              json={'choices': [{'message': {'content': content}}]})

    def test_structured_report_is_validated(self):
        content = '{"category":"water","urgency_level":6,"people_affected":4,"location_label":"Community centre","required_skills":["distribution"],"summary":"Clean water for four people"}'
        with patch('app.services.intelligence.httpx.post', return_value=self.response(content)):
            report, _, mode = self.ai.structure('Synthetic water report')
        self.assertEqual(mode, 'groq')
        self.assertEqual(report['people_affected'], 4)

    def test_invalid_urgency_falls_back_without_claiming_ai_success(self):
        with patch('app.services.intelligence.httpx.post', return_value=self.response('{"urgency_level":99}')):
            report, summary, mode = self.ai.structure('Synthetic report')
        self.assertEqual(report, {})
        self.assertEqual(mode, 'rules')
        self.assertIn('unavailable', summary)

    def test_non_object_image_response_returns_actionable_error(self):
        with patch('app.services.intelligence.httpx.post', return_value=self.response('[]')):
            with self.assertRaises(HTTPException) as caught:
                self.ai.read_image(b'synthetic', 'image/png')
        self.assertEqual(caught.exception.status_code, 503)

    def test_quota_failure_queues_photo_for_human_review(self):
        with patch('app.services.intelligence.httpx.post', return_value=self.response('{}', 429)):
            count, reason = self.ai.audit(b'synthetic', 'image/png')
        self.assertIsNone(count)
        self.assertIn('coordinator review', reason)

    def test_empty_transcription_does_not_create_invented_text(self):
        response = httpx.Response(200, request=httpx.Request('POST', 'https://api.groq.com'), json={'text': ''})
        with patch('app.services.intelligence.httpx.post', return_value=response):
            with self.assertRaises(HTTPException) as caught:
                self.ai.transcribe(b'synthetic', 'voice.webm', 'audio/webm')
        self.assertEqual(caught.exception.status_code, 503)


if __name__ == '__main__':
    unittest.main()
