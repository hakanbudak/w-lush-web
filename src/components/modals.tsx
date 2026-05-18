import { useState, type ReactNode } from 'react';
import { Icon } from './icons';
import { Chip } from './ui';

/* örnek veri — prototip seçimleri */
export const CONTACTS = ['Berfin Çağlar', 'Aslı Demir', 'Pınar Kaya', 'Ezgi Uçar', 'Duygu Özsever', '+90 555 312 ••'];
const SERVICES = ['Hydrafacial · Premium', 'Lazer Epilasyon', 'Botoks · Alın', 'Dolgu · Dudak', 'Mezoterapi', 'Cilt analizi · İlk seans', 'Konsültasyon'];
const STAFF = ['Dr. Defne A.', 'Ebru B.', 'Selin K.'];
const TEMPLATES: Record<string, string> = {
  'Boş': '',
  'Randevu hatırlatma': 'Merhaba {ad} 🌿 yarınki randevunuzu hatırlatırız. Onaylamak için 1 yazmanız yeterli.',
  'Kampanya': 'Merhaba {ad}! Bu aya özel %15 sadık danışan indirimimiz var, detay ister misiniz? 💚',
  'Geri kazanım': 'Sizi özledik {ad} 🌿 Size özel bir saat ayırabiliriz, uygun olduğunuz günü yazmanız yeterli.',
};

