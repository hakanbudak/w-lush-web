import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../components/icons';
import { Avatar, Chip } from '../components/ui';

/* ───────── danışan verisi ───────── */
type TagTone = 'lavender' | 'sage' | 'blush' | 'cream';
interface ClientTag { label: string; tone: TagTone }

interface Client {
  id: string;
  name: string;
  since: string;
  phone: string;
  email: string;
  staff: string;
  lastVisit: string;
  spend: string;
  tags: ClientTag[];
  stats: { l: string; v: string }[];
  ai: { chip: string; tone: TagTone; html: ReactNode; meta: string };
  skin: string;
  history: { d: string; s: string; u: string; st: 'tamam' | 'iptal'; p: string }[];
  packages: { name: string; used: number; total: number; color: string }[];
  payments: { d: string; desc: string; m: string; a: string }[];
  chat: { me: boolean; t: string; at: string }[];
  draft: string;
  notes: { d: string; by: string; t: string }[];
  loyalty: { level: string; levelTone: TagTone; points: string; score: string };
  prefs: { gun: string; uzman: string; kanal: string; risk: string; riskTone?: string };
}

const CLIENTS: Client[] = [
  {
    id: 'c1', name: 'Aslı Demir', since: 'Mart 2023', phone: '+90 532 418 76 22', email: 'asli.demir@gmail.com',
    staff: 'Ebru B.', lastVisit: '4 gün önce', spend: '₺ 142.350',
    tags: [{ label: 'VIP', tone: 'lavender' }, { label: 'Sadık', tone: 'sage' }, { label: '3. yıl', tone: 'sage' }],
    stats: [{ l: 'Toplam harcama', v: '₺ 142.350' }, { l: 'Tamamlanan seans', v: '38' }, { l: 'Son ziyaret', v: '4 gün önce' }, { l: 'No-show', v: '0' }],
    ai: { chip: 'Bu danışana özel', tone: 'lavender', meta: 'AI · 38 seans · 3 yıllık geçmiş · sadakat skoru 92/100', html: <>Lazer paketi <strong>9/10</strong> — yenileme zamanı. Cilt bakımına ilgisi yüksek, no-show <strong>0</strong>. <strong style={{ color: 'var(--sage-2)' }}>+₺ 12K</strong> paket yükseltme fırsatı.</> },
    skin: 'Karma cilt, hassasiyet: yanak bölgesi. Retinol kullanmıyor. Güneş koruyucu rutini var. Tercih: Cumartesi sabah, Ebru B. ile. Kanal: WhatsApp.',
    history: [
      { d: '12 May 2026', s: 'Mezoterapi + Cilt analizi', u: 'Ebru B.', st: 'tamam', p: '₺ 4.100' },
      { d: '28 Nis 2026', s: 'Hydrafacial · Premium', u: 'Ebru B.', st: 'tamam', p: '₺ 3.200' },
      { d: '14 Nis 2026', s: 'Cilt bakımı · Nemlendirme', u: 'Ebru B.', st: 'tamam', p: '₺ 1.900' },
      { d: '02 Nis 2026', s: 'Lazer Epilasyon', u: 'Selin K.', st: 'tamam', p: '₺ 2.450' },
      { d: '19 Mar 2026', s: 'Konsültasyon · Cilt', u: 'Dr. Defne A.', st: 'iptal', p: '—' },
    ],
    packages: [
      { name: 'Cilt Bakımı 10’lu', used: 4, total: 10, color: 'var(--forest)' },
      { name: 'Mezoterapi 6’lı', used: 2, total: 6, color: 'var(--sage)' },
      { name: 'Lazer Epilasyon 10’lu', used: 9, total: 10, color: 'var(--champagne)' },
    ],
    payments: [
      { d: '12 May 2026', desc: 'Mezoterapi paketi', m: 'Kredi kartı', a: '₺ 4.100' },
      { d: '28 Nis 2026', desc: 'Hydrafacial', m: 'Havale', a: '₺ 3.200' },
      { d: '02 Nis 2026', desc: 'Lazer paketi (peşin)', m: 'Kredi kartı', a: '₺ 18.000' },
    ],
    chat: [
      { me: false, t: 'Merhaba, cumartesi sabahına Ebru Hanım’dan randevu alabilir miyim? 🌿', at: 'Dün 18:21' },
      { me: true, t: 'Tabii Aslı Hanım, Cumartesi 13:00 uygun. Onaylıyor musunuz?', at: 'Dün 18:24' },
      { me: false, t: 'Harika, onaylıyorum. Teşekkürler!', at: 'Dün 18:25' },
      { me: true, t: 'Randevunuz oluşturuldu ✅ Bir gün önce hatırlatma göndereceğiz.', at: 'Dün 18:25' },
    ],
    draft: 'Aslı Hanım, lazer paketinizin son seansı kaldı 🌿 Yenileme için %15 sadık danışan indirimi tanımlayabilirim.',
    notes: [
      { d: '12 May 2026', by: 'Ebru B.', t: 'Cilt bariyeri güçlendi, kızarıklık azaldı. Sonraki seansta peeling yoğunluğu artırılabilir.' },
      { d: '28 Nis 2026', by: 'Ebru B.', t: 'Hassas bölge: yanak. Retinol içeren ürün kullanmıyor. Güneş koruyucu önerildi.' },
    ],
    loyalty: { level: 'Altın', levelTone: 'cream', points: '247', score: '92 / 100' },
    prefs: { gun: 'Cmt sabah', uzman: 'Ebru B.', kanal: 'WhatsApp', risk: 'Düşük', riskTone: 'var(--sage-2)' },
  },
  {
    id: 'c2', name: 'Duygu Özsever', since: 'Eylül 2023', phone: '+90 555 902 14 08', email: 'duygu.oz@gmail.com',
    staff: 'Ebru B.', lastVisit: 'Bugün', spend: '₺ 64.800',
    tags: [{ label: 'Sadık', tone: 'sage' }, { label: 'Hydrafacial', tone: 'cream' }],
    stats: [{ l: 'Toplam harcama', v: '₺ 64.800' }, { l: 'Tamamlanan seans', v: '21' }, { l: 'Son ziyaret', v: 'Bugün' }, { l: 'No-show', v: '1' }],
    ai: { chip: 'Bu danışana özel', tone: 'sage', meta: 'AI · 21 seans · düzenli aylık ritim', html: <>Aylık Hydrafacial ritmi çok düzenli. <strong>Cilt bakımı paketi</strong> önerilirse seans başı maliyet <strong style={{ color: 'var(--sage-2)' }}>−%18</strong> düşer, bağlılık artar.</> },
    skin: 'Kuru cilt, düzenli nemlendirme paketi kullanıyor. Premium Hydrafacial’ı tercih ediyor.',
    history: [
      { d: '16 May 2026', s: 'Hydrafacial · Premium', u: 'Ebru B.', st: 'tamam', p: '₺ 3.200' },
      { d: '18 Nis 2026', s: 'Hydrafacial · Premium', u: 'Ebru B.', st: 'tamam', p: '₺ 3.200' },
      { d: '20 Mar 2026', s: 'Cilt bakımı', u: 'Ebru B.', st: 'tamam', p: '₺ 1.900' },
    ],
    packages: [{ name: 'Hydrafacial 6’lı', used: 5, total: 6, color: 'var(--forest)' }],
    payments: [
      { d: '16 May 2026', desc: 'Hydrafacial', m: 'Kredi kartı', a: '₺ 3.200' },
      { d: '18 Nis 2026', desc: 'Hydrafacial', m: 'Kredi kartı', a: '₺ 3.200' },
    ],
    chat: [
      { me: false, t: 'Bu ayki seansımı ayarlayabilir miyiz?', at: 'Bugün 09:02' },
      { me: true, t: 'Tabii, bugün 09:00 tamamlandı 🌿 Bir sonraki için 18 Haziran’ı ayıralım mı?', at: 'Bugün 11:30' },
    ],
    draft: 'Duygu Hanım, 6’lı Hydrafacial paketi ile seans başı ₺2.620’ye geliyor. İlginizi çeker mi?',
    notes: [{ d: '16 May 2026', by: 'Ebru B.', t: 'Cilt tonu eşitlendi. Paket teklifi sunuldu, düşünecek.' }],
    loyalty: { level: 'Gümüş', levelTone: 'cream', points: '128', score: '81 / 100' },
    prefs: { gun: 'Hafta içi', uzman: 'Ebru B.', kanal: 'WhatsApp', risk: 'Düşük', riskTone: 'var(--sage-2)' },
  },
  {
    id: 'c3', name: 'Pınar Kaya', since: 'Ocak 2025', phone: '+90 533 671 22 90', email: 'pinar.kaya@outlook.com',
    staff: 'Dr. Defne A.', lastVisit: '11 gün önce', spend: '₺ 28.600',
    tags: [{ label: 'Risk', tone: 'blush' }, { label: 'Dolgu', tone: 'cream' }],
    stats: [{ l: 'Toplam harcama', v: '₺ 28.600' }, { l: 'Tamamlanan seans', v: '6' }, { l: 'Son ziyaret', v: '11 gün önce' }, { l: 'No-show', v: '2' }],
    ai: { chip: 'Risk uyarısı', tone: 'blush', meta: 'AI · 2 no-show · son 2 randevu ertelendi', html: <>İptal riski <strong style={{ color: 'var(--bad)' }}>%62</strong>. Son 2 randevuyu erteledi. <strong>Ön ödeme akışı</strong> ve nazik hatırlatma önerilir.</> },
    skin: 'Dudak dolgusu revizyon talebi. Hassas bölge; işlem öncesi detaylı bilgilendirme gerekiyor.',
    history: [
      { d: '05 May 2026', s: 'Dolgu · Dudak', u: 'Dr. Defne A.', st: 'iptal', p: '—' },
      { d: '21 Nis 2026', s: 'Konsültasyon · Dolgu', u: 'Dr. Defne A.', st: 'tamam', p: 'Ücretsiz' },
      { d: '02 Nis 2026', s: 'Botoks · Alın', u: 'Dr. Defne A.', st: 'tamam', p: '₺ 5.400' },
    ],
    packages: [],
    payments: [{ d: '02 Nis 2026', desc: 'Botoks · Alın', m: 'Kredi kartı', a: '₺ 5.400' }],
    chat: [
      { me: false, t: 'Cuma randevumu maalesef yine ertelemem gerekiyor 😞', at: '5 May 14:10' },
      { me: true, t: 'Anladım Pınar Hanım. Size uygun olunca küçük bir ön ödeme ile yerinizi garantileyebiliriz.', at: '5 May 14:20' },
    ],
    draft: 'Pınar Hanım, randevunuzu güvenceye almak için ₺500 ön ödeme ile dilediğiniz güne planlayabiliriz. Uygun olur mu?',
    notes: [{ d: '05 May 2026', by: 'Dr. Defne A.', t: 'İkinci kez erteledi. Ön ödeme akışına alındı. Nazik takip.' }],
    loyalty: { level: 'Standart', levelTone: 'cream', points: '34', score: '46 / 100' },
    prefs: { gun: 'Belirsiz', uzman: 'Dr. Defne A.', kanal: 'WhatsApp', risk: 'Yüksek %62', riskTone: 'var(--bad)' },
  },
  {
    id: 'c4', name: 'Selin Akın', since: 'Haziran 2024', phone: '+90 541 330 87 65', email: 'selin.akin@gmail.com',
    staff: 'Selin K.', lastVisit: '6 gün önce', spend: '₺ 38.900',
    tags: [{ label: 'Sadık', tone: 'sage' }, { label: 'Lazer', tone: 'cream' }],
    stats: [{ l: 'Toplam harcama', v: '₺ 38.900' }, { l: 'Tamamlanan seans', v: '14' }, { l: 'Son ziyaret', v: '6 gün önce' }, { l: 'No-show', v: '0' }],
    ai: { chip: 'Bu danışana özel', tone: 'sage', meta: 'AI · lazer paketi 8/10 · ritim düzenli', html: <>Lazer paketi <strong>8/10</strong>. Bitişe yakın — <strong>yüz lazer</strong> çapraz satışı için uygun aday. Memnuniyet yüksek.</> },
    skin: 'Tüm vücut lazer epilasyon paketinde. Cilt reaksiyonu yok, seanslar sorunsuz.',
    history: [
      { d: '10 May 2026', s: 'Lazer Epilasyon', u: 'Selin K.', st: 'tamam', p: '₺ 2.450' },
      { d: '26 Nis 2026', s: 'Lazer Epilasyon', u: 'Selin K.', st: 'tamam', p: '₺ 2.450' },
      { d: '12 Nis 2026', s: 'Lazer Epilasyon', u: 'Selin K.', st: 'tamam', p: '₺ 2.450' },
    ],
    packages: [{ name: 'Lazer Epilasyon 10’lu', used: 8, total: 10, color: 'var(--champagne)' }],
    payments: [{ d: '02 Şub 2026', desc: 'Lazer paketi (peşin)', m: 'Havale', a: '₺ 19.000' }],
    chat: [
      { me: false, t: 'Bir sonraki seans ne zaman olmalı?', at: '10 May 16:40' },
      { me: true, t: '4 hafta sonra ideal Selin Hanım, 7 Haziran’ı ayırdım 🌿', at: '10 May 16:45' },
    ],
    draft: 'Selin Hanım, paketinizin son 2 seansı kaldı. Yüz lazer eklemek isterseniz %20 paket içi avantaj sunabilirim.',
    notes: [{ d: '10 May 2026', by: 'Selin K.', t: 'Cilt reaksiyonu yok. Çapraz satış uygun.' }],
    loyalty: { level: 'Gümüş', levelTone: 'cream', points: '96', score: '85 / 100' },
    prefs: { gun: 'Hafta sonu', uzman: 'Selin K.', kanal: 'WhatsApp', risk: 'Düşük', riskTone: 'var(--sage-2)' },
  },
  {
    id: 'c5', name: 'Cem Yıldırım', since: 'Mayıs 2026', phone: '+90 555 214 09 71', email: 'cem.yildirim@gmail.com',
    staff: 'Dr. Defne A.', lastVisit: 'Yeni', spend: '₺ 0',
    tags: [{ label: 'Yeni', tone: 'cream' }],
    stats: [{ l: 'Toplam harcama', v: '₺ 0' }, { l: 'Tamamlanan seans', v: '0' }, { l: 'Son ziyaret', v: 'Henüz yok' }, { l: 'No-show', v: '0' }],
    ai: { chip: 'Bu danışana özel', tone: 'lavender', meta: 'AI · konsültasyon planlandı · ilk temas', html: <>Botoks konsültasyonu için bekleniyor. İlk izlenim kritik — <strong>örnek sonuç görselleri</strong> ve net fiyatlandırma dönüşümü artırır.</> },
    skin: 'Henüz analiz yapılmadı. İlgi alanı: alın ve kaz ayağı bölgesi botoks.',
    history: [{ d: 'Yarın 11:30', s: 'Konsültasyon · Botoks', u: 'Dr. Defne A.', st: 'tamam', p: 'Ücretsiz' }],
    packages: [],
    payments: [],
    chat: [{ me: false, t: 'Botoks için bilgi almak istiyorum.', at: 'Dün 12:00' }, { me: true, t: 'Memnuniyetle Cem Bey, yarın 11:30 ücretsiz konsültasyon ayarladım 🌿', at: 'Dün 12:08' }],
    draft: 'Cem Bey, konsültasyon öncesi sık sorulan sorular ve örnek sonuçları gönderiyorum. Görüşmek üzere!',
    notes: [{ d: 'Dün', by: 'Dr. Defne A.', t: 'İlk görüşme yarın. Beklenti yönetimi önemli.' }],
    loyalty: { level: 'Standart', levelTone: 'cream', points: '0', score: '— / 100' },
    prefs: { gun: 'Belirsiz', uzman: 'Dr. Defne A.', kanal: 'WhatsApp', risk: 'Bilinmiyor' },
  },
  {
    id: 'c6', name: 'Murat Aksoy', since: 'Mayıs 2026', phone: '+90 532 778 41 23', email: 'murat.aksoy@gmail.com',
    staff: 'Ebru B.', lastVisit: 'Yeni', spend: '₺ 900',
    tags: [{ label: 'Yeni', tone: 'cream' }, { label: 'Web', tone: 'cream' }],
    stats: [{ l: 'Toplam harcama', v: '₺ 900' }, { l: 'Tamamlanan seans', v: '1' }, { l: 'Son ziyaret', v: 'Bugün' }, { l: 'No-show', v: '0' }],
    ai: { chip: 'Bu danışana özel', tone: 'lavender', meta: 'AI · web kaynaklı · ilk seans tamam', html: <>İlk cilt analizi tamamlandı. <strong>Cilt bakımı paketi</strong> için sıcak — ilk 7 gün içinde teklif dönüşümü <strong style={{ color: 'var(--sage-2)' }}>2 kat</strong> artırır.</> },
    skin: 'Yağlı/karma cilt, gözenek görünürlüğü. Hydrafacial + bakım rutini öneriliyor.',
    history: [{ d: '16 May 2026', s: 'Cilt analizi · İlk seans', u: 'Ebru B.', st: 'tamam', p: '₺ 900' }],
    packages: [],
    payments: [{ d: '16 May 2026', desc: 'Cilt analizi', m: 'Kredi kartı', a: '₺ 900' }],
    chat: [{ me: false, t: 'Web sitesinden randevu aldım, teşekkürler.', at: '14 May 10:00' }, { me: true, t: 'Hoş geldiniz Murat Bey 🌿 Bugünkü analiz sonrası size özel bir plan çıkaracağız.', at: '14 May 10:05' }],
    draft: 'Murat Bey, analiz sonucunuza göre 6’lı bakım paketi ile %18 avantaj sunabilirim. Detay göndereyim mi?',
    notes: [{ d: '16 May 2026', by: 'Ebru B.', t: 'İlk analiz yapıldı. Paket teklifi 7 gün içinde iletilecek.' }],
    loyalty: { level: 'Standart', levelTone: 'cream', points: '5', score: '58 / 100' },
    prefs: { gun: 'Hafta içi', uzman: 'Ebru B.', kanal: 'Web / WhatsApp', risk: 'Düşük', riskTone: 'var(--sage-2)' },
  },
];

