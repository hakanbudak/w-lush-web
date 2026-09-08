import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AkisSemasi from './AkisSemasi';
import { getFlowGraph } from '../../api/whatsapp';

vi.mock('../../api/whatsapp', () => ({ getFlowGraph: vi.fn() }));

// jsdom'da ResizeObserver yok. Bileşende korumaya almak yerine burada
// karşılığını koyuyoruz: tarayıcıda hepsinde var, koruma eklersek asıl
// ölçüm yolu hiç test edilmemiş olurdu.
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(cleanup);

const GRAPH = {
  nodes: [
    { state: 'MENU', label: 'Menü', goes_to: ['MENU'] },
    { state: 'BOOK_SERVICE', label: 'Hizmet seçimi', goes_to: ['BOOK_DAY', 'BOOK_SERVICE', 'MENU'] },
    { state: 'BOOK_DAY', label: 'Gün seçimi', goes_to: ['MENU'] },
    { state: 'SILENT', label: 'Operatörde', goes_to: ['SILENT'] },
  ],
  global_rules: [{ label: 'Randevu al', goes_to: ['BOOK_SERVICE'] }],
  panel_rules: [{ label: 'Operatör devraldı', goes_to: ['SILENT'] }],
};

describe('AkisSemasi', () => {
  beforeEach(() => {
    vi.mocked(getFlowGraph).mockResolvedValue(structuredClone(GRAPH));
  });

  it('sunucudan gelen her durumu çiziyor', async () => {
    render(<AkisSemasi />);
    await screen.findByText('Menü');
    for (const label of ['Hizmet seçimi', 'Gün seçimi', 'Operatörde']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('sadece panelden girilen durum da şemada duruyor', async () => {
    // SILENT'a menüden hiçbir yol yok; katman araması onu bulamaz, en
    // alta konması gerekiyor — yoksa sessizce kaybolurdu.
    render(<AkisSemasi />);
    expect(await screen.findByText('Operatörde')).toBeTruthy();
  });

  it('aynı adımda kalma ve menüye dönüş rozet oluyor, ok değil', async () => {
    const { container } = render(<AkisSemasi />);
    await screen.findByText('Hizmet seçimi');
    expect(screen.getAllByText('aynı adımda kalabilir').length).toBeGreaterThan(0);
    expect(screen.getAllByText('menüye döner').length).toBeGreaterThan(0);
    // Çizilen tek eğri BOOK_SERVICE -> BOOK_DAY; kendine dönen ve menüye
    // dönen kenarlar eğri olarak çizilmiyor.
    expect(container.querySelectorAll('svg path')).toHaveLength(1);
  });

  it('kural şeritlerini gösteriyor', async () => {
    render(<AkisSemasi />);
    expect(await screen.findByText('Randevu al')).toBeTruthy();
    expect(screen.getByText('Operatör devraldı')).toBeTruthy();
  });

  it('yüklenemezse hata gösteriyor', async () => {
    vi.mocked(getFlowGraph).mockRejectedValueOnce(new Error('kopuk'));
    render(<AkisSemasi />);
    await waitFor(() => expect(screen.getByText(/yüklenemedi/i)).toBeTruthy());
  });
});
