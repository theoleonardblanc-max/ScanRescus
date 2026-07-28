"""Backend tests for Component Detector API.

Covers:
- GET  /api/            (health)
- POST /api/analyze     (real OpenAI gpt-5.4 vision call via emergentintegrations)
- GET  /api/history     (list sorted desc)
- PUT  /api/analysis/{id}   (update fields)
- DELETE /api/analysis/{id} (remove)
"""
import base64
import os
import time
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if 'REACT_APP_BACKEND_URL' in os.environ else None
if not BASE_URL:
    # fall back to frontend .env
    env_path = Path('/app/frontend/.env')
    for line in env_path.read_text().splitlines():
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
            break

assert BASE_URL, 'REACT_APP_BACKEND_URL not set'

FIXTURE = Path('/app/test_fixtures/cpu.jpg')


@pytest.fixture(scope='session')
def api():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def image_data_url():
    assert FIXTURE.exists(), f'Missing fixture image at {FIXTURE}'
    raw = FIXTURE.read_bytes()
    b64 = base64.b64encode(raw).decode()
    return f'data:image/jpeg;base64,{b64}'


# -------- Health --------
def test_root_health(api):
    r = api.get(f'{BASE_URL}/api/')
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get('message') == 'Component Detector API'


# -------- Analyze (real AI call) --------
@pytest.fixture(scope='session')
def analyzed_item(api, image_data_url):
    r = api.post(f'{BASE_URL}/api/analyze', json={'image_base64': image_data_url}, timeout=180)
    assert r.status_code == 200, f'analyze failed: {r.status_code} {r.text[:500]}'
    data = r.json()
    return data


def test_analyze_returns_expected_shape(analyzed_item):
    for key in ('id', 'name', 'category', 'price_estimate', 'description', 'confidence', 'image_base64'):
        assert key in analyzed_item, f'missing field {key}'
    assert isinstance(analyzed_item['id'], str) and analyzed_item['id']
    assert isinstance(analyzed_item['name'], str) and analyzed_item['name'].strip()
    assert isinstance(analyzed_item['description'], str) and analyzed_item['description'].strip()
    # confidence should be one of expected French tokens (or non-empty at minimum)
    assert analyzed_item['confidence'] in ('Élevée', 'Moyenne', 'Faible', '') or analyzed_item['confidence']


def test_analyze_name_not_placeholder(analyzed_item):
    # Ensure it really identified something (not fallback error)
    assert analyzed_item['name'].lower() != 'composant inconnu', (
        f"AI could not identify component or returned fallback: {analyzed_item}"
    )


def test_analyze_price_is_euros(analyzed_item):
    price = analyzed_item.get('price_estimate', '')
    # Should look like an EUR range, tolerate any string but require euro symbol or 'eur'
    assert '€' in price or 'eur' in price.lower(), f'unexpected price format: {price!r}'


# -------- History --------
def test_history_contains_item(api, analyzed_item):
    r = api.get(f'{BASE_URL}/api/history')
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 1
    ids = [i['id'] for i in items]
    assert analyzed_item['id'] in ids
    # sorted newest first: created_at descending
    if len(items) >= 2:
        assert items[0]['created_at'] >= items[1]['created_at']


# -------- Update --------
def test_update_analysis_persists(api, analyzed_item):
    aid = analyzed_item['id']
    payload = {
        'name': 'TEST_Composant Modifié',
        'price_estimate': '42 - 84 €',
        'category': 'TEST_Catégorie',
        'description': 'TEST description modifiée.',
    }
    r = api.put(f'{BASE_URL}/api/analysis/{aid}', json=payload)
    assert r.status_code == 200, r.text
    updated = r.json()
    for k, v in payload.items():
        assert updated[k] == v, f'field {k} not updated: got {updated[k]!r}'

    # Verify persistence via history GET
    r2 = api.get(f'{BASE_URL}/api/history')
    assert r2.status_code == 200
    found = next((i for i in r2.json() if i['id'] == aid), None)
    assert found is not None
    assert found['name'] == payload['name']
    assert found['price_estimate'] == payload['price_estimate']


def test_update_invalid_id(api):
    r = api.put(f'{BASE_URL}/api/analysis/not-an-id', json={'name': 'x'})
    assert r.status_code == 400


# -------- Delete --------
def test_delete_analysis(api, analyzed_item):
    aid = analyzed_item['id']
    r = api.delete(f'{BASE_URL}/api/analysis/{aid}')
    assert r.status_code == 200
    assert r.json().get('success') is True

    # Ensure gone
    r2 = api.get(f'{BASE_URL}/api/history')
    ids = [i['id'] for i in r2.json()]
    assert aid not in ids
