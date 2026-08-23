import { useEffect, useState } from 'react';
import {
  createConsentTemplate, deleteConsentTemplate, listConsentTemplates,
  updateConsentTemplate, type ConsentTemplate,
} from '../../api/consent';
import { listServices, type Service } from '../../api/clinic';
import Select from '../ui/Select';
import { Icon } from '../icons';
import { Toggle } from './ui';

type Row = ConsentTemplate & { _new?: boolean };

const bos = (sort: number): Row => ({
  id: -Date.now(), title: '', body: '', service_name: '',
  active: true, sort_order: sort, _new: true,
});

/**
 * Onam formu şablonları.
 *
 * Şablonu değiştirmek imzalanmış kayıtları etkilemiyor: metin imza anında
 * kopyalanıyor. Panel bunu açıkça yazıyor, çünkü aksi varsayım "eski
 * onamları da güncelledim" sanmaya yol açardı.
 */
export default function OnamSection() {
  const [rows, setRows] = useState<Row[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    listConsentTemplates()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
    listServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  const patch = (i: number, p: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const kaydet = async (i: number) => {
    const row = rows[i];
    if (!row.title.trim()) {
      setError('Form başlığı boş olamaz.');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = {
      title: row.title.trim(), body: row.body,
      service_name: row.service_name, active: row.active,
      sort_order: row.sort_order,
    };
    try {
      const saved = row._new
        ? await createConsentTemplate(body)
        : await updateConsentTemplate(row.id, body);
      setRows((r) => r.map((x, idx) => (idx === i ? saved : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const sil = async (i: number) => {
    const row = rows[i];
    if (row._new) {
      setRows((r) => r.filter((_, idx) => idx !== i));
      return;
    }
    if (!window.confirm(`"${row.title}" şablonu silinsin mi? İmzalanmış kopyalar kalır.`)) {
      return;
    }
    try {
      await deleteConsentTemplate(row.id);
      setRows((r) => r.filter((_, idx) => idx !== i));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Onam formları</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 2 }}>
            Danışan profilinden gönderilir, danışan bağlantıdan imzalar.
          </div>
        </div>
        <button
          type="button"
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 8 }}
          onClick={() => setRows((r) => [...r, bos(r.length)])}
        >
          {Icon.plus}Form ekle
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--bad)', marginBottom: 10 }}>{error}</div>
      )}

      {rows.length === 0 && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-45)' }}>
          Henüz form yok — "Form ekle" ile başlayın.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((r, i) => (
          <div
            key={r.id}
            style={{
              border: '1px solid var(--line-strong)', borderRadius: 12,
              padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="wl-input"
                value={r.title}
                placeholder="Form başlığı"
                style={{ flex: 1 }}
                onChange={(e) => patch(i, { title: e.target.value })}
              />
              <Select
                value={r.service_name}
                onChange={(v) => patch(i, { service_name: v })}
                options={[
                  { value: '', label: 'Genel form' },
                  ...services.map((s) => ({ value: s.name, label: s.name })),
                ]}
                ariaLabel={`${r.title || 'Form'} hangi hizmet için`}
                style={{ width: 180 }}
              />
              <Toggle on={r.active} onClick={() => patch(i, { active: !r.active })} />
            </div>

            <textarea
              className="wl-input"
              value={r.body}
              placeholder="Onam metni — danışanın okuyup kabul edeceği tam metin."
              rows={6}
              style={{ width: '100%', resize: 'vertical', lineHeight: 1.6 }}
              onChange={(e) => patch(i, { body: e.target.value })}
            />

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--ink-45)' }}>
                Metni değiştirmek daha önce imzalanmış onamları değiştirmez —
                imza anındaki metin kaydın içinde saklanıyor.
              </span>
              <button
                type="button"
                className="wl-btn wl-btn-sm"
                style={{ borderRadius: 8 }}
                disabled={busy === r.id}
                onClick={() => kaydet(i)}
              >
                {busy === r.id ? '…' : 'Kaydet'}
              </button>
              <button
                type="button"
                className="wl-btn wl-btn-ghost wl-btn-sm"
                style={{ borderRadius: 8, color: 'var(--bad)' }}
                onClick={() => sil(i)}
              >
                Sil
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
