"""Backend tests for CompoScan (iteration_2 - with auth).

Covers:
- GET  /api/            (health)
- POST /api/auth/register / login / me / logout
- POST /api/auth/google/session (invalid session_id handling + manual DB session)
- POST /api/analyze     (auth-gated, real OpenAI gpt-5.4 vision call)
- GET  /api/history     (owner-scoped)
- POST /api/analysis/{id}/offers (real AI offers, 4 items)
- PUT  /api/analysis/{id}   (update fields, own only)
- DELETE /api/analysis/{id} (own only, 404 if not found)
- GET  /api/files/{path}   (auth via cookie or ?auth= token)
"""
import base64
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    env_path = Path('/app/frontend/.env')
    for line in env_path.read_text().splitlines():
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip('/')

FIXTURE = Path('/app/test_fixtures/cpu.jpg')

TEST_EMAIL = f"test_{uuid.uuid4().hex[:8]}@compotest.example.com"
TEST_PASSWORD = "test1234"
TEST_NAME = "Test User"


# ---------- Fixtures ----------
@pytest.fixture(scope='session')
def image_data_url():
    assert FIXTURE.exists(), f'Missing fixture image at {FIXTURE}'
    raw = FIXTURE.read_bytes()
    b64 = base64.b64encode(raw).decode()
    return f'data:image/jpeg;base64,{b64}'


@pytest.fixture(scope='session')
def anon():
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    return s


@pytest.fixture(scope='session')
def auth_client():
    """Register a new user and return an authenticated session with cookie set."""
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    r = s.post(f'{BASE_URL}/api/auth/register', json={
        'email': TEST_EMAIL, 'password': TEST_PASSWORD, 'name': TEST_NAME
    })
    assert r.status_code == 200, f'register failed: {r.status_code} {r.text}'
    data = r.json()
    assert data['email'] == TEST_EMAIL
    assert data['name'] == TEST_NAME
    assert data.get('user_id')
    # session_token set as cookie AND returned in body
    assert 'session_token' in data
    return s, data


@pytest.fixture(scope='session')
def other_client():
    """A second user for cross-user isolation tests."""
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    email = f"other_{uuid.uuid4().hex[:8]}@compotest.example.com"
    r = s.post(f'{BASE_URL}/api/auth/register', json={
        'email': email, 'password': 'password9', 'name': 'Other User'
    })
    assert r.status_code == 200, r.text
    return s, r.json()


# ---------- Health ----------
def test_root_health(anon):
    r = anon.get(f'{BASE_URL}/api/')
    assert r.status_code == 200
    assert r.json().get('message') == 'ScanRescue API'


# ---------- Auth ----------
def test_register_and_me(auth_client):
    s, user = auth_client
    r = s.get(f'{BASE_URL}/api/auth/me')
    assert r.status_code == 200, r.text
    me = r.json()
    assert me['email'] == user['email']
    assert me['user_id'] == user['user_id']
    assert 'password_hash' not in me


def test_register_duplicate(anon, auth_client):
    _, user = auth_client
    r = anon.post(f'{BASE_URL}/api/auth/register', json={
        'email': user['email'], 'password': 'x123456', 'name': 'dup'
    })
    assert r.status_code == 400


def test_login_success_and_wrong_password(anon, auth_client):
    _, user = auth_client
    r = anon.post(f'{BASE_URL}/api/auth/login', json={
        'email': user['email'], 'password': TEST_PASSWORD
    })
    assert r.status_code == 200
    assert r.json()['user_id'] == user['user_id']

    r2 = anon.post(f'{BASE_URL}/api/auth/login', json={
        'email': user['email'], 'password': 'wrongpass'
    })
    assert r2.status_code == 401


def test_me_requires_auth():
    r = requests.get(f'{BASE_URL}/api/auth/me')
    assert r.status_code == 401


def test_google_session_missing_id(anon):
    r = anon.post(f'{BASE_URL}/api/auth/google/session')
    assert r.status_code == 400


def test_google_session_invalid_id(anon):
    r = anon.post(f'{BASE_URL}/api/auth/google/session',
                  headers={'X-Session-ID': 'definitely-not-valid-xyz'})
    assert r.status_code == 401


