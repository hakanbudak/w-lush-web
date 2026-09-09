import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppointmentDetail from './AppointmentDetail';

const rescheduleAppointment = vi.fn();
const cancelAppointment = vi.fn();
const confirmAppointment = vi.fn();
const completeAppointment = vi.fn();

const listCustomerConsents = vi.fn();

vi.mock('../../api/consent', () => ({
  listCustomerConsents: (...a: unknown[]) => listCustomerConsents(...a),
}));

const listCustomerPackages = vi.fn();
vi.mock('../../api/packages', () => ({
  listCustomerPackages: (...a: unknown[]) => listCustomerPackages(...a),
}));

vi.mock('../../api/clinic', () => ({
  assignAppointmentStaff: vi.fn(),
  completeAppointment: (...a: unknown[]) => completeAppointment(...a),
  cancelAppointment: (...a: unknown[]) => cancelAppointment(...a),
  confirmAppointment: (...a: unknown[]) => confirmAppointment(...a),
  getSettings: () => Promise.resolve({ slot_times: ['10:00', '11:00', '12:00'] }),
  listServices: () =>
    Promise.resolve([{ id: 1, name: 'Kontrol', price: 400, active: true }]),
  rescheduleAppointment: (...a: unknown[]) => rescheduleAppointment(...a),
}));

vi.mock('../../api/conversations', () => ({
  listConversations: () => Promise.resolve([]),
}));

const createPromise = vi.fn();
vi.mock('../../api/payments', () => ({
  createPromise: (...a: unknown[]) => createPromise(...a),
}));

const APPT = {
  id: 7,
  phone: '905321110001',
  customer_name: 'Ayşe Yılmaz',
  service_name: 'Kontrol',
  appt_date: '2026-09-01',
  appt_time: '10:00',
  status: 'confirmed',
  staff_id: null,
  created_at: '2026-08-20T09:00:00Z',
  paid_amount: null,
  promise_amount: null,
  promise_due: null,
};

const onChanged = vi.fn();

beforeEach(() => {
  listCustomerConsents.mockReset().mockResolvedValue([]);
  listCustomerPackages.mockReset().mockResolvedValue([]);
  completeAppointment.mockReset().mockResolvedValue({
    appointment: { ...APPT, status: 'completed' },
    session_used: false, payment_id: null,
    invoice_number: null, invoice_error: null,
  });
  rescheduleAppointment.mockReset().mockResolvedValue({ ...APPT, appt_date: '2026-09-03' });
  onChanged.mockReset();
  createPromise.mockReset().mockResolvedValue({ id: 1 });
});
afterEach(cleanup);

const göster = (appointment = APPT) =>
  render(
    <AppointmentDetail
      appointment={appointment as never}
      staff={[]}
      onClose={() => {}}
      onChanged={onChanged}
      onMessage={() => {}}
    />,
  );

describe('AppointmentDetail — erteleme', () => {
  it('form kapalı başlıyor', async () => {
    göster();
    expect(await screen.findByText('Ertele')).toBeTruthy();
    expect(screen.queryByText('Taşı')).toBeNull();
  });

  it('iptal edilmiş randevuda ertele düğmesi yok', async () => {
    göster({ ...APPT, status: 'cancelled' });
    await screen.findByText('Mesaj gönder');
    expect(screen.queryByText('Ertele')).toBeNull();
  });

  it('saat listesi kliniğin ayarından geliyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByRole('combobox', { name: 'Yeni saat' }));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(3));
  });

  it('taşıma yeni günü ve saati gönderiyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByRole('combobox', { name: 'Yeni saat' }));
    fireEvent.mouseDown(screen.getByText('12:00'));
    fireEvent.click(screen.getByText('Taşı'));

    await waitFor(() => expect(rescheduleAppointment).toHaveBeenCalled());
    expect(rescheduleAppointment).toHaveBeenCalledWith(7, {
      appt_date: '2026-09-01',
      appt_time: '12:00',
      notify: true,
    });
  });

  it('bildirim kapatılabiliyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByLabelText(/WhatsApp'tan bildir/));
    fireEvent.click(screen.getByText('Taşı'));

    await waitFor(() => expect(rescheduleAppointment).toHaveBeenCalled());
    expect(rescheduleAppointment.mock.calls[0][1].notify).toBe(false);
  });

  it('vazgeçmek formu kapatıyor ve hiçbir şey göndermiyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Ertele'));
    fireEvent.click(screen.getByText('Vazgeç'));

    expect(screen.queryByText('Taşı')).toBeNull();
    expect(rescheduleAppointment).not.toHaveBeenCalled();
  });
});

describe('AppointmentDetail · onam', () => {
  const bekleyen = {
    id: 1, phone: '905321110001', customer_name: 'Ayşe Yılmaz',
    title: 'Lazer epilasyon onamı', token: 'abc', signed: false,
    signed_name: '', signed_at: null, created_at: '2026-08-25T09:00:00',
  };

  it('imza bekleyen onamı uyarı olarak gösterir', async () => {
    listCustomerConsents.mockResolvedValue([bekleyen]);
    göster();
    expect(await screen.findByText(/Lazer epilasyon onamı/)).toBeTruthy();
    expect(screen.getByText('Tablette imzalat')).toBeTruthy();
  });

  it('imzalanmış onam uyarı üretmiyor', async () => {
    listCustomerConsents.mockResolvedValue([
      { ...bekleyen, signed: true, signed_name: 'Ayşe', signed_at: '2026-08-25T10:00:00' },
    ]);
    göster();
    await screen.findByText('Ayşe Yılmaz');
    expect(screen.queryByText('Tablette imzalat')).toBeNull();
  });
});

