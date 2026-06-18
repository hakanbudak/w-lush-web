// Yönetici (platform admin) sayfası — yalnızca is_admin kullanıcıya açık.
// Klinikleri listeler, WhatsApp bağlantı talebi olanlara numara atar.
// Backend: GET /api/admin/clinics, PUT /api/admin/clinics/{id}/whatsapp.
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getAdminClinics, assignWhatsapp, type AdminClinic } from '../api/whatsapp';

const STATUS_CHIP: Record<string, { cls: string; label: string }> = {
  connected: { cls: 'wl-chip-good', label: 'Bağlı' },
  requested: { cls: 'wl-chip-warn', label: 'Talep var' },
  none: { cls: '', label: 'Bağlı değil' },
};

export default function Yonetici() {
  const { user } = useAuth();
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setClinics(await getAdminClinics());
    } catch (e) {
      setError((e as Error).message || 'Klinikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // is_admin olmayan kullanıcı bu sayfayı görmesin (backend zaten 403 verir).
  if (user && !user.is_admin) return <Navigate to="/" replace />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 920 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em', margin: 0 }}>
          Yönetici · WhatsApp bağlantıları
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 4 }}>
          Bağlantı talebi olan kliniklere Meta WhatsApp numara kimliği ata.
          Atadığın an bot o klinik için çalışmaya başlar.
        </p>
      </div>

      {loading && <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>Yükleniyor…</div>}
      {error && <div style={{ fontSize: 13, color: 'var(--bad)' }}>{error}</div>}

      {!loading && !error && clinics.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>Henüz klinik yok.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {clinics.map((c) => (
          <ClinicRow key={c.id} clinic={c} onAssigned={load} />
        ))}
      </div>
    </div>
  );
}

function ClinicRow({ clinic, onAssigned }: { clinic: AdminClinic; onAssigned: () => void }) {
  const [pnid, setPnid] = useState(clinic.whatsapp.phone_number_id ?? '');
  const [display, setDisplay] = useState(clinic.whatsapp.display_number ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const chip = STATUS_CHIP[clinic.whatsapp.status] ?? STATUS_CHIP.none;

  async function handleAssign() {
    if (!pnid.trim()) {
      setErr('phone_number_id gerekli');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await assignWhatsapp(clinic.id, {
        phone_number_id: pnid.trim(),
        display_number: display.trim() || undefined,
      });
      onAssigned();
    } catch (e) {
      const msg = (e as Error).message || '';
      setErr(
        /409/.test(msg) ? 'Bu numara başka bir klinikte kullanımda' : msg || 'Atama başarısız',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 16,
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{clinic.name}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{clinic.slug}</div>
        </div>
        <span className={`wl-chip ${chip.cls}`} style={{ height: 20, fontSize: 11 }}>
          {chip.label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-60)' }}>phone_number_id (Meta)</span>
          <input
            value={pnid}
            onChange={(e) => setPnid(e.target.value)}
            placeholder="123456789012345"
            style={inputStyle}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 180 }}>
          <span style={{ fontSize: 11, color: 'var(--ink-60)' }}>Görünen numara (ops.)</span>
          <input
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            placeholder="+90 555 123 45 67"
            style={inputStyle}
          />
        </label>
        <button
          onClick={handleAssign}
          disabled={busy}
          className="wl-btn wl-btn-sm"
          style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8, height: 34 }}
        >
          {busy ? 'Atanıyor…' : clinic.whatsapp.status === 'connected' ? 'Güncelle' : 'Ata'}
        </button>
      </div>
      {err && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{err}</div>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 34,
  padding: '0 10px',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  background: 'var(--cream)',
  fontFamily: 'inherit',
  fontSize: 13,
  color: 'var(--ink)',
  outline: 'none',
};
