/**
 * Açılır listelerin saf mantığı: hangi tuş vurguyu nereye taşır, ve yazılan
 * metin listeyi nasıl daraltır. Bileşenden ayrı durması, klavye davranışının
 * DOM kurmadan da doğrulanabilmesini sağlıyor.
 */

export interface Option {
  value: string;
  label: string;
}

/**
 * Tuşun taşıdığı yeni sıra, ya da tuş vurguyu taşımıyorsa null.
 *
 * Uçlarda duruyor, başa/sona sarmıyor: sarma, uzun listede kullanıcının
 * nerede olduğunu kaybettiriyor.
 */
export function moveIndex(key: string, current: number, count: number): number | null {
  if (count === 0) return null;
  const clamp = (i: number) => Math.max(0, Math.min(count - 1, i));
  switch (key) {
    case 'ArrowDown':
      return clamp(current + 1);
    case 'ArrowUp':
      // Hiçbir şey vurgulu değilken yukarı, listenin sonuna gider.
      return current < 0 ? count - 1 : clamp(current - 1);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** Türkçe'ye duyarlı, büyük/küçük harf ayırmayan "içeriyor mu" araması. */
export function filterOptions(options: Option[], query: string): Option[] {
  const q = query.trim().toLocaleLowerCase('tr');
  if (!q) return options;
  return options.filter((o) => o.label.toLocaleLowerCase('tr').includes(q));
}

/** Seçili değerin listedeki sırası; yoksa -1. */
export function indexOfValue(options: Option[], value: string): number {
  return options.findIndex((o) => o.value === value);
}
