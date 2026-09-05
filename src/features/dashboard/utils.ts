/**
 * Feature-level utilities for the dashboard module.
 */

/** Horizontal pixel spacing between consecutive chart points. */
export const PITCH = 72;

/**
 * Finger movement (in device pixels) before a touch on the chart is
 * considered a drag/scroll instead of a tap. Below this, the touch is a tap
 * and the tooltip may show; at or beyond it, the tooltip is suppressed until
 * the next gesture begins. See logs/scroll-fix.md.
 */
export const TAP_TOLERANCE_PX = 10;

/**
 * Chart width for n points: one full band per point. Points sit at band
 * centers, so the first and last keep half a band of breathing room, and the
 * plot is always at least two bands wide so tiny datasets don't collapse.
 */
export function plotWidth(n: number): number {
  return Math.max(n * PITCH, PITCH * 2);
}

/** A rectangle in screen coordinates. */
export interface SurfaceRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The tooltip's own on-screen size. */
export interface TooltipBox {
  width: number;
  height: number;
}

/**
 * Where to place a tooltip whose anchor point is at (pointX, pointY) inside
 * the given viewport rectangle. The tooltip prefers the point's right and
 * above it, flipping to the left / below when it would run off the viewport,
 * and then clamping so the whole box stays on screen. This re-implements the
 * placement the pannable chart needs: the plot is wider than the visible
 * viewport, so Recharts' own boundary logic (which flips against the full
 * plot width) is wrong for the newest points.
 */
export function tooltipPlacement(
  pointX: number,
  pointY: number,
  surface: SurfaceRect,
  box: TooltipBox,
  gap = 10,
): { left: number; top: number } {
  let left = pointX + gap;
  if (left + box.width > surface.right) {
    left = pointX - gap - box.width;
  }
  const leftClampMax = Math.max(surface.left, surface.right - box.width);
  left = Math.min(Math.max(left, surface.left), leftClampMax);

  let top = pointY - gap - box.height;
  if (top < surface.top) {
    top = pointY + gap;
  }
  top = Math.max(top, surface.top);

  return { left, top };
}