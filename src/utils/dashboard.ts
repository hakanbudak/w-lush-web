// Ana ekranın hesapları. Bileşenlerden ayrı duruyorlar çünkü tarayıcı
// olmadan doğrulanabilmelerinin tek yolu bu.
import type { Payment, ServiceTotal } from '../api/payments';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Bugünden `offset` gün önceki tek günlük aralık (0 = bugün). */
export function dayRange(offset: number, today = new Date()): { start: string; end: string } {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return { start: iso(d), end: iso(d) };
}

/** Ayın 1'inden bugüne. */
export function monthRange(today = new Date()): { start: string; end: string } {
  return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end: iso(today) };
}

/** Ayın tamamı — grafik olmamış günleri de boş tırnak olarak çiziyor. */
export function monthFull(today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
}

/** Geçen ayın 1'inden, geçen ayın "bugün"üne — ay kıyası için. */
export function prevMonthToDate(today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = new Date(y, m - 1, 1);
  // Geçen ay bugünkü gün numarasını içermiyorsa (31 Mart → Şubat) ayın son
  // gününe kırpılır; new Date(y, m, 0) o ayın son günüdür.
  const lastDayOfPrev = new Date(y, m, 0).getDate();
  const end = new Date(y, m - 1, Math.min(today.getDate(), lastDayOfPrev));
  return { start: iso(first), end: iso(end) };
}

/** Son 30 gün (bugün dahil). */
export function last30(today = new Date()): { start: string; end: string } {
  const s = new Date(today);
  s.setDate(s.getDate() - 29);
  return { start: iso(s), end: iso(today) };
}

/** Ondan önceki 30 gün. */
export function prev30(today = new Date()): { start: string; end: string } {
  const e = new Date(today);
  e.setDate(e.getDate() - 30);
  const s = new Date(today);
  s.setDate(s.getDate() - 59);
  return { start: iso(s), end: iso(e) };
}

/**
 * Doluluk. Kapasite = slot sayısı × aktif personel; personel yoksa çarpan 1,
 * yani personel öncesi davranış. Slot tanımlı değilse hesap anlamsızdır ve
 * null döner — kart "—" gösterir.
 */
export function occupancy(
  activeAppointments: number,
  slotCount: number,
  staffCount: number,
): { used: number; capacity: number; percent: number } | null {
  if (slotCount <= 0) return null;
  const capacity = slotCount * Math.max(1, staffCount);
  return {
    used: activeAppointments,
    capacity,
    percent: Math.round((activeAppointments / capacity) * 100),
  };
}

export interface ServiceMove {
  service_name: string;
  from: number;
  to: number;
  percent: number;
}

/** Karşılaştırmaya girmek için önceki dönemde gereken alt sınırlar. */
export const MIN_COUNT = 3;
export const MIN_AMOUNT = 1000;

/**
 * İki dönemin hizmet kırılımını karşılaştırır, en çok değişen önce.
 *
 * Eşik olmadan bu hesap yalan söyler: önceki dönemde tek ödemesi olan bir
 * hizmet sıfıra düşünce "−%100" yazardı. O yüzden hizmetin önceki dönemde
 * en az MIN_COUNT ödemesi ve MIN_AMOUNT tutarı olmalı.
 */
export function compareServices(
  current: ServiceTotal[],
  previous: ServiceTotal[],
): ServiceMove[] {
  const now = new Map(current.map((s) => [s.service_name, s.amount]));
  return previous
    .filter((p) => p.count >= MIN_COUNT && p.amount >= MIN_AMOUNT)
    .map((p) => {
      const to = now.get(p.service_name) ?? 0;
      return {
        service_name: p.service_name,
        from: p.amount,
        to,
        percent: Math.round(((to - p.amount) / p.amount) * 100),
      };
    })
    .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));
}

/**
 * Ödemeleri güne göre toplar. Ödemesiz günler 0 ile doldurulur — aksi hâlde
 * grafik boş günleri atlar ve seyir olduğundan düz görünür.
 */
export function dailyTotals(
  payments: Payment[],
  start: string,
  end: string,
): { day: string; amount: number }[] {
  const sums = new Map<string, number>();
  for (const p of payments) {
    sums.set(p.paid_at, (sums.get(p.paid_at) ?? 0) + p.amount);
  }
  const out: { day: string; amount: number }[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    const key = iso(cur);
    out.push({ day: key, amount: sums.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
