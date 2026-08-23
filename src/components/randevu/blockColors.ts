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
  /** Bloğun zemini — hizmet renginin kendisi. */
  bg: string;
  bar: string;
  /** Zeminin üstündeki metin. */
  text: string;
  /** Zeminde daha silik duran ikinci satır. */
  subtext: string;
}

export const NEUTRAL_COLOR: BlockColor = {
  bg: 'var(--neutral)',
  bar: 'var(--neutral)',
  text: '#FFFFFF',
  subtext: 'rgba(255, 255, 255, 0.78)',
};

/**
 * `#RRGGBB` → blok renkleri.
 *
 * Zemin rengin **kendisi**, açık bir tonu değil. Saydam bir tint takvimi
 * soluk bırakıyordu: renk zaten dar bir sol çubukta duruyordu ve dolu bir
 * gün hâlâ krem bir ızgara gibi görünüyordu. Palet beyaz metinle en az
 * 4.1:1 kontrast verecek şekilde seçildi, o yüzden metin beyaz.
 */
export function blockColor(hex: string | null | undefined): BlockColor {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return NEUTRAL_COLOR;
  return {
    bg: hex,
    bar: hex,
    text: '#FFFFFF',
    subtext: 'rgba(255, 255, 255, 0.78)',
  };
}
