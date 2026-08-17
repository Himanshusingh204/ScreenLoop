// crypto.js — Web Crypto API for End-to-End Encrypted Chat
// Uses AES-GCM (256-bit) to ensure messages cannot be read by the server.

/**
 * Generate a random 256-bit AES-GCM key and return it as a base64url string.
 */
export async function generateRoomKey() {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return bufferToBase64Url(exported);
}

/**
 * Encrypt a plaintext string using the provided base64url key.
 * Returns a base64url string containing both the IV and Ciphertext.
 */
export async function encryptMessage(text, keyString) {
  try {
    const key = await importKey(keyString);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);

    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );

    // Combine IV and Ciphertext for easy transmission
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return bufferToBase64Url(combined);
  } catch (err) {
    console.error('Encryption failed:', err);
    return null;
  }
}

/**
 * Decrypt a base64url payload containing IV + Ciphertext using the key.
 * Returns the plaintext string, or null if decryption fails (e.g. wrong key).
 */
export async function decryptMessage(payloadString, keyString) {
  try {
    const key = await importKey(keyString);
    const combined = base64UrlToBuffer(payloadString);
    
    // AES-GCM standard IV length is 12 bytes
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function importKey(keyString) {
  const buffer = base64UrlToBuffer(keyString);
  return await window.crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert standard base64 to base64url
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url) {
  // Pad with '=' to make it a multiple of 4
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
