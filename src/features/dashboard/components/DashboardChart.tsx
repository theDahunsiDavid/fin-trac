import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Transaction } from "../../transactions/types";
import { plotWidth, tooltipPlacement, TAP_TOLERANCE_PX } from "../utils";
import type { TooltipBox } from "../utils";

interface DashboardChartProps {
  transactions: Transaction[];
  balance: number;
}

/**
 * Custom tooltip for the balance chart: the same label + balance rows as
 * before, plus the transaction description as a smaller-font third row.
 *
 * Rendered in a portal to document.body so the scroll-clipped viewport can't
 * cut it off - Recharts drops all wrapper positioning when a portal is used
 * (see TooltipBoundingBox: `hasPortalFromProps ? {} : ...`), so this content
 * positions itself: fixed at the tapped point's screen coordinates, clamped
 * inside the visible viewport by tooltipPlacement.
 */
interface BalanceTooltipPayloadItem {
  value?: number | string;
  payload?: {
    description?: string;
    transactionIndex?: number;
  };
}

interface BalanceTooltipProps {
  active?: boolean;
  payload?: BalanceTooltipPayloadItem[];
  coordinate?: { x?: number; y?: number };
  /** Sticky touch guard: while a drag/scroll gesture is (or was) active,
   *  Recharts' touch-activated tooltip stays hidden. See scroll-fix.md. */
  suppressed?: boolean;
}

const TOOLTIP_GAP = 10;

