import { describe, it, expect, vi } from 'vitest';
import { afterEach, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DashboardChart } from './DashboardChart';
import { PITCH, plotWidth, tooltipPlacement } from '../utils';
import type { Transaction } from '../../transactions/types';

// Mock Recharts components
// Captures the Tooltip's content element so tests can read the `suppressed`
// flag that the chart hands to the tooltip during touch gestures.
const tooltipCapture: { content?: React.ReactElement } = {};

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children, data, className, width }: { children: React.ReactNode; data: unknown; className?: string; width?: number }) => (
    <div
      data-testid={className === 'axis-chart' ? 'axis-chart' : 'plot-chart'}
      data-data={JSON.stringify(data)}
      data-width={width}
    >
      {children}
    </div>
  ),
  Line: (props: { isAnimationActive?: boolean }) => <div data-testid="line" data-anim={String(props.isAnimationActive)} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: (props: { content?: React.ReactElement }) => {
    tooltipCapture.content = props.content;
    return <div data-testid="tooltip" />;
  },
  ReferenceLine: () => <div data-testid="reference-line" />,
}));

describe('DashboardChart', () => {
  it('renders chart components', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Income',
        amount: 1000,
        currency: 'NGN',
        type: 'credit',
        category: 'Salary',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2023-01-02',
        description: 'Expense',
        amount: 200,
        currency: 'NGN',
        type: 'debit',
        category: 'Food',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      },
    ];

    render(<DashboardChart transactions={transactions} balance={800} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('plot-chart')).toBeInTheDocument();
    expect(screen.getByTestId('axis-chart')).toBeInTheDocument();
    // One invisible Line in the axis chart (forces Y-axis ticks to render),
    // one real Line in the plot.
    expect(within(screen.getByTestId('axis-chart')).getByTestId('line')).toBeInTheDocument();
    expect(within(screen.getByTestId('plot-chart')).getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('reference-line')).toBeInTheDocument();
    // No scrubber: history is panned on the plot itself.
    expect(screen.queryByTestId('brush')).toBeNull();
  });

  it('calculates running balance data correctly', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        date: '2023-01-01',
        description: 'Income',
        amount: 500,
        currency: 'NGN',
        type: 'credit',
        category: 'Salary',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: '2',
        date: '2023-01-02',
        description: 'Expense',
        amount: 100,
        currency: 'NGN',
        type: 'debit',
        category: 'Food',
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      },
      {
        id: '3',
        date: '2023-01-03',
        description: 'Income 2',
        amount: 300,
        currency: 'NGN',
        type: 'credit',
        category: 'Freelance',
        createdAt: '2023-01-03T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
      },
    ];

    render(<DashboardChart transactions={transactions} balance={700} />);

    const chart = screen.getByTestId('plot-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data).toEqual([
      { date: new Date('2023-01-01').toLocaleDateString(), amount: 500 },
      { date: new Date('2023-01-02').toLocaleDateString(), amount: 400 },
      { date: new Date('2023-01-03').toLocaleDateString(), amount: 700 },
    ]);
  });

  it('handles empty transactions array', () => {
    render(<DashboardChart transactions={[]} balance={0} />);

    const chart = screen.getByTestId('plot-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data).toEqual([]);
  });

  it('sorts transactions by date', () => {
    const transactions: Transaction[] = [
      {
        id: '2',
        date: '2023-01-03',
        description: 'Later transaction',
        amount: 100,
        currency: 'NGN',
        type: 'credit',
        category: 'Test',
        createdAt: '2023-01-03T00:00:00Z',
        updatedAt: '2023-01-03T00:00:00Z',
      },
      {
        id: '1',
        date: '2023-01-01',
        description: 'Earlier transaction',
        amount: 200,
        currency: 'NGN',
        type: 'credit',
        category: 'Test',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    render(<DashboardChart transactions={transactions} balance={300} />);

    const chart = screen.getByTestId('plot-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data[0].amount).toBe(200); // First transaction (earlier date)
    expect(data[1].amount).toBe(300); // Running balance after second transaction
  });
});

// Convenience: an ordered list of n credit transactions.
function nTransactions(n: number): Transaction[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i + 1),
    date: `2023-01-${String(i + 1).padStart(2, '0')}`,
    description: `Tx ${i + 1}`,
    amount: 100,
    currency: 'NGN',
    type: 'credit' as const,
    category: 'Test',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  }));
}

