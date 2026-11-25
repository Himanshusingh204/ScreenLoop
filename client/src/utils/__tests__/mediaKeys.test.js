import { describe, it, expect } from 'vitest';
import { generateKeyPair, exportPublic, newMediaKey, wrapMediaKey, unwrapMediaKey } from '../mediaKeys';

const ROOM_KEY = 'room-key-from-url-fragment';

describe('media key delivery (ECDH P-256 + HKDF(room key) + AES-GCM)', () => {
  it('newMediaKey is a fresh base64url secret', () => {
    const a = newMediaKey();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newMediaKey()).not.toBe(a);
  });

  it('exports a public key that fits the server limits (base64url, <= 200 chars)', async () => {
    const pub = await exportPublic((await generateKeyPair()).publicKey);
    expect(pub).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(pub.length).toBeLessThanOrEqual(200);
  });

  it('host wraps a key that only the intended recipient can unwrap', async () => {
    const host = await generateKeyPair();
    const guest = await generateKeyPair();
    const kicked = await generateKeyPair();
    const key = newMediaKey();

    const wrapped = await wrapMediaKey(key, host.privateKey, await exportPublic(guest.publicKey), ROOM_KEY);
    expect(wrapped.iv).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(wrapped.ct.length).toBeLessThanOrEqual(300);
    expect(wrapped.ct).not.toContain(key);

    const hostPub = await exportPublic(host.publicKey);
    expect(await unwrapMediaKey(wrapped, guest.privateKey, hostPub, ROOM_KEY)).toBe(key);
    // the kicked user knows the old room key but not the guest's private key
    expect(await unwrapMediaKey(wrapped, kicked.privateKey, hostPub, ROOM_KEY)).toBeNull();
  });

  it('is bound to the room key: a signaling server that swapped in its own ECDH keys still cannot unwrap or forge', async () => {
    const host = await generateKeyPair();
    const guest = await generateKeyPair();
    const hostPub = await exportPublic(host.publicKey);
    const wrapped = await wrapMediaKey(newMediaKey(), host.privateKey, await exportPublic(guest.publicKey), ROOM_KEY);
    expect(await unwrapMediaKey(wrapped, guest.privateKey, hostPub, 'wrong-room-key')).toBeNull();
  });

  it('returns null for tampered ciphertext and malformed input instead of throwing', async () => {
    const host = await generateKeyPair();
    const guest = await generateKeyPair();
    const hostPub = await exportPublic(host.publicKey);
    const w = await wrapMediaKey(newMediaKey(), host.privateKey, await exportPublic(guest.publicKey), ROOM_KEY);
    expect(await unwrapMediaKey({ ...w, ct: `A${w.ct.slice(1)}` }, guest.privateKey, hostPub, ROOM_KEY)).toBeNull();
    expect(await unwrapMediaKey({ iv: '!', ct: '!' }, guest.privateKey, hostPub, ROOM_KEY)).toBeNull();
    expect(await unwrapMediaKey(w, guest.privateKey, 'not-a-key', ROOM_KEY)).toBeNull();
  });
});
