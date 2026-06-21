"""End-to-end backend tests for CyberVault marketplace API."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://account-vault-41.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = ("admin@cybervault.io", "Admin@12345")
BUYER = ("buyer@test.com", "Test@12345")
SELLER = ("seller@test.com", "Test@12345")


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(s, email, password):
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    return r


@pytest.fixture(scope="session")
def admin_session():
    s = _session()
    r = _login(s, *ADMIN)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture
def buyer_session():
    s = _session()
    r = _login(s, *BUYER)
    assert r.status_code == 200, f"buyer login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture
def seller_session():
    s = _session()
    r = _login(s, *SELLER)
    assert r.status_code == 200, f"seller login failed: {r.status_code} {r.text}"
    return s


# ---------- Health / CORS ----------
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_cors_preflight(self):
        origin = BASE_URL
        r = requests.options(
            f"{API}/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        assert r.status_code in (200, 204)
        assert r.headers.get("access-control-allow-credentials", "").lower() == "true"
        assert r.headers.get("access-control-allow-origin") == origin


# ---------- Auth ----------
class TestAuth:
    def test_register_and_me(self):
        s = _session()
        email = f"test_{uuid.uuid4().hex[:10]}@test.com"
        r = s.post(f"{API}/auth/register", json={"email": email.upper(), "password": "Pass@1234", "name": "Tester"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == email  # lowercased
        assert "password_hash" not in body
        # Cookies set
        assert "access_token" in s.cookies.get_dict()
        assert "refresh_token" in s.cookies.get_dict()
        # /me
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == email

    def test_register_duplicate(self):
        s = _session()
        email = f"dup_{uuid.uuid4().hex[:8]}@test.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Pass@1234", "name": "Dup"})
        r2 = s.post(f"{API}/auth/register", json={"email": email, "password": "Pass@1234", "name": "Dup"})
        assert r2.status_code == 400

    def test_login_admin(self):
        s = _session()
        r = _login(s, *ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "admin"
        assert "access_token" in s.cookies.get_dict()

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self, buyer_session):
        r = buyer_session.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # access_token cookie should be cleared
        me = buyer_session.get(f"{API}/auth/me")
        assert me.status_code == 401

    def test_wrong_password_then_brute_force(self):
        # Use unique email so we don't lock real test accounts
        s = _session()
        email = f"brute_{uuid.uuid4().hex[:8]}@test.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "Right@1234", "name": "B"})
        s2 = _session()
        codes = []
        for _ in range(6):
            r = _login(s2, email, "wrong-pass")
            codes.append(r.status_code)
        # At least the first should be 401, and a later attempt should be 429
        assert 401 in codes
        assert 429 in codes, f"Expected 429 lockout but got: {codes}"


# ---------- Listings ----------
class TestListings:
    def test_listings_active(self):
        r = requests.get(f"{API}/listings")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 4
        for d in data:
            assert d["status"] == "active"

    def test_listings_filter_platform(self):
        r = requests.get(f"{API}/listings", params={"platform": "instagram"})
        assert r.status_code == 200
        for d in r.json():
            assert d["platform"] == "instagram"

    def test_listings_filter_category(self):
        r = requests.get(f"{API}/listings", params={"category": "account"})
        assert r.status_code == 200
        for d in r.json():
            assert d["category"] == "account"

    def test_featured(self):
        r = requests.get(f"{API}/listings/featured")
        assert r.status_code == 200
        assert len(r.json()) <= 6

    def test_listing_detail_has_seller_and_reviews(self):
        first = requests.get(f"{API}/listings").json()[0]
        r = requests.get(f"{API}/listings/{first['id']}")
        assert r.status_code == 200
        body = r.json()
        assert body["seller"] is not None
        assert "password_hash" not in body["seller"]
        assert isinstance(body["reviews"], list)

    def test_create_listing_unauth(self):
        r = requests.post(f"{API}/listings", json={
            "platform": "instagram", "category": "account",
            "title": "Should fail", "description": "no auth allowed here",
            "price": 10.0,
        })
        assert r.status_code == 401

    def test_create_listing_authed(self, buyer_session):
        r = buyer_session.post(f"{API}/listings", json={
            "platform": "instagram", "category": "account",
            "title": "TEST_buyer_listing", "description": "buyer trying to list",
            "price": 25.0,
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["seller_id"]
        # Verify via /me/listings
        my = buyer_session.get(f"{API}/me/listings")
        assert my.status_code == 200
        assert any(l["id"] == data["id"] for l in my.json())

    def test_pause_listing(self, seller_session):
        my = seller_session.get(f"{API}/me/listings").json()
        active = next((l for l in my if l["status"] == "active"), None)
        assert active is not None
        # Pause
        r = seller_session.patch(f"{API}/listings/{active['id']}/pause")
        assert r.status_code == 200
        assert r.json()["status"] == "paused"
        # Resume
        r = seller_session.patch(f"{API}/listings/{active['id']}/pause")
        assert r.json()["status"] == "active"


# ---------- Escrow E2E ----------
class TestEscrow:
    def test_full_escrow_flow(self, buyer_session, seller_session):
        # Pick the ~$95 twitter listing owned by seller
        listings = requests.get(f"{API}/listings", params={"platform": "twitter"}).json()
        listing = next((l for l in listings if 90 <= l["price"] <= 100), None)
        if not listing:
            # fall back to any cheap seller listing
            all_l = requests.get(f"{API}/listings").json()
            listing = min(all_l, key=lambda x: x["price"])

        price = float(listing["price"])
        buyer_before = buyer_session.get(f"{API}/auth/me").json()
        bal_before = buyer_before["balance"]

        if bal_before < price:
            # top up
            buyer_session.post(f"{API}/wallet/deposit", json={"amount": price - bal_before + 10, "method": "card"})
            buyer_before = buyer_session.get(f"{API}/auth/me").json()
            bal_before = buyer_before["balance"]

        # Create order
        r = buyer_session.post(f"{API}/orders", json={"listing_id": listing["id"]})
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["status"] == "awaiting_credentials"
        order_id = order["id"]

        # Buyer balance decreased / held increased
        buyer_after = buyer_session.get(f"{API}/auth/me").json()
        assert round(buyer_after["balance"], 2) == round(bal_before - price, 2)
        assert buyer_after["held_balance"] >= price

        # Listing sold
        lst = requests.get(f"{API}/listings/{listing['id']}").json()
        assert lst["status"] == "sold"

        # Seller submits credentials
        r = seller_session.post(f"{API}/orders/{order_id}/credentials", json={"credentials": "user: demo\npass: demo123"})
        assert r.status_code == 200, r.text
        # Verify status
        ord_check = seller_session.get(f"{API}/orders/{order_id}").json()
        assert ord_check["status"] == "credentials_submitted"
        assert ord_check["credentials"]

        # Seller balance before payout
        seller_before = seller_session.get(f"{API}/auth/me").json()
        seller_bal_before = seller_before["balance"]

        # Buyer confirms -> completed
        r = buyer_session.post(f"{API}/orders/{order_id}/confirm")
        assert r.status_code == 200, r.text
        final = buyer_session.get(f"{API}/orders/{order_id}").json()
        assert final["status"] == "completed"

        buyer_final = buyer_session.get(f"{API}/auth/me").json()
        # buyer held back to before-level
        assert round(buyer_final["held_balance"], 2) == round(buyer_before["held_balance"], 2)

        seller_final = seller_session.get(f"{API}/auth/me").json()
        assert round(seller_final["balance"], 2) == round(seller_bal_before + price, 2)

        # Transactions logged
        tx_buyer = buyer_session.get(f"{API}/wallet/transactions").json()
        tx_types = [t["type"] for t in tx_buyer]
        assert "escrow_hold" in tx_types
        assert "escrow_release" in tx_types
        tx_seller = seller_session.get(f"{API}/wallet/transactions").json()
        assert any(t["type"] == "payout" for t in tx_seller)

        # Save order_id for review test
        pytest.cybervault_completed_order = order_id
        pytest.cybervault_seller_id = listing["seller_id"]


# ---------- Reviews ----------
class TestReviews:
    def test_review_after_completion(self, buyer_session):
        order_id = getattr(pytest, "cybervault_completed_order", None)
        if not order_id:
            pytest.skip("escrow flow did not complete")
        r = buyer_session.post(f"{API}/orders/{order_id}/review", json={"rating": 5, "comment": "Excellent!"})
        assert r.status_code == 200, r.text
        # Cannot review twice
        r2 = buyer_session.post(f"{API}/orders/{order_id}/review", json={"rating": 4, "comment": "again"})
        assert r2.status_code == 400

    def test_review_uncompleted_order(self, buyer_session, seller_session):
        # Create a fresh order that is only awaiting_credentials
        # Ensure buyer has enough balance
        buyer_session.post(f"{API}/wallet/deposit", json={"amount": 300, "method": "card"})
        listings = requests.get(f"{API}/listings").json()
        # Use a fresh active listing
        active = next((l for l in listings if l["status"] == "active" and l["seller_id"] != buyer_session.get(f"{API}/auth/me").json()["id"]), None)
        if not active:
            pytest.skip("no active seller listing left")
        r = buyer_session.post(f"{API}/orders", json={"listing_id": active["id"]})
        assert r.status_code == 200
        order_id = r.json()["id"]
        rv = buyer_session.post(f"{API}/orders/{order_id}/review", json={"rating": 5, "comment": "ok"})
        assert rv.status_code == 400


# ---------- Chat ----------
class TestChat:
    def test_chat_flow_and_forbidden(self, buyer_session, seller_session):
        order_id = getattr(pytest, "cybervault_completed_order", None)
        if not order_id:
            pytest.skip("no order")
        r = buyer_session.post(f"{API}/orders/{order_id}/messages", json={"body": "hello seller"})
        assert r.status_code == 200
        r = seller_session.post(f"{API}/orders/{order_id}/messages", json={"body": "hi buyer"})
        assert r.status_code == 200
        msgs = buyer_session.get(f"{API}/orders/{order_id}/messages").json()
        assert len(msgs) >= 2

        # outsider forbidden
        s_other = _session()
        e = f"outsider_{uuid.uuid4().hex[:8]}@test.com"
        s_other.post(f"{API}/auth/register", json={"email": e, "password": "Pass@1234", "name": "X"})
        r = s_other.get(f"{API}/orders/{order_id}/messages")
        assert r.status_code == 403


# ---------- Dispute ----------
class TestDispute:
    def test_dispute_by_buyer(self, buyer_session, seller_session):
        # Need an order still in awaiting_credentials. Top-up buyer then place order.
        buyer_session.post(f"{API}/wallet/deposit", json={"amount": 500, "method": "card"})
        listings = requests.get(f"{API}/listings").json()
        me = buyer_session.get(f"{API}/auth/me").json()
        active = next((l for l in listings if l["status"] == "active" and l["seller_id"] != me["id"]), None)
        if not active:
            pytest.skip("no active listing for dispute test")
        r = buyer_session.post(f"{API}/orders", json={"listing_id": active["id"]})
        assert r.status_code == 200
        order_id = r.json()["id"]
        r = buyer_session.post(f"{API}/orders/{order_id}/dispute", json={"reason": "Seller is unresponsive!"})
        assert r.status_code == 200
        ord_doc = buyer_session.get(f"{API}/orders/{order_id}").json()
        assert ord_doc["status"] == "disputed"
        pytest.cybervault_disputed_order = order_id


# ---------- Wallet ----------
class TestWallet:
    def test_deposit_and_history(self, buyer_session):
        before = buyer_session.get(f"{API}/auth/me").json()["balance"]
        r = buyer_session.post(f"{API}/wallet/deposit", json={"amount": 100, "method": "card"})
        assert r.status_code == 200
        after = r.json()["balance"]
        assert round(after, 2) == round(before + 100, 2)
        txs = buyer_session.get(f"{API}/wallet/transactions").json()
        assert any(t["type"] == "deposit" for t in txs)
        # sorted desc by created_at
        if len(txs) >= 2:
            assert txs[0]["created_at"] >= txs[1]["created_at"]


# ---------- Admin ----------
class TestAdmin:
    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        s = r.json()
        for k in ("users", "active_listings", "orders", "disputes", "completed"):
            assert k in s

    def test_admin_orders_filter_disputed(self, admin_session):
        r = admin_session.get(f"{API}/admin/orders", params={"status": "disputed"})
        assert r.status_code == 200
        for o in r.json():
            assert o["status"] == "disputed"

    def test_admin_forbidden_for_non_admin(self, buyer_session):
        r = buyer_session.get(f"{API}/admin/stats")
        assert r.status_code == 403

    def test_admin_resolve_refund(self, admin_session, buyer_session):
        # Use disputed order from earlier
        order_id = getattr(pytest, "cybervault_disputed_order", None)
        if not order_id:
            pytest.skip("no disputed order")
        buyer_before = buyer_session.get(f"{API}/auth/me").json()
        order = admin_session.get(f"{API}/admin/orders").json()
        order = next((o for o in order if o["id"] == order_id), None)
        price = float(order["price"])
        r = admin_session.post(f"{API}/admin/orders/{order_id}/resolve", params={"decision": "refund"})
        assert r.status_code == 200, r.text
        buyer_after = buyer_session.get(f"{API}/auth/me").json()
        # buyer balance +price, held -price
        assert round(buyer_after["balance"], 2) == round(buyer_before["balance"] + price, 2)
        assert round(buyer_after["held_balance"], 2) == round(buyer_before["held_balance"] - price, 2)
        # listing reactivated
        ord_doc = admin_session.get(f"{API}/admin/orders").json()
        ord_doc = next(o for o in ord_doc if o["id"] == order_id)
        listing = requests.get(f"{API}/listings/{ord_doc['listing_id']}").json()
        assert listing["status"] == "active"


# ---------- Seeding ----------
class TestSeed:
    def test_seeded_accounts_exist(self):
        for email, password in (ADMIN, BUYER, SELLER):
            s = _session()
            r = _login(s, email, password)
            assert r.status_code == 200, f"{email} should be seeded"
        # seller should have listings
        s = _session()
        _login(s, *SELLER)
        my = s.get(f"{API}/me/listings").json()
        assert len(my) >= 4
