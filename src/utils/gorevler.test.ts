import { describe, expect, it } from 'vitest';
import { gorevler, type GorevGirdisi } from './gorevler';

const hazir: GorevGirdisi = {
  serviceCount: 5,
  hasContact: true,
  waConnected: true,
  waitingConversations: 0,
  pendingAppointments: 0,
  monthPaymentCount: 3,
  lowStockCount: 0,
};

const anahtarlar = (g: Partial<GorevGirdisi>) =>
  gorevler({ ...hazir, ...g }).map((x) => x.key);

describe('gorevler', () => {
  it('her şey yolundaysa boş liste döner', () => {
    expect(gorevler(hazir)).toEqual([]);
  });

  it('boş klinikte kurulum adımlarını sıralar', () => {
    expect(anahtarlar({ serviceCount: 0, hasContact: false, waConnected: false }))
      .toEqual(['hizmet', 'whatsapp', 'klinik']);
  });

  it('hizmet yokken WhatsApp acil değil, sıradaki iş', () => {
    const wa = gorevler({ ...hazir, serviceCount: 0, waConnected: false })
      .find((g) => g.key === 'whatsapp');
    expect(wa?.tone).toBe('idle');
    expect(wa?.cta).toBe('Sırada');
  });

  it('hizmet girilince WhatsApp acile döner', () => {
    const wa = gorevler({ ...hazir, waConnected: false }).find((g) => g.key === 'whatsapp');
    expect(wa?.tone).toBe('urgent');
    expect(wa?.cta).toBe('Bağla');
  });

  it('bekleyen mesaj ve onayı sayıyla yazar', () => {
    const g = gorevler({ ...hazir, waitingConversations: 3, pendingAppointments: 2 });
    expect(g.map((x) => x.title)).toEqual([
      '3 mesaj yanıt bekliyor',
      '2 randevu onay bekliyor',
    ]);
  });

  it('kurulum sürerken ödeme uyarısı çıkmaz', () => {
    expect(anahtarlar({ monthPaymentCount: 0, serviceCount: 0, waConnected: false }))
      .not.toContain('odeme');
    expect(anahtarlar({ monthPaymentCount: 0 })).toContain('odeme');
  });
});

describe('gorevler · stok', () => {
  it('azalan ürünü sayısıyla listeler', () => {
    const g = gorevler({ ...hazir, lowStockCount: 2 }).find((x) => x.key === 'stok');
    expect(g?.title).toBe('2 üründe stok azaldı');
    expect(g?.to).toBe('/stok');
  });

  it('stok yeterliyken uyarı çıkmaz', () => {
    expect(anahtarlar({})).not.toContain('stok');
  });
});
