// mediaKeys.js — deliver a fresh media-encryption key to specific peers (ECDH P-256 + AES-GCM).
// The room key in the URL hash can't carry a rotated key: the user being removed already has it.
const subtle = () => globalThis.crypto.subtle;
const ALGO = { name: 'ECDH', namedCurve: 'P-256' };

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export const generateKeyPair = () => subtle().generateKey(ALGO, false, ['deriveKey']);
export const newMediaKey = () => b64(globalThis.crypto.getRandomValues(new Uint8Array(32)));
export async function exportPublic(pub) {
  return b64(await subtle().exportKey('raw', pub));
}

const sharedKey = async (priv, otherPubB64) => {
  const pub = await subtle().importKey('raw', unb64(otherPubB64), ALGO, false, []);
  return subtle().deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};

/** @returns {Promise<{iv:string, ct:string}>} */
export async function wrapMediaKey(key, hostPriv, recipientPubB64) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aes = await sharedKey(hostPriv, recipientPubB64);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(key));
  return { iv: b64(iv), ct: b64(ct) };
}

/** @returns {Promise<string|null>} null on any failure: wrong recipient, tampering, malformed input */
export async function unwrapMediaKey({ iv, ct }, myPriv, senderPubB64) {
  try {
    const aes = await sharedKey(myPriv, senderPubB64);
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(iv) }, aes, unb64(ct));
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}
