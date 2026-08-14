import { useState } from 'react';
import { ApiError } from '../../api/client';
import { setStage, type CustomerSummary, type Stage } from '../../api/customers';
import { Modal } from '../modals';
import { displayName } from '../../utils/people';

const WARMTH: Record<string, { label: string; bg: string; color: string }> = {
  hot: { label: 'Sıcak', bg: 'var(--forest-3)', color: 'var(--forest-2)' },
  warm: { label: 'Ilık', bg: '#FBF3E0', color: '#8A6A1F' },
  cold: { label: 'Soğuk', bg: 'var(--neutral-soft)', color: 'var(--neutral)' },
};

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

/**
 * Aday kartının detayı. Aşama düğmeleri kartı panoda taşır.
 *
 * Aşama normalde davranıştan türetilir; elle konan değer onun yerine geçer ve
 * kart artık kendiliğinden ilerlemez — bu, operatörün bilerek verdiği bir
 * karar olduğu için ekranda da yazıyor.
 */
export default function LeadModal({
  customer,
  stages,
  onClose,
  onChanged,
  onOpenProfile,
  onMessage,
  onBook,
}: {
  customer: CustomerSummary;
  stages: { key: Stage; label: string; edge: string }[];
  onClose: () => void;
  onChanged: (phone: string, stage: Stage) => void;
  onOpenProfile: () => void;
  onMessage: () => void;
  onBook: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  const who = displayName(customer);
  const warmth = customer.warmth ? WARMTH[customer.warmth] : null;

  const move = (stage: Stage) => {
    setBusy(true);
    setError(null);
    setStage(customer.phone, stage)
      .then(() => {
        setPinned(true);
        onChanged(customer.phone, stage);
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        setError(api?.detail || 'Aşama değiştirilemedi.');
      })
      .finally(() => setBusy(false));
  };

  return (
    <Modal title="Aday" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: 'var(--forest)',
              color: 'var(--navy-ink)',
              display: 'grid',
              placeItems: 'center',
              fontSize: 14,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {initials(who)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wl-display" style={{ fontSize: 16 }}>
              {who}
            </div>
            <div className="wl-mono" style={{ fontSize: 12, color: 'var(--ink-45)' }}>
              {customer.phone}
            </div>
          </div>
          {warmth && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 999,
                background: warmth.bg,
                color: warmth.color,
              }}
            >
              {warmth.label}
            </span>
          )}
        </div>

        <div>
          <div className="wl-label" style={{ marginBottom: 8 }}>
            Aşama
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {stages.map((s) => (
              <button
                key={s.key}
                type="button"
                disabled={busy}
                onClick={() => move(s.key)}
                className="wl-btn wl-btn-sm"
                style={{
                  borderRadius: 8,
                  fontSize: 12,
                  background: customer.stage === s.key ? s.edge : 'transparent',
                  color: customer.stage === s.key ? 'var(--paper)' : 'var(--ink-60)',
                  border:
                    customer.stage === s.key ? 'none' : '1px solid var(--line-strong)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 8, lineHeight: 1.5 }}>
            {pinned
              ? 'Aşama elle sabitlendi — bu kart artık randevu ve mesaj geçmişine göre kendiliğinden ilerlemez.'
              : 'Aşama randevu ve mesaj geçmişinden türetilir. Elle seçmek onu sabitler.'}
          </div>
        </div>

        {customer.last_message && (
          <div>
            <div className="wl-label" style={{ marginBottom: 6 }}>
              Son mesaj
            </div>
            <div
              style={{
                background: 'var(--cream)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              {customer.last_message}
            </div>
          </div>
        )}

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onOpenProfile}>
            Profili aç
          </button>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onMessage}>
            Mesaj
          </button>
          <button type="button" className="wl-btn wl-btn-sm" onClick={onBook}>
            Randevu ver
          </button>
        </div>
      </div>
    </Modal>
  );
}
