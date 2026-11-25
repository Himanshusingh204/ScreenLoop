// mediaKeys.js — deliver a fresh media-encryption key to specific peers.
// ECDH P-256 shared secret -> HKDF-SHA256 salted with the URL-fragment room key -> AES-GCM.
// The room key in the salt means a signaling server (which never sees the fragment) cannot unwrap a key or forge one
// by swapping in its own ECDH public keys; the ECDH part means the user being removed (who has the room key) cannot unwrap.
const subtle = () => globalThis.crypto.subtle;
const ALGO = { name: 'ECDH', namedCurve: 'P-256' };
const enc = (s) => new TextEncoder().encode(s);

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export const generateKeyPair = () => subtle().generateKey(ALGO, false, ['deriveBits']);
export const newMediaKey = () => b64(globalThis.crypto.getRandomValues(new Uint8Array(32)));
export async function exportPublic(pub) {
  return b64(await subtle().exportKey('raw', pub));
}

const wrappingKey = async (priv, otherPubB64, roomKey) => {
  const pub = await subtle().importKey('raw', unb64(otherPubB64), ALGO, false, []);
  const secret = await subtle().deriveBits({ name: 'ECDH', public: pub }, priv, 256);
  const hkdf = await subtle().importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: enc(roomKey), info: enc('screenloop-media-key-v1') },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/** @returns {Promise<{iv:string, ct:string}>} */
export async function wrapMediaKey(key, hostPriv, recipientPubB64, roomKey) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aes = await wrappingKey(hostPriv, recipientPubB64, roomKey);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, aes, enc(key));
  return { iv: b64(iv), ct: b64(ct) };
}

/** @returns {Promise<string|null>} null on any failure: wrong recipient/room key, tampering, malformed input */
export async function unwrapMediaKey({ iv, ct }, myPriv, senderPubB64, roomKey) {
  try {
    const aes = await wrappingKey(myPriv, senderPubB64, roomKey);
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(iv) }, aes, unb64(ct));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
