import { describe, expect, it } from 'vitest';
import {
  compareServices, dailyTotals, dayRange, last30, monthFull, monthRange, occupancy,
  prev30, prevMonthToDate,
} from './dashboard';
import type { Payment } from '../api/payments';

const payment = (paid_at: string, amount: number): Payment =>
  ({ paid_at, amount } as Payment);

describe('occupancy', () => {
  it('multiplies slots by active staff', () => {
    expect(occupancy(7, 8, 2)).toEqual({ used: 7, capacity: 16, percent: 44 });
  });

  it('treats a clinic with no staff as capacity one per slot', () => {
    // The behaviour from before staff existed, preserved on purpose.
    expect(occupancy(3, 8, 0)).toEqual({ used: 3, capacity: 8, percent: 38 });
  });

  it('has nothing to say when no hours are configured', () => {
    expect(occupancy(3, 0, 2)).toBeNull();
  });

  it('reaches a hundred percent', () => {
    expect(occupancy(8, 8, 1)?.percent).toBe(100);
  });
});

describe('compareServices', () => {
  const previous = [
    { service_name: 'Lazer', amount: 18400, count: 8 },
    { service_name: 'Tek ödeme', amount: 400, count: 1 },
    { service_name: 'Ucuz ama sık', amount: 600, count: 5 },
    { service_name: 'Pahalı ama seyrek', amount: 9000, count: 2 },
  ];

  it('reports a real drop with both amounts', () => {
    const moves = compareServices([{ service_name: 'Lazer', amount: 14200, count: 6 }], previous);
    expect(moves).toEqual([
      { service_name: 'Lazer', from: 18400, to: 14200, percent: -23 },
    ]);
  });

  it('ignores services too small to mean anything', () => {
    // Without the threshold a single payment dropping to zero reads "-100%",
    // which is noise dressed as insight.
    const moves = compareServices([], previous);
    expect(moves.map((m) => m.service_name)).toEqual(['Lazer']);
  });

  it('returns nothing when no service clears the threshold', () => {
    expect(compareServices([], [{ service_name: 'X', amount: 500, count: 2 }])).toEqual([]);
  });

  it('puts the biggest mover first', () => {
    const moves = compareServices(
      [{ service_name: 'A', amount: 5000, count: 5 }, { service_name: 'B', amount: 1000, count: 4 }],
      [{ service_name: 'A', amount: 10000, count: 5 }, { service_name: 'B', amount: 8000, count: 4 }],
    );
    expect(moves[0].service_name).toBe('B'); // -88% beats -50%
  });
});

describe('dailyTotals', () => {
  it('fills days without payments so the shape is honest', () => {
    expect(
      dailyTotals([payment('2026-08-02', 100), payment('2026-08-02', 50)], '2026-08-01', '2026-08-03'),
    ).toEqual([
      { day: '2026-08-01', amount: 0 },
      { day: '2026-08-02', amount: 150 },
      { day: '2026-08-03', amount: 0 },
    ]);
  });

  it('covers the range even with no payments at all', () => {
    expect(dailyTotals([], '2026-08-01', '2026-08-02')).toEqual([
      { day: '2026-08-01', amount: 0 },
      { day: '2026-08-02', amount: 0 },
    ]);
  });
});

describe('date ranges', () => {
  const t = new Date(2026, 7, 11); // 11 August 2026

  it('reads today and yesterday', () => {
    expect(dayRange(0, t)).toEqual({ start: '2026-08-11', end: '2026-08-11' });
    expect(dayRange(1, t)).toEqual({ start: '2026-08-10', end: '2026-08-10' });
  });

  it('starts the month on the first', () => {
    expect(monthRange(t)).toEqual({ start: '2026-08-01', end: '2026-08-11' });
  });

  it('makes the two 30-day windows meet without overlapping', () => {
    expect(last30(t)).toEqual({ start: '2026-07-13', end: '2026-08-11' });
    expect(prev30(t)).toEqual({ start: '2026-06-13', end: '2026-07-12' });
  });

  it('clamps to the last day when the previous month is shorter', () => {
    // 31 March has no counterpart in February.
    expect(prevMonthToDate(new Date(2026, 2, 31))).toEqual({
      start: '2026-02-01', end: '2026-02-28',
    });
  });

  it('covers the whole month, not just up to today', () => {
    // Grafik olmamış günleri de çiziyor, aralık ay sonuna kadar gitmeli.
    expect(monthFull(t)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('knows a short month', () => {
    expect(monthFull(new Date(2026, 1, 10)).end).toBe('2026-02-28');
  });

  it('crosses the new year', () => {
    expect(prevMonthToDate(new Date(2026, 0, 15))).toEqual({
      start: '2025-12-01', end: '2025-12-15',
    });
  });
});
