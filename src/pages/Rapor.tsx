import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import PersonelPerformans from '../components/rapor/PersonelPerformans';
import {
  deleteReport,
  generateIncomeExpenseReport,
  getReport,
  listReports,
  type ReportDetail,
  type ReportSummary,
} from '../api/reports';
import PeriodPicker from '../components/finance/PeriodPicker';
import KpiTrio from '../components/finance/KpiTrio';
import { rangeFor, type Period } from '../utils/period';
import { relativeTime } from '../utils/time';

const fmt = (n: number): string => '₺ ' + n.toLocaleString('tr-TR');

/** YYYY-MM-DD → "1 Ağu" */
const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

const card: CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: 20,
};

const linkButton: CSSProperties = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  font: 'inherit',
  cursor: 'pointer',
};

export default function Rapor() {
  const [period, setPeriod] = useState<Period>('ay');
  const [rows, setRows] = useState<ReportSummary[] | null>(null);
  const [current, setCurrent] = useState<ReportDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Anahtar yoksa backend 503 döner; üretim düğmesi kalıcı olarak kapanır.
  const [unavailable, setUnavailable] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const loadList = useCallback(() => {
    listReports()
      .then(setRows)
      .catch(() => setError('Raporlar yüklenemedi.'));
  }, []);

  useEffect(loadList, [loadList]);

  const generate = () => {
    const { start, end } = rangeFor(period);
    setBusy(true);
    setError(null);
    generateIncomeExpenseReport(start, end)
      .then((report) => {
        setCurrent(report);
        loadList();
      })
      .catch((e: Error) => {
        if (e.message.includes('503')) setUnavailable(true);
        // 422/502 gövdesindeki TR metni göster; ayıklanamazsa genel mesaj.
        const detail = e.message.split('detail":"')[1]?.split('"')[0];
        setError(detail || 'Rapor üretilemedi.');
      })
      .finally(() => setBusy(false));
  };

  const open = (id: number) => {
    setError(null);
    getReport(id)
      .then(setCurrent)
      .catch(() => setError('Rapor açılamadı.'));
  };

  return (
    <>
      {/* Rakamlar önce: yapay zekâ yorumu bunların üstüne konuşuyor. */}
      <PersonelPerformans />

      {/* üretici */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span
          style={{
            width: 38, height: 38, borderRadius: 10, background: 'var(--ai-soft)',
            color: 'var(--ai)', display: 'grid', placeItems: 'center', flexShrink: 0,
            fontSize: 16,
            animation: busy ? 'wl-pulse 1.2s ease-in-out infinite' : 'none',
          }}
        >
          ✦
        </span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Gelir–gider raporu</div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
            Seçilen dönemin tablosu hesaplanır ve yapay zekâ ile yorumlanır.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <PeriodPicker value={period} onChange={setPeriod} />
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{
              height: 34, borderRadius: 9, fontSize: 12.5, fontWeight: 600,
              background: busy ? 'rgba(91,79,163,0.5)' : 'var(--ai)',
              color: 'var(--paper)',
            }}
            onClick={generate}
            disabled={busy || unavailable}
          >
            {busy ? 'Rapor hazırlanıyor…' : 'Rapor üret'}
          </button>
        </div>
      </div>

      {unavailable && (
        <div style={{ ...card, marginTop: 12, fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.5 }}>
          AI raporu yapılandırılmamış. Sunucuda <strong>ANTHROPIC_API_KEY</strong> tanımlandığında
          bu ekran çalışmaya başlar.
        </div>
      )}

      {error && !unavailable && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-60)' }}>
          {error}{' '}
          <button
            type="button"
            onClick={generate}
            style={{ ...linkButton, fontSize: 13, color: 'var(--forest)', textDecoration: 'underline' }}
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* üretilen rapor: önce sayılar, sonra yorum */}
      {current && (
        <>
          <KpiTrio
            accent="var(--ai)"
            items={[
              { label: 'Gelir', value: fmt(current.facts.income.total) },
              { label: 'Gider', value: fmt(current.facts.expense.total) },
              {
                label: current.facts.profit >= 0 ? 'Kâr' : 'Zarar',
                value: fmt(Math.abs(current.facts.profit)),
              },
            ]}
          />

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                background: 'var(--ai-band)', padding: '12px 20px',
                display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              }}
            >
              <div className="wl-label" style={{ color: 'var(--ai-dark)' }}>
                ✦ AI yorumu
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink-45)' }}>
                {dayLabel(current.period_start)} – {dayLabel(current.period_end)} · {current.model}
              </div>
            </div>
            <div
              style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', padding: 20 }}
            >
              {current.body}
            </div>
          </div>
        </>
      )}

      {/* geçmiş */}
      <div style={{ ...card, marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 20px', borderBottom: '1px solid var(--line)',
            fontSize: 14, fontWeight: 600,
          }}
        >
          Son raporlar
        </div>
        {rows?.length === 0 && (
          <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
            Henüz rapor üretilmedi.
          </div>
        )}
        {rows?.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              borderBottom: '1px solid var(--line)', fontSize: 12,
            }}
          >
            <button
              type="button"
              onClick={() => open(r.id)}
              style={{ ...linkButton, flex: 1, minWidth: 0, textAlign: 'left', fontSize: 12 }}
            >
              Gelir–gider · {dayLabel(r.period_start)} – {dayLabel(r.period_end)}
            </button>
            <span style={{ color: 'var(--ink-40)', fontSize: 10 }}>{relativeTime(r.created_at)}</span>
            <span
              style={{
                width: 96, textAlign: 'right', fontWeight: 600,
                color: r.profit >= 0 ? 'var(--forest-2)' : 'var(--bad)',
              }}
            >
              {r.profit >= 0 ? '+' : '−'}{fmt(Math.abs(r.profit))}
            </span>
            {confirmId === r.id ? (
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    deleteReport(r.id)
                      .then(() => {
                        setConfirmId(null);
                        if (current?.id === r.id) setCurrent(null);
                        loadList();
                      })
                      .catch(() => setError('Rapor silinemedi.'));
                  }}
                  style={{ ...linkButton, fontSize: 11, color: 'var(--bad)' }}
                >
                  Sil
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  style={{ ...linkButton, fontSize: 11, color: 'var(--ink-40)' }}
                >
                  Vazgeç
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmId(r.id)}
                style={{ ...linkButton, fontSize: 11, color: 'var(--ink-40)' }}
              >
                Kaldır
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
