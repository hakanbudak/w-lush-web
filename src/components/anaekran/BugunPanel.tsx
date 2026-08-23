const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

export interface BugunVerisi {
  randevu: number;
  tahsilat: number;
  doluluk: number | null;
  yeniDanisan: number;
}

/**
 * Günün dört sayısı. Doluluk hesaplanamıyorsa (çalışma saati ya da aktif
 * personel tanımsız) sayı uydurulmuyor, "—" yazılıyor.
 */
export default function BugunPanel({ data }: { data: BugunVerisi }) {
  const rows: { label: string; value: string }[] = [
    { label: 'Randevu', value: String(data.randevu) },
    { label: 'Tahsilat', value: money(data.tahsilat) },
    { label: 'Doluluk', value: data.doluluk === null ? '—' : `%${data.doluluk}` },
    { label: 'Bu ay yeni danışan', value: String(data.yeniDanisan) },
  ];

  return (
    <section
      style={{
        background: 'var(--paper)', border: '1px solid var(--line-strong)',
        borderRadius: 14, padding: '15px 20px 6px',
      }}
    >
      <h2 style={{ margin: '0 0 4px', fontSize: 14.5, fontWeight: 600 }}>Bugün</h2>
      <dl style={{ margin: 0 }}>
        {rows.map((r) => (
          <div
            key={r.label}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)',
            }}
          >
            <dt style={{ fontSize: 12.5, color: 'var(--ink-60)' }}>{r.label}</dt>
            <dd
              className="wl-mono"
              style={{ margin: 0, fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' }}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
