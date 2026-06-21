# Auth Testing Playbook

## JWT (custom email/password)

1. Register a new user:
```
curl -c cookies.txt -X POST $BACKEND/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","password":"Test@12345","name":"New User"}'
```

2. Login admin:
```
curl -c cookies.txt -X POST $BACKEND/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cybervault.io","password":"Admin@12345"}'
```

3. Verify session:
```
curl -b cookies.txt $BACKEND/api/auth/me
```

4. Logout:
```
curl -b cookies.txt -X POST $BACKEND/api/auth/logout
```

Expected:
- bcrypt hash starts with `$2b$`
- Index exists on `users.email` (unique)
- Cookies `access_token` + `refresh_token` set httpOnly

## Emergent Google OAuth

1. Frontend redirects to `https://auth.emergentagent.com/?redirect=<origin>/auth/callback`
2. After Google auth user lands at `<origin>/auth/callback#session_id=xxx`
3. Frontend extracts session_id from URL fragment and POSTs to `/api/auth/google-session`
4. Backend calls `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` with `X-Session-ID`
5. Backend stores `session_token` in `user_sessions` collection and sets httpOnly cookie
6. `/api/auth/me` returns user

## MongoDB Verification

```
mongosh
use cybervault_db
db.users.find({role: "admin"}).pretty()
db.user_sessions.find().limit(2).pretty()
```

Expected fields on user document: `id`, `email`, `name`, `password_hash` (null for Google users), `google_user_id` (null for password users), `role`, `balance`, `created_at`.
