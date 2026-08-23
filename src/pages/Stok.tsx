import { useCallback, useEffect, useState } from 'react';
import {
  addMovement, countProduct, createProduct, deleteProduct, listMovements,
  listProducts, updateProduct,
  type MovementReason, type Product, type StockMovement,
} from '../api/stock';
import { Icon } from '../components/icons';
import Select from '../components/ui/Select';
import { durum, ozet, REASON_LABEL, signed } from '../utils/stok';

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

const DURUM: Record<string, { label: string; bg: string; color: string }> = {
  bitti: { label: 'Bitti', bg: 'var(--bad-soft)', color: 'var(--bad)' },
  azaldi: { label: 'Azaldı', bg: 'var(--warn-soft)', color: 'var(--warn)' },
  yeterli: { label: 'Yeterli', bg: 'var(--forest-3)', color: 'var(--forest-2)' },
  takipsiz: { label: 'Takip yok', bg: 'var(--neutral-soft)', color: 'var(--neutral)' },
};

const bos = (): Omit<Product, 'id' | 'quantity'> => ({
  name: '', unit: 'adet', min_quantity: 0, price: 0, cost: 0,
  active: true, sort_order: 0,
});

/** Ürün stoğu: liste, hareket girişi ve ürünün geçmişi. */
export default function Stok() {
  const [rows, setRows] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(bos());

  const load = useCallback(() => {
    listProducts()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const ekle = () => {
    if (!draft.name.trim()) return;
    setError(null);
    createProduct(draft)
      .then((p) => {
        setRows((r) => [...(r ?? []), p]);
        setDraft(bos());
        setAdding(false);
        // Yeni ürün sıfır stokla açılıyor; ilk giriş hemen yapılabilsin.
        setOpen(p.id);
      })
      .catch((e: Error) => setError(e.message));
  };

  const sil = (p: Product) => {
    if (!window.confirm(`"${p.name}" ve tüm stok hareketleri silinsin mi?`)) return;
    deleteProduct(p.id)
      .then(() => setRows((r) => (r ?? []).filter((x) => x.id !== p.id)))
      .catch((e: Error) => setError(e.message));
  };

  return (
    <>
      <header style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Stok</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-60)' }}>
            Miktar yalnızca hareketle değişiyor — her azalmanın bir gerekçesi
            kalıyor.
          </p>
        </div>
        {!adding && (
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8 }}
            onClick={() => setAdding(true)}
          >
            {Icon.plus}Ürün ekle
          </button>
        )}
      </header>

      {error && <div style={{ fontSize: 12.5, color: 'var(--bad)' }}>{error}</div>}

      {adding && (
        <div
          style={{
            background: 'var(--paper)', border: '1px solid var(--line-strong)',
            borderRadius: 12, padding: 14, display: 'flex', flexWrap: 'wrap',
            gap: 8, alignItems: 'flex-end',
          }}
        >
          <Alan etiket="Ürün" genis>
            <input
              className="wl-input"
              value={draft.name}
              placeholder="Ürün adı"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Alan>
          <Alan etiket="Birim">
            <input
              className="wl-input"
              value={draft.unit}
              placeholder="adet"
              style={{ width: 80 }}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
            />
          </Alan>
          <Alan etiket="Uyarı eşiği">
            <input
              className="wl-input wl-mono"
              type="number"
              min={0}
              value={draft.min_quantity}
              style={{ width: 90, textAlign: 'right' }}
              onChange={(e) =>
                setDraft({ ...draft, min_quantity: Number(e.target.value) })
              }
            />
          </Alan>
          <Alan etiket="Satış (₺)">
            <input
              className="wl-input wl-mono"
              type="number"
              min={0}
              value={draft.price}
              style={{ width: 100, textAlign: 'right' }}
              onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
            />
          </Alan>
          <Alan etiket="Alış (₺)">
            <input
              className="wl-input wl-mono"
              type="number"
              min={0}
              value={draft.cost}
              style={{ width: 100, textAlign: 'right' }}
              onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })}
            />
          </Alan>
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8 }}
            disabled={!draft.name.trim()}
            onClick={ekle}
          >
            Kaydet
          </button>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8 }}
            onClick={() => {
              setAdding(false);
              setDraft(bos());
            }}
          >
            Vazgeç
          </button>
          <p style={{ width: '100%', margin: 0, fontSize: 11.5, color: 'var(--ink-45)' }}>
            Ürün sıfır stokla açılır; miktarı hemen ardından "Giriş" ile
            yazarsınız. Uyarı eşiği 0 ise o ürün için uyarı çıkmaz.
          </p>
        </div>
      )}

      {rows !== null && rows.length === 0 && !adding && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-45)' }}>
          Henüz ürün yok — "Ürün ekle" ile başlayın.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {(rows ?? []).map((p) => {
          const d = DURUM[durum(p)];
          return (
            <section
              key={p.id}
              style={{
                background: 'var(--paper)', border: '1px solid var(--line-strong)',
                borderRadius: 12, overflow: 'hidden',
                opacity: p.active ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                    {p.name}
                    {!p.active && (
                      <span style={{ fontWeight: 400, color: 'var(--ink-45)' }}>
                        {' '}· pasif
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 2 }}>
                    {money(p.price)}
                    {p.cost > 0 && ` · alış ${money(p.cost)}`}
                    {p.min_quantity > 0 && ` · uyarı eşiği ${p.min_quantity}`}
                  </div>
                </div>

                <span className="wl-mono" style={{ fontSize: 15, fontWeight: 500 }}>
                  {p.quantity} <span style={{ fontSize: 11 }}>{p.unit}</span>
                </span>

                <span
                  style={{
                    fontSize: 10.5, fontWeight: 600, padding: '3px 9px',
                    borderRadius: 999, background: d.bg, color: d.color,
                  }}
                >
                  {d.label}
                </span>

                <button
                  type="button"
                  className="wl-btn wl-btn-ghost wl-btn-sm"
                  style={{ borderRadius: 8 }}
                  onClick={() => setOpen(open === p.id ? null : p.id)}
                >
                  {open === p.id ? 'Kapat' : 'Hareket'}
                </button>
              </div>

              {open === p.id && (
                <Detay
                  product={p}
                  onChanged={(quantity) => {
                    setRows((r) =>
                      (r ?? []).map((x) => (x.id === p.id ? { ...x, quantity } : x)),
                    );
                  }}
                  onSaved={(next) =>
                    setRows((r) => (r ?? []).map((x) => (x.id === next.id ? next : x)))
                  }
                  onDelete={() => sil(p)}
                />
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Alan({
  etiket, genis, children,
}: {
  etiket: string;
  genis?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        fontSize: 11, color: 'var(--ink-60)', display: 'flex',
        flexDirection: 'column', gap: 4, flex: genis ? '1 1 160px' : undefined,
      }}
    >
      {etiket}
      {children}
    </label>
  );
}

/** Hareket girişi, sayım ve ürünün geçmişi. */
function Detay({
  product, onChanged, onSaved, onDelete,
}: {
  product: Product;
  onChanged: (quantity: number) => void;
  onSaved: (p: Product) => void;
  onDelete: () => void;
}) {
  const [moves, setMoves] = useState<StockMovement[] | null>(null);
  const [reason, setReason] = useState<MovementReason>('giris');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listMovements(product.id)
      .then(setMoves)
      .catch(() => setMoves([]));
  }, [product.id]);
  useEffect(load, [load]);

  const uygula = () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Miktar sıfırdan büyük olmalı.');
      return;
    }
    setBusy(true);
    setError(null);

    // Sayım "kaç tane var" sorusunu soruyor; diğerleri "kaç tane değişti".
    // Farkı sunucu hesaplıyor, ikinci bir yerde tekrar edilmiyor.
    const istek =
      reason === 'sayim'
        ? countProduct(product.id, n, note)
        : addMovement(product.id, {
            delta: reason === 'giris' ? n : -n,
            reason,
            note,
          });

    istek
      .then((m) => {
        setMoves((x) => [m, ...(x ?? [])]);
        onChanged(m.quantity_after);
        setAmount('');
        setNote('');
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const pasifle = () => {
    const { id, quantity: _quantity, ...rest } = product;
    updateProduct(id, { ...rest, active: !product.active })
      .then(onSaved)
      .catch((e: Error) => setError(e.message));
  };

  return (
    <div style={{ borderTop: '1px solid var(--line)', padding: '13px 16px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
        <Alan etiket="Hareket">
          <Select
            value={reason}
            onChange={(v) => setReason(v as MovementReason)}
            options={(Object.keys(REASON_LABEL) as MovementReason[]).map((k) => ({
              value: k,
              label: REASON_LABEL[k],
            }))}
            ariaLabel="Hareket türü"
            style={{ width: 120 }}
          />
        </Alan>
        <Alan etiket={reason === 'sayim' ? `Sayılan (${product.unit})` : `Miktar (${product.unit})`}>
          <input
            className="wl-input wl-mono"
            type="number"
            min={reason === 'sayim' ? 0 : 1}
            value={amount}
            style={{ width: 110, textAlign: 'right' }}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Alan>
        <Alan etiket="Not" genis>
          <input
            className="wl-input"
            value={note}
            placeholder={reason === 'giris' ? 'Fatura no' : 'Gerekçe'}
            onChange={(e) => setNote(e.target.value)}
          />
        </Alan>
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ borderRadius: 8 }}
          disabled={busy || !amount}
          onClick={uygula}
        >
          Kaydet
        </button>
      </div>

      {reason === 'sayim' && (
        <p style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: '8px 0 0' }}>
          Saydığınız toplamı yazın; fark otomatik hesaplanıp hareket olarak
          kaydedilir.
        </p>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--bad)', margin: '8px 0 0' }}>{error}</p>
      )}

      <div style={{ marginTop: 14 }}>
        <div className="wl-label" style={{ marginBottom: 6 }}>Geçmiş</div>
        {moves !== null && moves.length === 0 && (
          <p style={{ fontSize: 11.5, color: 'var(--ink-45)', margin: 0 }}>
            Henüz hareket yok.
          </p>
        )}
        {(moves ?? []).slice(0, 12).map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex', gap: 10, fontSize: 12, padding: '5px 0',
              borderTop: '1px solid var(--line)',
            }}
          >
            <span className="wl-mono" style={{ minWidth: 78, color: 'var(--ink-45)' }}>
              {m.created_at.slice(0, 10)}
            </span>
            <span style={{ flex: 1 }}>{ozet(m, product.unit)}</span>
            <span className="wl-mono" style={{ color: 'var(--ink-45)' }}>
              {signed(m.delta)} → {m.quantity_after}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          type="button"
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 8 }}
          onClick={pasifle}
        >
          {product.active ? 'Pasife al' : 'Aktifleştir'}
        </button>
        <button
          type="button"
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 8, color: 'var(--bad)' }}
          onClick={onDelete}
        >
          Ürünü sil
        </button>
      </div>
    </div>
  );
}
