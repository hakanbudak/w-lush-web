import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isoDate } from '../../utils/calendar';
import DatePicker from './DatePicker';

afterEach(cleanup);

const trigger = () => screen.getByRole('button', { name: 'Tarih' });
const panel = () => screen.queryByRole('dialog');
const day = (n: string) => screen.getByRole('button', { name: n });

const at = (value = '2026-08-12', extra = {}) => {
  const onChange = vi.fn();
  render(<DatePicker value={value} onChange={onChange} ariaLabel="Tarih" {...extra} />);
  return onChange;
};

describe('DatePicker', () => {
  it('değeri okunur biçimde gösterir, panel kapalı başlar', () => {
    at();
    expect(trigger().textContent).toContain('12.08.2026');
    expect(panel()).toBeNull();
  });

  it('değer yokken ne yapılacağını söyler', () => {
    at('');
    expect(trigger().textContent).toContain('Tarih seçin');
  });

  it('tıklayınca açılır ve o ayı gösterir', () => {
    at();
    fireEvent.click(trigger());
    expect(panel()).not.toBeNull();
    expect(screen.getByText('Ağustos 2026')).toBeTruthy();
  });

  it('bir güne tıklayınca ISO değer döner', () => {
    const onChange = at();
    fireEvent.click(trigger());
    fireEvent.click(day('20.08.2026'));
    expect(onChange).toHaveBeenCalledWith('2026-08-20');
    expect(panel()).toBeNull();
  });

  it('oklarla gezip Enter ile seçilir', () => {
    const onChange = at();
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // açar
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // bir hafta ileri
    fireEvent.keyDown(trigger(), { key: 'ArrowRight' }); // bir gün ileri
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('2026-08-20');
  });

  it('PageDown bir ay ileri gider', () => {
    at();
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: 'PageDown' });
    expect(screen.getByText('Eylül 2026')).toBeTruthy();
  });

  it('ay okları başlığı değiştirir', () => {
    at();
    fireEvent.click(trigger());
    fireEvent.click(screen.getByLabelText('Önceki ay'));
    expect(screen.getByText('Temmuz 2026')).toBeTruthy();
  });

  it('Escape kapatır ve odağı geri verir', () => {
    at();
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('üst sınırın ötesindeki gün seçilemez', () => {
    // Gelir ve gider gelecek tarihi reddediyor; hata ekrana gelmeden önce
    // o gün tıklanamıyor.
    const onChange = at('2026-08-12', { max: '2026-08-12' });
    fireEvent.click(trigger());
    const ileri = day('20.08.2026');
    expect(ileri.hasAttribute('disabled')).toBe(true);
    fireEvent.click(ileri);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('sınır dışındaki gün klavyeyle de seçilemez', () => {
    const onChange = at('2026-08-12', { max: '2026-08-12' });
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'ArrowRight' });
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('"Bugün" bugünü seçer', () => {
    const onChange = at('2026-08-12');
    fireEvent.click(trigger());
    fireEvent.click(screen.getByText('Bugün'));
    expect(onChange).toHaveBeenCalledWith(isoDate(new Date()));
  });

  it('seçili gün işaretli görünür', () => {
    at();
    fireEvent.click(trigger());
    expect(day('12.08.2026').getAttribute('aria-pressed')).toBe('true');
    expect(day('13.08.2026').getAttribute('aria-pressed')).toBe('false');
  });
});
