import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './dateUtils';

describe('formatDate', () => {
  it('formats ISO date string correctly', () => {
    const date = '2023-10-15T10:30:00Z';
    expect(formatDate(date)).toBe(new Date(date).toLocaleDateString());
  });

  it('handles invalid date', () => {
    const invalidDate = 'invalid-date';
    expect(formatDate(invalidDate)).toBe('Invalid Date');
  });
});

describe('formatDateTime', () => {
  it('formats ISO date string with time correctly', () => {
    const date = '2023-10-15T10:30:00Z';
    expect(formatDateTime(date)).toBe(new Date(date).toLocaleString());
  });

  it('handles invalid date', () => {
    const invalidDate = 'invalid-date';
    expect(formatDateTime(invalidDate)).toBe('Invalid Date');
  });
});