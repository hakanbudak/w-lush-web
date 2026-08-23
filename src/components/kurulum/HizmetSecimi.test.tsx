import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import HizmetSecimi, { key as adAnahtari } from './HizmetSecimi';
import type { PresetGroup, SetupService } from '../../api/clinic';

afterEach(cleanup);

const GRUPLAR: PresetGroup[] = [
  {
    name: 'Cilt bakımı',
    color: '#0B8A57',
    services: [
      { name: 'Hydrafacial', duration_minutes: 60, color: '#0B8A57', common: true },
      { name: 'Karbon peeling', duration_minutes: 45, color: '#0B8A57', common: false },
    ],
  },
  {
    name: 'Medikal estetik',
    color: '#6837C9',
    services: [{ name: 'Botoks', duration_minutes: 30, color: '#6837C9', common: true }],
  },
];

/** Seçim durumunu tutan küçük bir kabuk: bileşen kontrollü çalışıyor. */
function Kabuk({ baslangic = [] }: { baslangic?: SetupService[] }) {
  const [secili, setSecili] = useState(
    () => new Map(baslangic.map((s) => [adAnahtari(s.name), s])),
  );
  return (
    <>
      <HizmetSecimi
        groups={GRUPLAR}
        secim={{
          secili,
          ekle: (s) => setSecili((c) => new Map(c).set(adAnahtari(s.name), s)),
          cikar: (name) =>
            setSecili((c) => {
              const n = new Map(c);
              n.delete(adAnahtari(name));
              return n;
            }),
        }}
      />
      <output data-testid="secilenler">
        {[...secili.values()].map((s) => `${s.name}|${s.duration_minutes}|${s.color}`).join(',')}
      </output>
    </>
  );
}

const secilenler = () => screen.getByTestId('secilenler').textContent ?? '';

describe('HizmetSecimi', () => {
  it('hizmet seçince süresini ve rengini de taşır', () => {
    render(<Kabuk />);
    fireEvent.click(screen.getByText('Botoks'));
    expect(secilenler()).toBe('Botoks|30|#6837C9');
  });

  it('seçili hizmete tekrar basınca kaldırır', () => {
    render(<Kabuk baslangic={[{ name: 'Botoks', duration_minutes: 30, color: '#6837C9' }]} />);
    fireEvent.click(screen.getByText('Botoks'));
    expect(secilenler()).toBe('');
  });

  it('grubun tamamını tek tıkla seçer ve kaldırır', () => {
    render(<Kabuk />);
    const dugme = screen.getAllByText('Tümünü seç')[0];
    fireEvent.click(dugme);
    expect(secilenler()).toBe('Hydrafacial|60|#0B8A57,Karbon peeling|45|#0B8A57');
    fireEvent.click(screen.getAllByText('Tümünü kaldır')[0]);
    expect(secilenler()).toBe('');
  });

  it('merkezin kendi yazdığı hizmeti listeye ekler', () => {
    render(<Kabuk />);
    fireEvent.change(screen.getByPlaceholderText('Kendi hizmetinizin adı'), {
      target: { value: 'Özel bakımım' },
    });
    fireEvent.click(screen.getByText('Ekle'));
    expect(secilenler()).toBe('Özel bakımım|60|#0B8A57');
  });

  it('aynı hizmeti ikinci kez eklemeyi reddeder', () => {
    render(<Kabuk baslangic={[{ name: 'Botoks', duration_minutes: 30, color: '#6837C9' }]} />);
    fireEvent.change(screen.getByPlaceholderText('Kendi hizmetinizin adı'), {
      target: { value: 'botoks' },
    });
    fireEvent.click(screen.getByText('Ekle'));
    expect(screen.getByText('Bu hizmet zaten listede.')).toBeTruthy();
    expect(secilenler()).toBe('Botoks|30|#6837C9');
  });

  it('kendi eklediği hizmeti kaldırabilir', () => {
    render(<Kabuk baslangic={[{ name: 'Özel bakımım', duration_minutes: 60, color: '#B0577F' }]} />);
    fireEvent.click(screen.getByLabelText('Özel bakımım hizmetini kaldır'));
    expect(secilenler()).toBe('');
  });
});
