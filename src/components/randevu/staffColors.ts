/**
 * Uzman renkleri. Tasarımda her uzmana bir zemin/bar/metin üçlüsü düşüyor;
 * atanmamış randevular nötr gri. Tek kaynak, çünkü aynı renk hem ızgarada
 * hem lejantta hem detay popup'ında kullanılıyor — üç kopya kayardı.
 */
export interface StaffColor {
  bg: string;
  bar: string;
  text: string;
}

const PALETTE: StaffColor[] = [
  { bg: 'var(--forest-3)', bar: 'var(--forest)', text: 'var(--forest-2)' },
  { bg: 'var(--blue-soft)', bar: 'var(--blue)', text: '#2F5E85' },
  { bg: 'var(--ai-soft)', bar: 'var(--ai)', text: 'var(--ai-dark)' },
];

export const UNASSIGNED_COLOR: StaffColor = {
  bg: 'var(--neutral-soft)',
  bar: 'var(--neutral)',
  text: '#5E5A4C',
};

/** `null` ya da paletin dışı → atanmamış rengi. */
export function staffColor(index: number | null): StaffColor {
  if (index === null || index < 0) return UNASSIGNED_COLOR;
  return PALETTE[index % PALETTE.length];
}