def test_bearer_token_works(auth_client):
    _, user = auth_client
    # Use returned session_token as Bearer with a fresh session (no cookies)
    fresh = requests.Session()
    r = fresh.get(f'{BASE_URL}/api/auth/me',
                  headers={'Authorization': f'Bearer {user["session_token"]}'})
    assert r.status_code == 200
    assert r.json()['user_id'] == user['user_id']


# ---------- Analyze (auth-gated) ----------
def test_analyze_requires_auth(image_data_url):
    fresh = requests.Session()
    r = fresh.post(f'{BASE_URL}/api/analyze', json={'image_base64': image_data_url},
                   headers={'Content-Type': 'application/json'})
    assert r.status_code == 401


@pytest.fixture(scope='session')
def analyzed_item(auth_client, image_data_url):
    s, _ = auth_client
    r = s.post(f'{BASE_URL}/api/analyze', json={'image_base64': image_data_url}, timeout=180)
    assert r.status_code == 200, f'analyze failed: {r.status_code} {r.text[:500]}'
    return r.json()


def test_analyze_returns_expected_shape(analyzed_item, auth_client):
    _, user = auth_client
    for key in ('id', 'name', 'category', 'price_estimate', 'description',
                'confidence', 'image_url', 'storage_path', 'user_id'):
        assert key in analyzed_item, f'missing field {key}'
    assert analyzed_item['user_id'] == user['user_id']
    assert isinstance(analyzed_item['id'], str) and analyzed_item['id']
    assert analyzed_item['name'].strip()
    # image should be stored in object storage, not base64 in body
    assert analyzed_item['image_url'].startswith('/api/files/')
    assert 'image_base64' not in analyzed_item


def test_analyze_name_not_placeholder(analyzed_item):
    assert analyzed_item['name'].lower() != 'composant inconnu', (
        f"AI could not identify component or returned fallback: {analyzed_item}"
    )


def test_analyze_price_is_euros(analyzed_item):
    price = analyzed_item.get('price_estimate', '')
    assert '€' in price or 'eur' in price.lower(), f'unexpected price format: {price!r}'


# ---------- Files endpoint ----------
def test_files_endpoint_serves_image(auth_client, analyzed_item):
    s, user = auth_client
    path = analyzed_item['image_url'].replace('/api/files/', '')
    # cookie-based
    r = s.get(f'{BASE_URL}/api/files/{path}')
    assert r.status_code == 200
    assert len(r.content) > 100
    assert r.headers.get('content-type', '').startswith('image/')
    # ?auth= token-based (simulates <img> without cookie)
    fresh = requests.Session()
    r2 = fresh.get(f'{BASE_URL}/api/files/{path}?auth={user["session_token"]}')
    assert r2.status_code == 200
    assert len(r2.content) > 100


def test_files_requires_auth(analyzed_item):
    path = analyzed_item['image_url'].replace('/api/files/', '')
    r = requests.get(f'{BASE_URL}/api/files/{path}')
    assert r.status_code == 401


# ---------- History (user-scoped) ----------
def test_history_contains_own_item(auth_client, analyzed_item):
    s, _ = auth_client
    r = s.get(f'{BASE_URL}/api/history')
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 1
    ids = [i['id'] for i in items]
    assert analyzed_item['id'] in ids
    if len(items) >= 2:
        assert items[0]['created_at'] >= items[1]['created_at']


def test_history_isolated_per_user(other_client, analyzed_item):
    s, _ = other_client
    r = s.get(f'{BASE_URL}/api/history')
    assert r.status_code == 200
    ids = [i['id'] for i in r.json()]
    assert analyzed_item['id'] not in ids, "cross-user leak in /api/history"


# ---------- Offers (real AI) ----------
def test_offers_generates_four_realistic(auth_client, analyzed_item):
    s, _ = auth_client
    r = s.post(f'{BASE_URL}/api/analysis/{analyzed_item["id"]}/offers', timeout=180)
    assert r.status_code == 200, r.text
    data = r.json()
    offers = data.get('offers')
    assert isinstance(offers, list) and len(offers) == 4, f'expected 4 offers, got {offers}'
    for o in offers:
        for k in ('seller', 'price', 'quality', 'rating', 'note'):
            assert k in o, f'offer missing {k}: {o}'
        assert str(o['seller']).strip()
        assert str(o['price']).strip()


