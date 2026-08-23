import { useCallback, useEffect, useState } from 'react';
import { staffPerformance, type StaffPerformance } from '../../api/staff';
import { last30, monthRange } from '../../utils/dashboard';
import Select from '../ui/Select';

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;
const saat = (dk: number): string =>
  dk === 0 ? '—' : `${Math.floor(dk / 60)} sa${dk % 60 ? ` ${dk % 60} dk` : ''}`;

type Aralik = 'ay' | 'son30';

const ARALIKLAR: { value: Aralik; label: string }[] = [
  { value: 'ay', label: 'Bu ay' },
  { value: 'son30', label: 'Son 30 gün' },
];

const range = (a: Aralik) => (a === 'ay' ? monthRange() : last30());

/** En yüksek değere göre ölçekli çubuk. */
function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div
      aria-hidden
      style={{
        height: 5, borderRadius: 999, background: 'var(--line-strong)',
        overflow: 'hidden', marginTop: 5,
      }}
    >
      <div
        style={{
          width: `${max > 0 ? (value / max) * 100 : 0}%`,
          height: '100%', background: color,
        }}
      />
    </div>
  );
}

/**
 * Uzman başına performans.
 *
 * Hesaplanamayan hiçbir şey tahmin edilmiyor: slot ızgarası yoksa doluluk
 * "—" kalıyor. Bu raporun okuyucusu prim ve vardiya kararları veriyor ve
 * uydurulmuş bir oran, yanlış kararın en sessiz sebebi olurdu.
 */
export default function PersonelPerformans() {
  const [aralik, setAralik] = useState<Aralik>('ay');
  const [rows, setRows] = useState<StaffPerformance[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const r = range(aralik);
    setRows(null);
    setError(null);
    staffPerformance(r.start, r.end)
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, [aralik]);

  useEffect(load, [load]);

  const enCok = Math.max(1, ...(rows ?? []).map((r) => r.appointments));
  const toplamGelir = (rows ?? []).reduce((s, r) => s + r.revenue, 0);
  const isaretsiz = (rows ?? []).reduce((s, r) => s + r.unmarked, 0);

  return (
    <section
      style={{
        background: 'var(--paper)', border: '1px solid var(--line-strong)',
        borderRadius: 14, overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '15px 20px',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>
            Personel performansı
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--ink-45)' }}>
            Gelir randevuya bağlı ödemelerden geliyor; kasadan satış kimseye
            yazılmıyor.
          </p>
        </div>
        <Select
          value={aralik}
          onChange={(v) => setAralik(v as Aralik)}
          options={ARALIKLAR}
          ariaLabel="Rapor aralığı"
          style={{ width: 140 }}
        />
      </header>

      {error && (
        <p style={{ padding: '16px 20px', fontSize: 12.5, color: 'var(--bad)', margin: 0 }}>
          {error}
        </p>
      )}

      {rows === null && !error && (
        <p style={{ padding: 20, fontSize: 12.5, color: 'var(--ink-45)', margin: 0 }}>
          Yükleniyor…
        </p>
      )}

      {rows !== null && rows.length === 0 && (
        <p style={{ padding: 20, fontSize: 12.5, color: 'var(--ink-45)', margin: 0 }}>
          Bu aralıkta randevu yok.
        </p>
      )}

      {(rows ?? []).map((r, i) => {
        const atanmamis = r.staff_id === null;
        return (
          <div
            key={r.staff_id ?? 'atanmamis'}
            style={{
              padding: '13px 20px',
              borderTop: i === 0 ? 'none' : '1px solid var(--line)',
              background: atanmamis ? 'var(--cream-2)' : 'transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
                {r.name}
                {atanmamis && (
                  <span style={{ fontWeight: 400, color: 'var(--ink-45)' }}>
                    {' '}· uzman atanmamış randevular
                  </span>
                )}
              </span>
              <span className="wl-mono" style={{ fontSize: 13.5, fontWeight: 500 }}>
                {money(r.revenue)}
              </span>
            </div>

            <Bar
              value={r.appointments}
              max={enCok}
              color={atanmamis ? 'var(--neutral)' : 'var(--forest)'}
            />

            <div
              style={{
                display: 'flex', flexWrap: 'wrap', gap: '4px 14px',
                fontSize: 11.5, color: 'var(--ink-60)', marginTop: 8,
              }}
            >
              <span>{r.appointments} randevu</span>
              <span>{r.completed} tamamlandı</span>
              {r.cancelled > 0 && <span>{r.cancelled} iptal</span>}
              {r.unmarked > 0 && (
                <span style={{ color: 'var(--warn)' }}>{r.unmarked} işaretlenmemiş</span>
              )}
              <span>{saat(r.booked_minutes)} dolu</span>
              <span>
                Doluluk:{' '}
                {r.occupancy === null ? (
                  <span title="Çalışma saatleri tanımlı değil ya da bu satır bir kişiye ait değil">
                    —
                  </span>
                ) : (
                  `%${r.occupancy}`
                )}
              </span>
            </div>
          </div>
        );
      })}

      {rows !== null && rows.length > 0 && (
        <footer
          style={{
            padding: '12px 20px', borderTop: '1px solid var(--line)',
            fontSize: 11.5, color: 'var(--ink-45)', lineHeight: 1.6,
          }}
        >
          Toplam {money(toplamGelir)}.
          {isaretsiz > 0 && (
            <>
              {' '}
              <strong style={{ color: 'var(--warn)' }}>
                {isaretsiz} randevu işaretlenmemiş
              </strong>{' '}
              — tarihi geçmiş ama "Tamamlandı" denmemiş. Gelinmemiş olabilir,
              işaretlemek unutulmuş da olabilir; ikisini ayırt edemiyoruz.
            </>
          )}
        </footer>
      )}
    </section>
  );
}
