// redisAdapter.js — optional Socket.IO Redis adapter so several signaling nodes share rooms.
// Enabled only when REDIS_URL is set; otherwise the server stays single-node and unchanged.
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('./logger');

function attachRedisAdapter(io, url, { RedisCtor } = {}) {
  if (!url) return false;
  const Redis = RedisCtor || require('ioredis');
  const pub = new Redis(url);
  const sub = pub.duplicate();
  // Without listeners an ioredis 'error' event is thrown and would kill the process.
  // On Redis loss we log and keep serving local sockets (cross-node relay resumes on reconnect).
  for (const c of [pub, sub]) c.on('error', (err) => logger.error({ err: err.message }, 'Redis error'));
  io.adapter(createAdapter(pub, sub));
  logger.info('Socket.IO Redis adapter enabled');
  return { pub, sub };
}

module.exports = { attachRedisAdapter };
