/** Ana ekranın başlığı: tarih satırı, selamlama ve tek cümlelik gün özeti. */

const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** "23 Ağustos 2026 · Cumartesi" */
export function gunSatiri(d: Date): string {
  return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()} · ${GUNLER[d.getDay()]}`;
}

export function selamlama(hour: number): string {
  if (hour < 11) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export interface GunOzeti {
  randevu: number;
  bosSlot: number;
  tahsilat: number;
}

/**
 * Günün tek cümlelik özeti. Hiç randevu yoksa sayı saymak yerine ne
 * yapılacağını söylüyor — "0 randevu · 12 boş slot" boş bir günü rapor
 * gibi gösteriyordu.
 */
export function ozetSatiri(o: GunOzeti): string {
  if (o.randevu === 0) {
    return o.bosSlot > 0
      ? `Bugün randevu yok — ${o.bosSlot} slot boş.`
      : 'Bugün için tanımlı çalışma saati yok.';
  }
  const parcalar = [`bugün ${o.randevu} randevu`];
  if (o.bosSlot > 0) parcalar.push(`${o.bosSlot} slot boş`);
  if (o.tahsilat > 0) parcalar.push(`₺ ${o.tahsilat.toLocaleString('tr-TR')} tahsilat`);
  const s = parcalar.join(' · ');
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}
