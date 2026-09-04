import { useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { ConfettiOrigin } from "../utils";

/**
 * Everything a debit celebration needs to fly: the viewport-relative launch
 * origin and the pre-formatted amount text that rides beside the note.
 */
export interface DebitFlightPayload {
  origin: ConfettiOrigin;
  amount: string;
}

/**
 * Wall-clock flight duration. Matches the credit confetti burst (~200 rAF
 * ticks ≈ 3.3s at 60Hz; confetti is frame-driven so this is 60Hz parity).
 */
export const FLIGHT_DURATION_MS = 3300;

interface FlyingBanknoteProps extends DebitFlightPayload {
  onComplete: () => void;
}

/**
 * Renders the "money flying away" celebration for successful debit
 * transactions: a bank note (💵) with flapping wings (🪽, mirrored for the
 * left side) lifts from the submit button's position, the formatted amount
 * riding beside it, for exactly the same wall-clock duration as the credit
 * confetti burst.
 *
 * Emoji are platform-rendered: rich visuals at zero asset cost, at the cost
 * of fixed colors and per-OS differences (🪽 is Unicode 15 - older emoji
 * fonts may show a missing-glyph box).
 *
 * Rendered from `App.tsx` (not the form/modal) because the modal unmounts on
 * success - like canvas-confetti's library-owned canvas, this must outlive it.
 *
 * Accessibility: under reduced motion the flight is suppressed entirely and
 * `onComplete` fires immediately so the host state is cleared (nothing
 * lingers, and a later preference change can't replay a stale flight).
 */
export const FlyingBanknote: React.FC<FlyingBanknoteProps> = ({
  origin,
  amount,
  onComplete,
}) => {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) onComplete();
  }, [reducedMotion, onComplete]);

  if (reducedMotion) return null;

  const flapTransition = {
    duration: 0.28,
    repeat: Infinity,
    ease: "easeInOut" as const,
  };

  return (
    <div
      className="pointer-events-none fixed z-[110]"
      style={{ left: `${origin.x * 100}%`, top: `${origin.y * 100}%` }}
    >
      <motion.div
        className="flex items-center gap-0"
        initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
        animate={{
          x: 90,
          y: -150,
          rotate: 14,
          scale: [1, 1.08, 1.08],
          opacity: [1, 1, 0],
        }}
        transition={{
          duration: FLIGHT_DURATION_MS / 1000,
          ease: "easeOut",
          times: [0, 0.85, 1],
        }}
        onAnimationComplete={() => onComplete()}
      >
        {/* Left wing - 🪽 is drawn pointing right, so mirror it on a static
            wrapper. Inside the mirrored frame the element's own *left* edge is
            the bill-ward (visual right) side, so the flap origin is "left
            center". */}
        <div className="-scale-x-100 -mx-1">
          <motion.div
            style={{ transformOrigin: "left center" }}
            animate={{ scaleX: [1, 0.25, 1] }}
            transition={flapTransition}
          >
            <span
              aria-hidden="true"
              className="inline-block text-4xl leading-none drop-shadow-sm -translate-y-2"
            >
              🪽
            </span>
          </motion.div>
        </div>
        {/* Platform-rendered bank note. Decorative. Pulled inward with the
            wings so the drawn glyph edges sit tight against them. */}
        <span
          aria-hidden="true"
          className="inline-block text-4xl leading-none drop-shadow-sm -mx-1"
        >
          💵
        </span>
        {/* Right wing - 🪽 points right natively; its root is the left edge,
            so the flap origin is "left center" (bill-ward). */}
        <motion.div
          style={{ transformOrigin: "left center" }}
          animate={{ scaleX: [1, 0.25, 1] }}
          transition={flapTransition}
          className="-mx-1"
        >
          <span
            aria-hidden="true"
            className="inline-block text-4xl leading-none drop-shadow-sm -translate-y-2"
          >
            🪽
          </span>
        </motion.div>
        <span className="font-mono text-lg font-bold text-gray-900 ml-1.5">
          {amount}
        </span>
      </motion.div>
    </div>
  );
};
