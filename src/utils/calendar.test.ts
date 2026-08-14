import { describe, expect, it } from 'vitest';
import {
  addDays,
  gridRows,
  inRange,
  isoDate,
  isoDay,
  monthGrid,
  sameDay,
  startOfWeek,
  trDate,
} from './calendar';

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

describe('monthGrid', () => {
  it('her zaman 42 gün verir', () => {
    // Sabit satır sayısı: ay değişince ızgaranın boyu oynamasın.
    expect(monthGrid(2026, 7)).toHaveLength(42);
    expect(monthGrid(2026, 1)).toHaveLength(42); // 28 günlük Şubat
  });

  it('Pazartesi ile başlar', () => {
    expect(monthGrid(2026, 7).map(isoDay).slice(0, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('ayın ilk gününü kapsar', () => {
    // 1 Ağustos 2026 Cumartesi; ızgara Temmuz'un son haftasıyla başlıyor.
    const grid = monthGrid(2026, 7).map(isoDate);
    expect(grid).toContain('2026-08-01');
    expect(grid[0]).toBe('2026-07-27');
  });

  it('ayın son gününü de kapsar', () => {
    expect(monthGrid(2026, 7).map(isoDate)).toContain('2026-08-31');
  });
});

describe('inRange', () => {
  const d = new Date(2026, 7, 12);

  it('sınırsızken her gün seçilebilir', () => {
    expect(inRange(d)).toBe(true);
  });

  it('üst sınırın ötesi seçilemez', () => {
    // Gelir ve gider gelecek tarihi kabul etmiyor; sunucu reddetmeden önce
    // takvim engelliyor.
    expect(inRange(d, undefined, '2026-08-11')).toBe(false);
    expect(inRange(d, undefined, '2026-08-12')).toBe(true);
  });

  it('alt sınırın gerisi seçilemez', () => {
    expect(inRange(d, '2026-08-13')).toBe(false);
    expect(inRange(d, '2026-08-12')).toBe(true);
  });
});

describe('trDate', () => {
  it('ISO tarihi okunur biçime çevirir', () => {
    expect(trDate('2026-08-12')).toBe('12.08.2026');
  });

  it('boş değeri boş bırakır', () => {
    expect(trDate('')).toBe('');
  });
});

describe('sameDay', () => {
  it('saat farkına bakmaz', () => {
    expect(sameDay(new Date(2026, 7, 12, 9), new Date(2026, 7, 12, 23))).toBe(true);
  });

  it('farklı günleri ayırır', () => {
    expect(sameDay(new Date(2026, 7, 12), new Date(2026, 7, 13))).toBe(false);
  });
});
