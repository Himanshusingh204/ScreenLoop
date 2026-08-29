import { describe, it, expect, beforeEach } from 'vitest';
import { getRecentRooms, addRecentRoom, clearRecentRooms } from '../recentRooms';

describe('recentRooms', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list initially', () => {
    expect(getRecentRooms()).toEqual([]);
  });

  it('stores a room visit newest-first', () => {
    addRecentRoom('room-1');
    addRecentRoom('room-2');
    const rooms = getRecentRooms();
    expect(rooms.map((r) => r.roomId)).toEqual(['room-2', 'room-1']);
  });

  it('deduplicates by roomId and bumps to the front', () => {
    addRecentRoom('room-1');
    addRecentRoom('room-2');
    addRecentRoom('room-1');
    const rooms = getRecentRooms();
    expect(rooms.map((r) => r.roomId)).toEqual(['room-1', 'room-2']);
    expect(rooms).toHaveLength(2);
  });

  it('caps the history at 10 rooms', () => {
    for (let i = 0; i < 15; i++) addRecentRoom(`room-${i}`);
    expect(getRecentRooms()).toHaveLength(10);
  });

  it('ignores invalid or empty room ids', () => {
    addRecentRoom('');
    addRecentRoom(null);
    expect(getRecentRooms()).toEqual([]);
  });

  it('clears the history', () => {
    addRecentRoom('room-1');
    clearRecentRooms();
    expect(getRecentRooms()).toEqual([]);
  });
});