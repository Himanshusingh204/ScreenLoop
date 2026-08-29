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
const { stopRoomSweep, listRooms } = require('./roomManager');
const { registerHandlers } = require('./socketHandlers');
const logger = require('./logger');

const MAX_IP_CONNECTIONS = 5;
const connectedIPs = new Map();

const app = express();
const server = http.createServer(app);

// ─── Disable X-Powered-By ───────────────────────────────────────────────────
app.disable('x-powered-by');

// ─── Dynamic Origin Validator ───────────────────────────────────────────────
const explicitOrigins = process.env.ALLOWED_ORIGIN
  ? process.env.ALLOWED_ORIGIN.split(',').map((o) => o.trim())
  : [];

function isOriginAllowed(origin) {
  if (!origin) return true;

  if (explicitOrigins.includes(origin) || explicitOrigins.includes('*')) {
    return true;
  }

  if (
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$/.test(origin)
  ) {
    return true;
  }

  if (
    /^https:\/\/[\w-]+\.vercel\.app$/.test(origin) ||
    /^https:\/\/[\w-]+\.netlify\.app$/.test(origin) ||
    /^https:\/\/[\w-]+\.onrender\.com$/.test(origin)
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

app.use(cors(corsOptions));
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
  transports: ['websocket', 'polling'],
});

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// ─── Room Listing ───────────────────────────────────────────────────────────
app.get('/api/rooms', (req, res) => {
  const rooms = listRooms();
  res.json({ count: rooms.length, rooms });
});

// ─── Socket.io Connection ────────────────────────────────────────────────────
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;
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
server.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT }, 'Screenloop signaling server active');
  logger.info(
    { bindAddress: `0.0.0.0:${PORT}` },
    'Listening on all interfaces for LAN & Cloud access'
  );
});

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
