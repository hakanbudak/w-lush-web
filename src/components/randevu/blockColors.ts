/**
 * Takvim bloğunun renkleri.
 *
 * Renk artık uzmandan değil **hizmetten** geliyor. Uzman paleti üç tondan
 * ibaretti ve gün görünümünde sütun zaten uzman olduğu için o üç ton
 * sütunun söylediğini tekrarlıyordu; takvim de bu yüzden boğuk duruyordu.
 * Hizmet rengiyle dolu bir gün tek bakışta "sabah epilasyon, öğleden sonra
 * medikal" diye okunuyor.
 */
export interface BlockColor {
  bg: string;
  bar: string;
  text: string;
}

export const NEUTRAL_COLOR: BlockColor = {
  bg: 'var(--neutral-soft)',
  bar: 'var(--neutral)',
  text: '#5E5A4C',
};

/** `#RRGGBB` → blok renkleri. Zemin aynı rengin çok açık hâli. */
export function blockColor(hex: string | null | undefined): BlockColor {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return NEUTRAL_COLOR;
  return { bg: `${hex}1A`, bar: hex, text: hex };
}
