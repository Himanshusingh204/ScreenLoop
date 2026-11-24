import { describe, it, expect, vi, afterEach } from 'vitest';
import { getIceServers } from '../webrtcConfig';

afterEach(() => vi.unstubAllEnvs());

describe('getIceServers', () => {
  it('always includes STUN servers', () => {
    const { iceServers } = getIceServers();
    expect(iceServers.some((s) => String(s.urls).startsWith('stun:'))).toBe(true);
  });

  it('adds TURN servers with credentials from env', () => {
    vi.stubEnv('VITE_TURN_URLS', 'turn:a.example:3478, turn:b.example:443');
    vi.stubEnv('VITE_TURN_USERNAME', 'u');
    vi.stubEnv('VITE_TURN_CREDENTIAL', 'p');
    const turn = getIceServers().iceServers.filter((s) => s.username);
    expect(turn).toEqual([
      { urls: 'turn:a.example:3478', username: 'u', credential: 'p' },
      { urls: 'turn:b.example:443', username: 'u', credential: 'p' },
    ]);
  });

  it('keeps TURN urls without credentials when none provided', () => {
    vi.stubEnv('VITE_TURN_URLS', 'turn:a.example:3478');
    vi.stubEnv('VITE_TURN_USERNAME', '');
    vi.stubEnv('VITE_TURN_CREDENTIAL', '');
    const { iceServers } = getIceServers();
    expect(iceServers).toContainEqual({ urls: 'turn:a.example:3478' });
  });
});