def test_offers_requires_ownership(other_client, analyzed_item):
    s, _ = other_client
    r = s.post(f'{BASE_URL}/api/analysis/{analyzed_item["id"]}/offers')
    assert r.status_code == 404


# ---------- Update ----------
def test_update_persists(auth_client, analyzed_item):
    s, _ = auth_client
    aid = analyzed_item['id']
    payload = {
        'name': 'TEST_Composant Modifié',
        'price_estimate': '42 - 84 €',
        'category': 'TEST_Catégorie',
        'description': 'TEST description modifiée.',
    }
    r = s.put(f'{BASE_URL}/api/analysis/{aid}', json=payload)
    assert r.status_code == 200, r.text
    updated = r.json()
    for k, v in payload.items():
        assert updated[k] == v

    r2 = s.get(f'{BASE_URL}/api/history')
    found = next((i for i in r2.json() if i['id'] == aid), None)
    assert found is not None
    assert found['name'] == payload['name']


def test_update_other_user_forbidden(other_client, analyzed_item):
    s, _ = other_client
    r = s.put(f'{BASE_URL}/api/analysis/{analyzed_item["id"]}', json={'name': 'hack'})
    # can't update someone else's, so lookup after returns 404
    assert r.status_code == 404


# ---------- Delete ----------
def test_delete_own_and_404_when_missing(auth_client, analyzed_item):
    s, _ = auth_client
    aid = analyzed_item['id']
    r = s.delete(f'{BASE_URL}/api/analysis/{aid}')
    assert r.status_code == 200

    r2 = s.delete(f'{BASE_URL}/api/analysis/{aid}')
    assert r2.status_code == 404

    r3 = s.get(f'{BASE_URL}/api/history')
    ids = [i['id'] for i in r3.json()]
    assert aid not in ids


# ---------- Logout ----------
def test_logout_clears_session(auth_client):
    s, _ = auth_client
    r = s.post(f'{BASE_URL}/api/auth/logout')
    assert r.status_code == 200
    r2 = s.get(f'{BASE_URL}/api/auth/me')
    assert r2.status_code == 401


# ---------- Iteration 3: Stats / Demo / Favorite / Share / Public ----------
@pytest.fixture(scope='module')
def iter3_client():
    """Fresh user for iteration_3 tests (kept independent from session-scoped auth_client)."""
    s = requests.Session()
    s.headers.update({'Content-Type': 'application/json'})
    email = f"iter3_{uuid.uuid4().hex[:8]}@compotest.example.com"
    r = s.post(f'{BASE_URL}/api/auth/register', json={
        'email': email, 'password': 'test1234', 'name': 'Iter3 User'
    })
    assert r.status_code == 200, r.text
    return s, r.json()


@pytest.fixture(scope='module')
def iter3_analysis(iter3_client, image_data_url):
    s, _ = iter3_client
    r = s.post(f'{BASE_URL}/api/analyze', json={'image_base64': image_data_url}, timeout=180)
    assert r.status_code == 200, f'analyze failed: {r.status_code} {r.text[:500]}'
    return r.json()


def test_stats_requires_auth():
    r = requests.get(f'{BASE_URL}/api/stats')
    assert r.status_code == 401


def test_stats_returns_expected_shape(iter3_client, iter3_analysis):
    s, _ = iter3_client
    r = s.get(f'{BASE_URL}/api/stats')
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ('count', 'total_value', 'favorites', 'categories'):
        assert key in data, f'missing {key}'
    assert isinstance(data['count'], int) and data['count'] >= 1
    assert isinstance(data['total_value'], (int, float)) and data['total_value'] >= 0
    assert isinstance(data['favorites'], int)
    assert isinstance(data['categories'], dict)


def test_favorite_toggle_persists_and_updates_stats(iter3_client, iter3_analysis):
    s, _ = iter3_client
    aid = iter3_analysis['id']
    # Read initial stats
    stats_before = s.get(f'{BASE_URL}/api/stats').json()
    fav_before = stats_before['favorites']

    # Toggle favorite ON
    r = s.put(f'{BASE_URL}/api/analysis/{aid}', json={'is_favorite': True})
    assert r.status_code == 200, r.text
    updated = r.json()
    assert updated['is_favorite'] is True

    # Verify persistence via history
    hist = s.get(f'{BASE_URL}/api/history').json()
    found = next((i for i in hist if i['id'] == aid), None)
    assert found is not None and found['is_favorite'] is True

    # Verify stats reflects the change
    stats_after = s.get(f'{BASE_URL}/api/stats').json()
    assert stats_after['favorites'] == fav_before + 1

    # Toggle OFF
    r2 = s.put(f'{BASE_URL}/api/analysis/{aid}', json={'is_favorite': False})
    assert r2.status_code == 200
    assert r2.json()['is_favorite'] is False


