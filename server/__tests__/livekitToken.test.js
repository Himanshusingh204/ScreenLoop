import { describe, it, expect } from 'vitest';
import { generateLiveKitToken, LIVEKIT_URL } from '../src/livekitToken';

describe('LiveKit Token Generator', () => {
  it('should export a default LIVEKIT_URL', () => {
    expect(LIVEKIT_URL).toBeDefined();
    expect(typeof LIVEKIT_URL).toBe('string');
  });

  it('should generate a valid JWT token for a participant', async () => {
    const token = await generateLiveKitToken({
      roomId: 'test-room-101',
      participantName: 'Alice',
      isHost: true,
      metadata: { gender: 'female' },
    });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    // JWT has 3 base64 parts separated by dots
    const parts = token.split('.');
    expect(parts.length).toBe(3);
  });

  it('should reject invalid roomId or participantName', async () => {
    await expect(
      generateLiveKitToken({ roomId: '', participantName: 'Alice' })
    ).rejects.toThrow('Invalid roomId');

    await expect(
      generateLiveKitToken({ roomId: 'room-1', participantName: '' })
    ).rejects.toThrow('Invalid participantName');
  });
});
