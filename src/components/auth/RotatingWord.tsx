import { useEffect, useState } from 'react';

/**
 * Dönen kelimeler: merkezin *yaptığı iş*, artık tipi değil.
 *
 * Eskiden klinik tipleri arasında dönüyordu (diş, dermatoloji, fizyoterapi…)
 * ve sihirbazda seçilen tipe kilitleniyordu. Ürün güzellik ve estetik
 * merkezleri için; hepsini destekliyormuş gibi görünen bir liste satmak
 * istemediğimiz şeyi vaat ederdi.
 */
const WORDS = ['randevu', 'danışan', 'seans', 'tahsilat', 'hatırlatma'];

const EVERY_MS = 2800;

/** Hangi kelime gösterilecek. Dizinin dışına taşan bir sayı başa döner. */
export function wordFor(index: number): string {
  return WORDS[index % WORDS.length];
}

/**
 * "Her ___ tek bir yerde." — boşluk merkezin günlük işleri arasında döner.
 *
 * Başlığın yüksekliği sabit: kelimeler farklı uzunlukta olduğu için aksi
 * hâlde satır sayısı değişir ve altındaki her şey zıplar.
 */
export default function RotatingWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % WORDS.length), EVERY_MS);
    return () => window.clearInterval(t);
  }, []);

  const word = wordFor(i);

  return (
    <h1 className="wl-auth-hero" style={{ minHeight: 156 }}>
      Her{' '}
      <span
        key={word}
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          fontStyle: 'italic',
          color: 'var(--accent-soft)',
          animation: 'wl-word .55s ease both',
        }}
      >
        {word}
      </span>{' '}
      tek bir yerde.
    </h1>
  );
}
