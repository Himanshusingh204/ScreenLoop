// sfuToken.js — ask the signaling server (over the authenticated socket) for a LiveKit token.
export function requestSfuToken(socket, kind, roomId, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!socket) return reject(new Error('No signaling connection'));
    const timer = setTimeout(() => reject(new Error('Token request timed out')), timeoutMs);
    socket.emit('sfu:token', { kind, roomId }, (res) => {
      clearTimeout(timer);
      if (res?.error) return reject(new Error(res.error));
      if (!res?.token || !res?.url) return reject(new Error('Invalid token response'));
      return resolve({ token: res.token, url: res.url });
    });
  });
}