describe('AppointmentDetail · seansı kapatma', () => {
  beforeEach(() => {
    completeAppointment.mockReset().mockResolvedValue({
      appointment: { ...APPT, status: 'completed' },
      session_used: false, payment_id: 5,
      invoice_number: null, invoice_error: null,
    });
  });

  it('tutarı hizmetin fiyatından öneriyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Seans yapıldı'));
    expect(await screen.findByDisplayValue('400')).toBeTruthy();
  });

  it('paketi kapsayan seansta tahsilat hiç sorulmuyor', async () => {
    // Sormak aynı geliri iki kez yazdırırdı.
    listCustomerPackages.mockResolvedValue([
      { id: 1, service_name: 'Kontrol', remaining: 5, cancelled: false },
    ]);
    göster();
    await screen.findByText('Ayşe Yılmaz');
    fireEvent.click(screen.getByText('Seans yapıldı'));
    expect(screen.queryByText('Tahsil edildi')).toBeNull();
  });

  it('tahsilat girilmeden de kapatılabiliyor', async () => {
    göster();
    fireEvent.click(await screen.findByText('Seans yapıldı'));
    expect(await screen.findByText('Tahsilat sonra')).toBeTruthy();
  });

  it('tutar sıfırken tahsilat düğmesi kapalı', async () => {
    göster();
    fireEvent.click(await screen.findByText('Seans yapıldı'));
    const alan = await screen.findByDisplayValue('400');
    fireEvent.change(alan, { target: { value: '0' } });
    expect((screen.getByText('Tahsil edildi') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('ödeme sözü', () => {
  /** DatePicker bir düğme + takvim; `change` almıyor, gün tıklanıyor. */
  async function birGunSec(alan: string) {
    fireEvent.click(screen.getByRole('button', { name: alan }));
    const gunler = screen
      .getAllByRole('button')
      .filter((b) => /^\d{2}\.\d{2}\.\d{4}$/.test(b.getAttribute('aria-label') ?? ''));
    const secilen = gunler.find((b) => !b.hasAttribute('disabled'))!;
    const iso = secilen.getAttribute('aria-label')!.split('.').reverse().join('-');
    fireEvent.click(secilen);
    return iso;
  }

  const ac = () => {
    göster();
    fireEvent.click(screen.getByText('Seans yapıldı'));
  };

  it('"Tahsilat sonra" artık doğrudan kapatmıyor, vade soruyor', async () => {
    ac();
    fireEvent.click(await screen.findByText('Tahsilat sonra'));
    expect(screen.getByLabelText('Söz verilen tutar')).toBeTruthy();
    expect(completeAppointment).not.toHaveBeenCalled();
  });

  it('tutar ve vade verilince sözü kaydediyor', async () => {
    ac();
    fireEvent.click(await screen.findByText('Tahsilat sonra'));
    fireEvent.change(screen.getByLabelText('Söz verilen tutar'), {
      target: { value: '800' },
    });
    const gun = await birGunSec('Ödeme vadesi');
    fireEvent.click(screen.getByText('Sözü kaydet'));

    await waitFor(() => expect(createPromise).toHaveBeenCalled());
    expect(createPromise.mock.calls[0][0]).toMatchObject({
      appointment_id: 7, amount: 800, due_on: gun,
    });
  });

  it('vade girmeden de geçilebiliyor', async () => {
    ac();
    fireEvent.click(await screen.findByText('Tahsilat sonra'));
    fireEvent.click(screen.getByText('Vade girmeden geç'));

    await waitFor(() => expect(completeAppointment).toHaveBeenCalledWith(7));
    expect(createPromise).not.toHaveBeenCalled();
  });

  it('tutar boşken kaydedilemiyor', async () => {
    ac();
    fireEvent.click(await screen.findByText('Tahsilat sonra'));
    expect((screen.getByText('Sözü kaydet') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('para durumu', () => {
  const ile = (over: Record<string, unknown>) =>
    göster({ ...APPT, ...over } as never);

  it('tahsil edilmişse tutarıyla söylüyor', () => {
    ile({ paid_amount: 800, status: 'completed' });
    expect(screen.getByText('Tahsil edildi')).toBeTruthy();
    expect(screen.getByText(/800/)).toBeTruthy();
  });

  it('söz verilmişse vadesini gösteriyor', () => {
    ile({ promise_amount: 800, promise_due: '2026-09-15', status: 'completed' });
    expect(screen.getByText('Ödeme sözü')).toBeTruthy();
  });

  it('yapılmış ama parası alınmamışsa uyarıyor', () => {
    ile({ status: 'completed' });
    expect(screen.getByText('Tahsilat alınmadı')).toBeTruthy();
  });

  it('alan hiç gelmezse çökmüyor', () => {
    // Eski bir yanıt ya da farklı bir uç alanları taşımayabilir; modalın
    // tamamen kararması bundan kötü.
    const eksik = { ...APPT } as Record<string, unknown>;
    delete eksik.paid_amount;
    delete eksik.promise_amount;
    göster(eksik as never);
    expect(screen.getByText('Ayşe Yılmaz')).toBeTruthy();
  });
});

describe('tamamlanmış randevu', () => {
  it('ertele düğmesi çıkmıyor', () => {
    göster({ ...APPT, status: 'completed' } as never);
    expect(screen.queryByText('Ertele')).toBeNull();
  });

  it('iptal düğmesi duruyor — yanlış işaretlenmiş olabilir', () => {
    göster({ ...APPT, status: 'completed' } as never);
    expect(screen.getByText('İptal et')).toBeTruthy();
  });

  it('planlanmış randevuda ertele hâlâ var', () => {
    göster();
    expect(screen.getByText('Ertele')).toBeTruthy();
  });
});
