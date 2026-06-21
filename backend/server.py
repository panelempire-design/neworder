"""CyberVault Marketplace API."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from auth_utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    set_session_cookie,
    clear_auth_cookies,
    get_current_user,
    require_admin,
    SESSION_TTL,
)
from models import (
    RegisterIn, LoginIn, GoogleSessionIn,
    User, Listing, ListingIn,
    OrderCreateIn, CredentialsIn, DisputeIn, Order,
    MessageIn, Message,
    ReviewIn, Review,
    FundsIn, Transaction,
    now_iso, new_id,
)

# ---- DB ----
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---- App ----
app = FastAPI(title="CyberVault Marketplace")
api = APIRouter(prefix="/api")

EMERGENT_SESSION_DATA_URL = (
    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("cybervault")


# ============== Helpers ==============
async def _user_dep(request: Request) -> dict:
    return await get_current_user(request, db)


async def _admin_dep(request: Request) -> dict:
    return await require_admin(request, db)


def _public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "avatar": u.get("avatar"),
        "role": u.get("role", "user"),
        "balance": round(float(u.get("balance", 0.0)), 2),
        "held_balance": round(float(u.get("held_balance", 0.0)), 2),
        "rating": round(float(u.get("rating", 0.0)), 2),
        "rating_count": u.get("rating_count", 0),
        "auth_method": u.get("auth_method", "password"),
        "created_at": u.get("created_at"),
    }


async def _log_tx(user_id: str, type_: str, amount: float, note: str = "", order_id: Optional[str] = None):
    tx = Transaction(
        user_id=user_id, type=type_, amount=round(amount, 2), note=note, order_id=order_id
    ).model_dump()
    await db.transactions.insert_one(tx)
    return tx


def _touch(order_id: str, event: str):
    return {
        "$push": {"timeline": {"event": event, "at": now_iso()}},
        "$set": {"updated_at": now_iso()},
    }


# ============== Auth ==============
@api.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        id=new_id("usr"),
        email=email,
        name=payload.name.strip(),
        password_hash=None,
        auth_method="password",
    ).model_dump()
    user["password_hash"] = hash_password(payload.password)
    await db.users.insert_one(user)
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return _public_user(user)


@api.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = request.client.host if request.client else "?"
    key = f"{ip}:{email}"

    # brute force lockout
    attempt = await db.login_attempts.find_one({"identifier": key}, {"_id": 0})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("locked_until"):
        locked_until = attempt["locked_until"]
        if isinstance(locked_until, str):
            locked_until = datetime.fromisoformat(locked_until)
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > now:
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash") or ""):
        new_count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"$set": {"identifier": key, "count": new_count, "updated_at": now.isoformat()}}
        if new_count >= 5:
            update["$set"]["locked_until"] = (now + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": key}, update, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": key})
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return _public_user(user)


@api.post("/auth/google-session")
async def google_session(payload: GoogleSessionIn, response: Response):
    """Exchange Emergent OAuth session_id for a server session."""
    async with httpx.AsyncClient(timeout=15) as h:
        try:
            r = await h.get(
                EMERGENT_SESSION_DATA_URL,
                headers={"X-Session-ID": payload.session_id},
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Auth service error: {e}")
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = r.json()
    email = data["email"].lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        user = User(
            id=new_id("usr"),
            email=email,
            name=data.get("name") or email.split("@")[0],
            avatar=data.get("picture"),
            google_user_id=data.get("id"),
            auth_method="google",
        ).model_dump()
        user["password_hash"] = None
        await db.users.insert_one(user)
    else:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "avatar": data.get("picture") or user.get("avatar"),
                "google_user_id": data.get("id"),
            }},
        )
        user = await db.users.find_one({"id": user["id"]})

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + SESSION_TTL
    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user["id"],
            "expires_at": expires_at.isoformat(),
            "created_at": now_iso(),
        }},
        upsert=True,
    )
    set_session_cookie(response, session_token)
    return _public_user(user)


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(_user_dep)):
    return _public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    import jwt
    from auth_utils import get_jwt_secret, JWT_ALGORITHM
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"])
        new_refresh = create_refresh_token(user["id"])
        set_auth_cookies(response, access, new_refresh)
        return _public_user(user)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ============== Listings ==============
@api.get("/listings")
async def list_listings(
    platform: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = Query(50, le=100),
):
    flt = {"status": "active"}
    if platform:
        flt["platform"] = platform
    if category:
        flt["category"] = category
    if q:
        flt["title"] = {"$regex": q, "$options": "i"}
    if min_price is not None or max_price is not None:
        pr = {}
        if min_price is not None:
            pr["$gte"] = min_price
        if max_price is not None:
            pr["$lte"] = max_price
        flt["price"] = pr
    docs = await db.listings.find(flt, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return docs


@api.get("/listings/featured")
async def featured():
    docs = await db.listings.find({"status": "active"}, {"_id": 0}).sort("created_at", -1).limit(6).to_list(6)
    return docs


@api.get("/listings/{listing_id}")
async def get_listing(listing_id: str):
    doc = await db.listings.find_one({"id": listing_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    reviews = await db.reviews.find({"seller_id": doc["seller_id"]}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    seller = await db.users.find_one({"id": doc["seller_id"]}, {"_id": 0, "password_hash": 0})
    doc["seller"] = _public_user(seller) if seller else None
    doc["reviews"] = reviews
    return doc


@api.post("/listings")
async def create_listing(payload: ListingIn, user: dict = Depends(_user_dep)):
    obj = Listing(
        **payload.model_dump(),
        seller_id=user["id"],
        seller_name=user["name"],
    ).model_dump()
    await db.listings.insert_one(obj)
    obj.pop("_id", None)
    return obj


@api.get("/me/listings")
async def my_listings(user: dict = Depends(_user_dep)):
    docs = await db.listings.find({"seller_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api.patch("/listings/{listing_id}/pause")
async def pause_listing(listing_id: str, user: dict = Depends(_user_dep)):
    doc = await db.listings.find_one({"id": listing_id})
    if not doc or doc["seller_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Not found")
    new_status = "paused" if doc["status"] == "active" else "active"
    await db.listings.update_one({"id": listing_id}, {"$set": {"status": new_status}})
    return {"status": new_status}


@api.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str, user: dict = Depends(_user_dep)):
    doc = await db.listings.find_one({"id": listing_id})
    if not doc or (doc["seller_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=404, detail="Not found")
    await db.listings.update_one({"id": listing_id}, {"$set": {"status": "removed"}})
    return {"ok": True}


# ============== Orders / Escrow ==============
@api.post("/orders")
async def create_order(payload: OrderCreateIn, user: dict = Depends(_user_dep)):
    listing = await db.listings.find_one({"id": payload.listing_id}, {"_id": 0})
    if not listing or listing["status"] != "active":
        raise HTTPException(status_code=404, detail="Listing not available")
    if listing["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own listing")
    price = float(listing["price"])
    buyer = await db.users.find_one({"id": user["id"]})
    if (buyer.get("balance", 0.0)) < price:
        raise HTTPException(status_code=402, detail="Insufficient balance. Please add funds.")

    # Move balance -> held
    await db.users.update_one(
        {"id": buyer["id"]},
        {"$inc": {"balance": -price, "held_balance": price}},
    )
    order = Order(
        listing_id=listing["id"],
        listing_title=listing["title"],
        listing_image=listing.get("image_url"),
        platform=listing["platform"],
        price=price,
        buyer_id=buyer["id"],
        buyer_name=buyer["name"],
        seller_id=listing["seller_id"],
        seller_name=listing["seller_name"],
        status="awaiting_credentials",
        timeline=[
            {"event": "order_created", "at": now_iso()},
            {"event": "funds_held_in_escrow", "at": now_iso()},
        ],
    ).model_dump()
    await db.orders.insert_one(order)
    await db.listings.update_one({"id": listing["id"]}, {"$set": {"status": "sold"}})
    await _log_tx(buyer["id"], "escrow_hold", -price, f"Escrow for {listing['title']}", order["id"])
    order.pop("_id", None)
    return order


@api.get("/orders")
async def list_orders(user: dict = Depends(_user_dep), role: str = "all"):
    flt = {}
    if role == "buyer":
        flt["buyer_id"] = user["id"]
    elif role == "seller":
        flt["seller_id"] = user["id"]
    else:
        flt["$or"] = [{"buyer_id": user["id"]}, {"seller_id": user["id"]}]
    docs = await db.orders.find(flt, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(_user_dep)):
    doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if user["id"] not in (doc["buyer_id"], doc["seller_id"]) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return doc


@api.post("/orders/{order_id}/credentials")
async def submit_credentials(order_id: str, payload: CredentialsIn, user: dict = Depends(_user_dep)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only seller can submit credentials")
    if doc["status"] != "awaiting_credentials":
        raise HTTPException(status_code=400, detail="Cannot submit at this stage")
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"credentials": payload.credentials, "status": "credentials_submitted"},
         "$push": {"timeline": {"event": "credentials_submitted", "at": now_iso()}}},
    )
    return {"ok": True}


@api.post("/orders/{order_id}/confirm")
async def confirm_order(order_id: str, user: dict = Depends(_user_dep)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["buyer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only buyer can confirm")
    if doc["status"] != "credentials_submitted":
        raise HTTPException(status_code=400, detail="Seller has not submitted credentials yet")
    price = float(doc["price"])
    # Release escrow
    await db.users.update_one(
        {"id": doc["buyer_id"]}, {"$inc": {"held_balance": -price}}
    )
    await db.users.update_one(
        {"id": doc["seller_id"]}, {"$inc": {"balance": price}}
    )
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "completed", "updated_at": now_iso()},
         "$push": {"timeline": {"event": "buyer_confirmed_escrow_released", "at": now_iso()}}},
    )
    await _log_tx(doc["buyer_id"], "escrow_release", -price, f"Released for {doc['listing_title']}", order_id)
    await _log_tx(doc["seller_id"], "payout", price, f"Payout for {doc['listing_title']}", order_id)
    return {"ok": True}


@api.post("/orders/{order_id}/dispute")
async def dispute_order(order_id: str, payload: DisputeIn, user: dict = Depends(_user_dep)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if user["id"] not in (doc["buyer_id"], doc["seller_id"]):
        raise HTTPException(status_code=403, detail="Forbidden")
    if doc["status"] in ("completed", "cancelled", "refunded"):
        raise HTTPException(status_code=400, detail="Order already finalized")
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "disputed", "dispute_reason": payload.reason, "updated_at": now_iso()},
         "$push": {"timeline": {"event": f"dispute_opened_by_{user['id']}", "at": now_iso()}}},
    )
    return {"ok": True}


# ============== Chat ==============
@api.get("/orders/{order_id}/messages")
async def get_messages(order_id: str, user: dict = Depends(_user_dep)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if user["id"] not in (doc["buyer_id"], doc["seller_id"]) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    msgs = await db.messages.find({"order_id": order_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs


@api.post("/orders/{order_id}/messages")
async def send_message(order_id: str, payload: MessageIn, user: dict = Depends(_user_dep)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if user["id"] not in (doc["buyer_id"], doc["seller_id"]) and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    msg = Message(
        order_id=order_id,
        sender_id=user["id"],
        sender_name=user["name"],
        body=payload.body,
    ).model_dump()
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return msg


# ============== Reviews ==============
@api.post("/orders/{order_id}/review")
async def leave_review(order_id: str, payload: ReviewIn, user: dict = Depends(_user_dep)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["buyer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only buyer can review")
    if doc["status"] != "completed":
        raise HTTPException(status_code=400, detail="Order not completed yet")
    existing = await db.reviews.find_one({"order_id": order_id})
    if existing:
        raise HTTPException(status_code=400, detail="Review already submitted")
    review = Review(
        order_id=order_id,
        listing_id=doc["listing_id"],
        seller_id=doc["seller_id"],
        buyer_id=user["id"],
        buyer_name=user["name"],
        rating=payload.rating,
        comment=payload.comment,
    ).model_dump()
    await db.reviews.insert_one(review)
    # update seller rating
    agg = await db.reviews.aggregate([
        {"$match": {"seller_id": doc["seller_id"]}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "n": {"$sum": 1}}},
    ]).to_list(1)
    if agg:
        await db.users.update_one(
            {"id": doc["seller_id"]},
            {"$set": {"rating": round(agg[0]["avg"], 2), "rating_count": agg[0]["n"]}},
        )
    review.pop("_id", None)
    return review


@api.get("/sellers/{seller_id}/reviews")
async def seller_reviews(seller_id: str):
    docs = await db.reviews.find({"seller_id": seller_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


# ============== Wallet ==============
@api.post("/wallet/deposit")
async def deposit(payload: FundsIn, user: dict = Depends(_user_dep)):
    """MOCK payment: instantly credits the wallet (no real processor)."""
    amount = round(float(payload.amount), 2)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": amount}})
    await _log_tx(user["id"], "deposit", amount, f"Mock {payload.method} deposit")
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return _public_user(fresh)


@api.get("/wallet/transactions")
async def transactions(user: dict = Depends(_user_dep)):
    docs = await db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


# ============== Admin ==============
@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(_admin_dep)):
    users = await db.users.count_documents({})
    listings = await db.listings.count_documents({"status": "active"})
    orders = await db.orders.count_documents({})
    disputes = await db.orders.count_documents({"status": "disputed"})
    completed = await db.orders.count_documents({"status": "completed"})
    return {"users": users, "active_listings": listings, "orders": orders, "disputes": disputes, "completed": completed}


@api.get("/admin/orders")
async def admin_orders(_: dict = Depends(_admin_dep), status: Optional[str] = None):
    flt = {}
    if status:
        flt["status"] = status
    docs = await db.orders.find(flt, {"_id": 0}).sort("created_at", -1).to_list(300)
    return docs


@api.get("/admin/users")
async def admin_users(_: dict = Depends(_admin_dep)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(300)
    return [_public_user(d) for d in docs]


@api.post("/admin/orders/{order_id}/resolve")
async def admin_resolve(order_id: str, decision: str = Query(..., pattern="^(release|refund)$"), _: dict = Depends(_admin_dep)):
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["status"] not in ("disputed", "credentials_submitted", "awaiting_credentials"):
        raise HTTPException(status_code=400, detail="Cannot resolve in current state")
    price = float(doc["price"])
    if decision == "release":
        await db.users.update_one({"id": doc["buyer_id"]}, {"$inc": {"held_balance": -price}})
        await db.users.update_one({"id": doc["seller_id"]}, {"$inc": {"balance": price}})
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": "completed", "updated_at": now_iso()},
             "$push": {"timeline": {"event": "admin_released_funds", "at": now_iso()}}},
        )
        await _log_tx(doc["seller_id"], "payout", price, "Admin-released payout", order_id)
    else:  # refund
        await db.users.update_one({"id": doc["buyer_id"]}, {"$inc": {"held_balance": -price, "balance": price}})
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": "refunded", "updated_at": now_iso()},
             "$push": {"timeline": {"event": "admin_refunded_buyer", "at": now_iso()}}},
        )
        # reactivate listing
        await db.listings.update_one({"id": doc["listing_id"]}, {"$set": {"status": "active"}})
        await _log_tx(doc["buyer_id"], "refund", price, "Admin-issued refund", order_id)
    return {"ok": True}


# ============== Startup ==============
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@cybervault.io").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        user = User(
            id=new_id("usr"),
            email=admin_email,
            name="Admin",
            role="admin",
            auth_method="password",
        ).model_dump()
        user["password_hash"] = hash_password(admin_password)
        await db.users.insert_one(user)
        log.info(f"Seeded admin: {admin_email}")
    else:
        if not verify_password(admin_password, existing.get("password_hash") or ""):
            await db.users.update_one(
                {"email": admin_email},
                {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
            )
            log.info("Admin password updated from .env")


async def seed_test_users_and_listings():
    """Seed buyer/seller test users and a couple of demo listings."""
    for email, name, balance in [
        ("buyer@test.com", "Demo Buyer", 500.0),
        ("seller@test.com", "Demo Seller", 0.0),
    ]:
        existing = await db.users.find_one({"email": email})
        if not existing:
            u = User(
                id=new_id("usr"), email=email, name=name,
                auth_method="password", balance=balance,
            ).model_dump()
            u["password_hash"] = hash_password("Test@12345")
            await db.users.insert_one(u)

    seller = await db.users.find_one({"email": "seller@test.com"}, {"_id": 0})
    if seller and (await db.listings.count_documents({"seller_id": seller["id"]})) == 0:
        demo = [
            {
                "platform": "instagram", "category": "account",
                "title": "Verified Travel Niche IG — 120K followers",
                "description": "Premium travel/photography account, organic growth, US-based audience, high engagement rate (4.2%). Email-only login, no recovery linked.",
                "price": 320.0, "followers": 120000, "niche": "Travel",
                "image_url": "https://images.unsplash.com/photo-1535324492437-d8dcec6f1cdf?w=900",
            },
            {
                "platform": "youtube", "category": "subscribers",
                "title": "10K Real YouTube Subscribers (Tech niche)",
                "description": "Real human subscribers, delivered over 14 days, tech/gadget niche, no drop guarantee.",
                "price": 180.0, "followers": 10000, "niche": "Tech",
                "image_url": "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=900",
            },
            {
                "platform": "tiktok", "category": "account",
                "title": "TikTok Dance Niche — 85K followers",
                "description": "Active dance account, viral history, female demographic 18-24.",
                "price": 240.0, "followers": 85000, "niche": "Dance",
                "image_url": "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=900",
            },
            {
                "platform": "twitter", "category": "followers",
                "title": "5K X (Twitter) Real Followers",
                "description": "Crypto/finance niche real followers, instant start, 30-day refill guarantee.",
                "price": 95.0, "followers": 5000, "niche": "Crypto",
                "image_url": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=900",
            },
        ]
        for d in demo:
            obj = Listing(
                **d, seller_id=seller["id"], seller_name=seller["name"],
            ).model_dump()
            await db.listings.insert_one(obj)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.listings.create_index("seller_id")
    await db.listings.create_index("platform")
    await db.orders.create_index("buyer_id")
    await db.orders.create_index("seller_id")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.login_attempts.create_index("identifier")
    await seed_admin()
    await seed_test_users_and_listings()


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api.get("/")
async def root():
    return {"name": "CyberVault Marketplace API", "ok": True}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
