// ─────────────────────────────────────────────────────────────────────────────
// rateLimiter.js — In-memory spam and brute force protection
// ─────────────────────────────────────────────────────────────────────────────

const spamLimits = new Map();
const pinAttempts = new Map();

const SPAM_WINDOW_MS = 1000;
const SPAM_MAX_EVENTS = 20; // Increased to 20/s to allow rapid emoji reactions and chat

const PIN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const PIN_MAX_ATTEMPTS = 5;

/**
 * Checks if a socket is sending too many generic events (chat, reactions).
 * Returns true if allowed, false if blocked.
 */
function checkSpam(socketId) {
  const now = Date.now();
  let record = spamLimits.get(socketId);

  if (!record) {
    record = { count: 1, firstEvent: now };
    spamLimits.set(socketId, record);
    return true;
  }

  if (now - record.firstEvent > SPAM_WINDOW_MS) {
    // Reset window
    record.count = 1;
    record.firstEvent = now;
    return true;
  }

  record.count++;
  return record.count <= SPAM_MAX_EVENTS;
}

/**
 * Checks if a socket has exceeded the PIN guess limit.
 * Returns true if allowed to guess, false if locked out.
 */
function checkPinBruteForce(socketId) {
  const now = Date.now();
  const record = pinAttempts.get(socketId);
  
  if (!record) return true;

  if (record.count >= PIN_MAX_ATTEMPTS) {
    if (now - record.firstFail > PIN_WINDOW_MS) {
      // Lockout expired
      pinAttempts.delete(socketId);
      return true;
    }
    return false; // Currently locked out
  }

  return true;
}

/**
 * Record a failed PIN attempt.
 */
function recordFailedPin(socketId) {
  const now = Date.now();
  let record = pinAttempts.get(socketId);

  if (!record || now - record.firstFail > PIN_WINDOW_MS) {
    pinAttempts.set(socketId, { count: 1, firstFail: now });
  } else {
    record.count++;
  }
}

/**
 * Reset failed PIN attempts (e.g. on successful login).
 */
function resetFailedPin(socketId) {
  pinAttempts.delete(socketId);
}

module.exports = {
  checkSpam,
  checkPinBruteForce,
  recordFailedPin,
  resetFailedPin,
};