const BalanceTooltip: React.FC<BalanceTooltipProps> = ({
  active,
  payload,
  coordinate,
  suppressed,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<TooltipBox | null>(null);

  // Measure the rendered box once we have content, so placement can keep it
  // fully inside the viewport (size is only known after render, hence the
  // layout effect; one invisible frame while measuring is imperceptible).
  useLayoutEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBox({ width: rect.width, height: rect.height });
      }
    }
  }, [active, payload]);

  if (!active || !payload || payload.length === 0) return null;
  if (suppressed) return null;

  const item = payload[0];
  const description = item.payload?.description;
  const index = item.payload?.transactionIndex ?? 0;
  const amount = typeof item.value === "number" ? item.value : 0;

  // Anchor at the tapped point. Plot-space coordinates from Recharts are
  // relative to the SVG, whose on-screen rect already includes the scroll
  // offset, so pointX/pointY come out as true screen positions; the clamp
  // bounds come from the visible viewport (the plot itself is wider).
  let placement: { left: number; top: number } | null = null;
  const viewport = document
    .getElementById("balance-plot-surface")
    ?.getBoundingClientRect();
  const plot = document
    .querySelector("#balance-plot-surface svg")
    ?.getBoundingClientRect();
  const x = coordinate?.x;
  const y = coordinate?.y;
  if (
    viewport &&
    plot &&
    typeof x === "number" &&
    typeof y === "number" &&
    box
  ) {
    placement = tooltipPlacement(
      plot.left + x,
      plot.top + y,
      {
        left: viewport.left,
        top: viewport.top,
        right: viewport.right,
        bottom: viewport.bottom,
      },
      box,
      TOOLTIP_GAP,
    );
  }

  const style: React.CSSProperties = placement
    ? {
        position: "fixed",
        left: placement.left,
        top: placement.top,
        zIndex: 50,
      }
    : {
        position: "fixed",
        left: 0,
        top: 0,
        visibility: "hidden",
        zIndex: 50,
      };

  return (
    <div
      ref={ref}
      style={style}
      className="pointer-events-none rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md"
    >
      <p className="text-sm font-medium text-gray-900">
        Transaction {index + 1}
      </p>
      <p className="text-sm text-gray-700">
        Balance: ₦{amount.toLocaleString()}
      </p>
      {description && (
        <p className="max-w-[240px] text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
};

const PLOT_HEIGHT = 300;

/** Share one axis formatter between the fixed axis column and the plot. */
const formatAxisTick = (value: number): string => {
  if (value === 0) return "₦0";
  if (Math.abs(value) >= 1000) {
    return `₦${(value / 1000).toFixed(0)}K`;
  }
  return `₦${value}`;
};

/**
 * Renders the "Balance Over Time" line chart as a fixed-pitch strip inside a
 * horizontally scrollable viewport.
 *
 * History navigation is native panning, not a scrubber: the plot renders every
 * point at PITCH pixels apart with a constant Y-axis scale, and the browser's
 * overflow scrolling does the rest (two-finger trackpad drag, touch swipe,
 * shift+wheel). Because the scroll offset changes without the chart data
 * changing, nothing re-renders or re-animates mid-drag, so the user can always
 * trace where they are - and the Recharts line entry animation still plays on
 * a fresh visit (gated by prefers-reduced-motion). The axis is a fixed column
 * to the left so the scale never slides out of view. See logs/balance-scroll.md.
 *
 * Assumptions:
 * - transactions prop provides an array of Transaction objects with date and amount properties.
 * - balance prop provides the current calculated balance for line coloring.
 * - Recharts library is available and configured correctly.
 * - Parent component manages all data fetching and state updates.
 *
 * Edge cases:
 * - Handles empty data arrays gracefully, showing an empty chart.
 * - Y-axis is formatted as NGN currency, assuming all transactions use this currency.
 * - Constant domain (full-history min/max) means panning never changes the
 *   line's shape - only its horizontal position.
 * - On fresh visits the view is pinned to the newest points; if a new
 *   transaction lands while the viewer is at the edge it stays pinned, and a
 *   parked (scrolled-into-history) view is never yanked forward.
 * - Deliberately no max-visible window: the visible point count is whatever
 *   fits the card width at PITCH, ~5 on desktop.
 *
 * Connections:
 * - Consumes data from parent component props instead of useDashboardData hook.
 * - Displays transaction trends, complementing the TransactionForm for data entry.
 * - Integrated into App.tsx as part of the dashboard section with prop-based data flow.
 * - No direct hook dependencies, ensuring clean separation of concerns.
 */
export const DashboardChart: React.FC<DashboardChartProps> = ({
  transactions,
  balance,
}) => {
  // Chart data - running balance over time, memoized for performance
  const data = useMemo(() => {
    let runningBalance = 0;
    return transactions
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((t, index) => {
        runningBalance += t.type === "credit" ? t.amount : -t.amount;
        return {
          date: new Date(t.date).toLocaleDateString(),
          dateTime: new Date(t.date).toLocaleString(),
          amount: runningBalance,
          transactionIndex: index,
          description: t.description,
        };
      });
  }, [transactions]);

  // Constant Y domain across the whole history: the line changes shape
  // only when transactions are added/removed, never while panning.
  const balances = data.map((d) => d.amount);
  const lo = Math.min(0, ...balances);
  const hi = Math.max(0, ...balances);
  const domain: [number, number] = lo === hi ? [lo - 1, hi + 1] : [lo, hi];

  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  // Scroll-pinning: fresh visits open on the newest points; growth while at
  // the newest edge stays pinned; a parked view in history is never yanked.
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevDataLenRef = useRef(data.length);
  const wasAtEndRef = useRef(false);
  const isFirstDataRef = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isFirstDataRef.current) {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
      wasAtEndRef.current = true;
      isFirstDataRef.current = false;
    } else if (
      data.length > prevDataLenRef.current &&
      wasAtEndRef.current
    ) {
      el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
    }
    prevDataLenRef.current = data.length;
  }, [data.length]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    wasAtEndRef.current =
      el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
  };

  // Touch tooltip suppression: Recharts activates its tooltip on ANY
  // touchmove over the plot (elementFromPoint), so a scroll across the chart
  // would light it up and leave it stuck - mobile browsers only synthesize
  // the mouse-leave that clears it for taps, not scrolls. We track the
  // gesture ourselves: past TAP_TOLERANCE_PX of travel it is a drag/scroll,
  // not a tap - suppress the tooltip and keep it suppressed (sticky) until
  // the NEXT touchstart re-arms. See logs/scroll-fix.md.
  //
  // Native listeners on the viewport (not LineChart's onTouch* props):
  // Recharts types chart-level touch props as its legacy mouse-style
  // CategoricalChartFunc, which would need casts; the strip's element is
  // already ours and events from any touch over the plot bubble up to it.
  const [tooltipSuppressed, setTooltipSuppressed] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      }
      setTooltipSuppressed(false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !touchStartRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      if (dx * dx + dy * dy > TAP_TOLERANCE_PX * TAP_TOLERANCE_PX) {
        setTooltipSuppressed(true);
      }
    };

    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // Stretch the plot canvas to at least the viewport width: history panning
  // sizes the SVG to the data (PITCH per point), which leaves sparse
  // datasets - or none at all - with half the card blank: no grid lines, and
  // the X-axis baseline cut off midway. Grid and axes are drawn across the
  // full canvas, so filling the card keeps the empty chart intact. Measured
  // in a layout effect (pre-paint, so no width flash) and kept in sync by a
  // ResizeObserver for window/card size changes.
  const [viewWidth, setViewWidth] = useState(0);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") {
      return; // jsdom/test environments have no layout to observe
    }
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // The canvas is data-sized (PITCH per point) but never narrower than the
  // viewport: a sparse history (or none yet) still shows a full card of grid
  // lines and the X-axis baseline instead of a half-blank chart.
  const plotWidthPx = Math.max(plotWidth(data.length), viewWidth);

  return (
    <div className="flex items-stretch">
      {/* Fixed axis column: stays put while the plot pans underneath, so the
          balance scale is always visible as a reference. */}
      <div className="w-16 shrink-0">
        <ResponsiveContainer width="100%" height={PLOT_HEIGHT}>
          <LineChart className="axis-chart" data={data}>
            <YAxis
              domain={domain}
              tickFormatter={formatAxisTick}
              tick={{ fontSize: 12 }}
              width={60}
              axisLine={false}
            />
            {/* Recharts v3 only generates Y-axis ticks when a graphical item
                is present in the chart; this invisible line makes the labels
                render without drawing anything. */}
            <Line
              dataKey="amount"
              stroke="transparent"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pannable plot: native overflow scrolling is the two-finger/touch
          gesture - no custom pointer math, no re-render while moving. */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chart-scroll hide-scrollbar flex-1"
        id="balance-plot-surface"
        data-testid="chart-scroll"
        aria-label="Balance over time. Two-finger drag or swipe to explore earlier points."
      >
        <LineChart
          width={plotWidthPx}
          height={PLOT_HEIGHT}
          data={data}
          className="plot-chart"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="transactionIndex" tick={false} />
          <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" />
          {/* Portal the tooltip to the body so the scroll-clipped viewport
              can't cut it off near the newest points. The suppressed prop
              hides it during (and after) a drag/scroll until the next tap. */}
          <Tooltip
            content={<BalanceTooltip suppressed={tooltipSuppressed} />}
            portal={document.body}
          />
          <Line
            type="linear"
            dataKey="amount"
            stroke={balance >= 0 ? "#10b981" : "#ef4444"}
            strokeWidth={2}
            dot={{ fill: balance >= 0 ? "#10b981" : "#ef4444" }}
            isAnimationActive={!reduceMotion}
          />
        </LineChart>
      </div>
    </div>
  );
};