import { Icon } from '../icons';

const ADIMLAR = [
  { icon: Icon.whatsapp, color: 'var(--wa-green)',
    title: 'Danışan WhatsApp’tan yazar', sub: 'Kliniğinin numarasına mesaj atar.' },
  { icon: Icon.calendar, color: 'var(--forest)',
    title: 'Bot karşılar, randevu alır', sub: 'Uygun saati sunar, fiyat sorusunu yanıtlar.' },
  { icon: Icon.check, color: 'var(--blue)',
    title: 'Panelde görür, yönetirsin', sub: 'Randevu burada listelenir; onayla ya da ertele.' },
];

/**
 * Kurulum bitmeden gösterilen üç adımlık açıklama. WhatsApp bağlanınca
 * kayboluyor — akış çalışmaya başladıktan sonra nasıl çalıştığını anlatmak
 * ekranı boşuna dolduruyor.
 */
export default function NasilCalisir() {
  return (
    <section
      style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 1, background: 'var(--line-strong)', border: '1px solid var(--line-strong)',
        borderRadius: 14, overflow: 'hidden',
      }}
    >
      {ADIMLAR.map((a, i) => (
        <div
          key={a.title}
          style={{ background: 'var(--paper)', padding: '14px 18px', display: 'flex', gap: 11 }}
        >
          <span style={{ color: a.color, display: 'flex', flexShrink: 0 }}>{a.icon}</span>
          <span>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600 }}>
              {i + 1}. {a.title}
            </span>
            <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-45)', marginTop: 2 }}>
              {a.sub}
            </span>
          </span>
        </div>
      ))}
    </section>
  );
}
