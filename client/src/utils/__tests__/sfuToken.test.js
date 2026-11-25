import { describe, it, expect } from 'vitest';
import { requestSfuToken } from '../sfuToken';

const sock = (reply) => ({ emit: (ev, payload, ack) => reply && setTimeout(() => ack(reply(payload)), 0) });

describe('requestSfuToken', () => {
  it('resolves token + url from the socket ack and sends kind and roomId', async () => {
    let sent;
    const s = sock((p) => { sent = p; return { token: 'T', url: 'ws://x' }; });
    expect(await requestSfuToken(s, 'watch', 'r1')).toEqual({ token: 'T', url: 'ws://x' });
    expect(sent).toEqual({ kind: 'watch', roomId: 'r1' });
  });

  it('rejects with the server error text', async () => {
    await expect(requestSfuToken(sock(() => ({ error: 'Not in this room' })), 'watch', 'r1')).rejects.toThrow('Not in this room');
  });

  it('rejects an incomplete reply and times out when the server never answers', async () => {
    await expect(requestSfuToken(sock(() => ({})), 'meet', 'r1')).rejects.toThrow();
    await expect(requestSfuToken(sock(null), 'meet', 'r1', 30)).rejects.toThrow(/timed out/i);
  });

  it('rejects when there is no socket', async () => {
    await expect(requestSfuToken(null, 'watch', 'r1')).rejects.toThrow();
  });
});