/* ── genel modal kabuğu ── */
export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 520,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(42,53,48,0.32)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wl"
        style={{ width, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 24px 80px -20px rgba(42,53,48,0.35)' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
          <button onClick={onClose} className="wl-btn wl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center', background: 'transparent', color: 'var(--ink-40)' }}>
            {Icon.x}
          </button>
        </div>
        <div style={{ padding: 20, overflow: 'auto' }}>{children}</div>
        {footer && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span style={{ fontSize: 11, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{children}</span>;
}

function Success({ icon, title, sub, onClose }: { icon: ReactNode; title: string; sub: string; onClose: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '20px 8px' }}>
      <div style={{ width: 48, height: 48, borderRadius: 999, margin: '0 auto 14px', background: 'var(--sage-soft)', display: 'grid', placeItems: 'center', color: 'var(--sage-2)' }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 6, lineHeight: 1.5 }}>{sub}</div>
      <button onClick={onClose} className="wl-btn wl-btn-sm" style={{ marginTop: 18, background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8 }}>Kapat</button>
    </div>
  );
}

/* ── Mesaj gönder ── */
export function MessageComposerModal({ onClose, presetTo }: { onClose: () => void; presetTo?: string }) {
  const options = presetTo && !CONTACTS.includes(presetTo) ? [presetTo, ...CONTACTS] : CONTACTS;
  const [to, setTo] = useState(presetTo ?? CONTACTS[0]);
  const [tpl, setTpl] = useState('Boş');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const applyTpl = (k: string) => {
    setTpl(k);
    setText(TEMPLATES[k].replace('{ad}', to.split(' ')[0] || 'değerli danışanımız'));
  };

  if (sent) {
    return (
      <Modal title="Mesaj gönder" onClose={onClose}>
        <Success icon={Icon.whatsapp} title="WhatsApp mesajı sıraya alındı" sub={`${to} kişisine mesaj gönderildi. Yanıt geldiğinde bildirim alacaksınız.`} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal
      title="Mesaj gönder"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>Vazgeç</button>
          <button onClick={() => text.trim() && setSent(true)} className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}>
            <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>Gönder
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>Alıcı</FieldLabel>
          <select className="wl-input" value={to} onChange={(e) => setTo(e.target.value)}>
            {options.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>Şablon</FieldLabel>
          <select className="wl-input" value={tpl} onChange={(e) => applyTpl(e.target.value)}>
            {Object.keys(TEMPLATES).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>Mesaj</FieldLabel>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="wl-input"
            style={{ height: 'auto', padding: 12, resize: 'vertical', lineHeight: 1.5 }}
            placeholder="Mesajınızı yazın ya da bir şablon seçin…"
          />
        </label>
        <button
          onClick={() => setText('Merhaba 🌿 size özel bir önerimiz var, kısaca bahsedebilir miyim?')}
          className="wl-btn wl-btn-sm"
          style={{ alignSelf: 'flex-start', background: 'var(--lavender-soft)', color: 'var(--lavender-2)', borderRadius: 8 }}
        >
          {Icon.sparkle}AI taslağı öner
        </button>
      </div>
    </Modal>
  );
}

/* ── Yeni randevu ── */
export function NewAppointmentModal({ onClose }: { onClose: () => void }) {
  const [client, setClient] = useState('');
  const [service, setService] = useState(SERVICES[0]);
  const [staff, setStaff] = useState(STAFF[0]);
  const [date, setDate] = useState('2026-05-16');
  const [time, setTime] = useState('14:30');
  const [channel, setChannel] = useState('WhatsApp');
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <Modal title="Yeni randevu" onClose={onClose}>
        <Success icon={Icon.check} title="Randevu oluşturuldu" sub={`${client || 'Danışan'} · ${service} · ${date} ${time} · ${staff}. WhatsApp onayı gönderildi.`} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal
      title="Yeni randevu"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>Vazgeç</button>
          <button onClick={() => client.trim() && setSaved(true)} className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}>
            {Icon.check}Oluştur
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>Danışan</FieldLabel>
          <input className="wl-input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Danışan adı veya telefon" autoFocus list="wl-contacts" />
          <datalist id="wl-contacts">{CONTACTS.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>Hizmet</FieldLabel>
            <select className="wl-input" value={service} onChange={(e) => setService(e.target.value)}>
              {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>Uzman</FieldLabel>
            <select className="wl-input" value={staff} onChange={(e) => setStaff(e.target.value)}>
              {STAFF.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>Tarih</FieldLabel>
            <input type="date" className="wl-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>Saat</FieldLabel>
            <input type="time" className="wl-input" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <FieldLabel>Kanal</FieldLabel>
          <select className="wl-input" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {['WhatsApp', 'Web', 'Manuel'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div style={{ background: 'var(--lavender-soft)', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--lavender-2)', display: 'flex' }}>{Icon.sparkle}</span>
          <span style={{ fontSize: 12, color: 'var(--lavender-2)' }}>AI: 14:30 slotu Ebru B.’de boş — bu randevu için %92 uygun.</span>
        </div>
      </div>
    </Modal>
  );
}

/* ── Kampanyayı gör ── */
export function CampaignModal({ onClose }: { onClose: () => void }) {
  const [started, setStarted] = useState(false);
  if (started) {
    return (
      <Modal title="Yaz kampanyası" onClose={onClose}>
        <Success icon={Icon.check} title="Kampanya başlatıldı" sub="18 sadık danışana WhatsApp daveti sıraya alındı. Dönüşümleri Rapor sayfasından izleyebilirsiniz." onClose={onClose} />
      </Modal>
    );
  }
  return (
    <Modal
      title="Yaz kampanyası — AI önerisi"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button onClick={onClose} className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>Daha sonra</button>
          <button onClick={() => setStarted(true)} className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>
            {Icon.sparkle}Kampanyayı başlat
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip tone="warn" small>Eğilim ↓ Lazer −%23</Chip>
          <Chip tone="warn" small>Cilt bakımı −%15</Chip>
          <Chip tone="sage" small>Hedef 18 danışan</Chip>
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.6 }}>
          Son 30 günde lazer epilasyon ve cilt bakımında düşüş var. AI, son 6 ayda en az 3 kez gelen ama bu ay
          randevusu olmayan <strong>18 sadık danışana</strong> özel <strong>%15 indirim</strong> ile yeniden kazanım öneriyor.
        </div>
        <div style={{ background: 'var(--cream)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>✦ Önerilen mesaj</div>
          <div style={{ fontSize: 13, color: 'var(--ink-60)', fontStyle: 'italic', lineHeight: 1.5 }}>
            “Merhaba {'{ad}'} 🌿 Sizi özledik! Bu haftaya özel cilt bakımı & lazer seanslarında %15 indirim tanımladık. Uygun gününüzü yazmanız yeterli.”
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Tahmini dönüşüm</div><div style={{ fontSize: 18, fontWeight: 600 }}>~%34</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Tahmini ek gelir</div><div style={{ fontSize: 18, fontWeight: 600, color: 'var(--sage-2)' }}>₺ 42K</div></div>
          <div><div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Kanal</div><div style={{ fontSize: 18, fontWeight: 600 }}>WhatsApp</div></div>
        </div>
      </div>
    </Modal>
  );
}

/* ── Tüm öneriler ── */
export interface Suggestion { tone: 'warn' | 'sage' | 'blush' | 'lavender'; tag: string; title: string; sub: string; cta: string }

export function SuggestionsModal({ items, onClose }: { items: Suggestion[]; onClose: () => void }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  return (
    <Modal title={`AI önerileri · ${items.length}`} onClose={onClose} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((s, i) => (
          <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14, opacity: done[i] ? 0.6 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span className={`wl-chip wl-chip-${s.tone}`} style={{ height: 18, fontSize: 10, padding: '0 6px' }}>{s.tag}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4, marginBottom: 10 }}>{s.sub}</div>
            <button
              onClick={() => setDone((d) => ({ ...d, [i]: true }))}
              className="wl-btn wl-btn-sm"
              style={{ height: 28, background: done[i] ? 'var(--sage-soft)' : 'var(--cream-2)', color: done[i] ? 'var(--sage-2)' : 'var(--ink)', fontSize: 11, borderRadius: 6 }}
            >
              {done[i] ? <>{Icon.check}Uygulandı</> : <>{s.cta} →</>}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
