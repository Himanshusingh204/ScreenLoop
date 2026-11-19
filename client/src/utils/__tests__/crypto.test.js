import { describe, it, expect } from 'vitest';
import { generateRoomKey, encryptMessage, decryptMessage } from '../crypto';

describe('WebCrypto AES-GCM End-to-End Chat Encryption', () => {
  it('should generate a base64url room key', async () => {
    const key = await generateRoomKey();
    expect(key).toBeDefined();
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(20);
    // Base64url should not have +, /, or =
    expect(key).not.toMatch(/[+/=]/);
  });

  it('should encrypt and decrypt a message round-trip', async () => {
    const key = await generateRoomKey();
    const originalText = 'Hello Movie Night 🍿';

    const encrypted = await encryptMessage(originalText, key);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalText);

    const decrypted = await decryptMessage(encrypted, key);
    expect(decrypted).toBe(originalText);
  });

  it('should return null when decrypting with an incorrect key', async () => {
    const key1 = await generateRoomKey();
    const key2 = await generateRoomKey();
    const message = 'Confidential dialogue';

    const encrypted = await encryptMessage(message, key1);
    const decryptedWithWrongKey = await decryptMessage(encrypted, key2);

    expect(decryptedWithWrongKey).toBeNull();
  });
});
