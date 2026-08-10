import { useEffect, useState } from 'react';
import {
  createPackage,
  deletePackage,
  listPackages,
  updatePackage,
  type Package,
} from '../../api/clinic';
import { Icon } from '../icons';
import { Toggle } from './ui';

type PkgRow = Package & { _new?: boolean };

export default function PaketSection() {
  const [rows, setRows] = useState<PkgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listPackages()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const patch = (i: number, p: Partial<PkgRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: -Date.now(), name: '', sessions: 1, price: 0,
        save_percent: 0, active: true, sort_order: r.length, _new: true,
      },
    ]);

  async function save(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError('Paket adı boş olamaz');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = {
      name: row.name.trim(),
      sessions: Number(row.sessions) || 1,
      price: Number(row.price) || 0,
      save_percent: Number(row.save_percent) || 0,
      active: row.active,
      sort_order: row.sort_order,
    };
    try {
      const saved = row._new
        ? await createPackage(body)
        : await updatePackage(row.id, body);
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
      await deletePackage(row.id);
      setRows((r) => r.filter((_, idx) => idx !== i));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Paketler
          <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
            · çok seanslı kampanya fiyatları
          </span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addRow}>
          {Icon.plus}Paket ekle
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', background: 'var(--cream)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
          {error} — API çalışıyor mu? (uvicorn :8000)
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '20px 0' }}>Yükleniyor…</div>
      ) : (
        <table className="wl-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
          <thead>
            <tr>
              <th>Paket</th>
              <th style={{ width: 90, textAlign: 'right' }}>Seans</th>
              <th style={{ width: 140, textAlign: 'right' }}>Fiyat (₺)</th>
              <th style={{ width: 110, textAlign: 'right' }}>%Avantaj</th>
              <th style={{ width: 80 }}>Durum</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: 'var(--ink-40)', fontSize: 13 }}>
                  Henüz paket yok — "Paket ekle" ile başlayın.
                </td>
              </tr>
            )}
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <input
                    className="wl-input"
                    value={p.name}
                    placeholder="Paket adı"
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input wl-mono"
                    type="number"
                    min={1}
                    value={p.sessions}
                    style={{ textAlign: 'right' }}
                    onChange={(e) => patch(i, { sessions: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input wl-mono"
                    type="number"
                    min={0}
                    value={p.price}
                    style={{ textAlign: 'right' }}
                    onChange={(e) => patch(i, { price: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input wl-mono"
                    type="number"
                    min={0}
                    max={100}
                    value={p.save_percent}
                    style={{ textAlign: 'right' }}
                    onChange={(e) => patch(i, { save_percent: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <Toggle on={p.active} onClick={() => patch(i, { active: !p.active })} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="wl-btn wl-btn-sm"
                      disabled={busy === p.id}
                      style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}
                      onClick={() => save(i)}
                    >
                      {busy === p.id ? '…' : <>{Icon.check}Kaydet</>}
                    </button>
                    <button
                      className="wl-btn wl-btn-ghost wl-btn-sm"
                      style={{ borderRadius: 8 }}
                      onClick={() => remove(i)}
                    >
                      Sil
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
