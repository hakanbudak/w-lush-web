import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../components/icons';
import { Avatar, Chip } from '../components/ui';

/* ───────── aday verisi ───────── */
type Stage = 'yeni' | 'temas' | 'konsult' | 'musteri';
type Source = 'wa' | 'web' | 'ig' | 'man';

interface Lead {
  id: string;
  name: string;
  stage: Stage;
  source: Source;
  service: string;
  last: string;
  warmth: number; // 0-100
  budget?: string;
  signals: string[];
  draft: string;
}

const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: 'yeni', label: 'Yeni', hint: 'Henüz dönülmedi' },
  { key: 'temas', label: 'İlk temas', hint: 'Mesajlaşıldı' },
  { key: 'konsult', label: 'Konsültasyon', hint: 'Randevu verildi' },
  { key: 'musteri', label: 'Müşteri', hint: 'Dönüşüm tamam' },
];

const SRC: Record<Source, { label: string; tone: 'wa' | 'champagne' | 'lavender' | 'cream' }> = {
  wa: { label: 'WhatsApp', tone: 'wa' },
  web: { label: 'Web', tone: 'champagne' },
  ig: { label: 'Instagram', tone: 'lavender' },
  man: { label: 'Manuel', tone: 'cream' },
};

const INITIAL_LEADS: Lead[] = [
  { id: 'l1', name: '+90 555 312 ••', stage: 'yeni', source: 'wa', service: 'Mezoterapi', last: '2 dk', warmth: 88, budget: '₺ 4–5K', signals: ['2 dk önce WA yazdı', 'Fiyat sordu', 'Maslak’a yakın'], draft: 'Merhaba 🌿 Mezoterapi seansı ₺4.100, paket olursa avantajlı. Bu hafta size uygun bir gün ayarlayalım mı?' },
  { id: 'l2', name: '+90 542 870 ••', stage: 'yeni', source: 'ig', service: 'Lazer Epilasyon', last: '18 dk', warmth: 72, budget: '₺ 2–3K', signals: ['Instagram reklamından geldi', 'Kampanya sordu'], draft: 'Merhaba! Yaz kampanyasında tüm vücut lazer 10 seans %20 indirimli. Detay göndereyim mi?' },
  { id: 'l3', name: '+90 533 © 91', stage: 'yeni', source: 'web', service: 'Hydrafacial', last: '1 sa', warmth: 54, signals: ['Web formu doldurdu', 'İlk kez'], draft: 'Merhaba, Hydrafacial hakkında bilgi talebinizi aldık. Size en uygun zamanı birlikte planlayalım.' },
  { id: 'l4', name: 'Berfin Çağlar', stage: 'temas', source: 'wa', service: 'Lazer · Yüz', last: '5 dk', warmth: 92, budget: '₺ 1–2K', signals: ['Cumartesi 14:30 boş slota %92 uyum', 'Hızlı yanıt veriyor'], draft: 'Berfin Hanım, Cumartesi 14:30 Ebru B. ile uygun 🌿 Onaylayayım mı?' },
  { id: 'l5', name: 'Ezgi Uçar', stage: 'temas', source: 'wa', service: 'Cilt bakımı', last: '1 sa', warmth: 67, signals: ['Çarşamba 11:00 sordu', 'Fiyatı uygun buldu'], draft: 'Ezgi Hanım, Çarşamba 11:00 müsait. Cilt analizini de ekleyelim mi?' },
  { id: 'l6', name: 'Selin Korkmaz', stage: 'temas', source: 'web', service: 'Botoks', last: 'Dün', warmth: 48, signals: ['Bir gündür yanıt yok', 'Soğuma riski'], draft: 'Selin Hanım, Botoks konsültasyonu için hâlâ uygun musunuz? Size özel bir saat ayırabilirim.' },
  { id: 'l7', name: 'Naz Yıldırım', stage: 'konsult', source: 'wa', service: 'Dolgu · Dudak', last: 'Bugün 11:00', warmth: 84, budget: '₺ 6–8K', signals: ['Konsültasyon bugün 11:00', 'Görsel istedi'], draft: 'Naz Hanım, konsültasyon öncesi örnek sonuç görsellerini gönderiyorum 🌿' },
  { id: 'l8', name: 'Cem Yıldız', stage: 'konsult', source: 'man', service: 'Konsültasyon · Botoks', last: 'Yarın 11:30', warmth: 75, signals: ['Yarın 11:30 randevulu', 'Manuel kayıt'], draft: 'Cem Bey, yarın 11:30 randevunuzu hatırlatırız. Aklınızdaki sorular için hazırız.' },
  { id: 'l9', name: 'Derya Aksu', stage: 'musteri', source: 'wa', service: 'Cilt bakımı 10’lu', last: '2 gün', warmth: 96, budget: 'Paket aldı', signals: ['Paket satın aldı', 'Sadık adaya dönüştü'], draft: 'Derya Hanım, ilk seansınız için en uygun gün hangisi? Hoş geldin hediyenizi ayırdık 🎁' },
  { id: 'l10', name: 'Onur Şen', stage: 'musteri', source: 'ig', service: 'Lazer 10’lu', last: '4 gün', warmth: 90, budget: 'Paket aldı', signals: ['Instagram → müşteri', 'Yüksek memnuniyet'], draft: 'Onur Bey, ikinci seans planlaması için uygun olduğunuz günü paylaşır mısınız?' },
];

