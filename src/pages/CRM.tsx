import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCustomers, type CustomerSummary, type Stage, type Warmth } from '../api/customers';
import LeadModal from '../components/crm/LeadModal';
import { useToast } from '../components/shell/Toast';
import { Avatar } from '../components/ui';
import { relativeTime } from '../utils/time';

/** Kolonlar. Sıra panonun soldan sağa akışı. */
const STAGES: { key: Stage; label: string; hint: string; edge: string }[] = [
  { key: 'new', label: 'Yeni', hint: 'Henüz dönülmedi', edge: 'var(--warn)' },
  { key: 'contacted', label: 'İlk temas', hint: 'Mesajlaşıldı', edge: 'var(--blue)' },
  { key: 'consult', label: 'Konsültasyon', hint: 'Randevu verildi', edge: 'var(--ai)' },
  { key: 'customer', label: 'Danışan', hint: 'Seansa geldi', edge: 'var(--forest)' },
];

const WARMTH: Record<Warmth, { label: string; bg: string; color: string }> = {
  hot: { label: 'Sıcak', bg: 'var(--forest-3)', color: 'var(--forest-2)' },
  // Amber tasarıma özel; palette karşılığı yok.
  warm: { label: 'Ilık', bg: '#FBF3E0', color: '#8A6A1F' },
  cold: { label: 'Soğuk', bg: 'var(--neutral-soft)', color: 'var(--neutral)' },
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
  const [open, setOpen] = useState<CustomerSummary | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

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
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--line)',
                borderTop: `2px solid ${stage.edge}`,
                borderTopLeftRadius: 'var(--r-card)',
                borderTopRightRadius: 'var(--r-card)',
              }}
            >
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
                  onClick={() => setOpen(c)}
                  style={{
                    textAlign: 'left', width: '100%', cursor: 'pointer', font: 'inherit',
                    background: 'var(--paper)', border: '1px solid var(--line)',
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
                      <span
                        style={{
                          marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 999,
                          background: WARMTH[c.warmth].bg,
                          color: WARMTH[c.warmth].color,
                        }}
                      >
                        {WARMTH[c.warmth].label}
                      </span>
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

      {open && (
        <LeadModal
          customer={open}
          stages={STAGES}
          onClose={() => setOpen(null)}
          onChanged={(phone, stage) => {
            setItems((cur) =>
              cur ? cur.map((c) => (c.phone === phone ? { ...c, stage } : c)) : cur,
            );
            setOpen((cur) => (cur ? { ...cur, stage } : cur));
            toast('Aşama güncellendi.');
          }}
          onOpenProfile={() => navigate(`/danisan/${encodeURIComponent(open.phone)}`)}
          onMessage={() => navigate(`/mesajlar?phone=${encodeURIComponent(open.phone)}`)}
          onBook={() => navigate('/randevu')}
        />
      )}
    </div>
  );
}
