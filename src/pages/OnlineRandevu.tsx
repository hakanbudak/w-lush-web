import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  bookAppointment, getBookingClinic, getBookingSlots,
  type BookingClinic, type BookingResult,
} from '../api/booking';
import { addDays, isoDate, isoDay } from '../utils/calendar';
import { kisaGun } from '../utils/karsilama';
import './auth.css';

const money = (n: number): string => (n > 0 ? `₺ ${n.toLocaleString('tr-TR')}` : '');

/** Sayfada gezilebilecek günler: bugünden başlayıp kapalı günleri atlıyor. */
function selectableDays(clinic: BookingClinic, count = 14): string[] {
  const out: string[] = [];
  const open = new Set(clinic.open_days);
  for (let i = 0; out.length < count && i < 60; i += 1) {
    const d = addDays(new Date(), i);
    if (open.has(isoDay(d))) out.push(isoDate(d));
  }
  return out;
}

/**
 * Danışanın kendi randevusunu aldığı sayfa. Panelin kabuğunun dışında:
 * oturum yok, kenar menü yok, üst bar yok.
 */
export default function OnlineRandevu() {
  const { slug = '' } = useParams<{ slug: string }>();

  const [clinic, setClinic] = useState<BookingClinic | null>(null);
  const [missing, setMissing] = useState(false);
  const [service, setService] = useState('');
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const [times, setTimes] = useState<string[] | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<BookingResult | null>(null);

  useEffect(() => {
    getBookingClinic(slug)
      .then(setClinic)
      .catch(() => setMissing(true));
  }, [slug]);

  const days = useMemo(() => (clinic ? selectableDays(clinic) : []), [clinic]);

  // Hizmet ve gün seçilince o günün boş saatleri. Hizmet süresi slot
  // listesini değiştiriyor, o yüzden ikisi birlikte sorgulanıyor.
  const loadTimes = useCallback(() => {
    if (!service || !day) {
      setTimes(null);
      return;
    }
    setTimes(null);
    getBookingSlots(slug, day, service)
      .then((r) => setTimes(r.times))
      .catch(() => setTimes([]));
  }, [slug, day, service]);

  useEffect(loadTimes, [loadTimes]);
  useEffect(() => setTime(''), [day, service]);

  if (missing) {
    return (
      <Kabuk>
        <h1 className="wl-auth-title">Sayfa bulunamadı</h1>
        <p className="wl-auth-sub">
          Bu randevu sayfası kapalı ya da adres yanlış. Lütfen merkezi arayın.
        </p>
      </Kabuk>
    );
  }

  if (!clinic) {
    return (
      <Kabuk>
        <p className="wl-auth-sub">Yükleniyor…</p>
      </Kabuk>
    );
  }

  if (done) {
    return (
      <Kabuk baslik={clinic.name}>
        <h1 className="wl-auth-title">Randevu talebiniz alındı</h1>
        <p className="wl-auth-sub">
          {kisaGun(done.appt_date)} · {done.appt_time} · {done.service_name}
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.6 }}>
          Merkez onayladıktan sonra size bilgi verilecek. Bir değişiklik
          gerekirse {clinic.phone || 'merkezi'} arayabilirsiniz.
        </p>
      </Kabuk>
    );
  }

  const gonder = () => {
    setBusy(true);
    setError(null);
    bookAppointment(slug, {
      phone, customer_name: name, service_name: service,
      appt_date: day, appt_time: time,
    })
      .then(setDone)
      .catch((e: Error) => {
        setError(e.message);
        // Saat kapılmış olabilir; listeyi tazelemek en olası çözüm.
        loadTimes();
      })
      .finally(() => setBusy(false));
  };

  const hazir = Boolean(service && day && time && name.trim() && phone.trim());

  return (
    <Kabuk baslik={clinic.name} altbaslik={clinic.address}>
      <h1 className="wl-auth-title">Randevu al</h1>

      <Bolum no={1} baslik="Hizmet">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {clinic.services.map((s) => {
            const on = s.name === service;
            return (
              <button
                key={s.name}
                type="button"
                aria-pressed={on}
                onClick={() => setService(s.name)}
                style={{
                  font: 'inherit', fontSize: 12.5, cursor: 'pointer',
                  padding: '7px 12px', borderRadius: 999,
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: on ? s.color : 'var(--paper)',
                  color: on ? '#FFFFFF' : 'var(--ink-60)',
                  border: on ? `1.5px solid ${s.color}` : '1px solid var(--line-strong)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                {!on && (
                  <span
                    aria-hidden
                    style={{
                      width: 7, height: 7, borderRadius: 999, background: s.color,
                    }}
                  />
                )}
                {s.name}
                {money(s.price) && (
                  <span style={{ opacity: on ? 0.85 : 0.6 }}>{money(s.price)}</span>
                )}
              </button>
            );
          })}
        </div>
        {clinic.services.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-45)', margin: 0 }}>
            Şu an online alınabilen hizmet yok. Lütfen merkezi arayın.
          </p>
        )}
      </Bolum>

      {service && (
        <Bolum no={2} baslik="Gün">
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 }}>
            {days.map((d) => {
              const on = d === day;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDay(d)}
                  style={{
                    font: 'inherit', fontSize: 12, cursor: 'pointer', flexShrink: 0,
                    padding: '8px 12px', borderRadius: 10, whiteSpace: 'nowrap',
                    background: on ? 'var(--ink)' : 'var(--paper)',
                    color: on ? 'var(--paper)' : 'var(--ink-60)',
                    border: '1px solid var(--line-strong)',
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  {kisaGun(d)}
                </button>
              );
            })}
          </div>
        </Bolum>
      )}

      {service && day && (
        <Bolum no={3} baslik="Saat">
          {times === null ? (
            <p style={{ fontSize: 12.5, color: 'var(--ink-45)', margin: 0 }}>
              Boş saatler aranıyor…
            </p>
          ) : times.length === 0 ? (
            <p style={{ fontSize: 12.5, color: 'var(--ink-45)', margin: 0 }}>
              Bu günde boş saat kalmamış. Başka bir gün seçebilirsiniz.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {times.map((t) => {
                const on = t === time;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setTime(t)}
                    className="wl-mono"
                    style={{
                      fontSize: 12.5, cursor: 'pointer', padding: '8px 12px',
                      borderRadius: 10,
                      background: on ? 'var(--ink)' : 'var(--paper)',
                      color: on ? 'var(--paper)' : 'var(--ink-60)',
                      border: '1px solid var(--line-strong)',
                      fontWeight: on ? 600 : 400,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </Bolum>
      )}

      {service && day && time && (
        <Bolum no={4} baslik="Bilgileriniz">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              className="wl-input"
              value={name}
              placeholder="Adınız soyadınız"
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="wl-input"
              value={phone}
              placeholder="Telefon numaranız"
              inputMode="tel"
              autoComplete="tel"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </Bolum>
      )}

      {error && (
        <p style={{ fontSize: 12.5, color: 'var(--bad)', margin: '4px 0 0' }}>{error}</p>
      )}

      <button
        type="button"
        className="wl-btn"
        style={{ width: '100%', marginTop: 16, borderRadius: 10 }}
        disabled={!hazir || busy}
        onClick={gonder}
      >
        {busy ? 'Gönderiliyor…' : 'Randevu talebi gönder'}
      </button>
      <p style={{ fontSize: 11.5, color: 'var(--ink-45)', marginTop: 8 }}>
        Talebiniz merkez onayladıktan sonra kesinleşir.
      </p>
    </Kabuk>
  );
}

function Bolum({
  no, baslik, children,
}: {
  no: number;
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 18 }}>
      <h2
        style={{
          margin: '0 0 8px', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--ink-45)',
        }}
      >
        {no}. {baslik}
      </h2>
      {children}
    </section>
  );
}

function Kabuk({
  baslik, altbaslik, children,
}: {
  baslik?: string;
  altbaslik?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="wl"
      style={{
        minHeight: '100vh', background: 'var(--cream)', display: 'flex',
        justifyContent: 'center', padding: '32px 16px',
      }}
    >
      <main style={{ width: '100%', maxWidth: 460 }}>
        {baslik && (
          <header style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{baslik}</div>
            {altbaslik && (
              <div style={{ fontSize: 12, color: 'var(--ink-45)', marginTop: 2 }}>
                {altbaslik}
              </div>
            )}
          </header>
        )}
        {children}
      </main>
    </div>
  );
}
