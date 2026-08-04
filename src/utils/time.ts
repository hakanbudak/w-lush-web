// Zaman biçimlendirme — bildirimler ve mesajlar aynı kuralları paylaşır.

/**
 * Backend `created_at`'i naive UTC üretiyor (offset/`Z` yok). Eki yoksa
 * tarayıcı yerel saat varsayar ve production'da (API UTC, tarayıcı UTC+3)
 * saatler saatlerce ileri kayar. Offset yoksa `Z` ekleyip UTC'ye sabitleriz.
 */
export function toUtcIso(raw: string): string {
  return /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
}

/** "az önce" / "12 dk önce" / "3 sa önce" / "dün 14:20" / "9 Ağu 11:00" */
export function relativeTime(iso: string): string {
  // `iso` api katmanında toUtcIso ile normalize edilmiş olarak gelir. Yine de
  // saat kayması diffMin'i negatif yapabilir, Math.max ile 0'a kelepçeleriz.
  const then = new Date(iso);
  const diffMin = Math.max(0, Math.floor((Date.now() - then.getTime()) / 60_000));

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;

  const today = new Date();
  const sameDay = then.toDateString() === today.toDateString();
  if (sameDay) return `${Math.floor(diffMin / 60)} sa önce`;

  const hhmm = then.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return `dün ${hhmm}`;

  const dm = then.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${dm} ${hhmm}`;
}

/** Sadece saat — mesaj balonlarının altında kullanılır. */
export const clockTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
