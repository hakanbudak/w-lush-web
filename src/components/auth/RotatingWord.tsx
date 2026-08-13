import { useEffect, useState } from 'react';

/** Dönen kelimeler. "diger" dönmüyor — o bir kaçış seçeneği, tip değil. */
const WORDS: Record<string, string> = {
  dis: 'diş kliniği',
  guzellik: 'güzellik merkezi',
  dermatoloji: 'dermatoloji kliniği',
  fizyoterapi: 'fizyoterapi merkezi',
  poliklinik: 'poliklinik',
  diger: 'sağlık merkezi',
};

const ROTATION = ['dis', 'guzellik', 'dermatoloji', 'fizyoterapi', 'poliklinik'];

const EVERY_MS = 2800;

/**
 * Hangi kelime gösterilecek. Kilit her zaman kazanır; bilinmeyen bir kilit
 * değeri (eski bir ayar, elle düzenlenmiş veri) dönmeye geri düşer, boş
 * ekran bırakmaz.
 */
export function wordFor(locked: string | null | undefined, index: number): string {
  if (locked && WORDS[locked]) return WORDS[locked];
  return WORDS[ROTATION[index % ROTATION.length]];
}

/**
 * "Her ___ için ortak bir dil." — boşluk klinik tipleri arasında döner.
 *
 * `locked` verilirse dönme durur ve kelime o tipe sabitlenir: sihirbazda tip
 * seçildiği anda panel de o kliniği anlatmaya başlar.
 *
 * Başlığın yüksekliği sabit: kelimeler farklı uzunlukta olduğu için aksi
 * hâlde satır sayısı değişir ve altındaki her şey zıplar.
 */
export default function RotatingWord({ locked }: { locked?: string | null }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (locked) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % ROTATION.length), EVERY_MS);
    return () => window.clearInterval(t);
  }, [locked]);

  const word = wordFor(locked, i);

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
      için
      <br />
      ortak bir dil.
    </h1>
  );
}
