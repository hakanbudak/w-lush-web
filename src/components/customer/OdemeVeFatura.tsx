import { useState } from 'react';
import type { CustomerDetail } from '../../api/customers';
import { deleteInvoice } from '../../api/invoices';
import { settlePromise } from '../../api/payments';
import { Modal } from '../modals';
import { trDate } from '../../utils/calendar';
import { tl } from '../../utils/fatura';

/*
 * Danışanın parası: bekleyen ödeme sözleri ve kesilmiş faturaları.
 *
 * İkisi de profildeydi ama görünmüyordu; operatör tahsilatı girmek ya da
 * yanlış kesilmiş bir faturayı iptal etmek için başka ekranlara gidiyordu.
 */

export default function OdemeVeFatura({
  detail,
  onChanged,
}: {
  detail: CustomerDetail;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iptalEdilecek, setIptalEdilecek] = useState<number | null>(null);

  const run = (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    work()
      .then(onChanged)
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const fatura = detail.invoices.find((f) => f.id === iptalEdilecek);

  return (
    <div>
      {error && (
        <div style={{ padding: '10px 20px', fontSize: 11.5, color: 'var(--bad)' }}>
          {error}
        </div>
      )}

      <Baslik>Bekleyen ödeme sözleri</Baslik>
      {detail.promises.length === 0 && <Bos>Bekleyen ödeme sözü yok.</Bos>}
      {detail.promises.map((p) => (
        <Satir key={p.id}>
          <span style={{ width: 130, color: 'var(--ink-60)' }}>
            {trDate(p.due_on)} vadeli
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            {p.service_name || '—'}
            {p.note && (
              <span style={{ color: 'var(--ink-40)' }}> · {p.note}</span>
            )}
          </span>
          <span style={{ width: 90, textAlign: 'right', fontWeight: 600 }}>
            ₺ {p.amount.toLocaleString('tr-TR')}
          </span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            disabled={busy}
            onClick={() => run(() => settlePromise(p.id))}
          >
            Tahsil edildi
          </button>
        </Satir>
      ))}

      <Baslik>Faturalar</Baslik>
      {detail.invoices.length === 0 && <Bos>Kesilmiş fatura yok.</Bos>}
      {detail.invoices.map((f) => (
        <Satir key={f.id}>
          <span className="wl-mono" style={{ width: 150 }}>{f.number}</span>
          <span style={{ width: 110, color: 'var(--ink-60)' }}>
            {trDate(f.issue_date)}
          </span>
          <span style={{ flex: 1, color: 'var(--ink-40)' }}>
            {f.profile === 'TEMELFATURA' ? 'e-Fatura' : 'e-Arşiv'}
          </span>
          <span style={{ width: 90, textAlign: 'right', fontWeight: 600 }}>
            {tl(f.total_kurus)}
          </span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            disabled={busy}
            onClick={() => setIptalEdilecek(f.id)}
          >
            İptal et
          </button>
        </Satir>
      ))}

      {fatura && (
        <Modal
          title="Fatura iptal edilsin mi?"
          onClose={() => setIptalEdilecek(null)}
          footer={
            <>
              <button
                type="button"
                className="wl-btn wl-btn-ghost wl-btn-sm"
                onClick={() => setIptalEdilecek(null)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                onClick={() => {
                  const id = fatura.id;
                  setIptalEdilecek(null);
                  run(() => deleteInvoice(id));
                }}
              >
                İptal et
              </button>
            </>
          }
        >
          <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>
            <strong>{fatura.number}</strong> numaralı fatura silinecek. Kapsadığı
            tahsilat silinmiyor — faturalanmamışlara geri düşüyor, yeniden
            faturalanabiliyor.
            <div style={{ marginTop: 8, color: 'var(--ink-45)' }}>
              Numara yeniden kullanılmıyor: aynı numarayı taşıyan iki belge
              olmaması için o numara boş kalıyor.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Baslik({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '12px 20px 6px', fontSize: 11.5, fontWeight: 600,
        color: 'var(--ink-60)',
      }}
    >
      {children}
    </div>
  );
}

function Bos({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '4px 20px 12px', fontSize: 12, color: 'var(--ink-40)' }}>
      {children}
    </div>
  );
}

function Satir({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px',
        borderBottom: '1px solid var(--line)', fontSize: 12,
      }}
    >
      {children}
    </div>
  );
}
