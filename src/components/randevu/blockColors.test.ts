import { describe, expect, it } from 'vitest';
import { blockColor, NEUTRAL_COLOR } from './blockColors';

describe('blockColor', () => {
  it('hizmet renginden zemin, bar ve metin türetir', () => {
    expect(blockColor('#2E7D5B')).toEqual({
      bg: '#2E7D5B1A', bar: '#2E7D5B', text: '#2E7D5B',
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
