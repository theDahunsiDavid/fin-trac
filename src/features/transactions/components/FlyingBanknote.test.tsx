import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import {
  hasReducedMotionListener,
  initPrefersReducedMotion,
} from 'motion/react';
import { FlyingBanknote } from './FlyingBanknote';

describe('FlyingBanknote', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom lacks matchMedia; motion's useReducedMotion needs a full
    // MediaQueryList-like object. Default: no reduced motion.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  });

  it('renders a fixed, click-through flight with note, wings and amount', () => {
    const { container } = render(
      <FlyingBanknote
        origin={{ x: 0.5, y: 0.5 }}
        amount="₦1,250.00"
        onComplete={onComplete}
      />
    );

    const layer = container.firstElementChild as HTMLElement;
    expect(layer.className).toContain('fixed');
    expect(layer.className).toContain('pointer-events-none');
    expect(layer.className).toContain('z-[110]');

    // Platform-rendered emoji: 💵 bill + two 🪽 wings; amount text rides
    // beside them. No SVG assets needed.
    expect(container.querySelectorAll('svg')).toHaveLength(0);
    const text = container.textContent ?? '';
    expect(text).toContain('💵');
    expect(text.match(/🪽/g) ?? []).toHaveLength(2);
    expect(text).toContain('₦1,250.00');

    // Completion is driven by the animation, never synchronous on mount.
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('renders nothing and completes immediately under reduced motion', () => {
    // motion's `useReducedMotion` initializes `prefersReducedMotion` once per
    // module (on the first hook call, guarded by `hasReducedMotionListener`),
    // seeds React state at mount from that cache, and never re-subscribes. To
    // simulate a user with reduced motion after the normal-path test already
    // initialized the cache with `matches: false`, reset the guard and
    // re-initialize while matchMedia reports the preference.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        // motion queries the bare feature (not ": reduce"); matches must be
        // true to signal the preference.
        matches: true,
        media: '(prefers-reduced-motion)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    hasReducedMotionListener.current = false;
    initPrefersReducedMotion();

    const { container } = render(
      <FlyingBanknote
        origin={{ x: 0.5, y: 0.5 }}
        amount="₦1,250.00"
        onComplete={onComplete}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});