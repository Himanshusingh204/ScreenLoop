// ─────────────────────────────────────────────────────────────────────────────
// rateLimiter.js — IP-based spam and brute force protection
// Keyed by IP address to prevent bypass via reconnect.
// Uses expiry-based cleanup to avoid memory leaks.
// ─────────────────────────────────────────────────────────────────────────────

const spamLimits = new Map(); // IP -> { count, firstEvent }
const reactionLimits = new Map(); // socketId -> { count, firstEvent }
const pinAttempts = new Map(); // IP -> { count, firstFail }

const SPAM_WINDOW_MS = 1000;
const SPAM_MAX_EVENTS = parseInt(process.env.SPAM_MAX_EVENTS, 10) || 20;

const REACTION_WINDOW_MS = 1000;
const REACTION_MAX_PER_SEC = 5;

const PIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const PIN_MAX_ATTEMPTS = parseInt(process.env.PIN_MAX_ATTEMPTS, 10) || 5;

const SWEEP_INTERVAL_MS = 60 * 1000; // sweep every 60 seconds

/**
 * Get a stable rate-limit key from a socket (IP address).
 */
function getClientKey(socket) {
  return socket.handshake?.address || socket.id;
}

/**
 * Checks if a client is sending too many events.
 * Returns true if allowed, false if blocked.
 */
function checkSpam(socket) {
  const key = getClientKey(socket);
  const now = Date.now();
  let record = spamLimits.get(key);

  if (!record) {
    record = { count: 1, firstEvent: now };
    spamLimits.set(key, record);
    return true;
  }

  if (now - record.firstEvent > SPAM_WINDOW_MS) {
    record.count = 1;
    record.firstEvent = now;
    return true;
  }

  record.count++;
  return record.count <= SPAM_MAX_EVENTS;
}

/**
 * Checks if a client is sending too many reactions.
 * Returns true if allowed, false if blocked.
 */
function checkReactionRate(socket) {
  const key = socket.id;
  const now = Date.now();
  let record = reactionLimits.get(key);

  if (!record) {
    record = { count: 1, firstEvent: now };
    reactionLimits.set(key, record);
    return true;
  }

  if (now - record.firstEvent > REACTION_WINDOW_MS) {
    record.count = 1;
    record.firstEvent = now;
    return true;
  }

  record.count++;
  return record.count <= REACTION_MAX_PER_SEC;
}

/**
 * Checks if a client has exceeded the PIN guess limit.
 * Returns true if allowed to guess, false if locked out.
 */
function checkPinBruteForce(socket) {
  const key = getClientKey(socket);
  const now = Date.now();
  const record = pinAttempts.get(key);

  if (!record) return true;

  if (record.count >= PIN_MAX_ATTEMPTS) {
    if (now - record.firstFail > PIN_WINDOW_MS) {
      pinAttempts.delete(key);
      return true;
    }
    return false;
  }

  return true;
}

/**
 * Record a failed PIN attempt (keyed by IP).
 */
function recordFailedPin(socket) {
  const key = getClientKey(socket);
  const now = Date.now();
  const record = pinAttempts.get(key);

  if (!record || now - record.firstFail > PIN_WINDOW_MS) {
    pinAttempts.set(key, { count: 1, firstFail: now });
  } else {
    record.count++;
  }
}

/**
 * Reset failed PIN attempts on success (keyed by IP).
 */
function resetFailedPin(socket) {
  const key = getClientKey(socket);
  pinAttempts.delete(key);
}

/**
 * Periodic sweep to remove expired entries and prevent memory leaks.
 */
function sweepExpiredEntries() {
  const now = Date.now();
  for (const [key, record] of spamLimits.entries()) {
    if (now - record.firstEvent > SPAM_WINDOW_MS) {
      spamLimits.delete(key);
    }
  }
  for (const [key, record] of reactionLimits.entries()) {
    if (now - record.firstEvent > REACTION_WINDOW_MS) {
      reactionLimits.delete(key);
    }
  }
  for (const [key, record] of pinAttempts.entries()) {
    if (now - record.firstFail > PIN_WINDOW_MS) {
      pinAttempts.delete(key);
    }
  }
}

// Start periodic sweep
const sweepTimer = setInterval(sweepExpiredEntries, SWEEP_INTERVAL_MS);

/**
 * Stop the sweep timer (for graceful shutdown or testing).
 */
function stopSweep() {
  clearInterval(sweepTimer);
}

module.exports = {
  checkSpam,
  checkReactionRate,
  checkPinBruteForce,
  recordFailedPin,
  resetFailedPin,
  getClientKey,
  stopSweep,
  sweepExpiredEntries,
};