def test_update_price_recomputes_price_value(iter3_client, iter3_analysis):
    s, _ = iter3_client
    aid = iter3_analysis['id']
    r = s.put(f'{BASE_URL}/api/analysis/{aid}', json={'price_estimate': '20 - 40 €'})
    assert r.status_code == 200
    doc = r.json()
    assert doc.get('price_value') == 30.0, f'expected 30.0 got {doc.get("price_value")}'


def test_demo_endpoint_analyzes_sample(iter3_client):
    """POST /api/analyze/demo downloads server-side image, runs real gpt-5.4 vision, saves + returns."""
    s, _ = iter3_client
    r = s.post(f'{BASE_URL}/api/analyze/demo', timeout=180)
    assert r.status_code == 200, f'demo failed: {r.status_code} {r.text[:500]}'
    doc = r.json()
    for key in ('id', 'name', 'category', 'price_estimate', 'description', 'confidence', 'image_url', 'user_id'):
        assert key in doc, f'demo missing {key}'
    assert doc['name'].strip() and doc['name'].lower() != 'composant inconnu', (
        f'demo AI did not identify a component: {doc}'
    )
    # Should be saved -> visible in history
    hist = s.get(f'{BASE_URL}/api/history').json()
    ids = [i['id'] for i in hist]
    assert doc['id'] in ids


def test_demo_requires_auth():
    fresh = requests.Session()
    r = fresh.post(f'{BASE_URL}/api/analyze/demo')
    assert r.status_code == 401


def test_share_returns_share_id_and_is_stable(iter3_client, iter3_analysis):
    s, _ = iter3_client
    aid = iter3_analysis['id']
    r = s.post(f'{BASE_URL}/api/analysis/{aid}/share')
    assert r.status_code == 200, r.text
    sid1 = r.json().get('share_id')
    assert isinstance(sid1, str) and len(sid1) >= 6
    # Second call must return the SAME share_id (stable link)
    r2 = s.post(f'{BASE_URL}/api/analysis/{aid}/share')
    assert r2.status_code == 200
    assert r2.json()['share_id'] == sid1


def test_share_other_user_forbidden(other_client, iter3_analysis):
    s, _ = other_client
    r = s.post(f'{BASE_URL}/api/analysis/{iter3_analysis["id"]}/share')
    assert r.status_code == 404


def test_public_component_is_readable_without_auth(iter3_client, iter3_analysis):
    s, _ = iter3_client
    # Ensure share exists
    share = s.post(f'{BASE_URL}/api/analysis/{iter3_analysis["id"]}/share').json()
    share_id = share['share_id']

    # Anonymous access
    anon = requests.Session()
    r = anon.get(f'{BASE_URL}/api/public/component/{share_id}')
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ('name', 'category', 'price_estimate', 'description', 'confidence', 'image_url'):
        assert key in data
    assert data['name'].strip()
    # image_url must point at public image route (or empty if storage failed)
    if data['image_url']:
        assert data['image_url'] == f'/api/public/image/{share_id}'


def test_public_component_unknown_share_id_404():
    anon = requests.Session()
    r = anon.get(f'{BASE_URL}/api/public/component/does-not-exist-xyz')
    assert r.status_code == 404


def test_public_image_serves_bytes_without_auth(iter3_client, iter3_analysis):
    s, _ = iter3_client
    share = s.post(f'{BASE_URL}/api/analysis/{iter3_analysis["id"]}/share').json()
    share_id = share['share_id']

    anon = requests.Session()
    r = anon.get(f'{BASE_URL}/api/public/image/{share_id}')
    assert r.status_code == 200, r.text
    assert len(r.content) > 100
    assert r.headers.get('content-type', '').startswith('image/')


def test_public_image_unknown_share_id_404():
    anon = requests.Session()
    r = anon.get(f'{BASE_URL}/api/public/image/does-not-exist-xyz')
    assert r.status_code == 404