describe('balance chart panning', () => {
  // jsdom has no layout engine, so scrollWidth/clientWidth are 0. Install
  // geometry on Element.prototype ahead of each render so the component's
  // pinning logic runs against realistic metrics.
  const proto = Element.prototype as unknown as Record<string, unknown>;
  const origScrollWidth = Object.getOwnPropertyDescriptor(proto, 'scrollWidth');
  const origClientWidth = Object.getOwnPropertyDescriptor(proto, 'clientWidth');
  let points = 7;
  const clientWidth = 360;

  const isViewport = (el: unknown): boolean =>
    el instanceof HTMLElement && el.classList.contains('chart-scroll');

  beforeEach(() => {
    points = 7;
    Object.defineProperty(proto, 'scrollWidth', {
      configurable: true,
      get() {
        return isViewport(this) ? plotWidth(points) : 0;
      },
    });
    Object.defineProperty(proto, 'clientWidth', {
      configurable: true,
      get() {
        return isViewport(this) ? clientWidth : 0;
      },
    });
  });

  afterEach(() => {
    if (origScrollWidth) {
      Object.defineProperty(proto, 'scrollWidth', origScrollWidth);
    } else {
      delete proto.scrollWidth;
    }
    if (origClientWidth) {
      Object.defineProperty(proto, 'clientWidth', origClientWidth);
    } else {
      delete proto.clientWidth;
    }
  });

  it('renders the plot at a fixed pitch (PITCH per point) with a pinned axis column', () => {
    render(<DashboardChart transactions={nTransactions(7)} balance={700} />);

    const plot = screen.getByTestId('plot-chart');
    expect(Number(plot.getAttribute('data-width'))).toBe(7 * PITCH);
    expect(screen.getByTestId('axis-chart')).toBeInTheDocument();
  });

  it('opens pinned to the newest points on a fresh visit', () => {
    render(<DashboardChart transactions={nTransactions(7)} balance={700} />);

    const viewport = screen.getByTestId('chart-scroll');
    expect(viewport.scrollLeft).toBe(7 * PITCH - clientWidth);
  });

  it('stays pinned to the newest points when data grows while at the edge', () => {
    const { rerender } = render(
      <DashboardChart transactions={nTransactions(7)} balance={700} />,
    );
    const viewport = screen.getByTestId('chart-scroll');
    expect(viewport.scrollLeft).toBe(7 * PITCH - clientWidth); // pinned at mount

    points = 9;
    rerender(<DashboardChart transactions={nTransactions(9)} balance={900} />);

    expect(viewport.scrollLeft).toBe(9 * PITCH - clientWidth); // re-pinned
  });

  it('does not yank the view forward when exploring history', () => {
    const { rerender } = render(
      <DashboardChart transactions={nTransactions(7)} balance={700} />,
    );
    const viewport = screen.getByTestId('chart-scroll');

    viewport.scrollLeft = 100;
    fireEvent.scroll(viewport); // user panned away from the edge

    points = 9;
    rerender(<DashboardChart transactions={nTransactions(9)} balance={900} />);

    expect(viewport.scrollLeft).toBe(100); // untouched
  });
});

