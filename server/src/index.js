// ─────────────────────────────────────────────────────────────────────────────
// index.js — Screenloop Signaling Server
// Express + Socket.io — handles WebRTC signaling, chat, and drawing sync
// Includes graceful shutdown, CSP-ready, and security headers.
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { stopRoomSweep, listRooms, countMeets } = require('./roomManager');
const { getClientKey } = require('./rateLimiter');
const { registerHandlers } = require('./socketHandlers');
const logger = require('./logger');
const { attachRedisAdapter } = require('./redisAdapter');
const { register, registerGauges } = require('./metrics');

const MAX_IP_CONNECTIONS = parseInt(process.env.MAX_IP_CONNECTIONS, 10) || 5;
const connectedIPs = new Map();

const app = express();
const server = http.createServer(app);

// ─── Disable X-Powered-By ───────────────────────────────────────────────────
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

// ─── Dynamic Origin Validator ───────────────────────────────────────────────
const explicitOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : [];

function isOriginAllowed(origin) {
  // Allow missing origin only in local development / testing
  if (!origin) {
    return process.env.NODE_ENV !== 'production';
  }

  if (explicitOrigins.includes(origin) || explicitOrigins.includes('*')) {
    return true;
  }

  // Allow local development and LAN testing origins
  if (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin)
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
      logger.warn({ origin }, 'Blocked origin');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Probes/scrapers send no Origin header, which CORS rejects in production: exempt them from the browser CORS gate.
const PROBE_PATHS = new Set(['/health', '/healthz', '/metrics']);
const corsMw = cors(corsOptions);
app.use((req, res, next) => (PROBE_PATHS.has(req.path) ? next() : corsMw(req, res, next)));
app.use(express.json());

// ─── Security Headers (non-Vercel deployments) ──────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'display-capture=(self), camera=(), microphone=(self)');
  next();
});

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
  maxHttpBufferSize: 1e6, // 1MB payload ceiling prevents memory exhaustion
  transports: ['websocket', 'polling'],
});

attachRedisAdapter(io, process.env.REDIS_URL);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

registerGauges({
  countRooms: () => listRooms().length,
  countMeets,
  countSockets: () => io.engine.clientsCount,
});
// Set METRICS_TOKEN to require `Authorization: Bearer <token>`; unset = open (fine on a private network only).
app.get('/metrics', async (req, res) => {
  const want = process.env.METRICS_TOKEN;
  if (want && req.get('authorization') !== `Bearer ${want}`) return res.status(401).end();
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// ─── Room Listing (Phase 1: gated — prevents unauthenticated enumeration) ───
// Set ROOM_LISTING_ENABLED=true to expose (dev default: on, prod default: off).
// Lightweight per-IP rate limit included (no extra dependency).
const roomListingHits = new Map();
const ROOM_LISTING_WINDOW_MS = 60 * 1000;
const ROOM_LISTING_MAX = 30;

// Drop expired buckets so the map can't grow without bound (unref: don't hold the process open)
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of roomListingHits) {
    if (now - rec.start > ROOM_LISTING_WINDOW_MS) roomListingHits.delete(ip);
  }
}, ROOM_LISTING_WINDOW_MS).unref();

app.get('/api/rooms', (req, res) => {
  const enabled =
    process.env.ROOM_LISTING_ENABLED !== undefined
      ? process.env.ROOM_LISTING_ENABLED === 'true'
      : process.env.NODE_ENV !== 'production';
  if (!enabled) {
    return res.status(403).json({ error: 'Room listing disabled' });
  }

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const rec = roomListingHits.get(ip);
  if (!rec || now - rec.start > ROOM_LISTING_WINDOW_MS) {
    roomListingHits.set(ip, { count: 1, start: now });
  } else {
    rec.count += 1;
    if (rec.count > ROOM_LISTING_MAX) {
      return res.status(429).json({ error: 'Too many requests' });
    }
  }

  const rooms = listRooms();
  res.json({ count: rooms.length, rooms });
});

// LiveKit tokens are issued over the authenticated socket ('sfu:token' in socketHandlers.js), not over open HTTP.

// ─── Socket.io Connection ────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const clientIP = getClientKey(socket);
  const ipCount = (connectedIPs.get(clientIP) || 0) + 1;
  connectedIPs.set(clientIP, ipCount);

  if (ipCount > MAX_IP_CONNECTIONS) {
    logger.warn({ clientIP, ipCount }, 'Rate limit exceeded');
    socket.emit('server:error', { message: 'Too many connections from your IP' });
    connectedIPs.set(clientIP, ipCount - 1);
    socket.disconnect(true);
    return;
  }

  logger.info({ socketId: socket.id, clientIP }, 'Socket connected');
  registerHandlers(socket, io);

  socket.on('disconnect', () => {
    const count = connectedIPs.get(clientIP) || 1;
    if (count <= 1) {
      connectedIPs.delete(clientIP);
    } else {
      connectedIPs.set(clientIP, count - 1);
    }
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
// Only listen when run directly, so tests can import `app` without binding a port
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, 'Screenloop signaling server active');
    logger.info(
      { bindAddress: `0.0.0.0:${PORT}` },
      'Listening on all interfaces for LAN & Cloud access'
    );
  });
}

// ─── Graceful Shutdown ──────────────────────────────────────────────────────
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Graceful shutdown initiated');

  stopRoomSweep();

  // Notify all connected clients
  io.emit('server:shutdown', { message: 'Server is restarting. Please reconnect.' });

  // Give clients a moment to receive the shutdown message
  setTimeout(() => {
    io.close(() => {
      logger.info('Socket.io connections closed');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  }, 2000);

  // Force exit after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Forced exit after shutdown timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Uncaught Exception / Unhandled Rejection Handlers ──────────────────────
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection');
});

// ─── Express Error Handler (must be last) ───────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error({ err: err.message }, 'Express error');
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = { app, server, io };
