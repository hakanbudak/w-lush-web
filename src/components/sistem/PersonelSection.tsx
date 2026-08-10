import { useEffect, useState } from 'react';
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
  type StaffMember,
} from '../../api/staff';
import { Icon } from '../icons';

type StaffRow = StaffMember & { _new?: boolean };

export default function PersonelSection() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listStaff()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const patch = (i: number, p: Partial<StaffRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: -Date.now(), name: '', role: '', active: true, sort_order: r.length, _new: true },
    ]);

  async function save(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError('Personel adı boş olamaz');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = {
      name: row.name.trim(),
      role: row.role.trim(),
      active: row.active,
      sort_order: row.sort_order,
    };
    try {
      const saved = row._new ? await createStaff(body) : await updateStaff(row.id, body);
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
      await deleteStaff(row.id);
      setRows((r) => r.filter((_, idx) => idx !== i));
    } catch (e) {
      // 409: personelin randevuları var. Satır durur, backend'in önerisi görünür.
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
          Personel
          <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
            · Randevular bu kişilere atanır
          </span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addRow}>
          {Icon.plus}Personel ekle
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
              <th>Ad</th>
              <th>Görev</th>
              <th style={{ width: 80 }}>Durum</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--ink-40)', fontSize: 13 }}>
                  Henüz personel yok — "Personel ekle" ile başlayın.
                </td>
              </tr>
            )}
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <input
                    className="wl-input"
                    value={p.name}
                    placeholder="Ad soyad"
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input"
                    value={p.role}
                    placeholder="Cilt uzmanı"
                    onChange={(e) => patch(i, { role: e.target.value })}
                  />
                </td>
                <td>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    onClick={() => patch(i, { active: !p.active })}
                  >
                    {p.active ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="wl-btn wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    disabled={busy === p.id}
                    onClick={() => save(i)}
                  >
                    Kaydet
                  </button>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    disabled={busy === p.id}
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
