import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from '../formatTime';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it('labels the present moment', () => {
    expect(formatRelativeTime(Date.now())).toBe('just now');
    expect(formatRelativeTime(Date.now() - 30 * 1000)).toBe('just now');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime(Date.now() - 5 * MINUTE)).toBe('5m ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTime(Date.now() - 3 * HOUR)).toBe('3h ago');
  });

  it('formats days', () => {
    expect(formatRelativeTime(Date.now() - DAY)).toBe('yesterday');
    expect(formatRelativeTime(Date.now() - 3 * DAY)).toBe('3d ago');
  });
});