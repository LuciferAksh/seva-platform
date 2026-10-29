"""Run with backend/.env.local configured; never print credentials or provider bodies.

Read-only database/model checks followed by one synthetic text extraction.
No incident, volunteer, media or email records are created.
"""
from __future__ import annotations

import sys
import httpx
from app.config import get_settings
from app.services.intelligence import Intelligence


def check_connections() -> int:
    try:
        settings = get_settings()
    except ValueError:
        print('FAIL: connected Supabase settings are missing or invalid.')
        return 1
    if settings.demo:
        print('FAIL: set APP_MODE=connected before checking cloud services.')
        return 1
    failures = []
    headers = {'apikey': settings.supabase_key,
               'Authorization': 'Bearer ' + settings.supabase_key}
    with httpx.Client(timeout=30) as client:
        try:
            response = client.get(settings.supabase_url + '/rest/v1/seva_records',
                                  headers=headers, params={'select': 'id', 'limit': 1})
            response.raise_for_status()
            if not isinstance(response.json(), list):
                raise ValueError()
            print('PASS: Supabase private records accessible to backend.')
            response = client.get(settings.supabase_url + '/storage/v1/bucket/' + settings.supabase_bucket,
                                  headers=headers)
            response.raise_for_status()
            if response.json().get('public') is not False:
                raise ValueError()
            print('PASS: private media bucket configured.')
        except (httpx.HTTPError, ValueError):
            failures.append('Supabase database/storage access')
        if not settings.groq_key:
            failures.append('Groq key missing')
        else:
            try:
                response = client.get('https://api.groq.com/openai/v1/models',
                                      headers={'Authorization': 'Bearer ' + settings.groq_key})
                response.raise_for_status()
                available = {m['id'] for m in response.json()['data']}
                for label, model in [('text', settings.text_model), ('vision', settings.vision_model),
                                     ('speech', settings.speech_model)]:
                    if model in available:
                        print('PASS: configured ' + label + ' model available.')
                    else:
                        failures.append(label + ' model unavailable to this Groq account')
                report, _, mode = Intelligence().structure(
                    'Synthetic connection test: 4 people need clean drinking water at a community centre. '
                    'No real incident or assistance requested.')
                if mode != 'groq' or report.get('category') != 'water' or report.get('people_affected') != 4:
                    failures.append('Groq structured text extraction')
                else:
                    print('PASS: live Groq structured text extraction.')
            except (httpx.HTTPError, ValueError, KeyError, TypeError):
                failures.append('Groq authentication/model discovery')
    if not settings.admin_emails:
        failures.append('coordinator email allowlist missing')
    if not settings.turnstile_secret:
        print('PENDING: public reporting needs Turnstile configuration.')
    if not settings.brevo_key or not settings.mail_sender:
        print('PENDING: operational email needs Brevo key and approved sender.')
    print('NOT TESTED: voice transcription, image quality, auth email delivery and browser flows.')
    for failure in failures:
        print('FAIL: ' + failure)
    return int(bool(failures))


if __name__ == '__main__':
    sys.exit(check_connections())