type Tab = 'genel' | 'randevu' | 'odeme' | 'mesaj' | 'not' | 'foto';
const TABS: { key: Tab; label: string; icon: keyof typeof Icon }[] = [
  { key: 'genel', label: 'Genel', icon: 'home' },
  { key: 'randevu', label: 'Randevu geçmişi', icon: 'calendar' },
  { key: 'odeme', label: 'Ödeme & paket', icon: 'wallet' },
  { key: 'mesaj', label: 'Mesajlar', icon: 'whatsapp' },
  { key: 'not', label: 'Notlar', icon: 'edit' },
  { key: 'foto', label: 'Fotoğraflar', icon: 'sparkle' },
];

const SummaryCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-60)', fontWeight: 500 }}>
      {title}
    </div>
    <div style={{ padding: 16 }}>{children}</div>
  </div>
);

const Row = ({ l, v, vc }: { l: string; v: string; vc?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', fontSize: 13 }}>
    <span style={{ color: 'var(--ink-60)' }}>{l}</span>
    <span style={{ fontWeight: 500, color: vc ?? 'var(--ink)' }}>{v}</span>
  </div>
);

export default function DanisanProfili() {
  const [selId, setSelId] = useState('c1');
  const [tab, setTab] = useState<Tab>('genel');
  const [q, setQ] = useState('');

  const c = CLIENTS.find((x) => x.id === selId) ?? CLIENTS[0];
  const list = useMemo(
    () => CLIENTS.filter((x) => x.name.toLowerCase().includes(q.trim().toLowerCase())),
    [q],
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '288px 1fr', gap: 14, flex: 1, minHeight: 0 }}>
      {/* ── sol: danışan listesi ── */}
      <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Danışanlar</div>
            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 999, background: 'var(--cream-3)', color: 'var(--ink-60)', fontFamily: 'Geist Mono, monospace' }}>{CLIENTS.length}</span>
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 12, color: 'var(--ink-40)', display: 'flex' }}>{Icon.search}</span>
            <input className="wl-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Danışan ara" style={{ height: 34, paddingLeft: 34, fontSize: 12 }} />
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {list.map((x, i) => {
            const active = x.id === selId;
            return (
              <button
                key={x.id}
                onClick={() => { setSelId(x.id); setTab('genel'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', border: 'none', borderRadius: 10,
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                  background: active ? 'var(--cream-2)' : 'transparent',
                  outline: active ? '1px solid var(--line-strong)' : 'none',
                }}
              >
                <Avatar name={x.name} i={i} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>{x.lastVisit} · {x.spend}</div>
                </div>
                {x.tags[0] && <Chip tone={x.tags[0].tone} small>{x.tags[0].label}</Chip>}
              </button>
            );
          })}
          {list.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink-40)', textAlign: 'center', padding: '24px 0' }}>Sonuç yok</div>}
        </div>
      </div>

      {/* ── sağ: seçili danışan profili ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, overflow: 'auto' }}>
        {/* başlık kartı */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
          <Avatar name={c.name} i={3} size={64} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>{c.name}</div>
              {c.tags.map((t) => (
                <Chip key={t.label} tone={t.tone} small>{t.label}</Chip>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12, color: 'var(--ink-60)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.phone}{c.phone}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>✉ {c.email}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.clock}Üyelik: {c.since}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{Icon.user}Sorumlu: {c.staff}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="wl-btn wl-btn-sm" style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8 }}>
              <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>Mesaj gönder
            </button>
            <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>{Icon.plus}Yeni randevu</button>
            <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }}>{Icon.edit}Düzenle</button>
          </div>
        </div>

        {/* AI özet */}
        <div style={{ background: 'linear-gradient(110deg, var(--paper) 0%, var(--paper) 50%, var(--lavender-soft) 100%)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--lavender-soft)', display: 'grid', placeItems: 'center', color: 'var(--lavender-2)', flexShrink: 0 }}>{Icon.sparkle}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Chip tone={c.ai.tone} small>{c.ai.chip}</Chip>
              <span>{c.ai.html}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>{c.ai.meta}</div>
          </div>
          <button className="wl-btn wl-btn-sm" style={{ background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 8 }}>{Icon.sparkle}Teklif hazırla</button>
        </div>

        {/* iki kolon: sekmeler + özet */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 14, flex: 1, minHeight: 0 }}>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', padding: '0 8px', gap: 2, flexWrap: 'wrap' }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '14px 12px', border: 'none', background: 'transparent',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                    fontWeight: tab === t.key ? 600 : 400,
                    color: tab === t.key ? 'var(--ink)' : 'var(--ink-60)',
                    borderBottom: tab === t.key ? '2px solid var(--forest)' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  <span style={{ color: tab === t.key ? 'var(--forest)' : 'var(--ink-40)', display: 'flex' }}>{Icon[t.icon]}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
              {tab === 'genel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                    {c.stats.map((s) => (
                      <div key={s.l} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>{s.l}</div>
                        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 6 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Son aktiviteler</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {c.history.slice(0, 4).map((h, i) => (
                        <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 999, background: h.st === 'iptal' ? 'var(--blush)' : 'var(--forest)', marginTop: 5, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{h.s}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>{h.d} · {h.u} · {h.p}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Cilt profili</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.6, background: 'var(--cream)', borderRadius: 10, padding: 14 }}>{c.skin}</div>
                  </div>
                </div>
              )}

              {tab === 'randevu' && (
                <table className="wl-table" style={{ marginTop: -8 }}>
                  <thead>
                    <tr><th>Tarih</th><th>Hizmet</th><th>Uzman</th><th>Durum</th><th style={{ textAlign: 'right' }}>Ücret</th></tr>
                  </thead>
                  <tbody>
                    {c.history.map((h, i) => (
                      <tr key={i}>
                        <td><span className="wl-mono" style={{ fontSize: 12 }}>{h.d}</span></td>
                        <td style={{ fontWeight: 500 }}>{h.s}</td>
                        <td style={{ color: 'var(--ink-60)' }}>{h.u}</td>
                        <td>{h.st === 'tamam' ? <Chip tone="good" small>{Icon.check}Tamamlandı</Chip> : <Chip tone="blush" small>İptal</Chip>}</td>
                        <td style={{ textAlign: 'right' }} className="wl-mono">{h.p}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {tab === 'odeme' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Aktif paketler</div>
                    {c.packages.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--ink-40)', background: 'var(--cream)', borderRadius: 10, padding: 14 }}>Aktif paket yok.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {c.packages.map((p) => (
                          <div key={p.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                              <span style={{ fontWeight: 500 }}>{p.name}</span>
                              <span className="wl-mono" style={{ color: 'var(--ink-60)' }}>{p.used}/{p.total}</span>
                            </div>
                            <div style={{ height: 8, borderRadius: 999, background: 'var(--cream-2)', overflow: 'hidden' }}>
                              <div style={{ width: `${(p.used / p.total) * 100}%`, height: '100%', background: p.color, borderRadius: 999 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Ödeme geçmişi</div>
                    {c.payments.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--ink-40)', background: 'var(--cream)', borderRadius: 10, padding: 14 }}>Henüz ödeme yok.</div>
                    ) : (
                      <table className="wl-table">
                        <tbody>
                          {c.payments.map((p, i) => (
                            <tr key={i}>
                              <td><span className="wl-mono" style={{ fontSize: 12 }}>{p.d}</span></td>
                              <td style={{ fontWeight: 500 }}>{p.desc}</td>
                              <td><Chip tone="cream" small>{p.m}</Chip></td>
                              <td style={{ textAlign: 'right' }} className="wl-mono">{p.a}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {tab === 'mesaj' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {c.chat.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.me ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '74%' }}>
                        <div style={{ background: m.me ? 'var(--sage-soft)' : 'var(--cream-2)', color: 'var(--ink)', padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: m.me ? 4 : 12, borderBottomLeftRadius: m.me ? 12 : 4, fontSize: 13, lineHeight: 1.5 }}>{m.t}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink-40)', marginTop: 4, textAlign: m.me ? 'right' : 'left' }}>{m.at}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 6, border: '1px dashed var(--lavender-2)', background: 'var(--lavender-soft)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--lavender-2)', display: 'flex' }}>{Icon.sparkle}</span>
                    <span style={{ fontSize: 12, color: 'var(--lavender-2)', fontStyle: 'italic', flex: 1 }}>AI taslağı: “{c.draft}”</span>
                    <button className="wl-btn wl-btn-sm" style={{ height: 26, fontSize: 11, background: 'var(--lavender-2)', color: 'var(--cream)', borderRadius: 6 }}>Gönder</button>
                  </div>
                </div>
              )}

              {tab === 'not' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ alignSelf: 'flex-start', borderRadius: 8 }}>{Icon.plus}Not ekle</button>
                  {c.notes.map((n, i) => (
                    <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Avatar name={n.by} i={i} size={22} />
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{n.by}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-40)', marginLeft: 'auto' }}>{n.d}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.55 }}>{n.t}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'foto' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                  {['Öncesi', 'Sonrası', 'Detay', 'Genel', 'Analiz', 'Yakın', 'Profil', 'Kontrol'].map((cap, i) => (
                    <div key={i}>
                      <div style={{ aspectRatio: '1', borderRadius: 10, background: i % 2 ? 'var(--cream-3)' : 'var(--cream-2)', display: 'grid', placeItems: 'center', color: 'var(--ink-40)', border: '1px solid var(--line)' }}>{Icon.sparkle}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink-40)', marginTop: 6 }}>{cap} · {c.history[0]?.d ?? '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* sağ özet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SummaryCard title="Paket durumu">
              {c.packages.length === 0
                ? <div style={{ fontSize: 13, color: 'var(--ink-40)' }}>Aktif paket yok</div>
                : c.packages.map((p) => (
                    <Row key={p.name} l={p.name} v={`${p.used}/${p.total}`} vc={p.used / p.total > 0.8 ? 'var(--bad)' : undefined} />
                  ))}
            </SummaryCard>
            <SummaryCard title="Sadakat">
              <Row l="Üye seviyesi" v={c.loyalty.level} vc="var(--champagne-2)" />
              <Row l="Puan" v={c.loyalty.points} />
              <Row l="Sadakat skoru" v={c.loyalty.score} vc="var(--sage-2)" />
            </SummaryCard>
            <SummaryCard title="Tercihler">
              <Row l="Gün/saat" v={c.prefs.gun} />
              <Row l="Uzman" v={c.prefs.uzman} />
              <Row l="Kanal" v={c.prefs.kanal} />
              <Row l="İptal riski" v={c.prefs.risk} vc={c.prefs.riskTone} />
            </SummaryCard>
          </div>
        </div>
      </div>
    </div>
  );
}
