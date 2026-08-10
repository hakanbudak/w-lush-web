import { useEffect, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type ExpenseCategory,
} from '../../api/expenses';
import { Icon } from '../icons';

type CatRow = ExpenseCategory & { _new?: boolean };

export default function GiderKategoriSection() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listCategories()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const patch = (i: number, p: Partial<CatRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: -Date.now(), name: '', active: true, sort_order: r.length, _new: true },
    ]);

  async function save(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError('Kategori adı boş olamaz');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = { name: row.name.trim(), active: row.active, sort_order: row.sort_order };
    try {
      const saved = row._new ? await createCategory(body) : await updateCategory(row.id, body);
      setRows((r) => r.map((x, idx) => (idx === i ? saved : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(i: number) {
    const row = rows[i];
    if (row._new) {
      setRows((r) => r.filter((_, idx) => idx !== i));
      return;
    }
    if (!window.confirm(`"${row.name}" silinsin mi?`)) return;
    setBusy(row.id);
    try {
      await deleteCategory(row.id);
      setRows((r) => r.filter((_, idx) => idx !== i));
    } catch (e) {
      // 409: kategoride gider var. Satır durur, backend'in önerisi gösterilir.
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Gider kategorileri
          <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
            · Giderler ekranı bu listeyi kullanır
          </span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addRow}>
          {Icon.plus}Kategori ekle
        </button>
      </div>

      {error && (
        <div
          style={{
            fontSize: 12, color: 'var(--bad)', background: 'var(--cream)',
            border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px',
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '20px 0' }}>Yükleniyor…</div>
      ) : (
        <table className="wl-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
          <thead>
            <tr>
              <th>Kategori</th>
              <th style={{ width: 80 }}>Durum</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: 'var(--ink-40)', fontSize: 13 }}>
                  Henüz kategori yok — "Kategori ekle" ile başlayın.
                </td>
              </tr>
            )}
            {rows.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <input
                    className="wl-input"
                    value={c.name}
                    placeholder="Kategori adı"
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                </td>
                <td>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    onClick={() => patch(i, { active: !c.active })}
                  >
                    {c.active ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="wl-btn wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    disabled={busy === c.id}
                    onClick={() => save(i)}
                  >
                    Kaydet
                  </button>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    disabled={busy === c.id}
                    onClick={() => remove(i)}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
