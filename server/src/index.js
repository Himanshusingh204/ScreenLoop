// ─────────────────────────────────────────────────────────────────────────────
// index.js — Screenloop Signaling Server
// Express + Socket.io — handles WebRTC signaling, chat, and drawing sync
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { registerHandlers } = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

// ─── Dynamic Origin Validator ───────────────────────────────────────────────
const explicitOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : [];

function isOriginAllowed(origin) {
  if (!origin) return true; // allow curl, mobile apps, or same-origin requests

  // 1. Explicitly configured origins
  if (explicitOrigins.includes(origin) || explicitOrigins.includes('*')) {
    return true;
  }

  // 2. Local development origins & LAN (localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  if (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin)
  ) {
    return true;
  }

  // 3. Vercel and Netlify production & preview deployments
  if (
    /^https:\/\/[\w-]+\.vercel\.app$/.test(origin) ||
    /^https:\/\/[\w-]+\.netlify\.app$/.test(origin)
  ) {
    return true;
  }

  return false;
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[cors] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ─── Socket.io Setup ─────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// ─── Socket.io Connection ────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[connect] Socket ID: ${socket.id} (from ${socket.handshake.address})`);
  registerHandlers(socket, io);
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Screenloop signaling server active on port ${PORT}`);
  console.log(`   Listening on all interfaces (0.0.0.0:${PORT}) for LAN & Cloud access\n`);
});
