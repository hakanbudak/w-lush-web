import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getCustomer,
  listCustomers,
  type CustomerDetail,
  type CustomerSummary,
} from '../api/customers';
import { Avatar, Chip } from '../components/ui';
import { clockTime, relativeTime } from '../utils/time';
import { displayName } from '../utils/people';

type Tab = 'randevular' | 'mesajlar';

const STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  confirmed: { label: 'Onaylı', tone: 'good' },
  pending: { label: 'Bekliyor', tone: 'warn' },
  cancelled: { label: 'İptal', tone: 'bad' },
};

/** YYYY-MM-DD → "12 May 2026". Takvim günü; saat dilimi çevrimi yok. */
const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function DanisanProfili() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<CustomerSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('randevular');

  const loadList = useCallback(() => {
    setListError(null);
    listCustomers()
      .then(setList)
      .catch(() => setListError('Danışanlar yüklenemedi.'));
  }, []);

  useEffect(loadList, [loadList]);

  const loadDetail = useCallback(() => {
    if (!phone) {
      setDetail(null);
      return;
    }
    setDetail(null);
    setDetailError(null);
    getCustomer(phone)
      .then(setDetail)
      .catch((e: Error) =>
        setDetailError(
          e.message.includes('404')
            ? 'Bu numaraya ait kayıt bulunamadı.'
            : 'Danışan bilgileri yüklenemedi.',
        ),
      );
  }, [phone]);

  useEffect(loadDetail, [loadDetail]);

  const filtered = useMemo(() => {
    if (!list) return [];
    const needle = q.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return list;
    return list.filter(
      (c) => c.name.toLocaleLowerCase('tr-TR').includes(needle) || c.phone.includes(needle),
    );
  }, [list, q]);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* ── sol: danışan listesi ── */}
      <div
        style={{
          width: 280, flexShrink: 0, background: 'var(--paper)',
          border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
        }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim veya telefon ara"
            style={{
              width: '100%', border: '1px solid var(--line)', borderRadius: 8,
              padding: '8px 10px', font: 'inherit', fontSize: 12, background: 'var(--cream)',
            }}
          />
        </div>
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {listError && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-60)' }}>
              {listError}{' '}
              <button
                type="button"
                onClick={loadList}
                style={{
                  border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                  fontSize: 12, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Tekrar dene
              </button>
            </div>
          )}
          {!listError && list === null && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
          )}
          {!listError && list?.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
              Henüz danışan yok — WhatsApp’tan mesaj geldiğinde burada görünür.
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.phone}
              type="button"
              onClick={() => navigate(`/danisan/${encodeURIComponent(c.phone)}`)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                border: 'none', borderBottom: '1px solid var(--line)',
                background: c.phone === phone ? 'var(--cream)' : 'transparent',
              }}
            >
              <Avatar name={displayName(c)} i={i} />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block', fontSize: 12, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {displayName(c)}
                </span>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-40)' }}>
                  {c.last_message_at ? relativeTime(c.last_message_at) : 'Mesaj yok'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── sağ: detay ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!phone && (
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
              padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ink-40)',
            }}
          >
            Soldan bir danışan seçin.
          </div>
        )}

        {phone && detailError && (
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
              padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ink-60)',
            }}
          >
            {detailError}{' '}
            <button
              type="button"
              onClick={loadDetail}
              style={{
                border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                fontSize: 13, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Tekrar dene
            </button>
          </div>
        )}

        {phone && !detailError && detail === null && (
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
              padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ink-40)',
            }}
          >
            Yükleniyor…
          </div>
        )}

        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* kimlik */}
            <div
              style={{
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <Avatar name={displayName(detail)} size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{displayName(detail)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-40)', marginTop: 2 }}>
                  {detail.phone} · İlk kayıt {relativeTime(detail.created_at)}
                </div>
              </div>
            </div>

            {/* sayılar */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                {
                  l: 'Toplam seans',
                  v: String(detail.stats.past_sessions),
                  sub: `${detail.stats.appointments_total} randevu · ${detail.stats.cancelled} iptal`,
                },
                {
                  l: 'Toplam harcama',
                  v: `₺ ${detail.stats.total_spend.toLocaleString('tr-TR')}`,
                  // Telefonsuz kaydedilen ödemeler kimseye ait olmadığı için
                  // buraya girmiyor; operatör eksik görürse nedenini bilsin.
                  sub: 'telefonu kayıtlı ödemeler',
                },
                {
                  l: 'Son ziyaret',
                  v: detail.stats.last_visit ? dayLabel(detail.stats.last_visit) : '—',
                },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    flex: 1, background: 'var(--paper)', border: '1px solid var(--line)',
                    borderRadius: 'var(--r-card)', padding: '16px 18px',
                  }}
                >
                  <div className="wl-label">{s.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6 }}>{s.v}</div>
                  {s.sub && (
                    <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 4 }}>
                      {s.sub}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* sekmeler */}
            <div
              style={{
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
                {([
                  ['randevular', 'Randevu geçmişi'],
                  ['mesajlar', 'Mesaj geçmişi'],
                ] as [Tab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    style={{
                      padding: '12px 18px', border: 'none', cursor: 'pointer', font: 'inherit',
                      fontSize: 12, fontWeight: tab === key ? 600 : 400,
                      color: tab === key ? 'var(--ink)' : 'var(--ink-40)',
                      background: 'transparent',
                      borderBottom:
                        tab === key ? '2px solid var(--forest)' : '2px solid transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'randevular' && (
                <div>
                  {detail.appointments.length === 0 && (
                    <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
                      Henüz randevu yok.
                    </div>
                  )}
                  {detail.appointments.map((a) => {
                    const st = STATUS[a.status] ?? { label: a.status, tone: 'warn' as const };
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                          borderBottom: '1px solid var(--line)', fontSize: 12,
                        }}
                      >
                        <span style={{ width: 130, color: 'var(--ink-60)' }}>
                          {dayLabel(a.appt_date)}
                        </span>
                        <span style={{ width: 50, color: 'var(--ink-40)' }}>{a.appt_time}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>{a.service_name || '—'}</span>
                        <span
                          style={{
                            width: 80, textAlign: 'right', fontWeight: 600,
                            color: a.amount === null ? 'var(--ink-40)' : 'var(--ink)',
                          }}
                        >
                          {a.amount === null ? '—' : `₺ ${a.amount.toLocaleString('tr-TR')}`}
                        </span>
                        <Chip tone={st.tone} small>{st.label}</Chip>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'mesajlar' && (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.messages.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Henüz mesaj yok.</div>
                  )}
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.direction === 'out' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%', padding: '8px 12px', borderRadius: 10, fontSize: 12,
                        background: m.direction === 'out' ? 'var(--forest)' : 'var(--cream)',
                        color: m.direction === 'out' ? 'var(--cream)' : 'var(--ink)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                      <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                        {clockTime(m.created_at)}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: 'var(--ink-40)', textAlign: 'center', marginTop: 4 }}>
                    Cevap yazmak için Mesajlar ekranını kullanın.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
