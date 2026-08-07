import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCustomers, type CustomerSummary, type Stage, type Warmth } from '../api/customers';
import { Avatar, Chip } from '../components/ui';
import { relativeTime } from '../utils/time';

/** Kolonlar. Sıra panonun soldan sağa akışı. */
const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: 'new', label: 'Yeni', hint: 'Henüz dönülmedi' },
  { key: 'contacted', label: 'İlk temas', hint: 'Mesajlaşıldı' },
  { key: 'consult', label: 'Konsültasyon', hint: 'Randevu verildi' },
  { key: 'customer', label: 'Müşteri', hint: 'Seansa geldi' },
];

const WARMTH: Record<Warmth, { label: string; tone: 'sage' | 'champagne' | 'blush' }> = {
  hot: { label: 'Sıcak', tone: 'sage' },
  warm: { label: 'Ilık', tone: 'champagne' },
  cold: { label: 'Soğuk', tone: 'blush' },
};

const displayName = (c: CustomerSummary): string => c.name || c.phone;

/** "9 Ağu 14:30 · Lazer" — takvim günü, saat dilimi çevrimi yok. */
const apptLabel = (a: NonNullable<CustomerSummary['next_appointment']>): string => {
  const day = new Date(`${a.appt_date}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
  return `${day} ${a.appt_time} · ${a.service_name}`;
};

export default function CRM() {
  const [items, setItems] = useState<CustomerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setError(null);
    listCustomers()
      .then(setItems)
      .catch(() => setError('Danışan adayları yüklenemedi.'));
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: 'var(--ink-60)' }}>
        {error}{' '}
        <button
          type="button"
          onClick={load}
          style={{
            border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit',
            fontSize: 13, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (items === null) {
    return <div style={{ padding: 24, fontSize: 13, color: 'var(--ink-40)' }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {STAGES.map((stage) => {
        const cards = items.filter((c) => c.stage === stage.key);
        return (
          <div
            key={stage.key}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{stage.label}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>{cards.length}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>{stage.hint}</div>
            </div>

            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cards.length === 0 && (
                <div style={{ padding: 12, fontSize: 11, color: 'var(--ink-40)' }}>
                  Bu aşamada kimse yok.
                </div>
              )}
              {cards.map((c, i) => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => navigate(`/danisan/${encodeURIComponent(c.phone)}`)}
                  style={{
                    textAlign: 'left', width: '100%', cursor: 'pointer', font: 'inherit',
                    background: 'var(--cream)', border: '1px solid var(--line)',
                    borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={displayName(c)} i={i} />
                    <span
                      style={{
                        fontSize: 12, fontWeight: 600, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {displayName(c)}
                    </span>
                    {c.warmth && (
                      <Chip tone={WARMTH[c.warmth].tone} small style={{ marginLeft: 'auto' }}>
                        {WARMTH[c.warmth].label}
                      </Chip>
                    )}
                  </div>

                  {c.last_message && (
                    <div
                      style={{
                        fontSize: 11, color: 'var(--ink-60)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {c.last_message}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--ink-40)' }}>
                    {c.last_message_at && <span>{relativeTime(c.last_message_at)}</span>}
                    {c.next_appointment && (
                      <span
                        style={{
                          marginLeft: 'auto', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {apptLabel(c.next_appointment)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
