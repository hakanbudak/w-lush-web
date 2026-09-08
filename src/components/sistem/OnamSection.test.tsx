import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnamSection from './OnamSection';

const listConsentTemplates = vi.fn();
const listConsentPresets = vi.fn();
const createConsentTemplate = vi.fn();
vi.mock('../../api/consent', () => ({
  listConsentTemplates: (...a: unknown[]) => listConsentTemplates(...a),
  listConsentPresets: (...a: unknown[]) => listConsentPresets(...a),
  createConsentTemplate: (...a: unknown[]) => createConsentTemplate(...a),
  updateConsentTemplate: vi.fn(),
  deleteConsentTemplate: vi.fn(),
}));
vi.mock('../../api/clinic', () => ({ listServices: () => Promise.resolve([]) }));

const UZUN = 'A'.repeat(2000);
const PRESET = {
  title: 'Lazer epilasyon onam formu',
  service_name: 'Lazer epilasyon · bölgesel',
  body: UZUN,
};

beforeEach(() => {
  listConsentTemplates.mockReset().mockResolvedValue([]);
  listConsentPresets.mockReset().mockResolvedValue([PRESET]);
  createConsentTemplate.mockReset();
});
afterEach(cleanup);

describe('OnamSection · hazır formlar', () => {
  it('hazır formu tam metniyle ekliyor', async () => {
    render(<OnamSection />);
    fireEvent.click(await screen.findByText('Hazır formlar'));
    fireEvent.click(await screen.findByText('Ekle'));

    // Metin kısaltılmadan geliyor: onamın değeri neyin kabul edildiğini
    // gösterebilmesinde.
    expect(await screen.findByDisplayValue(UZUN)).toBeTruthy();
    expect(screen.getByDisplayValue('Lazer epilasyon onam formu')).toBeTruthy();
  });

  it('taslak olduğunu ve gözden geçirilmesi gerektiğini söylüyor', async () => {
    render(<OnamSection />);
    fireEvent.click(await screen.findByText('Hazır formlar'));
    expect(await screen.findByText(/hukuk danışmanınızın gözden geçirmesi/))
      .toBeTruthy();
  });

  it('aynı formu ikinci kez eklemiyor', async () => {
    render(<OnamSection />);
    fireEvent.click(await screen.findByText('Hazır formlar'));
    fireEvent.click(await screen.findByText('Ekle'));
    await waitFor(() => expect(screen.getByText('Eklendi')).toBeTruthy());
  });

  it('hazır form yoksa düğme çıkmıyor', async () => {
    listConsentPresets.mockResolvedValue([]);
    render(<OnamSection />);
    await screen.findByText('Boş form');
    expect(screen.queryByText('Hazır formlar')).toBeNull();
  });
});
