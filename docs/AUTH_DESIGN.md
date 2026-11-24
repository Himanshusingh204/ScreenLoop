# 🔐 Screenloop — Multi-User Authentication System Design

> **Status: design proposal — NOT implemented.** The current app has no accounts and no database (authentication / PostgreSQL below describes a possible future direction).

> **Document Version**: 1.0  
> **Status**: Approved Design (Future Scaling)  
> **Target**: User Accounts, OAuth2, Persistent Profiles & RBAC

---

## 1. Authentication Strategy

To transition from the current "zero-account link sharing" model to a full multi-user platform:
- **Dual-Mode Access**:
  1. *Anonymous Guests*: Can join via link/PIN without logging in.
  2. *Registered Users*: Can create persistent rooms, schedule watch parties, save watch history, and manage friends.
- **Authentication Protocol**: JWT (JSON Web Tokens) with a short-lived Access Token + long-lived HTTP-only Refresh Token.

---

## 2. Token Architecture & Lifecycle

```
[ Client ] ──( 1. Login with credentials )──▶ [ Auth API ]
[ Client ] ◀──( 2. Access Token in JSON + Refresh Token in HttpOnly Cookie )── [ Auth API ]

[ Client ] ──( 3. API Request with Bearer AccessToken )──▶ [ Protected Resource ]

When AccessToken expires (15 minutes):
[ Client ] ──( 4. POST /api/auth/refresh with HttpOnly Cookie )──▶ [ Auth API ]
[ Client ] ◀──( 5. Fresh AccessToken )── [ Auth API ]
```

### Access Token Payload
```json
{
  "sub": "usr_9f8a7b6c5d4e",
  "email": "user@example.com",
  "name": "Alex",
  "role": "user",
  "avatarUrl": "https://cdn.screenloop.app/avatars/user.png",
  "iat": 1732064400,
  "exp": 1732065300
}
```

---

## 3. Data Models (PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Refresh Tokens Table (Token Rotation & Revocation)
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. API Endpoints

- `POST /api/auth/register` — Create account with email, password, display name.
- `POST /api/auth/login` — Authenticate and receive tokens.
- `POST /api/auth/refresh` — Issue fresh access token using cookie.
- `POST /api/auth/logout` — Invalidate refresh token and clear cookie.
- `GET /api/auth/me` — Fetch authenticated user profile.
- `GET /api/auth/oauth/google` — Google OAuth2 SSO initiation.
- `GET /api/auth/oauth/google/callback` — Google OAuth2 callback.

---

## 5. Socket.IO Handshake Authentication

Once auth is enabled, Socket.IO connections will authenticate in middleware:
```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    // Fall back to guest session
    socket.data.user = { isGuest: true, id: `guest_${socket.id}` };
    return next();
  }
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid authentication token'));
  }
});
```
