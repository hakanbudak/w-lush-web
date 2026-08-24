/** Fatura tutarları kuruş cinsinden tam sayı tutuluyor. */

/** 50000 → "₺ 500,00" */
export function tl(kurus: number): string {
  return `₺ ${(kurus / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * "500,50" ya da "500.50" → 50050 kuruş.
 *
 * Ondalık ayırıcı hem virgül hem nokta kabul ediliyor: klavyeden gelen
 * ikisi de ve birini reddetmek, tutarı sessizce yüz katına çıkarırdı.
 * Geçersiz girdi 0 dönüyor, NaN değil — NaN gövdeye yazılıp sunucuda
 * anlamsız bir hataya dönüşürdü.
 */
export function kurusa(text: string): number {
  const temiz = text.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(temiz) || temiz === '' || temiz === '.') return 0;
  return Math.round(Number(temiz) * 100);
}

export interface Kalem {
  quantity: number;
  unit_price_kurus: number;
  vat_rate: number;
}

/** Satır satır yuvarlanan KDV — sunucudaki hesabın aynısı. */
export function toplamlar(lines: Kalem[]): {
  net: number;
  kdv: number;
  toplam: number;
} {
  let net = 0;
  let kdv = 0;
  for (const l of lines) {
    const satir = l.quantity * l.unit_price_kurus;
    net += satir;
    kdv += Math.round((satir * l.vat_rate) / 100);
  }
  return { net, kdv, toplam: net + kdv };
}
