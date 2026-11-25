// sfuTracks.js — pure helpers mapping LiveKit participants/tracks onto the Meet tile model (keyed by socketId).
export function socketIdOf(participant) {
  try {
    const id = JSON.parse(participant?.metadata || '{}').socketId;
    return typeof id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(id) ? id : null;
  } catch {
    return null;
  }
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
