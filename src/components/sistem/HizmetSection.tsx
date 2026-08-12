import { useEffect, useState } from 'react';
import {
  createService,
  deleteService,
  listServices,
  updateService,
  type Service,
} from '../../api/clinic';
import { Icon } from '../icons';
import { Toggle } from './ui';

type Row = Service & { _new?: boolean };

export default function HizmetSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listServices()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const patch = (i: number, p: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: -Date.now(), name: '', price: 0, duration_minutes: 60,
        active: true, sort_order: r.length, _new: true,
      },
    ]);

  async function save(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError('Hizmet adı boş olamaz');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = {
      name: row.name.trim(),
      price: Number(row.price) || 0,
      duration_minutes: Number(row.duration_minutes) || 60,
      active: row.active,
      sort_order: row.sort_order,
    };
    try {
      const saved = row._new
        ? await createService(body)
        : await updateService(row.id, body);
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
      await deleteService(row.id);
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
            Hizmetler & fiyatlar
            <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
              · WhatsApp botu bu listeyi kullanır
            </span>
          </div>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addRow}>
            {Icon.plus}Hizmet ekle
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
                <th>Hizmet</th>
                <th style={{ width: 110, textAlign: 'right' }}>Süre (dk)</th>
                <th style={{ width: 150, textAlign: 'right' }}>Fiyat (₺)</th>
                <th style={{ width: 80 }}>Durum</th>
                <th style={{ width: 150 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: 'var(--ink-40)', fontSize: 13 }}>
                    Henüz hizmet yok — "Hizmet ekle" ile başlayın.
                  </td>
                </tr>
              )}
              {rows.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <input
                      className="wl-input"
                      value={s.name}
                      placeholder="Hizmet adı"
                      onChange={(e) => patch(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="wl-input wl-mono"
                      type="number"
                      min={5}
                      step={5}
                      value={s.duration_minutes}
                      style={{ textAlign: 'right' }}
                      onChange={(e) => patch(i, { duration_minutes: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="wl-input wl-mono"
                      type="number"
                      min={0}
                      value={s.price}
                      style={{ textAlign: 'right' }}
                      onChange={(e) => patch(i, { price: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <Toggle on={s.active} onClick={() => patch(i, { active: !s.active })} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="wl-btn wl-btn-sm"
                        disabled={busy === s.id}
                        style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}
                        onClick={() => save(i)}
                      >
                        {busy === s.id ? '…' : <>{Icon.check}Kaydet</>}
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
