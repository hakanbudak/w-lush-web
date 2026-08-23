import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PersonelPerformans from './PersonelPerformans';
import type { StaffPerformance } from '../../api/staff';
import { last30, monthRange } from '../../utils/dashboard';

vi.mock('../../api/staff', () => ({ staffPerformance: vi.fn() }));

import { staffPerformance } from '../../api/staff';

const satir = (over: Partial<StaffPerformance> = {}): StaffPerformance => ({
  staff_id: 1, name: 'Elif', appointments: 12, completed: 10, cancelled: 1,
  unmarked: 1, booked_minutes: 720, available_minutes: 1440, occupancy: 50,
  revenue: 6000, services: { 'Saç kesimi': 8 }, ...over,
});

beforeEach(() => vi.mocked(staffPerformance).mockResolvedValue([satir()]));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PersonelPerformans', () => {
  it('uzmanın sayılarını ve gelirini gösterir', async () => {
    render(<PersonelPerformans />);
    expect(await screen.findByText('Elif')).toBeTruthy();
    expect(screen.getByText('₺ 6.000')).toBeTruthy();
    expect(screen.getByText('12 randevu')).toBeTruthy();
    // "Doluluk:" ile değeri ayrı düğümlerde; ikisini birlikte arıyoruz.
    expect(screen.getByText((_, el) => el?.textContent === 'Doluluk: %50')).toBeTruthy();
  });

  it('hesaplanamayan doluluk yerine oran uydurmuyor', async () => {
    vi.mocked(staffPerformance).mockResolvedValue([
      satir({ occupancy: null, available_minutes: null }),
    ]);
    render(<PersonelPerformans />);
    expect(await screen.findByText('—')).toBeTruthy();
    expect(screen.queryByText(/%\d/)).toBeNull();
  });

  it('işaretlenmemişi "gelmedi" diye adlandırmıyor', async () => {
    render(<PersonelPerformans />);
    expect(await screen.findByText('1 işaretlenmemiş')).toBeTruthy();
    expect(screen.getByText(/ikisini ayırt edemiyoruz/)).toBeTruthy();
    expect(screen.queryByText(/gelmedi\b/i)).toBeNull();
  });

  it('atanmamış satırı kişiden ayırıyor', async () => {
    vi.mocked(staffPerformance).mockResolvedValue([
      satir({ staff_id: null, name: 'Atanmamış', occupancy: null }),
    ]);
    render(<PersonelPerformans />);
    expect(await screen.findByText(/uzman atanmamış randevular/)).toBeTruthy();
  });

  it('aralık değişince o aralığı sorar', async () => {
    render(<PersonelPerformans />);
    await screen.findByText('Elif');

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.mouseDown(await screen.findByText('Son 30 gün'));

    // Çağrı sayısı değil, sorulan aralık önemli.
    await waitFor(() => {
      const calls = vi.mocked(staffPerformance).mock.calls;
      expect(calls[calls.length - 1]).toEqual([last30().start, last30().end]);
    });
    expect(last30().start).not.toBe(monthRange().start);
  });

  it('randevu yoksa bunu söyler', async () => {
    vi.mocked(staffPerformance).mockResolvedValue([]);
    render(<PersonelPerformans />);
    expect(await screen.findByText('Bu aralıkta randevu yok.')).toBeTruthy();
  });
});
