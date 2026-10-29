"""Small document repository with atomic, optimistic multi-record writes."""
from __future__ import annotations
from copy import deepcopy
from threading import RLock
import httpx
from fastapi import HTTPException
from .config import Settings


class MemoryRepository:
    def __init__(self):
        self.rows: dict[tuple[str, str], dict] = {}
        self.lock = RLock()

    def get(self, kind: str, id: str):
        with self.lock:
            return deepcopy(self.rows.get((kind, id)))

    def list(self, kind: str, **filters):
        with self.lock:
            return [deepcopy(r) for (k, _), r in self.rows.items()
                    if k == kind and all(r['body'].get(f) == v for f, v in filters.items())]

    def write(self, changes: list[dict]):
        with self.lock:
            for change in changes:
                current = self.rows.get((change['kind'], change['id']))
                if (current['version'] if current else 0) != change['expected_version']:
                    raise HTTPException(409, 'This record changed. Refresh and try again.')
            for change in changes:
                self.rows[(change['kind'], change['id'])] = {
                    'id': change['id'], 'kind': change['kind'],
                    'body': deepcopy(change['body']), 'version': change['expected_version'] + 1,
                }


class SupabaseRepository:
    def __init__(self, settings: Settings):
        self.base = settings.supabase_url + '/rest/v1/'
        self.client = httpx.Client(headers={
            'apikey': settings.supabase_key, 'Authorization': 'Bearer ' + settings.supabase_key,
        }, timeout=20)

    def request(self, method, path, **kwargs):
        try:
            response = self.client.request(method, self.base + path, **kwargs)
            if response.status_code == 409 or (response.status_code >= 400 and 'revision_conflict' in response.text):
                raise HTTPException(409, 'This record changed. Refresh and try again.')
            response.raise_for_status()
            return response.json() if response.content else None
        except httpx.HTTPError:
            raise HTTPException(503, 'Database is temporarily unavailable') from None

    def get(self, kind, id):
        rows = self.request('GET', 'seva_records', params={'kind': 'eq.' + kind, 'id': 'eq.' + id, 'limit': 1})
        return rows[0] if rows else None

    def list(self, kind, **filters):
        rows, offset = [], 0
        while True:
            params = {'kind': 'eq.' + kind, 'order': 'id.asc', 'limit': 500, 'offset': offset}
            params.update({f'body->>{k}': 'eq.' + str(v) for k, v in filters.items()})
            page = self.request('GET', 'seva_records', params=params)
            rows.extend(page)
            if len(page) < 500:
                return rows
            offset += 500

    def write(self, changes):
        self.request('POST', 'rpc/seva_write_transaction', json={'changes': changes})


def change(kind, record, version=0):
    body = record.model_dump(mode='json') if hasattr(record, 'model_dump') else record
    return {'kind': kind, 'id': body['id'], 'body': body, 'expected_version': version}
