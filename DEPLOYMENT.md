# 🚀 Screenloop — Production Deployment & Setup Guide

Screenloop is a high-performance, zero-friction peer-to-peer watch party and video calling platform powered by **LiveKit SFU**, **React 18**, and **Node.js**.

---

## 📋 Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- *(Optional)* **Docker & Docker Compose** for containerized deployment.

---

## ⚡ Quick Start (Local Development)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/screenloop.git
cd screenloop

# Install root, client, and server dependencies
npm install
npm install --prefix client
npm install --prefix server
```

### 2. Configure Environment Variables
Copy the example files in both client and server:
```bash
# In client/
cp client/.env.example client/.env

# In server/
cp server/.env.example server/.env
```

Default local settings in `server/.env`:
```env
PORT=4000
ALLOWED_ORIGIN=http://localhost:5173
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

### 3. Run Development Servers
In two separate terminal tabs:
```bash
# Terminal 1: Run signaling & token server
npm run dev:server

# Terminal 2: Run Vite React client
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🐳 Option 1: 1-Command Docker Deployment (Full Stack)

Screenloop includes a complete `docker-compose.yml` that spins up:
1. **LiveKit SFU Server** (ports 7880, 7881, 7882/udp)
2. **Screenloop Signaling Server** (port 4000)
3. **Screenloop Web Client** (port 3000)

```bash
# Start all services in the background
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```
Access the web app at **http://localhost:3000**!

---

## ☁️ Option 2: Cloud Deployment (Vercel + Render / Railway)

### 1. Frontend (Vercel)
1. Push your repository to GitHub.
2. In Vercel, import your repository.
3. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables in Vercel Dashboard:
   - `VITE_SERVER_URL`: `https://your-server.onrender.com`
   - `VITE_LIVEKIT_URL`: `wss://your-project.livekit.cloud`
5. Click **Deploy**.

### 2. Backend (Render / Railway)
1. In Render / Railway, create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
4. Set Environment Variables in the service settings:
   - `PORT`: `4000` (Render binds automatically)
   - `ALLOWED_ORIGIN`: `https://your-screenloop.vercel.app`
   - `LIVEKIT_URL`: `wss://your-project.livekit.cloud`
   - `LIVEKIT_API_KEY`: `<Your LiveKit API Key>`
   - `LIVEKIT_API_SECRET`: `<Your LiveKit Secret>`
   - `NODE_ENV`: `production`

---

## 🎥 Setting up Free LiveKit Cloud (SFU Server)
1. Sign up for free at **[cloud.livekit.io](https://cloud.livekit.io)** (50GB free bandwidth monthly, no credit card required).
2. Create a new Project (e.g. `screenloop-prod`).
3. Under **Settings → Project API Keys**, copy:
   - **WebSocket URL** (`wss://xxxx.livekit.cloud`)
   - **API Key**
   - **API Secret**
4. Paste these into your backend's environment variables. LiveKit takes care of auto-scaling, global edge routing, and firewall traversal!

---

## 🛡️ Environment Variables Reference

| Variable | Location | Description | Default |
|---|---|---|---|
| `PORT` | Server | HTTP/WebSocket listen port | `4000` |
| `ALLOWED_ORIGIN` | Server | Comma-separated allowed frontend origins for CORS | `http://localhost:5173` |
| `LIVEKIT_URL` | Server & Client | LiveKit SFU WebSocket endpoint | `ws://127.0.0.1:7880` |
| `LIVEKIT_API_KEY` | Server | API Key for JWT token minting | `devkey` |
| `LIVEKIT_API_SECRET` | Server | Secret for signing LiveKit tokens | `secret` |
| `MAX_PARTICIPANTS` | Server | Max attendees per watch room | `10` |
| `MAX_MEET_PARTICIPANTS` | Server | Max attendees per video meeting | `20` |
| `ROOM_TTL_MS` | Server | Idle timeout before cleaning empty rooms | `1800000` (30m) |
| `VITE_SERVER_URL` | Client | Signaling backend server URL | `http://localhost:4000` |

---

## 🧪 Testing & Verification

```bash
# Run server test suite (40 tests)
npm test --prefix server

# Run client test suite (35 tests)
npm test --prefix client

# Run production build check
npm run build --prefix client
```

## 📈 Scaling Out (multiple signaling nodes)

Rooms live in each node's memory, so the load balancer **pins a room to one node** by hashing the `?room=` query the client sends
(`deploy/nginx.conf`, or the ingress annotation in `deploy/k8s/signaling.yaml`). Set `REDIS_URL` so Socket.IO broadcasts also
reach sockets on other nodes, and `TRUST_PROXY=true` so rate limits use the real client IP from `X-Forwarded-For`
(never enable it without a proxy you control: the header is spoofable).

| Env | Meaning | Default |
|---|---|---|
| `REDIS_URL` | enables the Redis adapter | unset (single node) |
| `TRUST_PROXY` | trust `X-Forwarded-For` | unset |
| `MAX_IP_CONNECTIONS` | sockets per client IP | 5 |
| `MAX_ROOMS` | rooms per node | 100 |

Local 3-node test: `docker compose -f deploy/docker-compose.scale.yml up --build`. Scrape `GET /metrics` (Prometheus); probe `GET /healthz`.
Trade-off: if a node dies, its rooms end (they are ephemeral); clients auto-reconnect and recreate. `/metrics` is unauthenticated, so block it at the ingress.
