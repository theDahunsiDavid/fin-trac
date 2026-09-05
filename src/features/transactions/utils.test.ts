import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  CREDIT_TOAST_DELAY_MS,
  CREDIT_TOAST_MESSAGES,
  celebrateCredit,
  showCreditToast,
  DEBIT_TOAST_DELAY_MS,
  DEBIT_TOAST_MESSAGES,
  scheduleDebitToast,
  showDebitToast,
  TOAST_TITLE,
} from './utils';

// Keep the DOM-heavy deps out of this logic test.
vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

describe('showCreditToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom lacks matchMedia; default to "no reduced motion" so the
    // celebration takes its normal (confetti + delayed toast) path.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Extract the per-call description (the cycling message) from the mocked
  // `toast.success(title, { description })` calls.
  const descriptions = () =>
    vi
      .mocked(toast.success)
      .mock.calls.map(([, options]) => options?.description as string);

  it('shows each message in order and wraps around', () => {
    const total = CREDIT_TOAST_MESSAGES.length + 1;
    for (let i = 0; i < total; i++) {
      showCreditToast();
    }

    const messages = descriptions();

    expect(messages.slice(0, CREDIT_TOAST_MESSAGES.length)).toEqual(
      CREDIT_TOAST_MESSAGES,
    );
    // The call after the list is exhausted wraps back to the first message.
    expect(messages[CREDIT_TOAST_MESSAGES.length]).toBe(
      CREDIT_TOAST_MESSAGES[0],
    );
    // Every toast is branded with the fintrac title.
    for (const [title] of vi.mocked(toast.success).mock.calls) {
      expect(title).toBe(TOAST_TITLE);
    }
  });

  it('fires the confetti immediately and delays the toast by one beat', () => {
    vi.useFakeTimers();

    celebrateCredit({ x: 0.5, y: 0.5 });

    // Confetti fires right away...
    expect(vi.mocked(confetti)).toHaveBeenCalled();
    // ...but the toast waits for the stagger window.
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled();

    vi.advanceTimersByTime(CREDIT_TOAST_DELAY_MS - 1);
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(vi.mocked(toast.success)).toHaveBeenCalledTimes(1);

    const [, options] = vi.mocked(toast.success).mock.calls[0];
    expect(CREDIT_TOAST_MESSAGES).toContain(options?.description);
  });
});

describe('showDebitToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows each message in order and wraps around', () => {
    const total = DEBIT_TOAST_MESSAGES.length + 1;
    for (let i = 0; i < total; i++) {
      showDebitToast();
    }

    const messages = vi
      .mocked(toast.success)
      .mock.calls.map(([, options]) => options?.description as string);

    expect(messages.slice(0, DEBIT_TOAST_MESSAGES.length)).toEqual(
      DEBIT_TOAST_MESSAGES,
    );
    // The call after the list is exhausted wraps back to the first message.
    expect(messages[DEBIT_TOAST_MESSAGES.length]).toBe(
      DEBIT_TOAST_MESSAGES[0],
    );
    // Every toast is branded with the fintrac title.
    for (const [title] of vi.mocked(toast.success).mock.calls) {
      expect(title).toBe(TOAST_TITLE);
    }
  });

  it('delays the toast by one beat so it staggers behind the flight', () => {
    vi.useFakeTimers();

    scheduleDebitToast();

    // Nothing for the stagger window...
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DEBIT_TOAST_DELAY_MS - 1);
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(vi.mocked(toast.success)).toHaveBeenCalledTimes(1);

    const [, options] = vi.mocked(toast.success).mock.calls[0];
    expect(DEBIT_TOAST_MESSAGES).toContain(options?.description);
  });
});