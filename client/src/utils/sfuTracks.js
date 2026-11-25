// sfuTracks.js — pure helpers mapping LiveKit participants/tracks onto the Meet tile model (keyed by socketId).
// The LiveKit identity is set by the server to the authenticated socket id, so it cannot be spoofed by a client.
export function socketIdOf(participant) {
  const id = participant?.identity;
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : null;
}

export const withTrack = (map, id, track) =>
  (map[id] || []).includes(track) ? map : { ...map, [id]: [...(map[id] || []), track] };

export function withoutTrack(map, id, track) {
  if (!(map[id] || []).includes(track)) return map;
  const rest = map[id].filter((t) => t !== track);
  const next = { ...map };
  if (rest.length) next[id] = rest;
  else delete next[id];
  return next;
}

export function withoutPeer(map, id) {
  if (!(id in map)) return map;
  const next = { ...map };
  delete next[id];
  return next;
}
