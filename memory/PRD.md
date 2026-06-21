# CyberVault — Product Requirements Document

## Original Problem Statement
Build a secure, automated marketplace platform for buying and selling social media accounts and services with a clean, futuristic, neon-cyber aesthetic dashboard with a robot mascot. Core features: user dashboard (balance, orders, listings), escrow flow (buyer pays → seller submits creds → buyer confirms → release), mock payments, full responsiveness for APK conversion.

## User Choices (locked-in)
- **Auth**: Both JWT custom (email/password) + Emergent Google social login
- **Payments**: Mock/manual (UI complete, no real processor)
- **Platforms**: Instagram, YouTube, TikTok, Twitter/X, Facebook, Telegram, Twitch
- **MVP Features**: Admin panel, Chat between buyer/seller, Reviews/ratings
- **APK**: Capacitor config + setup guide bundled

## User Personas
1. **Buyer** — discovers listings, deposits to wallet, opens escrow, verifies credentials, leaves reviews.
2. **Seller** — creates listings, submits credentials, gets paid on confirmation, builds reputation.
3. **Admin** — resolves disputes (release/refund), monitors stats, manages users.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + JWT (PyJWT) + bcrypt + Emergent OAuth.
- **Frontend**: React 19, react-router-dom 7, Tailwind, shadcn/ui, sonner toasts, lucide icons.
- **DB Collections**: `users`, `listings`, `orders`, `messages`, `reviews`, `transactions`, `user_sessions`, `login_attempts`, `password_reset_tokens`.
- **All IDs** custom UUIDs (`usr_*`, `lst_*`, `ord_*`, `msg_*`, etc); MongoDB `_id` excluded via projection.
- **Cookies**: httpOnly, samesite=none, secure. `access_token` (1h), `refresh_token` (7d), `session_token` (7d Google).
- **Mobile wrapper**: Capacitor — see `/app/CAPACITOR_APK_SETUP.md`.

## Implemented (Feb 2026)
- ✅ Landing page (hero, robot mascot, how-it-works, featured, security panel, APK section)
- ✅ JWT auth (register/login/logout/me/refresh) with brute-force lockout
- ✅ Emergent Google OAuth (callback flow with race-condition handling)
- ✅ Protected routes + admin guard
- ✅ Dashboard (KPIs, recent orders, wallet activity, AI-mascot card)
- ✅ Marketplace with platform/category filters + search
- ✅ Listing detail with reviews, buyer purchase flow
- ✅ Create / pause / remove listings (seller)
- ✅ Escrow flow (4-step state machine + visual stepper)
- ✅ Credential submission/view with copy + confirm/release
- ✅ Dispute opening (any party)
- ✅ 1-on-1 order chat
- ✅ Reviews (1-5 stars) — auto-updates seller rating
- ✅ Wallet page + mock deposit modal (card/crypto/UPI)
- ✅ Transaction ledger
- ✅ Admin console (stats, disputes, all orders, users) + release/refund tools
- ✅ Responsive mobile-first nav (top bar + bottom tab + drawer)
- ✅ Capacitor config + APK setup guide

## Test Credentials
- Admin: `admin@cybervault.io` / `Admin@12345`
- Buyer: `buyer@test.com` / `Test@12345` (seeded with $500 balance)
- Seller: `seller@test.com` / `Test@12345` (seeded with 4 demo listings)

## Backlog (P1)
- Real payment integration (Stripe/Razorpay)
- Push notifications for new messages
- Withdraw to bank/crypto
- Two-factor for sellers
- Verified seller badge program

## Backlog (P2)
- Advanced search / saved filters
- Bulk listing import
- Seller analytics dashboard
- Referral / loyalty program
- Real-time chat (WebSocket upgrade)
