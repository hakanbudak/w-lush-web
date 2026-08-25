import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GununAkisi from './GununAkisi';
import type { Appointment } from '../../api/clinic';

const randevu = (over: Partial<Appointment> = {}): Appointment =>
  ({ id: 1, appt_date: '2026-08-23', appt_time: '11:00', status: 'confirmed',
     customer_name: 'Ayşe Yılmaz', phone: '05321112233', service_name: 'Cilt bakımı',
     staff_name: 'Elif', ...over } as Appointment);

type Props = Parameters<typeof GununAkisi>[0];
type Verilen = Omit<Props, 'upcoming' | 'colorOf' | 'day'> &
  Partial<Pick<Props, 'upcoming' | 'colorOf' | 'day'>>;

const ciz = (props: Verilen) =>
  render(
    <MemoryRouter>
      <GununAkisi
        upcoming={[]}
        colorOf={() => '#0B8A57'}
        day={{ iso: '2026-08-25', yarin: false }}
        {...props}
      />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('GununAkisi', () => {
  it('boş satıra basınca o saatle randevu formunu ister', () => {
    const onPick = vi.fn();
    ciz({ items: [], slots: ['10:00', '11:00'], onPick });
    fireEvent.click(screen.getAllByText('Boş — randevu ekle')[1]);
    expect(onPick).toHaveBeenCalledWith('11:00');
  });

  it('dolu saatte danışanı, hizmeti ve durumu gösterir', () => {
    ciz({ items: [randevu({ status: 'pending' })], slots: ['11:00'], onPick: vi.fn() });
    expect(screen.getByText('Ayşe Yılmaz')).toBeTruthy();
    expect(screen.getByText('Cilt bakımı · Elif')).toBeTruthy();
    expect(screen.getByText('Bekliyor')).toBeTruthy();
    expect(screen.queryByText('Boş — randevu ekle')).toBeNull();
  });

  it('uzman atanmamışsa bunu yazar', () => {
    ciz({ items: [randevu({ staff_name: '' })], slots: ['11:00'], onPick: vi.fn() });
    expect(screen.getByText('Cilt bakımı · uzman atanmadı')).toBeTruthy();
  });

  it('adsız danışanı telefonuyla gösterir', () => {
    ciz({ items: [randevu({ customer_name: '' })], slots: ['11:00'], onPick: vi.fn() });
    expect(screen.getByText(/0532/)).toBeTruthy();
  });

  it('çalışma saati yoksa ne yapılacağını söyler', () => {
    ciz({ items: [], slots: [], onPick: vi.fn() });
    expect(screen.getByText(/çalışma saati tanımlı değil/)).toBeTruthy();
  });
});

describe('GununAkisi · sıradaki randevular', () => {
  const ileri = randevu({ id: 9, appt_date: '2026-08-27', appt_time: '09:00',
                          customer_name: 'Elif Gülşen' });

  it('bugün boşken sıradakini gösterir', () => {
    ciz({ items: [], slots: ['10:00'], upcoming: [ileri], onPick: vi.fn() });
    expect(screen.getByText('Sıradaki randevular')).toBeTruthy();
    expect(screen.getByText('27 Ağustos Perşembe 09:00')).toBeTruthy();
  });

  it('bugün doluysa sıradakini göstermez', () => {
    ciz({ items: [randevu()], slots: ['11:00'], upcoming: [ileri], onPick: vi.fn() });
    expect(screen.queryByText('Sıradaki randevular')).toBeNull();
  });
});

describe('GununAkisi · hizmet renkleri', () => {
  it('satırı hizmetin rengiyle işaretler', () => {
    ciz({
      items: [randevu()],
      slots: ['11:00'],
      colorOf: (ad) => (ad === 'Cilt bakımı' ? '#C2185B' : null),
      onPick: vi.fn(),
    });
    const satir = screen.getByText('Ayşe Yılmaz').closest('li');
    // Satırın tamamı hizmet rengiyle doluyor; jsdom hex'i rgb'ye çeviriyor.
    expect(satir?.style.background).toBe('rgb(194, 24, 91)');
  });

  it('hizmeti silinmiş randevu nötr kalır, renksiz kalmaz', () => {
    ciz({ items: [randevu()], slots: ['11:00'], colorOf: () => null, onPick: vi.fn() });
    const satir = screen.getByText('Ayşe Yılmaz').closest('li');
    expect(satir?.getAttribute('style')).toContain('var(--neutral)');
  });
});

describe('GununAkisi · gün sonu', () => {
  it('gün içinde "Günün akışı" yazar', () => {
    ciz({ items: [], slots: ['10:00'], onPick: vi.fn() });
    expect(screen.getByText('Günün akışı')).toBeTruthy();
  });

  it('gün kapandıysa yarını gösterdiğini söyler', () => {
    // Akşam panele bakanın sorusu "bugün ne kaldı" değil, "yarın ne var".
    ciz({
      items: [],
      slots: ['10:00'],
      day: { iso: '2026-08-26', yarin: true },
      onPick: vi.fn(),
    });
    expect(screen.getByText(/Yarının akışı/)).toBeTruthy();
    expect(screen.getByText(/bugün kapandı/)).toBeTruthy();
  });
});
