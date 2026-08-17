const {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  findRoomBySocket,
  getParticipants,
  transferHost,
  MAX_PARTICIPANTS,
} = require('../src/roomManager');

describe('createRoom', () => {
  it('creates a room with host', () => {
    const room = createRoom('test1', 'host-socket', 'Host', null);
    expect(room.id).toBe('test1');
    expect(room.hostId).toBe('host-socket');
    expect(room.participants.size).toBe(1);
  });

  it('creates a room with PIN', () => {
    const room = createRoom('test2', 'host-socket', 'Host', '1234');
    expect(room.pin).toBe('1234');
  });
});

describe('joinRoom', () => {
  it('adds participant to room', () => {
    createRoom('join-test', 'host-1', 'Host');
    const room = joinRoom('join-test', 'viewer-1', 'Viewer');
    expect(room.participants.size).toBe(2);
  });

  it('rejects wrong PIN', () => {
    createRoom('pin-test', 'host-1', 'Host', 'secret');
    expect(() => joinRoom('pin-test', 'v-1', 'V', 'wrong')).toThrow('Incorrect PIN');
  });

  it('rejects room full', () => {
    createRoom('full-test', 'host-1', 'Host');
    for (let i = 0; i < MAX_PARTICIPANTS - 1; i++) {
      joinRoom('full-test', `viewer-${i}`, `V${i}`);
    }
    expect(() => joinRoom('full-test', 'extra', 'Extra')).toThrow('Room is full');
  });

  it('rejects duplicate join', () => {
    createRoom('dup-test', 'host-1', 'Host');
    expect(() => joinRoom('dup-test', 'host-1', 'Host Again')).toThrow('Already in room');
  });
});

describe('leaveRoom', () => {
  it('promotes new host when host leaves', () => {
    createRoom('lvhost-a', 'sock-a1', 'Host A');
    joinRoom('lvhost-a', 'sock-b1', 'Viewer B');
    const room = getRoom('lvhost-a');
    expect(room.participants.has('sock-a1')).toBe(true);
    expect(room.participants.has('sock-b1')).toBe(true);
    expect(room.participants.size).toBe(2);
    const result = leaveRoom('lvhost-a', 'sock-a1');
    expect(result.wasHost).toBe(true);
    expect(result.newHostId).toBe('sock-b1');
  });

  it('deletes room when last person leaves', () => {
    createRoom('lvdlt-a', 'sock-c1', 'Host C');
    leaveRoom('lvdlt-a', 'sock-c1');
    expect(getRoom('lvdlt-a')).toBeNull();
  });
});

describe('transferHost', () => {
  it('transfers host to another participant', () => {
    createRoom('transfer-test-u', 'host-tu1', 'Host');
    joinRoom('transfer-test-u', 'viewer-tu1', 'Viewer');
    const result = transferHost('transfer-test-u', 'host-tu1', 'viewer-tu1');
    expect(result).toBe(true);
    const room = getRoom('transfer-test-u');
    expect(room.hostId).toBe('viewer-tu1');
  });

  it('rejects transfer from non-host', () => {
    createRoom('transfer-test2-u', 'host-tu2', 'Host');
    joinRoom('transfer-test2-u', 'viewer-tu2', 'Viewer');
    const result = transferHost('transfer-test2-u', 'viewer-tu2', 'host-tu2');
    expect(result).toBe(false);
  });
});

describe('findRoomBySocket', () => {
  it('finds room for socket', () => {
    createRoom('find-test', 'find-host-1', 'Host');
    const found = findRoomBySocket('find-host-1');
    expect(found).not.toBeNull();
    expect(found.roomId).toBe('find-test');
  });

  it('returns null for unknown socket', () => {
    expect(findRoomBySocket('unknown-socket-id')).toBeNull();
  });
});

describe('getParticipants', () => {
  it('returns participant list', () => {
    createRoom('part-test', 'part-host-1', 'Host');
    joinRoom('part-test', 'part-viewer-1', 'Viewer');
    const list = getParticipants('part-test');
    expect(list).toHaveLength(2);
    expect(list[0].isHost).toBe(true);
  });
});
