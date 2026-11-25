// livekitAdmin.js — server-side LiveKit room control (best effort: signaling stays authoritative if the SFU is down).
const { RoomServiceClient } = require('livekit-server-sdk');
const logger = require('./logger');

let client = null;
// LIVEKIT_URL is what BROWSERS connect to; LIVEKIT_API_URL (optional) is how this server reaches LiveKit internally.
const httpUrl = () => (process.env.LIVEKIT_API_URL || process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880').replace(/^ws/, 'http');

function getClient() {
  if (!client) {
    client = new RoomServiceClient(
      httpUrl(),
      process.env.LIVEKIT_API_KEY || 'devkey',
      process.env.LIVEKIT_API_SECRET || 'secret'
    );
  }
  return client;
}

/** Disconnect a participant from an SFU room. Never throws: a kick must succeed even if LiveKit is unreachable. */
function removeParticipant(room, identity) {
  getClient()
    .removeParticipant(room, identity)
    .catch((err) => logger.warn({ room, err: err.message }, 'SFU removeParticipant failed'));
}

module.exports = { removeParticipant };