const warmthMeta = (w: number) =>
  w >= 80
    ? { label: 'Sıcak', tone: 'sage' as const, bar: 'var(--sage)' }
    : w >= 55
    ? { label: 'Ilık', tone: 'champagne' as const, bar: 'var(--champagne)' }
    : { label: 'Soğuk', tone: 'blush' as const, bar: 'var(--blush)' };

const blankLead = (): Lead => ({
  id: 'l' + Math.random().toString(36).slice(2, 8),
  name: '',
  stage: 'yeni',
  source: 'wa',
  service: '',
  last: 'şimdi',
  warmth: 60,
  budget: '',
  signals: [],
  draft: '',
});

/* ───────── form alanı ───────── */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontSize: 11, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {children}
    </span>
  );
}

function LeadEditor({
  mode,
  initial,
  onSave,
  onClose,
}: {
  mode: 'new' | 'edit';
  initial: Lead;
  onSave: (l: Lead) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<Lead>(initial);
  const [signalsText, setSignalsText] = useState(initial.signals.join('\n'));
  const set = <K extends keyof Lead>(k: K, v: Lead[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (!f.name.trim()) return;
    onSave({ ...f, signals: signalsText.split('\n').map((s) => s.trim()).filter(Boolean) });
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(42,53,48,0.32)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 24 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wl"
        style={{ width: 520, maxHeight: '88vh', overflow: 'auto', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, boxShadow: '0 24px 80px -20px rgba(42,53,48,0.35)' }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{mode === 'new' ? 'Yeni aday ekle' : 'Adayı düzenle'}</div>
          <button onClick={onClose} className="wl-btn wl-btn-sm" style={{ width: 32, padding: 0, justifyContent: 'center', background: 'transparent', color: 'var(--ink-40)' }}>
            {Icon.x}
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>Ad / telefon</FieldLabel>
            <input className="wl-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Berfin Çağlar veya +90 555 ••" autoFocus />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Aşama</FieldLabel>
              <select className="wl-input" value={f.stage} onChange={(e) => set('stage', e.target.value as Stage)}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Kaynak</FieldLabel>
              <select className="wl-input" value={f.source} onChange={(e) => set('source', e.target.value as Source)}>
                {(Object.keys(SRC) as Source[]).map((s) => (
                  <option key={s} value={s}>{SRC[s].label}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>İlgilendiği hizmet</FieldLabel>
              <input className="wl-input" value={f.service} onChange={(e) => set('service', e.target.value)} placeholder="Lazer · Yüz" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Bütçe (ops.)</FieldLabel>
              <input className="wl-input" value={f.budget ?? ''} onChange={(e) => set('budget', e.target.value)} placeholder="₺ 4–5K" />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Son etkileşim</FieldLabel>
              <input className="wl-input" value={f.last} onChange={(e) => set('last', e.target.value)} placeholder="2 dk" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <FieldLabel>Sıcaklık · {f.warmth}</FieldLabel>
              <input type="range" min={0} max={100} value={f.warmth} onChange={(e) => set('warmth', Number(e.target.value))} style={{ accentColor: 'var(--forest)', height: 38 }} />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>AI sıcaklık sinyalleri (her satır bir madde)</FieldLabel>
            <textarea
              value={signalsText}
              onChange={(e) => setSignalsText(e.target.value)}
              rows={3}
              className="wl-input"
              style={{ height: 'auto', padding: 12, resize: 'vertical', lineHeight: 1.5 }}
              placeholder={'Fiyat sordu\nHızlı yanıt veriyor'}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <FieldLabel>✦ AI yanıt taslağı</FieldLabel>
            <textarea
              value={f.draft}
              onChange={(e) => set('draft', e.target.value)}
              rows={3}
              className="wl-input"
              style={{ height: 'auto', padding: 12, resize: 'vertical', lineHeight: 1.5 }}
              placeholder="Merhaba 🌿 ..."
            />
          </label>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>Vazgeç</button>
          <button onClick={save} className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}>
            {Icon.check}{mode === 'new' ? 'Aday ekle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── sayfa ───────── */
export default function CRM() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [selId, setSelId] = useState('l1');
  const [view, setView] = useState<'kanban' | 'liste'>('kanban');
  const [editor, setEditor] = useState<{ mode: 'new' | 'edit'; lead: Lead } | null>(null);

  const sel = leads.find((l) => l.id === selId) ?? leads[0];
  const counts = useMemo(
    () => STAGES.map((s) => ({ ...s, n: leads.filter((l) => l.stage === s.key).length })),
    [leads],
  );
  const sm = sel ? warmthMeta(sel.warmth) : warmthMeta(0);

  const upsert = (l: Lead) => {
    setLeads((prev) => (prev.some((x) => x.id === l.id) ? prev.map((x) => (x.id === l.id ? l : x)) : [l, ...prev]));
    setSelId(l.id);
    setEditor(null);
  };
  const remove = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    if (id === selId) {
      const next = leads.find((l) => l.id !== id);
      if (next) setSelId(next.id);
    }
  };
  const moveStage = (id: string, stage: Stage) =>
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));

  return (
    <>
      {/* AI banner */}
      <div style={{ background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 52%, var(--lavender-soft) 100%)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>{Icon.sparkle}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Chip tone="sage" small>Fırsat</Chip>
            <span><strong>3 yeni aday %85+ sıcak</strong> — bugün dönülmezse ~%40 soğur. Berfin Ç. <strong>%92</strong> uyumla 14:30 slotuna uygun. AI yanıt taslakları hazır.</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>AI · {leads.length} aktif aday · ort. dönüşüm %34 · son tarama 3 dk önce</div>
        </div>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8, fontSize: 12 }}>Sıcakları sırala</button>
        <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>{Icon.sparkle}Toplu WA taslağı</button>
      </div>

      {/* kontrol satırı: görünüm + yeni aday */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 8, padding: 3 }}>
          {([['kanban', 'Kanban'], ['liste', 'Liste']] as const).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className="wl-btn wl-btn-sm"
              style={{ height: 28, borderRadius: 6, fontSize: 12, background: view === k ? 'var(--cream-2)' : 'transparent', color: view === k ? 'var(--ink)' : 'var(--ink-60)' }}
            >
              {k === 'kanban' ? Icon.chart : Icon.users}{lbl}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: 'var(--ink-40)' }}>{leads.length} aday</span>
        <button
          onClick={() => setEditor({ mode: 'new', lead: blankLead() })}
          className="wl-btn wl-btn-sm"
          style={{ marginLeft: 'auto', background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}
        >
          {Icon.plus}Yeni aday
        </button>
      </div>

      {/* funnel şeridi */}
      <div style={{ display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {counts.map((s, i) => (
          <div key={s.key} style={{ flex: 1, padding: '16px 20px', borderLeft: i ? '1px solid var(--line)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 4 }}>{s.n}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>{s.hint}</div>
            </div>
            {i < counts.length - 1 && <span style={{ color: 'var(--ink-20)' }}>{Icon.arrow}</span>}
          </div>
        ))}
      </div>

      {/* içerik + detay */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 312px', gap: 14, flex: 1, minHeight: 0 }}>
        {view === 'kanban' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, minHeight: 0 }}>
            {STAGES.map((st) => {
              const items = leads.filter((l) => l.stage === st.key);
              return (
                <div key={st.key} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{st.label}</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--cream-3)', color: 'var(--ink-60)', fontFamily: 'Geist Mono, monospace' }}>{items.length}</span>
                  </div>
                  <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto', flex: 1 }}>
                    {items.map((l) => {
                      const w = warmthMeta(l.warmth);
                      const src = SRC[l.source];
                      const active = l.id === selId;
                      return (
                        <div
                          key={l.id}
                          onClick={() => setSelId(l.id)}
                          style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, cursor: 'pointer', background: active ? 'var(--cream)' : 'var(--paper)', outline: active ? '2px solid var(--ink)' : 'none', outlineOffset: -1 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Avatar name={l.name} i={l.id.charCodeAt(1)} size={26} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
                              <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>{l.last} önce</div>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-60)', marginTop: 8 }}>{l.service}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                            <Chip tone={src.tone} small>{l.source === 'wa' && Icon.whatsapp}{src.label}</Chip>
                            <Chip tone={w.tone} small>{w.label} {l.warmth}</Chip>
                          </div>
                          <div style={{ height: 4, borderRadius: 999, background: 'var(--cream-2)', marginTop: 10, overflow: 'hidden' }}>
                            <div style={{ width: `${l.warmth}%`, height: '100%', background: w.bar }} />
                          </div>
                        </div>
                      );
                    })}
                    {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-40)', textAlign: 'center', padding: '20px 0' }}>Aday yok</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'auto', minHeight: 0 }}>
            <table className="wl-table">
              <thead>
                <tr>
                  <th>Aday</th>
                  <th>Aşama</th>
                  <th>Kanal</th>
                  <th>Hizmet</th>
                  <th>Son etkileşim</th>
                  <th style={{ width: 150 }}>Sıcaklık</th>
                  <th style={{ width: 84, textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const w = warmthMeta(l.warmth);
                  const src = SRC[l.source];
                  return (
                    <tr
                      key={l.id}
                      className="is-clickable"
                      onClick={() => setSelId(l.id)}
                      style={l.id === selId ? { background: 'var(--cream)' } : undefined}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={l.name} i={l.id.charCodeAt(1)} size={28} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{l.name}</span>
                        </div>
                      </td>
                      <td><Chip tone="cream" small>{STAGES.find((s) => s.key === l.stage)?.label}</Chip></td>
                      <td><Chip tone={src.tone} small>{l.source === 'wa' && Icon.whatsapp}{src.label}</Chip></td>
                      <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{l.service}</td>
                      <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{l.last} önce</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--cream-2)', overflow: 'hidden' }}>
                            <div style={{ width: `${l.warmth}%`, height: '100%', background: w.bar }} />
                          </div>
                          <span className="wl-mono" style={{ fontSize: 11, color: 'var(--ink-60)' }}>{l.warmth}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEditor({ mode: 'edit', lead: l })}
                            title="Düzenle"
                            className="wl-btn wl-btn-ghost wl-btn-sm"
                            style={{ width: 30, padding: 0, justifyContent: 'center', borderRadius: 8 }}
                          >
                            {Icon.edit}
                          </button>
                          <button
                            onClick={() => remove(l.id)}
                            title="Sil"
                            className="wl-btn wl-btn-ghost wl-btn-sm"
                            style={{ width: 30, padding: 0, justifyContent: 'center', borderRadius: 8, color: 'var(--bad)' }}
                          >
                            {Icon.x}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* detay paneli */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {sel ? (
            <>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Aday detayı</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Chip tone={sm.tone} small>{sm.label} · {sel.warmth}</Chip>
                  <button onClick={() => setEditor({ mode: 'edit', lead: sel })} title="Düzenle" className="wl-btn wl-btn-sm" style={{ width: 28, padding: 0, justifyContent: 'center', background: 'var(--cream-2)', color: 'var(--ink-60)', borderRadius: 7 }}>{Icon.edit}</button>
                  <button onClick={() => remove(sel.id)} title="Sil" className="wl-btn wl-btn-sm" style={{ width: 28, padding: 0, justifyContent: 'center', background: 'var(--blush-soft)', color: 'var(--bad)', borderRadius: 7 }}>{Icon.x}</button>
                </div>
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={sel.name} i={sel.id.charCodeAt(1)} size={44} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{sel.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <Chip tone={SRC[sel.source].tone} small>{sel.source === 'wa' && Icon.whatsapp}{SRC[sel.source].label}</Chip>
                      {sel.budget && <Chip tone="cream" small>{sel.budget}</Chip>}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { ic: Icon.sparkle, l: 'İlgilendiği hizmet', v: sel.service || '—' },
                    { ic: Icon.clock, l: 'Son etkileşim', v: `${sel.last} önce` },
                    { ic: Icon.chart, l: 'Aşama', v: STAGES.find((s) => s.key === sel.stage)?.label ?? '' },
                  ].map((r) => (
                    <div key={r.l} style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: 'var(--ink-40)', display: 'flex', marginTop: 1 }}>{r.ic}</span>
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{r.l}</div>
                        <div style={{ fontSize: 13, marginTop: 2 }}>{r.v}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {sel.signals.length > 0 && (
                  <div style={{ background: 'var(--lavender-soft)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--lavender-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {Icon.sparkle}AI sıcaklık sinyalleri
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {sel.signals.map((s) => (
                        <li key={s} style={{ fontSize: 12, color: 'var(--lavender-2)', lineHeight: 1.4 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sel.draft && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>✦ AI yanıt taslağı</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-60)', background: 'var(--cream)', borderRadius: 8, padding: '10px 12px', lineHeight: 1.5, fontStyle: 'italic' }}>“{sel.draft}”</div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8, justifyContent: 'center' }}>
                    <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>Taslağı WhatsApp’tan gönder
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => moveStage(sel.id, 'konsult')} className="wl-btn wl-btn-ghost wl-btn-sm" style={{ flex: 1, borderRadius: 8, justifyContent: 'center' }}>{Icon.calendar}Konsültasyon</button>
                    <button onClick={() => moveStage(sel.id, 'musteri')} className="wl-btn wl-btn-ghost wl-btn-sm" style={{ flex: 1, borderRadius: 8, justifyContent: 'center' }}>{Icon.check}Müşteri yap</button>
                  </div>
                  <button onClick={() => setEditor({ mode: 'edit', lead: sel })} className="wl-btn wl-btn-sm" style={{ background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8, justifyContent: 'center' }}>{Icon.edit}Adayı düzenle</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-40)', fontSize: 13 }}>Aday seçili değil</div>
          )}
        </div>
      </div>

      {editor && (
        <LeadEditor
          mode={editor.mode}
          initial={editor.lead}
          onSave={upsert}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}
