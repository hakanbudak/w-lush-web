import { describe, expect, it } from 'vitest';
import { blockColor, NEUTRAL_COLOR } from './blockColors';

describe('blockColor', () => {
  it('zemin rengin kendisi, metin beyaz', () => {
    // Saydam bir tint takvimi soluk bırakıyordu; palet beyaz metinle
    // en az 4.1:1 kontrast verecek şekilde seçildi.
    expect(blockColor('#0B8A57')).toEqual({
      bg: '#0B8A57',
      bar: '#0B8A57',
      text: '#FFFFFF',
      subtext: 'rgba(255, 255, 255, 0.78)',
    });
  });

  it('rengi olmayan randevu nötr blok olur', () => {
    // Silinen bir hizmetin eski randevusu bu yola düşüyor.
    expect(blockColor(null)).toBe(NEUTRAL_COLOR);
    expect(blockColor('')).toBe(NEUTRAL_COLOR);
    expect(blockColor('yesil')).toBe(NEUTRAL_COLOR);
    expect(blockColor('#ABC')).toBe(NEUTRAL_COLOR);
  });
});
