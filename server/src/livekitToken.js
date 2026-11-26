// livekitToken.js — LiveKit AccessToken generator for Screenloop
// Creates short-lived, cryptographically signed JWTs with room-level permissions

const { AccessToken } = require('livekit-server-sdk');

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'secret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://127.0.0.1:7880';

/**
 * Mint a signed JWT access token for a room participant.
 * @param {object} params
 * @param {string} params.roomId
 * @param {string} params.participantName
 * @param {string} [params.participantIdentity]
 * @param {boolean} [params.isHost]
 * @param {object} [params.metadata]
 * @returns {Promise<string>}
 */
async function generateLiveKitToken({
  roomId,
  participantName,
  participantIdentity,
  isHost = false,
  canPublish = true,
  canPublishData = true,
  metadata = {},
}) {
  if (!roomId || typeof roomId !== 'string') {
    throw new Error('Invalid roomId');
  }
  if (!participantName || typeof participantName !== 'string') {
    throw new Error('Invalid participantName');
  }

  const identity = participantIdentity || `${participantName}_${Math.random().toString(36).slice(2, 7)}`;

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: participantName,
    ttl: '6h',
    metadata: JSON.stringify({
      isHost: !!isHost,
      ...metadata,
    }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish,
    canSubscribe: true,
    canPublishData,
  });

  return await at.toJwt();
}

module.exports = {
  generateLiveKitToken,
  LIVEKIT_URL,
};
