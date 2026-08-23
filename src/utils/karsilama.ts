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

/** "27 Ağustos Perşembe" — yıl yok, çünkü bildirim hep yakın bir güne bakıyor. */
export function kisaGun(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  return `${t.getDate()} ${AYLAR[t.getMonth()]} ${GUNLER[t.getDay()]}`;
}

export interface RandevuBildirimi {
  text: string;
  /** Randevu bugüne düşmediyse ana ekranın akışında görünmüyor. */
  baskaGun: boolean;
}

/**
 * Randevu oluşturulduktan sonraki bildirim.
 *
 * Tarihi yazmak şart: ana ekran yalnızca bugünü gösteriyor, ileri tarihe
 * yazılan randevu kaydedildiği hâlde ekranda hiçbir iz bırakmıyordu ve
 * "oluşturuldu" diyen bir mesajın ardından boş bir gün görmek randevunun
 * kaybolduğu izlenimi veriyordu.
 */
export function randevuBildirimi(
  a: { appt_date: string; appt_time: string },
  notified: boolean,
  today: string,
): RandevuBildirimi {
  const ne = `${kisaGun(a.appt_date)} ${a.appt_time} randevusu oluşturuldu`;
  const posta = notified
    ? ', danışana WhatsApp bilgisi gönderildi.'
    : ', ancak danışana mesaj iletilemedi.';
  return { text: ne + posta, baskaGun: a.appt_date !== today };
}
