import { describe, it, expect } from 'vitest';
import { filterMessages } from '../chatFilter';

const msgs = [
  { id: 1, text: 'Hello World' },
  { id: 2, text: 'joined the room', system: true },
  { id: 3, text: 'bye' },
];

describe('filterMessages', () => {
  it('returns all messages for empty/blank search', () => {
    expect(filterMessages(msgs, '')).toBe(msgs);
    expect(filterMessages(msgs, '   ')).toBe(msgs);
    expect(filterMessages(msgs, undefined)).toBe(msgs);
  });
  it('matches case-insensitively', () => {
    expect(filterMessages(msgs, 'WORLD').map((m) => m.id)).toEqual([1]);
  });
  it('excludes system messages while searching', () => {
    expect(filterMessages(msgs, 'room')).toEqual([]);
  });
});
