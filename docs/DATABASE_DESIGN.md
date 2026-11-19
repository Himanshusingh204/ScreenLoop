# 🗄️ Screenloop — Database & Persistence Layer Architecture

> **Document Version**: 1.0  
> **Status**: Approved Design  
> **Target**: PostgreSQL (Core DB) + Redis (Session & Socket.IO Clustering)

---

## 1. Storage Strategy: Memory vs. Database

| Data Type | Storage Tier | Rationale |
|---|---|---|
| Active WebRTC / LiveKit room tokens | In-Memory / LiveKit Redis | Ephemeral, ultra-low latency (<1ms) |
| Active socket connections & participants | In-Memory (current) ➔ Redis Adapter | Enables multi-node server clustering |
| User accounts, credentials, settings | PostgreSQL | ACID compliance, secure relations, persistent |
| Saved rooms / scheduled watch parties | PostgreSQL | Persistent configuration & access control |
| Chat history (optional) | PostgreSQL (encrypted) | Optional persistence for scheduled watch clubs |

---

## 2. PostgreSQL Schema

```sql
-- 1. Organizations / Workspaces (Optional Enterprise Tier)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Persistent Rooms Table
CREATE TABLE rooms (
  id VARCHAR(32) PRIMARY KEY, -- Room code, e.g. "x7k2m9qp"
  name VARCHAR(100),
  host_id UUID REFERENCES users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  pin_hash BYTEA,             -- SHA-256 hashed PIN
  is_locked BOOLEAN DEFAULT FALSE,
  max_participants INT DEFAULT 20,
  host_only_controls BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Room Membership / Invites
CREATE TABLE room_memberships (
  room_id VARCHAR(32) REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'viewer', -- 'host', 'co-host', 'viewer'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- 4. Audit Log
CREATE TABLE security_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,       -- 'room.created', 'user.kicked', 'pin.failed'
  ip_address INET,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. Horizontal Scaling with Redis Socket.IO Adapter

When Screenloop scales to multiple signaling server containers behind a load balancer:

```
[ Clients ] ──▶ [ AWS ALB / Cloudflare ]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ Server Node 1 ]          [ Server Node 2 ]
        │                           │
        └─────────────┬─────────────┘
                      ▼
            [ Redis Pub/Sub ]
       (@socket.io/redis-adapter)
```

Implementation in `server/src/index.js`:
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Socket.IO Redis cluster adapter connected');
});
```
