import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency } from './currencyUtils';

describe('formatCurrency', () => {
  it('formats USD amount correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('formats NGN amount correctly', () => {
    expect(formatCurrency(5000, 'NGN')).toMatch(/NGN.*5,000\.00/);
  });

  it('defaults to USD when no currency provided', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('handles negative amounts', () => {
    expect(formatCurrency(-500, 'USD')).toBe('-$500.00');
  });

  it('handles zero amount', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('handles decimal amounts', () => {
    expect(formatCurrency(12.345, 'USD')).toBe('$12.35');
  });
});

describe('parseCurrency', () => {
  it('parses USD string correctly', () => {
    expect(parseCurrency('$1,234.56')).toBe(1234.56);
  });

  it('parses NGN string correctly', () => {
    expect(parseCurrency('₦5,000.00')).toBe(5000);
  });

  it('parses plain number string', () => {
    expect(parseCurrency('1234.56')).toBe(1234.56);
  });

  it('handles negative amounts', () => {
    expect(parseCurrency('-$500.00')).toBe(-500);
  });

  it('returns NaN for invalid input', () => {
    expect(parseCurrency('abc')).toBeNaN();
  });

  it('handles empty string', () => {
    expect(parseCurrency('')).toBeNaN();
  });

  it('strips multiple currency symbols', () => {
    expect(parseCurrency('$$123.45')).toBe(123.45);
  });
});