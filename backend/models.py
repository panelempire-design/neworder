"""Pydantic models for the CyberVault marketplace."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str = "id") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:14]}"


# ---------- Auth payloads ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GoogleSessionIn(BaseModel):
    session_id: str


# ---------- User ----------
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    avatar: Optional[str] = None
    role: Literal["user", "admin"] = "user"
    balance: float = 0.0
    held_balance: float = 0.0
    rating: float = 0.0
    rating_count: int = 0
    google_user_id: Optional[str] = None
    auth_method: Literal["password", "google"] = "password"
    created_at: str = Field(default_factory=now_iso)


# ---------- Listing ----------
Platform = Literal["instagram", "youtube", "tiktok", "twitter", "facebook", "telegram", "twitch"]
Category = Literal["account", "followers", "likes", "views", "subscribers"]


class ListingIn(BaseModel):
    platform: Platform
    category: Category
    title: str = Field(min_length=4, max_length=140)
    description: str = Field(min_length=10, max_length=2000)
    price: float = Field(gt=0)
    followers: Optional[int] = 0
    niche: Optional[str] = None
    image_url: Optional[str] = None


class Listing(ListingIn):
    id: str = Field(default_factory=lambda: new_id("lst"))
    seller_id: str
    seller_name: str
    status: Literal["active", "sold", "paused", "removed"] = "active"
    created_at: str = Field(default_factory=now_iso)


# ---------- Orders / Escrow ----------
OrderStatus = Literal[
    "pending_payment",
    "awaiting_credentials",
    "credentials_submitted",
    "completed",
    "disputed",
    "cancelled",
    "refunded",
]


class OrderCreateIn(BaseModel):
    listing_id: str


class CredentialsIn(BaseModel):
    credentials: str = Field(min_length=4, max_length=4000)


class DisputeIn(BaseModel):
    reason: str = Field(min_length=4, max_length=2000)


class Order(BaseModel):
    id: str = Field(default_factory=lambda: new_id("ord"))
    listing_id: str
    listing_title: str
    listing_image: Optional[str] = None
    platform: str
    price: float
    buyer_id: str
    buyer_name: str
    seller_id: str
    seller_name: str
    status: OrderStatus = "awaiting_credentials"
    credentials: Optional[str] = None
    dispute_reason: Optional[str] = None
    timeline: List[dict] = []
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


# ---------- Chat ----------
class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class Message(BaseModel):
    id: str = Field(default_factory=lambda: new_id("msg"))
    order_id: str
    sender_id: str
    sender_name: str
    body: str
    created_at: str = Field(default_factory=now_iso)


# ---------- Reviews ----------
class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=2, max_length=1000)


class Review(BaseModel):
    id: str = Field(default_factory=lambda: new_id("rev"))
    order_id: str
    listing_id: str
    seller_id: str
    buyer_id: str
    buyer_name: str
    rating: int
    comment: str
    created_at: str = Field(default_factory=now_iso)


# ---------- Wallet ----------
class FundsIn(BaseModel):
    amount: float = Field(gt=0, le=10000)
    method: Literal["card", "crypto", "upi"] = "card"


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: new_id("tx"))
    user_id: str
    type: Literal["deposit", "withdraw", "escrow_hold", "escrow_release", "payout", "refund"]
    amount: float
    note: Optional[str] = None
    order_id: Optional[str] = None
    created_at: str = Field(default_factory=now_iso)
