import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SlotGrid, { type SlotColumn, type SlotItem } from './SlotGrid';

afterEach(cleanup);

const COLUMNS: SlotColumn[] = [
  { key: '1', title: 'Elif' },
  { key: 'none', title: 'Atanmamış' },
];

const item = (over: Partial<SlotItem> = {}): SlotItem => ({
  id: 7, slot: '10:00', columnKey: 'none', title: 'Ayşe Yılmaz',
  subtitle: 'Saç kesimi', status: 'confirmed', color: '#0B8A57', ...over,
});

const ciz = (props: Partial<Parameters<typeof SlotGrid>[0]> = {}) =>
  render(
    <SlotGrid
      slots={['10:00', '11:00']}
      columns={COLUMNS}
      items={[item()]}
      selectedId={null}
      onSelect={() => {}}
      {...props}
    />,
  );

const blok = () => screen.getByText('Ayşe Yılmaz').closest('button') as HTMLElement;

/** jsdom'da dataTransfer yok; sürükleme olayları için taklit ediliyor. */
const dt = () => ({ effectAllowed: '', setData: vi.fn(), getData: () => '7' });

describe('SlotGrid · sürükleyerek taşıma', () => {
  it('onMove verilmezse blok sürüklenemiyor', () => {
    ciz();
    expect(blok().getAttribute('draggable')).toBe('false');
  });

  it('bırakılan hücrenin saatini ve sütununu bildiriyor', () => {
    const onMove = vi.fn();
    ciz({ onMove });

    fireEvent.dragStart(blok(), { dataTransfer: dt() });
    const hedef = screen.getByText('11:00').closest('tr')!.querySelectorAll('td')[1];
    fireEvent.dragOver(hedef, { dataTransfer: dt() });
    fireEvent.drop(hedef, { dataTransfer: dt() });

    // Sütun uzman, satır saat: tek hareket ikisini de belirliyor.
    expect(onMove).toHaveBeenCalledWith(7, '11:00', '1');
  });

  it('iptal edilmiş randevu sürüklenemiyor', () => {
    // Sunucu da reddediyor; sürüklenebilir görünmesi yalan olurdu.
    ciz({ items: [item({ status: 'cancelled' })], onMove: vi.fn() });
    expect(blok().getAttribute('draggable')).toBe('false');
  });

  it('sürükleme bitince hiçbir hücre işaretli kalmıyor', () => {
    const onMove = vi.fn();
    ciz({ onMove });
    fireEvent.dragStart(blok(), { dataTransfer: dt() });
    const hedef = screen.getByText('11:00').closest('tr')!.querySelectorAll('td')[1];
    fireEvent.dragOver(hedef, { dataTransfer: dt() });
    expect(hedef.getAttribute('style')).toContain('var(--forest-3)');

    fireEvent.dragEnd(blok());
    expect(hedef.getAttribute('style')).not.toContain('var(--forest-3)');
  });
});
