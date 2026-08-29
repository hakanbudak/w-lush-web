import type { Appointment } from '../api/clinic';

/** "Günün akışı" listesinin tek satırı: bir saat ve o saatteki randevular. */
export interface AkisSatiri {
  time: string;
  /** Boş saatte boş dizi. */
  appointments: Appointment[];
}

/**
 * Çalışma saatleriyle günün randevularını tek listede birleştirir.
 *
 * Satır **saat başına**, randevu başına değil. Randevu başına olsaydı dört
 * uzmanlı bir merkezde saat 10:00 dört kez tekrar ediyor, dolu bir gün de
 * otuz satıra çıkıyordu — akış listesi tam da bunu okunamaz kılar.
 *
 * Tanımlı slotların dışına düşen randevu da listeye giriyor: ertelenen
 * randevu slot ızgarasına oturmayabiliyor ve o randevuyu gizlemek
 * operatörün gününü yanlış göstermek olurdu. İptaller listede yok.
 */
export function gunAkisi(slots: string[], appts: Appointment[]): AkisSatiri[] {
  const aktif = appts.filter((a) => a.status !== 'cancelled');
  const saatler = [...new Set([...slots, ...aktif.map((a) => a.appt_time)])].sort();
  return saatler.map((time) => ({
    time,
    appointments: aktif.filter((a) => a.appt_time === time),
  }));
}

export const bosSlotSayisi = (slots: string[], appts: Appointment[]): number => {
  const dolu = new Set(appts.filter((a) => a.status !== 'cancelled').map((a) => a.appt_time));
  return slots.filter((s) => !dolu.has(s)).length;
};

/**
 * Bugünden sonraki ilk randevular.
 *
 * Ana ekran yalnızca bugünü gösteriyor. Bugünü boş olan klinikte ekran
 * bomboş kalıyordu ve az önce ileri tarihe randevu yazan operatör
 * randevusunun kaydolmadığını sanıyordu.
 */
export function yaklasanlar(
  appts: Appointment[],
  today: string,
  limit = 3,
): Appointment[] {
  return appts
    .filter((a) => a.status !== 'cancelled' && a.appt_date > today)
    .sort((x, y) =>
      x.appt_date === y.appt_date
        ? x.appt_time.localeCompare(y.appt_time)
        : x.appt_date.localeCompare(y.appt_date))
    .slice(0, limit);
}
