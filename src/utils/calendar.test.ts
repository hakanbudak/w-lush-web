import { describe, expect, it } from 'vitest';
import { addDays, gridRows, isoDate, isoDay, startOfWeek } from './calendar';

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

describe('gridRows', () => {
  it('slots an off-hours appointment into its true position', () => {
    // Without this the appointment simply vanished from the grid.
    const { rows, off } = gridRows(SLOTS, ['10:00', '14:30', '13:00']);
    expect(rows).toEqual([
      '10:00', '11:00', '12:00', '13:00', '14:00', '14:30', '15:00', '16:00', '17:00',
    ]);
    expect([...off]).toEqual(['14:30']);
  });

  it('leaves the grid alone when every appointment is on a slot', () => {
    const { rows, off } = gridRows(SLOTS, ['10:00', '11:00']);
    expect(rows).toEqual(SLOTS);
    expect(off.size).toBe(0);
  });

  it('handles a day with no appointments', () => {
    expect(gridRows(SLOTS, []).rows).toEqual(SLOTS);
  });

  it('takes times before and after working hours', () => {
    const { rows, off } = gridRows(SLOTS, ['09:15', '18:45']);
    expect(rows[0]).toBe('09:15');
    expect(rows[rows.length - 1]).toBe('18:45');
    expect([...off].sort()).toEqual(['09:15', '18:45']);
  });

  it('does not repeat a time shared by two appointments', () => {
    const { rows } = gridRows(SLOTS, ['14:30', '14:30']);
    expect(rows.filter((r) => r === '14:30')).toHaveLength(1);
  });
});

describe('week maths', () => {
  it('starts the week on Monday', () => {
    // Sunday 9 August 2026 belongs to the week starting Monday the 3rd.
    expect(isoDate(startOfWeek(new Date(2026, 7, 9)))).toBe('2026-08-03');
  });

  it('leaves a Monday where it is', () => {
    expect(isoDate(startOfWeek(new Date(2026, 7, 10)))).toBe('2026-08-10');
  });

  it('numbers Sunday seven, matching the clinic open_days', () => {
    expect(isoDay(new Date(2026, 7, 9))).toBe(7);
    expect(isoDay(new Date(2026, 7, 10))).toBe(1);
  });

  it('crosses a month boundary when adding days', () => {
    expect(isoDate(addDays(new Date(2026, 7, 31), 1))).toBe('2026-09-01');
  });
});
