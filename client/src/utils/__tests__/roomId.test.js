import { describe, it, expect } from 'vitest';
import { generateRoomId, buildRoomLink } from '../roomId';

describe('generateRoomId', () => {
  it('generates a 10-character ID', () => {
    const id = generateRoomId();
    expect(id).toHaveLength(10);
  });

  it('generates only alphanumeric characters', () => {
    const id = generateRoomId();
    expect(id).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRoomId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('buildRoomLink', () => {
  it('builds a link with room ID', () => {
    const link = buildRoomLink('test123', null);
    expect(link).toContain('/room/test123');
    expect(link).not.toContain('#');
  });

  it('builds a link with room ID and key', () => {
    const link = buildRoomLink('test123', 'mykey');
    expect(link).toContain('/room/test123#mykey');
  });
});
