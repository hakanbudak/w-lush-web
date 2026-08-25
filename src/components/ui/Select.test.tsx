import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Combobox from './Combobox';
import Select from './Select';

afterEach(cleanup);

const OPTIONS = [
  { value: '1', label: 'Cilt Bakımı' },
  { value: '2', label: 'Lazer Epilasyon' },
  { value: '3', label: 'Şişme İğnesi' },
];

const trigger = () => screen.getByRole('combobox');
const list = () => screen.queryByRole('listbox');

describe('Select', () => {
  it('seçili etiketi gösterir, liste kapalı başlar', () => {
    render(<Select value="2" onChange={() => {}} options={OPTIONS} />);
    expect(trigger().textContent).toContain('Lazer Epilasyon');
    expect(list()).toBeNull();
  });

  it('seçim yokken yer tutucuyu gösterir', () => {
    render(<Select value="" onChange={() => {}} options={OPTIONS} />);
    expect(trigger().textContent).toContain('Seçilmedi');
  });

  it('tıklayınca açılır, tekrar tıklayınca kapanır', () => {
    render(<Select value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    expect(list()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(trigger());
    expect(list()).toBeNull();
  });

  it('ok tuşu ve Enter ile seçim yapılır', () => {
    const onChange = vi.fn();
    render(<Select value="1" onChange={onChange} options={OPTIONS} />);
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // açar, seçiliyi vurgular
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // sıradakine geçer
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('2');
    expect(list()).toBeNull();
  });

  it('açılışta seçili öğe vurgulanır', () => {
    render(<Select value="3" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    expect(trigger().getAttribute('aria-activedescendant')).toMatch(/-2$/);
  });

  it('Escape kapatır ve odağı geri verir', () => {
    render(<Select value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    expect(list()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('tıklanan seçenek değeri bildirir', () => {
    const onChange = vi.fn();
    render(<Select value="" onChange={onChange} options={OPTIONS} />);
    fireEvent.click(trigger());
    fireEvent.mouseDown(screen.getByText('Şişme İğnesi'));
    expect(onChange).toHaveBeenCalledWith('3');
  });

  it('odak kaybında kapanır', () => {
    render(<Select value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    fireEvent.blur(trigger());
    expect(list()).toBeNull();
  });

  it('etiket içindeyken tek tıklamada açık kalır', () => {
    // Çağıran ekranların hepsinde <label> sarmalıyor. Etiket tıklamayı
    // bir kez daha iletirse liste açılır açılmaz kapanırdı.
    render(
      <label>
        Hizmet
        <Select value="" onChange={() => {}} options={OPTIONS} />
      </label>,
    );
    fireEvent.click(trigger());
    expect(list()).not.toBeNull();
  });

  it('seçili öğe listede işaretli görünür', () => {
    render(<Select value="2" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    const selected = screen.getAllByRole('option').filter(
      (o) => o.getAttribute('aria-selected') === 'true',
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain('Lazer Epilasyon');
  });
});

describe('Combobox', () => {
  it('yazılan metin listeyi daraltır', () => {
    render(
      <Combobox value="lazer" onChange={() => {}} onPick={() => {}} options={OPTIONS} />,
    );
    fireEvent.focus(trigger());
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('yazılan metni olduğu gibi bildirir', () => {
    const onChange = vi.fn();
    render(<Combobox value="" onChange={onChange} onPick={() => {}} options={OPTIONS} />);
    fireEvent.change(trigger(), { target: { value: 'Kayıtsız Ziyaretçi' } });
    expect(onChange).toHaveBeenCalledWith('Kayıtsız Ziyaretçi');
  });

  it('hiçbir kayda uymayan metinde liste boş kalır ama metin durur', () => {
    // Kayıtsız ziyaretçiye ödeme girilebilmesi buna bağlı.
    render(
      <Combobox
        value="Kayıtsız Ziyaretçi"
        onChange={() => {}}
        onPick={() => {}}
        options={OPTIONS}
      />,
    );
    fireEvent.focus(trigger());
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('Eşleşen yok')).toBeTruthy();
    expect((trigger() as HTMLInputElement).value).toBe('Kayıtsız Ziyaretçi');
  });

  it('listeden seçim çağırana seçeneğin kendisini verir', () => {
    const onPick = vi.fn();
    render(<Combobox value="" onChange={() => {}} onPick={onPick} options={OPTIONS} />);
    fireEvent.focus(trigger());
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
    fireEvent.keyDown(trigger(), { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith(OPTIONS[0]);
  });
});

describe('Select · panelin içinde kaydırma', () => {
  it('panelin kendi kaydırması listeyi kapatmıyor', () => {
    // Dinleyici yakalama fazında olmak zorunda (kaydırma köpürmüyor), o
    // yüzden panelin kendi kaydırması da oraya düşüyordu ve uzun listeyi
    // kaydırmaya çalışmak listeyi kapatıyordu.
    render(<Select value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    const panel = document.querySelector('[data-wl-popover]');
    expect(panel).not.toBeNull();

    fireEvent.scroll(panel as Element);
    expect(list()).not.toBeNull();
  });

  it('sayfanın kaydırması listeyi kapatıyor', () => {
    render(<Select value="" onChange={() => {}} options={OPTIONS} />);
    fireEvent.click(trigger());
    expect(list()).not.toBeNull();

    fireEvent.scroll(document.body);
    expect(list()).toBeNull();
  });
});
