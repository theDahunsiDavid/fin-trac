import confetti from "canvas-confetti";
import { toast } from "sonner";

/**
 * Feature-level utilities for the transactions module.
 */

/** Chart palette colors used for the credit celebration burst. */
export const CREDIT_CONFETTI_COLORS = [
  "#34d399", // emerald-400
  "#60a5fa", // blue-400
  "#fbbf24", // amber-400
  "#fb7185", // rose-400
];

/** Viewport-relative confetti origin (fractions of window width/height, 0-1). */
export interface ConfettiOrigin {
  x: number;
  y: number;
}

/**
 * Converts a DOM element's screen position to a viewport-relative confetti
 * origin (`canvas-confetti` expects fractions, not pixels). Falls back to the
 * viewport center when the element is not mounted.
 */
export function elementToConfettiOrigin(
  el: HTMLElement | null,
): ConfettiOrigin {
  if (!el) return { x: 0.5, y: 0.5 };

  const rect = el.getBoundingClientRect();
  return {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };
}

/**
 * Brand title shown on every toast; the message rides as the description.
 */
export const TOAST_TITLE = "fintrac";

/**
 * Praise messages cycled through on each successful credit transaction.
 */
export const CREDIT_TOAST_MESSAGES = [
  "Na man you be!",
  "You bad no worry! 😎",
  "You na Odogwu normally! 🎖️",
];

let creditToastIndex = 0;

/**
 * Shows the next credit praise message as a toast, cycling through the list
 * on each successful credit transaction.
 */
export function showCreditToast(): void {
  const message =
    CREDIT_TOAST_MESSAGES[creditToastIndex % CREDIT_TOAST_MESSAGES.length];
  creditToastIndex += 1;
  toast.success(TOAST_TITLE, { description: message });
}

/**
 * Delay before the praise toast appears after the confetti burst, in ms.
 * Matches the burst's own wall-clock run (~200 rAF ticks ≈ 3.3s at 60Hz) so
 * the toast lands as the animation ends, not while it's mid-climax.
 */
export const CREDIT_TOAST_DELAY_MS = 3300;

/** Total particle count across all layers of the celebration burst. */
const REALISTIC_COUNT = 200;

/**
 * Fires a one-shot multi-layer confetti burst from the given origin,
 * based on the canvas-confetti "Realistic Look" demo, then shows the praise
 * toast as the burst winds down so the message doesn't compete with it.
 *
 * Five synchronous layers (tight fast core -> wide slow scatter) stack into a
 * single natural-looking explosion. The try/catch makes this a no-op in
 * canvas-less environments (e.g. jsdom). The toast is delayed only when the
 * confetti actually plays: under reduced motion the toast fires immediately
 * (there's no visual competition, so a delay would just read as lag).
 */
export function celebrateCredit(origin: ConfettiOrigin): void {
  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  if (reducedMotion) {
    showCreditToast();
    return;
  }

  try {
    const defaults = {
      origin,
      colors: CREDIT_CONFETTI_COLORS,
      disableForReducedMotion: true,
    };

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(REALISTIC_COUNT * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });

    // Fire-and-forget: self-containing timer, safe past the modal unmount.
    // The toast lands as the burst winds down, so attention jumps from the
    // confetti to the message instead of sharing it mid-flight.
    setTimeout(showCreditToast, CREDIT_TOAST_DELAY_MS);
  } catch {
    // no-op: no canvas support (e.g. jsdom)
  }
}

/**
 * Mocking "concern" messages cycled through on each successful debit
 * transaction, mirroring the credit praise trio.
 */
export const DEBIT_TOAST_MESSAGES = [
  "Potential poverty noted. ✍️",
  "Spend on! I go dey update you on your failure. 😐",
  "Another capital buried. 🥀 🪦",
];

let debitToastIndex = 0;

/**
 * Shows the next debit concern message as a toast, cycling through the list
 * on each successful debit transaction. `success` styling keeps the visual
 * language identical to the credit toasts (checkmark, green tint).
 */
export function showDebitToast(): void {
  const message =
    DEBIT_TOAST_MESSAGES[debitToastIndex % DEBIT_TOAST_MESSAGES.length];
  debitToastIndex += 1;
  toast.success(TOAST_TITLE, { description: message });
}

/** Delay before the debit toast appears after the flight ends, in ms. */
export const DEBIT_TOAST_DELAY_MS = 3300;

/**
 * Schedules the debit toast so it lands as the flight ends (~3.3s), not
 * while the animation is mid-climax where it would compete for attention.
 */
export function scheduleDebitToast(): void {
  window.setTimeout(showDebitToast, DEBIT_TOAST_DELAY_MS);
}