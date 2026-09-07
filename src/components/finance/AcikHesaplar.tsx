import { useCallback, useEffect, useState } from 'react';
import {
  listServices, listUnpaidAppointments, type Appointment, type Service,
} from '../../api/clinic';
import {
  createPayment, deletePayment, type PaymentMethod,
} from '../../api/payments';
import { Modal } from '../modals';
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
  // Onay kutusu: tahsilat tek tıkla yazılıyordu ve yanlış satıra basmak
  // sessizce gelir kaydı üretiyordu.
  const [onay, setOnay] = useState<{ appt: Appointment; amount: number } | null>(
    null,
  );
  /**
   * Son tahsilat, geri alınabilsin diye tutuluyor.
   *
   * Ödeme kaydı Gelir listesinden silinebiliyordu ama operatörün onu orada
   * bulup silmesi gerekiyordu; yanlış tıktan sonra "geri alamıyorum"
   * hissi buradan geliyordu.
   */
  const [sonIslem, setSonIslem] = useState<
    { paymentId: number; appt: Appointment; amount: number } | null
  >(null);

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

  const sor = (a: Appointment) => {
    const n = Number(oneri(a));
    if (!Number.isFinite(n) || n <= 0) {
      setError('Tutar sıfırdan büyük olmalı.');
      return;
    }
    setError(null);
    setOnay({ appt: a, amount: n });
  };

  const tahsilEt = (a: Appointment, n: number) => {
    setBusy(a.id);
    setError(null);
    setOnay(null);
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
      .then((p) => {
        setRows((r) => (r ?? []).filter((x) => x.id !== a.id));
        setSonIslem({ paymentId: p.id, appt: a, amount: n });
        onPaid();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(null));
  };

  const geriAl = () => {
    if (!sonIslem) return;
    const { paymentId, appt } = sonIslem;
    setError(null);
    deletePayment(paymentId)
      .then(() => {
        // Satır listeye dönüyor: açık hesap ödemeden türetiliyor, ödeme
        // silinince randevu yeniden açık sayılıyor.
        setRows((r) => [appt, ...(r ?? [])]);
        setSonIslem(null);
        onPaid();
      })
      .catch((e: Error) => setError(e.message));
  };

  // Son açık hesap da tahsil edilince panel kapanıyor — ama geri alma
  // şeridi duruyorsa değil: onunla birlikte kaybolsa, yanlış tıkı geri
  // almanın yolu yine kalmazdı.
  if (rows !== null && rows.length === 0 && sonIslem === null) return null;

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

      {sonIslem && (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
            background: 'var(--forest-3)', color: 'var(--forest-2)', fontSize: 12.5,
          }}
        >
          <span style={{ flex: 1 }}>
            {displayName({
              name: sonIslem.appt.customer_name, phone: sonIslem.appt.phone,
            })}{' '}
            · <strong>{money(sonIslem.amount)}</strong> tahsil edildi.
          </span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8 }}
            onClick={geriAl}
          >
            Geri al
          </button>
          <button
            type="button"
            aria-label="Bildirimi kapat"
            onClick={() => setSonIslem(null)}
            style={{
              border: 'none', background: 'transparent', font: 'inherit',
              fontSize: 15, color: 'inherit', cursor: 'pointer', padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
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
            onClick={() => sor(a)}
          >
            {busy === a.id ? '…' : 'Tahsil et'}
          </button>
        </div>
      ))}

      {onay && (
        <Modal
          title="Tahsilatı onayla"
          onClose={() => setOnay(null)}
          footer={
            <>
              <button
                type="button"
                className="wl-btn wl-btn-ghost wl-btn-sm"
                onClick={() => setOnay(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                onClick={() => tahsilEt(onay.appt, onay.amount)}
              >
                Tahsilatı kaydet
              </button>
            </>
          }
        >
          <div style={{ fontSize: 13, lineHeight: 1.7 }}>
            <div>
              <strong>
                {displayName({
                  name: onay.appt.customer_name, phone: onay.appt.phone,
                })}
              </strong>{' '}
              · {onay.appt.service_name}
            </div>
            <div>
              {money(onay.amount)} ·{' '}
              {yontem === 'cash' ? 'Nakit' : yontem === 'card' ? 'Kart' : 'Havale'}
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: '10px 0 0' }}>
              Gelire bugünün tarihiyle yazılır. Yanlışlıkla kaydedersen hemen
              ardından "Geri al" ile silebilirsin.
            </p>
          </div>
        </Modal>
      )}

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
