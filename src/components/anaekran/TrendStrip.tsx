import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import type { ServiceMove } from '../../utils/dashboard';

const money = (n: number): string => `₺${n.toLocaleString('tr-TR')}`;

function MoveLine({ m }: { m: ServiceMove }) {
  const down = m.percent < 0;
  return (
    <span>
      <strong>{m.service_name}</strong>{' '}
      <strong style={{ color: down ? 'var(--bad)' : 'var(--forest)' }}>
        {m.percent > 0 ? '+' : ''}%{Math.abs(m.percent)}
      </strong>{' '}
      <span style={{ color: 'var(--ink-40)' }}>
        ({money(m.from)} → {money(m.to)})
      </span>
    </span>
  );
}

export default function TrendStrip({
  moves,
  paymentCount,
}: {
  moves: ServiceMove[];
  paymentCount: number;
}) {
  // En çok düşen ve en çok artan. moves zaten |yüzde|'ye göre sıralı.
  const worst = moves.find((m) => m.percent < 0) ?? null;
  const best = moves.find((m) => m.percent > 0) ?? null;
  const enough = worst !== null || best !== null;

  return (
    <div
      style={{
        background:
          'linear-gradient(110deg, var(--paper) 0%, var(--paper) 55%, var(--cream-2) 100%)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 8, background: 'var(--cream-2)',
          display: 'grid', placeItems: 'center', color: 'var(--ink-60)', flexShrink: 0,
        }}
      >
        {Icon.chart}
      </div>

      <div style={{ flex: 1 }}>
        {enough ? (
          <>
            <div style={{ fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {worst && <MoveLine m={worst} />}
              {best && <MoveLine m={best} />}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>
              son 30 gün vs önceki 30 gün · {paymentCount} ödeme
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-60)' }}>
            Karşılaştırma için henüz yeterli ödeme kaydı yok — Gelir ekranından ödeme
            girdikçe burası dolar.
          </div>
        )}
      </div>

      <Link
        to="/gelir"
        className="wl-btn wl-btn-sm"
        style={{
          background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8,
          fontSize: 12, textDecoration: 'none',
        }}
      >
        Gelir raporunda aç
      </Link>
    </div>
  );
}
