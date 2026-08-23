import { useState } from 'react';
import type { PresetGroup, SetupService } from '../../api/clinic';
import { SERVICE_COLORS } from '../ui/ColorPicker';

/** Ad karşılaştırması büyük/küçük harf ve boşluk gözetmiyor. */
export const key = (name: string): string => name.trim().toLocaleLowerCase('tr-TR');

export interface Secim {
  /** Ada göre; aynı hizmet iki kez eklenemiyor. */
  secili: Map<string, SetupService>;
  ekle: (s: SetupService) => void;
  cikar: (name: string) => void;
}

/**
 * Sihirbazın hizmet adımı.
 *
 * Katalog gruplu: elli kalemi düz bir liste hâlinde göstermek işaretlemeyi
 * taramaya çeviriyordu. Katalog kapalı da değil — merkez kendi işlemini
 * yazabiliyor, çünkü hiçbir hazır liste her merkezin menüsünü tutmuyor.
 */
export default function HizmetSecimi({
  groups,
  secim,
}: {
  groups: PresetGroup[];
  secim: Secim;
}) {
  const [yeni, setYeni] = useState('');
  const [hata, setHata] = useState<string | null>(null);

  const kendiEklenenler = [...secim.secili.values()].filter(
    (s) => !groups.some((g) => g.services.some((x) => key(x.name) === key(s.name))),
  );

  const kendiEkle = () => {
    const ad = yeni.trim();
    if (!ad) return;
    if (secim.secili.has(key(ad))) {
      setHata('Bu hizmet zaten listede.');
      return;
    }
    secim.ekle({
      name: ad,
      duration_minutes: 60,
      color: SERVICE_COLORS[secim.secili.size % SERVICE_COLORS.length].hex,
    });
    setYeni('');
    setHata(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map((g) => {
        const hepsi = g.services.every((s) => secim.secili.has(key(s.name)));
        return (
          <section key={g.name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span
                aria-hidden
                style={{ width: 8, height: 8, borderRadius: 3, background: g.color }}
              />
              <h3 style={{ margin: 0, flex: 1, fontSize: 12.5, fontWeight: 600 }}>{g.name}</h3>
              <button
                type="button"
                onClick={() =>
                  g.services.forEach((s) =>
                    hepsi
                      ? secim.cikar(s.name)
                      : secim.ekle({
                          name: s.name,
                          duration_minutes: s.duration_minutes,
                          color: s.color,
                        }),
                  )
                }
                style={{
                  border: 'none', background: 'transparent', font: 'inherit',
                  fontSize: 11.5, color: 'var(--ink-45)', cursor: 'pointer', padding: 0,
                }}
              >
                {hepsi ? 'Tümünü kaldır' : 'Tümünü seç'}
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {g.services.map((s) => {
                const on = secim.secili.has(key(s.name));
                return (
                  <button
                    key={s.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      on
                        ? secim.cikar(s.name)
                        : secim.ekle({
                            name: s.name,
                            duration_minutes: s.duration_minutes,
                            color: s.color,
                          })
                    }
                    style={{
                      font: 'inherit', fontSize: 12.5, cursor: 'pointer',
                      padding: '6px 11px', borderRadius: 999,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: on ? 'var(--paper)' : 'transparent',
                      color: on ? 'var(--ink)' : 'var(--ink-45)',
                      border: on ? `1.5px solid ${g.color}` : '1px solid var(--line-strong)',
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 7, height: 7, borderRadius: 999,
                        background: on ? g.color : 'var(--ink-20)',
                      }}
                    />
                    {s.name}
                    <span style={{ opacity: 0.55, fontWeight: 400 }}>{s.duration_minutes} dk</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <section>
        <h3 style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 600 }}>
          Listede olmayan bir işleminiz mi var?
        </h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="wl-input"
            value={yeni}
            placeholder="Kendi hizmetinizin adı"
            onChange={(e) => {
              setYeni(e.target.value);
              setHata(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                kendiEkle();
              }
            }}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8 }}
            disabled={!yeni.trim()}
            onClick={kendiEkle}
          >
            Ekle
          </button>
        </div>
        {hata && (
          <div style={{ fontSize: 11.5, color: 'var(--bad)', marginTop: 6 }}>{hata}</div>
        )}

        {kendiEklenenler.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
            {kendiEklenenler.map((s) => (
              <span
                key={s.name}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5,
                  padding: '6px 8px 6px 11px', borderRadius: 999, fontWeight: 600,
                  background: 'var(--paper)', border: `1.5px solid ${s.color}`,
                }}
              >
                <span
                  aria-hidden
                  style={{ width: 7, height: 7, borderRadius: 999, background: s.color }}
                />
                {s.name}
                <button
                  type="button"
                  aria-label={`${s.name} hizmetini kaldır`}
                  onClick={() => secim.cikar(s.name)}
                  style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: 'var(--ink-45)', font: 'inherit', fontSize: 14,
                    lineHeight: 1, padding: '0 2px',
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