describe('touch tooltip suppression', () => {
  // Touch events are handled by native listeners on the viewport strip
  // (`.chart-scroll`), where the component attaches them in an effect.
  const viewport = () => screen.getByTestId('chart-scroll');
  const touch = (x: number, y: number) => ({
    touches: [{ clientX: x, clientY: y }],
  });
  // Suppression flag the chart currently hands to the tooltip's content.
  const suppressed = (): boolean =>
    (tooltipCapture.content?.props as { suppressed?: boolean } | undefined)
      ?.suppressed ?? false;

  beforeEach(() => {
    tooltipCapture.content = undefined;
  });

  it('keeps the tooltip available on a tap (movement within tolerance)', () => {
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    fireEvent.touchStart(viewport(), touch(100, 100));
    fireEvent.touchMove(viewport(), touch(103, 102));
    expect(suppressed()).toBe(false);
  });

  it('suppresses the tooltip during a vertical scroll over the chart', () => {
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    fireEvent.touchStart(viewport(), touch(100, 100));
    fireEvent.touchMove(viewport(), touch(100, 140)); // 40px travel
    expect(suppressed()).toBe(true);
  });

  it('keeps suppression after the finger lifts (sticky, no re-show)', () => {
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    fireEvent.touchStart(viewport(), touch(100, 100));
    fireEvent.touchMove(viewport(), touch(100, 140));
    fireEvent.touchEnd(viewport(), touch(100, 140));
    expect(suppressed()).toBe(true);
  });

  it('re-arms tooltips on the next touch gesture', () => {
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    fireEvent.touchStart(viewport(), touch(100, 100));
    fireEvent.touchMove(viewport(), touch(100, 140)); // suppress
    fireEvent.touchEnd(viewport(), touch(100, 140));
    fireEvent.touchStart(viewport(), touch(200, 200)); // fresh gesture
    fireEvent.touchMove(viewport(), touch(203, 201)); // within tolerance
    expect(suppressed()).toBe(false);
  });

  it('also suppresses during a horizontal chart pan', () => {
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    fireEvent.touchStart(viewport(), touch(100, 100));
    fireEvent.touchMove(viewport(), touch(150, 100)); // 50px travel
    expect(suppressed()).toBe(true);
  });

  it('ignores multi-touch movement so a two-finger gesture does not suppress', () => {
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    fireEvent.touchStart(viewport(), touch(100, 100));
    fireEvent.touchMove(viewport(), {
      touches: [
        { clientX: 400, clientY: 300 },
        { clientX: 500, clientY: 400 },
      ],
    });
    expect(suppressed()).toBe(false);
  });
});

describe('tooltipPlacement', () => {
  const surface = { left: 0, top: 0, right: 400, bottom: 300 };
  const box = { width: 200, height: 70 };

  it('places the tooltip to the right of and above the point by default', () => {
    expect(tooltipPlacement(100, 150, surface, box)).toEqual({
      left: 110,
      top: 70,
    });
  });

  it('flips left when the point is too close to the right edge', () => {
    expect(tooltipPlacement(380, 150, surface, box)).toEqual({
      left: 170, // 380 - 10 gap - 200 width
      top: 70,
    });
  });

  it('stays right of the point when there is room, clamping only when needed', () => {
    const right = tooltipPlacement(60, 150, surface, box);
    expect(right).toEqual({ left: 70, top: 70 }); // 60 + 10 gap; fits (270 <= 400)

    // Point hugging the left edge: no flip needed, so it clamps the +gap
    // result back to the surface edge.
    expect(tooltipPlacement(5, 150, surface, box)).toEqual({
      left: 15, // 5 + 10 gap
      top: 70,
    });
  });

  it('falls back below the point when there is no room above', () => {
    expect(tooltipPlacement(100, 20, surface, box)).toEqual({
      left: 110,
      top: 30, // pointY + gap
    });
  });

  it('keeps the box inside a narrow viewport', () => {
    const narrow = { left: 0, top: 0, right: 260, bottom: 300 };
    // Right of the point there is only 20px left, so it flips left of the
    // point, then clamps into the viewport.
    expect(tooltipPlacement(240, 150, narrow, box)).toEqual({
      left: 30, // flip: 240 - 10 - 200
      top: 70,
    });
  });
});

describe('plot width helper', () => {
  it('stays at least two bands wide for tiny datasets', () => {
    expect(plotWidth(0)).toBe(PITCH * 2);
    expect(plotWidth(1)).toBe(PITCH * 2);
  });

  it('scales one band per point beyond the minimum', () => {
    expect(plotWidth(5)).toBe(5 * PITCH);
    expect(plotWidth(7)).toBe(7 * PITCH);
  });
});

describe('reduced motion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the line entry animation by default', () => {
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    const plot = within(screen.getByTestId('plot-chart'));
    expect(plot.getByTestId('line').getAttribute('data-anim')).toBe('true');
  });

  it('switches animation off under prefers-reduced-motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true }),
    );
    render(<DashboardChart transactions={nTransactions(3)} balance={300} />);
    const plot = within(screen.getByTestId('plot-chart'));
    expect(plot.getByTestId('line').getAttribute('data-anim')).toBe('false');
  });
});