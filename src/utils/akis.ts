import type { Appointment } from '../api/clinic';

/** "Günün akışı" listesinin tek satırı: ya bir randevu ya da boş bir slot. */
export interface AkisSatiri {
  time: string;
  appointment: Appointment | null;
}

/**
 * Çalışma saatleriyle günün randevularını tek listede birleştirir.
 *
 * Tanımlı slotların dışına düşen randevu da listeye giriyor: ertelenen
 * randevu slot ızgarasına oturmayabiliyor ve o randevuyu gizlemek
 * operatörün gününü yanlış göstermek olurdu. İptaller listede yok.
 */
export function gunAkisi(slots: string[], appts: Appointment[]): AkisSatiri[] {
  const aktif = appts.filter((a) => a.status !== 'cancelled');
  const saatler = [...new Set([...slots, ...aktif.map((a) => a.appt_time)])].sort();
  const satirlar: AkisSatiri[] = [];
  for (const time of saatler) {
    const o = aktif.filter((a) => a.appt_time === time);
    if (o.length === 0) satirlar.push({ time, appointment: null });
    // Aynı saatte birden fazla uzman çalışabiliyor; hepsi ayrı satır.
    else for (const a of o) satirlar.push({ time, appointment: a });
  }
  return satirlar;
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
