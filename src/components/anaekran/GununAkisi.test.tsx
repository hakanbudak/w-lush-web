import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GununAkisi from './GununAkisi';
import type { Appointment } from '../../api/clinic';

const randevu = (over: Partial<Appointment> = {}): Appointment =>
  ({ id: 1, appt_date: '2026-08-23', appt_time: '11:00', status: 'confirmed',
     customer_name: 'Ayşe Yılmaz', phone: '05321112233', service_name: 'Cilt bakımı',
     staff_name: 'Elif', ...over } as Appointment);

const ciz = (props: Parameters<typeof GununAkisi>[0]) =>
  render(<MemoryRouter><GununAkisi {...props} /></MemoryRouter>);

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
