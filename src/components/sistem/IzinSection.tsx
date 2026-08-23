import { useCallback, useEffect, useState } from 'react';
import {
  createLeave,
  deleteLeave,
  listLeaves,
  type LeaveConflict,
  type StaffLeave,
  type StaffMember,
} from '../../api/staff';
import { trDate } from '../../utils/calendar';
import { displayName } from '../../utils/people';
import DatePicker from '../ui/DatePicker';

/** "12–20 Ağu" · tek günse tek tarih. Aralık iki uca da dahil. */
function rangeLabel(leave: StaffLeave): string {
  const bas = trDate(leave.starts_on);
  const bit = trDate(leave.ends_on);
  return bas === bit ? bas : `${bas} – ${bit}`;
}

/**
 * Bir uzmanın izinleri.
 *
 * İzin girmek çakışan randevuları engellemiyor: hastalık izni "önce
 * randevularını taşı" diye geri çevrilemez. Onun yerine çakışanlar telefon
 * numaralarıyla listeleniyor — danışan boşa gelmesin diye operatörün onları
 * araması gerekiyor.
 */
export default function IzinSection({ person }: { person: StaffMember }) {
  const [leaves, setLeaves] = useState<StaffLeave[] | null>(null);
  const [conflicts, setConflicts] = useState<LeaveConflict[]>([]);
  const [adding, setAdding] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    listLeaves(person.id)
      .then(setLeaves)
      .catch(() => setError('İzinler yüklenemedi.'));
  }, [person.id]);

  useEffect(load, [load]);

  const reset = () => {
    setAdding(false);
    setStart('');
    setEnd('');
    setReason('');
    setError(null);
  };

  const save = () => {
    if (!start) return;
    setBusy(true);
    setError(null);
    // Bitiş boşsa tek günlük izin: iki tarihi eşitlemek en sık girilen hâli
    // tek tıka indiriyor.
    createLeave(person.id, { starts_on: start, ends_on: end || start, reason })
      .then((out) => {
        setLeaves((l) => [...(l ?? []), out.leave]);
        setConflicts(out.conflicts);
        reset();
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const remove = (id: number) => {
    setError(null);
    deleteLeave(id)
      .then(() => setLeaves((l) => (l ?? []).filter((x) => x.id !== id)))
      .catch(() => setError('İzin silinemedi.'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>
          İzinler
          <span style={{ fontWeight: 400, color: 'var(--ink-45)', marginLeft: 6 }}>
            · bu tarihlerde randevu verilmez
          </span>
        </div>
        {!adding && (
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8 }}
            onClick={() => setAdding(true)}
          >
            İzin ekle
          </button>
        )}
      </div>

      {adding && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
          <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
            Başlangıç
            <DatePicker value={start} onChange={setStart} ariaLabel="İzin başlangıcı"
                        style={fieldStyle} />
          </label>
          <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
            Bitiş
            <DatePicker value={end} onChange={setEnd} ariaLabel="İzin bitişi"
                        style={fieldStyle} />
          </label>
          <label style={{ fontSize: 11, color: 'var(--ink-60)', flex: '1 1 160px' }}>
            Sebep
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Yıllık izin"
              style={{ ...fieldStyle, width: '100%' }}
            />
          </label>
          <button type="button" className="wl-btn wl-btn-sm" style={{ borderRadius: 8 }}
                  disabled={busy || !start} onClick={save}>
            Kaydet
          </button>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm"
                  style={{ borderRadius: 8 }} onClick={reset}>
            Vazgeç
          </button>
          {start && !end && (
            <div style={{ fontSize: 11, color: 'var(--ink-45)', width: '100%' }}>
              Bitiş boş kalırsa tek günlük izin sayılır.
            </div>
          )}
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: 'var(--bad)' }}>{error}</div>}

      {leaves !== null && leaves.length === 0 && !adding && (
        <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Kayıtlı izin yok.</div>
      )}

      {(leaves ?? []).map((l) => (
        <div
          key={l.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
            padding: '6px 0', borderTop: '1px solid var(--line)',
          }}
        >
          <span className="wl-mono" style={{ minWidth: 120 }}>{rangeLabel(l)}</span>
          <span style={{ flex: 1, color: 'var(--ink-60)' }}>{l.reason || '—'}</span>
          <button
            type="button"
            onClick={() => remove(l.id)}
            aria-label="İzni sil"
            style={{
              border: 'none', background: 'transparent', font: 'inherit',
              fontSize: 11, color: 'var(--ink-45)', cursor: 'pointer', padding: 0,
            }}
          >
            sil
          </button>
        </div>
      ))}

      {conflicts.length > 0 && (
        <div
          style={{
            background: 'var(--warn-soft)', borderRadius: 8, padding: '10px 12px',
            fontSize: 11.5, lineHeight: 1.6,
          }}
        >
          <strong style={{ color: 'var(--warn)' }}>
            Bu tarihlerde {conflicts.length} randevu var.
          </strong>{' '}
          İzin kaydedildi ama randevular duruyor — danışanların boşa gelmemesi için
          bunları taşımanız gerekiyor:
          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {conflicts.map((c) => (
              <li key={c.id}>
                {trDate(c.appt_date)} {c.appt_time} ·{' '}
                {displayName({ name: c.customer_name, phone: c.phone })} · {c.service_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '6px 8px',
  font: 'inherit',
  fontSize: 12.5,
  background: 'var(--cream)',
  marginTop: 4,
  minWidth: 130,
};
