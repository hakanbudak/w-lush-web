import { useCallback, useEffect, useState } from 'react';
import {
  listServices, listUnpaidAppointments, type Appointment, type Service,
} from '../../api/clinic';
import { createPayment, type PaymentMethod } from '../../api/payments';
import { trDate } from '../../utils/calendar';
import { displayName } from '../../utils/people';
import Select from '../ui/Select';

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

const bugun = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};

/**
 * Hizmeti verilmiş ama parası alınmamış seanslar.
 *
 * Gelir raporunda görünmüyorlar — para gerçekten alınmadı — ama hiçbir
 * yerde görünmezlerse unutuluyorlar. Açık hesap, kliniğin tahsil etmeyi
 * unuttuğu paradır.
 */
export default function AcikHesaplar({ onPaid }: { onPaid: () => void }) {
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tutar, setTutar] = useState<Record<number, string>>({});
  const [yontem, setYontem] = useState<PaymentMethod>('cash');

  const load = useCallback(() => {
    listUnpaidAppointments()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  useEffect(() => {
    listServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  // Tutar hizmetin liste fiyatından öneriliyor; fiyatı yoksa boş kalıyor
  // ki yanlışlıkla sıfır tahsilat yazılmasın.
  const oneri = (a: Appointment): string => {
    const s = services.find((x) => x.name === a.service_name);
    return tutar[a.id] ?? (s?.price ? String(s.price) : '');
  };

  const tahsilEt = (a: Appointment) => {
    const n = Number(oneri(a));
    if (!Number.isFinite(n) || n <= 0) {
      setError('Tutar sıfırdan büyük olmalı.');
      return;
    }
    setBusy(a.id);
    setError(null);
    createPayment({
      paid_at: bugun(),
      amount: n,
      method: yontem,
      phone: a.phone,
      appointment_id: a.id,
      customer_name: a.customer_name,
      service_name: a.service_name,
      note: '',
    })
      .then(() => {
        setRows((r) => (r ?? []).filter((x) => x.id !== a.id));
        onPaid();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(null));
  };

  if (rows !== null && rows.length === 0) return null;

  const toplam = (rows ?? []).reduce((s, a) => s + (Number(oneri(a)) || 0), 0);

  return (
    <section
      style={{
        background: 'var(--paper)', border: '1px solid var(--line-strong)',
        borderRadius: 14, overflow: 'hidden',
      }}
    >
      <header
        style={{
          padding: '15px 20px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>Açık hesaplar</h2>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ink-45)' }}>
            Hizmet verildi, tahsilat girilmedi. Gelir raporuna ancak tahsil
            edilince giriyorlar.
          </p>
        </div>
        <label
          style={{
            fontSize: 11, color: 'var(--ink-60)', display: 'flex',
            alignItems: 'center', gap: 6,
          }}
        >
          Ödeme
          <Select
            value={yontem}
            onChange={(v) => setYontem(v as PaymentMethod)}
            options={[
              { value: 'cash', label: 'Nakit' },
              { value: 'card', label: 'Kart' },
              { value: 'transfer', label: 'Havale' },
            ]}
            ariaLabel="Ödeme yöntemi"
            style={{ width: 110 }}
          />
        </label>
      </header>

      {error && (
        <p style={{ padding: '12px 20px', margin: 0, fontSize: 12.5, color: 'var(--bad)' }}>
          {error}
        </p>
      )}

      {(rows ?? []).map((a, i) => (
        <div
          key={a.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
            borderTop: i === 0 ? 'none' : '1px solid var(--line)', fontSize: 12.5,
          }}
        >
          <span className="wl-mono" style={{ color: 'var(--ink-45)', minWidth: 96 }}>
            {trDate(a.appt_date)}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            {displayName({ name: a.customer_name, phone: a.phone })}
            <span style={{ color: 'var(--ink-45)' }}> · {a.service_name}</span>
          </span>
          <input
            className="wl-input wl-mono"
            type="number"
            min={0}
            value={oneri(a)}
            aria-label={`${a.customer_name || a.phone} tahsilat tutarı`}
            style={{ width: 110, textAlign: 'right' }}
            onChange={(e) => setTutar((t) => ({ ...t, [a.id]: e.target.value }))}
          />
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8 }}
            disabled={busy === a.id}
            onClick={() => tahsilEt(a)}
          >
            {busy === a.id ? '…' : 'Tahsil et'}
          </button>
        </div>
      ))}

      {rows !== null && rows.length > 0 && (
        <footer
          style={{
            padding: '11px 20px', borderTop: '1px solid var(--line)',
            fontSize: 11.5, color: 'var(--ink-45)',
          }}
        >
          {rows.length} açık seans · önerilen toplam{' '}
          <strong className="wl-mono">{money(toplam)}</strong>
        </footer>
      )}
    </section>
  );
}
