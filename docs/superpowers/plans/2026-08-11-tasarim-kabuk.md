# Yeni Tasarım: Sistem ve Kabuk — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yeni tasarımın token setini ve uygulama kabuğunu (kenar menü + üst bar + yerleşim) hayata geçirmek.

**Architecture:** Mevcut rol adlı CSS değişkenlerinin **değerleri** yeni palete çevrilir; böylece bütün ekranlar tek hamlede yeni renklere geçer ve hiçbiri kırılmaz. Yeni kavramlar (lacivert, scrim, yarıçap, gölge) yeni değişken olarak eklenir. Kenar menü ve üst bar tasarım dosyalarına göre yeniden yazılır. Kabuk hiçbir yeni backend ucu gerektirmez.

**Tech Stack:** React 18 + TypeScript, Vite, `@fontsource` paketleri.

**Tasarım kaynağı:** `Klinik Yönetim Merkezi Tasarımı.zip` → `design_handoff_klinik_redesign/`. Bu iş için ilgili dosyalar: `README.md`, `Kenar Menu.dc.html`, `Ana Ekran.dc.html` (üst bar bölümü).

## Global Constraints

- Yalnızca frontend: `hakanbudak/w-lush-web`. Backend değişikliği yok.
- Kapılar: `npm run typecheck`, `npm test`, `npm run build` — üçü de 0 ile çıkar. CI bunları zaten koşuyor.
- **Hiçbir rakam uydurulmaz.** Kenar menü rozetleri gerçek veriden gelir; veri yoksa rozet çizilmez.
- Terminoloji her yerde **"danışan"**.
- Tasarım token'ları (README'den birebir): bone `#F4F2EC`, ikincil zemin `#FAF9F5`, yüzey `#FFFFFF`, lacivert `#17233D` (hover `#22335A`), ink `#1C2434`, çizgi `rgba(28,36,52,0.08)` / güçlü `rgba(28,36,52,0.14)`, yeşil `#2E7D5B` (hover `#256B4D`, koyu `#1F5C42`, açık zemin `#E7F1EB`, lacivert üstü `#8FC0A6`), mavi `#4A85B5`/`#E3EEF7`, mor `#5B4FA3`/`#EDEBF7`/`#F3F0FA`/`#463C85`, turuncu `#B4552F`/`#FBEAE3`, kırmızı `#C66B65`/`#FBEAE8`, gri `#8B8778`/`#EFEDE6`, WhatsApp `#25D366` + `#DCF8C6`/`#075E54`, scrim `rgba(23,35,61,0.45)`.
- Ölçüler: kart radius 12, modal 16, buton/input 8–9, chip 999; input 38–42px, buton 34–44px; kart border `1px solid rgba(28,36,52,0.08)`; modal gölgesi `0 32px 64px -16px rgba(23,35,61,0.5)`; içerik padding `20px 28px 28px`, kart arası gap 14.
- Tipografi: UI **Hanken Grotesk** (400/500/600/700), başlık **Lora** (500/600); sayılar `font-feature-settings:'tnum'`; gövde 13px, tablo başlığı 10px/600/0.1em/uppercase, etiket 11px/600/0.08em/uppercase.
- Commit trailer'ı serbest (frontend): `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Kapsam dışı (sonraki işler)

Bu plan **yalnızca kabuğu** bitirir. Ekranların içi eski yerleşimiyle, yeni renklerde kalır ve sırayla ele alınır. Üst bardaki **arama kutusu (⌘K)** Ana Ekran işine bırakıldı: tasarımda Ana Ekran'a özel ve arkasında bir arama ucu yok — kabukta boş bir kutu göstermek, çalışmayan bir özellik vaat etmek olurdu.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/styles/design-system.css` | Token'lar yeni palete çevrilir, yeni token'lar eklenir |
| `src/components/Sidebar.tsx` | Tasarıma göre yeniden yazılır (232px lacivert) |
| `src/components/TopBar.tsx` | Tasarıma göre yeniden yazılır; sayfaya özel aksiyon slotu |
| `src/components/Layout.tsx` | Boşluklar; üst bar aksiyon bağlamı |
| `src/components/shell/TopBarActions.tsx` (yeni) | Sayfaların üst bara düğme koymasını sağlayan bağlam |
| `src/hooks/useShellBadges.ts` (yeni) | Kenar menü rozetleri (CRM + Mesajlar), gerçek veriden |
| `package.json` | `@fontsource/hanken-grotesk`, `@fontsource/lora` |
| `src/main.tsx` | Font importları |

---

### Task 1: Token seti ve fontlar

**Files:**
- Modify: `src/styles/design-system.css`, `src/main.tsx`, `package.json`

**Interfaces:**
- Consumes: yok.
- Produces: CSS değişkenleri — mevcut adlar korunur (`--paper`, `--ink`, `--ink-60`, `--ink-40`, `--line`, `--line-strong`, `--cream`, `--cream-2`, `--forest`, `--forest-2`, `--forest-3`, `--bad`, `--wa-green`…), yeni adlar eklenir: `--navy`, `--navy-hover`, `--navy-ink`, `--accent-soft`, `--blue`, `--blue-soft`, `--ai`, `--ai-soft`, `--ai-band`, `--ai-dark`, `--warn`, `--warn-soft`, `--neutral`, `--neutral-soft`, `--scrim`, `--r-card`, `--r-modal`, `--r-control`, `--shadow-modal`.

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/tasarim-kabuk
```

- [ ] **Step 2: Fontları kur**

```bash
cd ~/Desktop/kisisel/w-lush-web
npm install @fontsource/hanken-grotesk @fontsource/lora 2>&1 | tail -3
```

- [ ] **Step 3: Font importlarını değiştir**

`src/main.tsx` içindeki Geist importlarını bul:

```bash
grep -n "fontsource" src/main.tsx
```

Geist satırlarını bununla değiştir (mevcut ağırlıkları koruyarak):

```tsx
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/hanken-grotesk/700.css';
import '@fontsource/lora/500.css';
import '@fontsource/lora/600.css';
```

Geist paketlerini `package.json`'dan **silme** — `wl-mono` sınıfı hâlâ Geist Mono kullanıyor olabilir; Step 5'te kontrol edilecek.

- [ ] **Step 4: Token'ları yeni palete çevir**

`src/styles/design-system.css` dosyasının `:root` bloğunu bununla değiştir. Değişken **adları korunuyor** — böylece bütün ekranlar tek hamlede yeni palete geçer ve hiçbiri kırılmaz.

```css
:root {
  /* --- Zeminler --- */
  --cream: #F4F2EC;        /* bone — sayfa zemini */
  --cream-2: #FAF9F5;      /* ikincil zemin / satır hover */
  --cream-3: #EFEDE6;      /* seçili yüzey */
  --paper: #FFFFFF;        /* kartlar */

  /* --- Lacivert (kenar menü, birincil) --- */
  --navy: #17233D;
  --navy-hover: #22335A;
  --navy-ink: #F4F2EC;     /* lacivert üzerindeki metin */

  /* --- Klinik yeşili (accent / CTA) --- */
  --forest: #2E7D5B;
  --forest-2: #1F5C42;     /* koyu metin */
  --forest-3: #E7F1EB;     /* açık zemin */
  --accent-soft: #8FC0A6;  /* lacivert üstünde açık ton */

  /* --- Yardımcı renkler --- */
  --blue: #4A85B5;
  --blue-soft: #E3EEF7;
  --ai: #5B4FA3;
  --ai-soft: #EDEBF7;
  --ai-band: #F3F0FA;
  --ai-dark: #463C85;
  --warn: #B4552F;
  --warn-soft: #FBEAE3;
  --bad: #C66B65;
  --bad-soft: #FBEAE8;
  --neutral: #8B8778;
  --neutral-soft: #EFEDE6;

  /* --- Metin --- */
  --ink: #1C2434;
  --ink-60: rgba(28, 36, 52, 0.6);
  --ink-45: rgba(28, 36, 52, 0.45);
  --ink-40: rgba(28, 36, 52, 0.4);
  --ink-20: rgba(28, 36, 52, 0.2);
  --ink-08: rgba(28, 36, 52, 0.08);

  /* --- Çizgiler --- */
  --line: rgba(28, 36, 52, 0.08);
  --line-strong: rgba(28, 36, 52, 0.14);

  /* --- WhatsApp --- */
  --wa-green: #25D366;
  --wa-chip: #DCF8C6;
  --wa-chip-ink: #075E54;
  --wa-bg: #FAF9F5;

  /* --- Ölçüler --- */
  --r-card: 12px;
  --r-modal: 16px;
  --r-control: 9px;
  --scrim: rgba(23, 35, 61, 0.45);
  --shadow-modal: 0 32px 64px -16px rgba(23, 35, 61, 0.5);
}
```

Eski palete ait olup yeni tasarımda karşılığı olmayan değişkenler (`--champagne*`, `--sage*`, `--lavender*`, `--blush*`, `--sand*`) **silinmez**, çünkü ekranlar hâlâ onlara başvuruyor ve bu iş yalnızca kabuğu bitiriyor. Bunun yerine yeni palete eşlenirler; `:root` bloğunun altına ekle:

```css
/* Eski palet adları, yeni palete eşlendi. Ekranlar sırayla yeni tasarıma
   geçtikçe bu blok küçülür ve sonunda silinir. Şimdilik silmek, henüz
   dokunulmamış ekranları renksiz bırakırdı. */
:root {
  --champagne: var(--blue);
  --champagne-2: var(--blue);
  --champagne-3: var(--blue-soft);
  --sage: var(--forest);
  --sage-2: var(--forest-2);
  --sage-soft: var(--forest-3);
  --lavender: var(--ai);
  --lavender-2: var(--ai);
  --lavender-soft: var(--ai-soft);
  --blush: var(--bad);
  --blush-soft: var(--bad-soft);
  --sand: var(--neutral);
  --sand-soft: var(--neutral-soft);
}
```

- [ ] **Step 5: Tipografiyi güncelle**

Aynı dosyada gövde/font kurallarını bul ve şu kuralları uygula (mevcut seçicilere göre uyarla, yenilerini ekleme):

```css
body, .wl {
  font-family: 'Hanken Grotesk', system-ui, sans-serif;
  font-size: 13px;
  color: var(--ink);
  background: var(--cream);
}

/* Sayılar her yerde hizalı. */
.wl, .wl input, .wl select, .wl button, .wl table {
  font-feature-settings: 'tnum';
}

/* Display: sayfa ve modal başlıkları. */
.wl-display {
  font-family: 'Lora', Georgia, serif;
  font-weight: 600;
}

/* Tablo başlığı ve etiketler. */
.wl-table th {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-45);
}

.wl-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-45);
}
```

`wl-mono` sınıfının hangi fontu istediğini kontrol et:

```bash
grep -n "wl-mono" -A3 src/styles/design-system.css
```

Geist Mono kullanıyorsa **bırak** — tasarım monospace için bir şey söylemiyor ve saat/tutar hizalaması ondan geliyor.

- [ ] **Step 6: Animasyonları ekle**

Dosyanın sonuna:

```css
@keyframes wl-fade {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}

@keyframes wl-modal {
  from { opacity: 0; transform: translateY(14px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
```

- [ ] **Step 7: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

Beklenen: `24 passed`, `kapılar 0`. CSS değişikliği testleri etkilemez; bu adım bir regresyon olmadığını gösterir.

- [ ] **Step 8: Eski palete başvuran yer kalmadığını değil, **hepsinin eşlendiğini** doğrula**

```bash
cd ~/Desktop/kisisel/w-lush-web
echo "--- ekranların kullandığı eski değişkenler ---"
grep -rhoE "var\(--(champagne|sage|lavender|blush|sand)[a-z0-9-]*\)" src/ | sort -u
echo "--- bunların hepsi uyumluluk bloğunda tanımlı mı ---"
for v in $(grep -rhoE "\-\-(champagne|sage|lavender|blush|sand)[a-z0-9-]*" src/ --include="*.tsx" | sort -u); do
  grep -q "^  $v:" src/styles/design-system.css || echo "EKSİK: $v"
done
echo "(EKSİK satırı yoksa tamam)"
```

Eksik çıkan olursa uyumluluk bloğuna ekle — aksi hâlde o ekranda renk tanımsız kalır.

- [ ] **Step 9: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/styles/design-system.css src/main.tsx package.json package-lock.json
git commit -m "$(cat <<'EOF'
Move the design tokens to the new palette

The variable names are role-based already, so remapping their values moves
every screen onto the new palette at once instead of leaving two palettes
alive during the migration.

Old palette names are aliased rather than deleted: the screens still
reference them and this change finishes the shell, not the screens. The alias
block shrinks as each screen is redone.

Fonts come from @fontsource rather than the Google Fonts CDN the handoff
suggests — the repo already works that way and it keeps the panel working
offline.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Kenar menü

**Files:**
- Create: `src/hooks/useShellBadges.ts`
- Modify: `src/components/Sidebar.tsx`, `src/config/nav.ts`

**Interfaces:**
- Consumes: `listCustomers`, `listConversations`, `getConnection`, `useAuth`.
- Produces: `useShellBadges(): { crm: number; mesajlar: number }`; yeniden yazılmış `Sidebar`.

- [ ] **Step 1: Rozet kancasını yaz**

`src/hooks/useShellBadges.ts`:

```ts
import { useEffect, useState } from 'react';
import { listConversations } from '../api/conversations';
import { listCustomers } from '../api/customers';

/**
 * Kenar menüdeki iki rozet. İkisi de gerçek veriden gelir; sayı yoksa rozet
 * çizilmez — tasarımdaki 3 ve 2 örnek veriydi.
 *
 * CRM: henüz kimsenin dönmediği adaylar ("yeni" aşaması).
 * Mesajlar: son sözü müşterinin söylediği konuşmalar.
 */
export function useShellBadges(): { crm: number; mesajlar: number } {
  const [crm, setCrm] = useState(0);
  const [mesajlar, setMesajlar] = useState(0);

  useEffect(() => {
    listCustomers()
      .then((rows) => setCrm(rows.filter((c) => c.stage === 'new').length))
      .catch(() => setCrm(0));
    listConversations()
      .then((rows) => setMesajlar(rows.filter((c) => c.waiting).length))
      .catch(() => setMesajlar(0));
  }, []);

  return { crm, mesajlar };
}
```

- [ ] **Step 2: `Sidebar.tsx`'i yeniden yaz**

Tasarım: `Kenar Menu.dc.html`. 232px, `--navy`, tam yükseklik.

```tsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NAV } from '../config/nav';
import { useShellBadges } from '../hooks/useShellBadges';
import { useWhatsAppStatus } from '../hooks/useWhatsAppStatus';
import { Icon } from './icons';

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const badges = useShellBadges();
  const wa = useWhatsAppStatus();

  return (
    <aside
      style={{
        width: 232, height: '100vh', background: 'var(--navy)',
        color: 'var(--navy-ink)', display: 'flex', flexDirection: 'column',
        flexShrink: 0, overflow: 'hidden',
      }}
    >
      <NavLink
        to="/"
        style={{
          padding: '18px 20px 14px', display: 'flex', alignItems: 'center',
          gap: 10, textDecoration: 'none', color: 'inherit',
        }}
      >
        <span
          style={{
            width: 32, height: 32, borderRadius: 9, background: 'var(--forest)',
            color: 'var(--navy-ink)', display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 15,
          }}
        >
          w
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>
            w-lush
          </span>
          <span
            style={{
              fontSize: 11, color: 'rgba(244,242,236,0.5)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {user?.clinic.name ?? ''}
          </span>
        </span>
      </NavLink>

      <nav style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map((n) => {
          const badge = n.key === 'crm' ? badges.crm : n.key === 'mesajlar' ? badges.mesajlar : 0;
          return (
            <NavLink
              key={n.key}
              to={n.path}
              end={n.path === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 8, fontSize: 13, textDecoration: 'none',
                color: isActive ? '#FFFFFF' : 'rgba(244,242,236,0.62)',
                background: isActive ? 'rgba(255,255,255,0.09)' : 'transparent',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    style={{
                      display: 'flex',
                      color: isActive ? 'var(--accent-soft)' : 'rgba(244,242,236,0.4)',
                    }}
                  >
                    {Icon[n.icon]}
                  </span>
                  <span style={{ flex: 1 }}>{n.label}</span>
                  {badge > 0 && (
                    <span
                      style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 7px',
                        borderRadius: 999, background: 'rgba(46,125,91,0.35)',
                        color: '#9ED0B5',
                      }}
                    >
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div
        style={{
          padding: '12px 18px', borderTop: '1px solid rgba(244,242,236,0.09)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span
          style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: wa.connected ? '#4ADE80' : 'rgba(244,242,236,0.35)',
          }}
        />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>WhatsApp</span>
        <span style={{ fontSize: 11, color: 'rgba(244,242,236,0.5)' }}>
          {wa.label}
        </span>
      </div>

      <div
        style={{
          padding: '12px 18px', borderTop: '1px solid rgba(244,242,236,0.09)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span
          style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--forest)',
            color: 'var(--navy-ink)', display: 'grid', placeItems: 'center',
            fontSize: 11, fontWeight: 600, flexShrink: 0,
          }}
        >
          {initials(user?.name || user?.email || '')}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 12, fontWeight: 600, overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {user?.name || '—'}
          </span>
          <span
            style={{
              fontSize: 10, color: 'rgba(244,242,236,0.45)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {user?.email ?? ''}
          </span>
        </span>
        <button
          type="button"
          onClick={logout}
          title="Çıkış yap"
          style={{
            display: 'flex', color: 'rgba(244,242,236,0.45)', padding: 4,
            borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer',
          }}
        >
          {Icon.exit}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Eksik parçaları kontrol et ve tamamla**

Bu bileşen dört şeye dayanıyor; her birinin var olduğunu doğrula, yoksa ekle:

```bash
cd ~/Desktop/kisisel/w-lush-web
echo "--- useAuth ne veriyor ---"; grep -n "logout\|user" src/auth/AuthContext.tsx | head -12
echo "--- Icon.exit var mı ---"; grep -c "exit:" src/components/icons.tsx
echo "--- whatsapp durum kancası var mı ---"; ls src/hooks/ 2>/dev/null || echo "hooks klasörü yok"
echo "--- eski Sidebar WhatsApp durumunu nasıl alıyordu ---"; grep -n "getConnection\|whatsapp" src/components/Sidebar.tsx | head -5
```

- `Icon.exit` yoksa `src/components/icons.tsx`'e ekle (tasarımdaki path'ler): `M14 4.5h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-5` ve `M10 8l-4 4 4 4M6 12h10`, `stroke-width 1.7`, round cap/join.
- `useWhatsAppStatus` yoksa `src/hooks/useWhatsAppStatus.ts` olarak yaz:

```ts
import { useEffect, useState } from 'react';
import { getConnection } from '../api/whatsapp';

/** Kenar menünün alt satırı. Bilinmiyorken "—" gösterilir, "Bağlı değil" değil. */
export function useWhatsAppStatus(): { connected: boolean; label: string } {
  const [state, setState] = useState<{ connected: boolean; label: string }>({
    connected: false,
    label: '—',
  });

  useEffect(() => {
    getConnection()
      .then((c) =>
        setState(
          c.status === 'connected'
            ? { connected: true, label: 'Bağlı' }
            : { connected: false, label: 'Bağlı değil' },
        ),
      )
      .catch(() => setState({ connected: false, label: '—' }));
  }, []);

  return state;
}
```

- `useAuth`'ta `logout` yoksa mevcut çıkış mekanizmasını kullan (eski `Sidebar.tsx`'te nasıl yapıldığına bak) ve kodu ona göre düzelt.

- [ ] **Step 4: `NAV`'daki ikonların yeni tasarımla eşleştiğini doğrula**

Tasarım `mesajlar` için sohbet balonu ikonu kullanıyor; `config/nav.ts` şu an `whatsapp` diyor. Tasarıma uy:

```bash
cd ~/Desktop/kisisel/w-lush-web && grep -n "mesajlar" src/config/nav.ts
```

`icon: 'whatsapp'` ise `icon: 'chat'` yap ve `icons.tsx`'te `chat` yoksa tasarımdaki path'le ekle: `M12 3a8.5 8.5 0 0 0-7.3 12.9L3.5 20.5l4.7-1.2A8.5 8.5 0 1 0 12 3z`.

- [ ] **Step 5: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

- [ ] **Step 6: Rozetlerin gerçek veriyi yansıttığını doğrula**

Tarayıcı olmadan yapılabilecek kontrol: kancanın okuduğu iki sayıyı API'den bağımsız hesapla.

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:5173"
def call(path, body=None, method="GET", token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())

tok = call("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"}, "POST")["token"]["access_token"]
customers = call("/api/customers", token=tok)
convs = call("/api/conversations", token=tok)
crm = sum(1 for c in customers if c["stage"] == "new")
msg = sum(1 for c in convs if c["waiting"])
print("CRM rozeti  :", crm, "(aşaması 'new' olan aday)")
print("Mesaj rozeti:", msg, "(yanıt bekleyen konuşma)")
print("→ kenar menüde bu iki sayı görünmeli; 0 ise rozet hiç çizilmemeli")
PY
```

Bu sayıları not et; PR gövdesine yazılacak.

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/Sidebar.tsx src/hooks/ src/config/nav.ts src/components/icons.tsx
git commit -m "$(cat <<'EOF'
Rebuild the sidebar on the new design

The badges are real: CRM counts leads nobody has answered yet, Mesajlar
counts conversations where the customer spoke last. The 3 and 2 in the
handoff were sample data, and a badge with no number behind it is worse than
no badge.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Üst bar ve yerleşim

**Files:**
- Create: `src/components/shell/TopBarActions.tsx`
- Modify: `src/components/TopBar.tsx`, `src/components/Layout.tsx`

**Interfaces:**
- Consumes: `NAV`, `useLocation`, `NotificationBell`.
- Produces:
  - `<TopBarActionsProvider>` — Layout sarar.
  - `useSetTopBarActions(node: ReactNode, deps: unknown[]): void` — sayfalar üst bara düğme koyar.

- [ ] **Step 1: Aksiyon bağlamını yaz**

Tasarımda üst bardaki düğmeler sayfaya özel ("Yeni randevu" takvimde, "Gelir ekle" gelirde…). Kabuk bunları bilmemeli; sayfa kendi düğmesini yerleştirir.

`src/components/shell/TopBarActions.tsx`:

```tsx
import {
  createContext, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';

const Ctx = createContext<{
  actions: ReactNode;
  setActions: (n: ReactNode) => void;
} | null>(null);

export function TopBarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Üst barın sağ tarafı. Kabuk sayfaları bilmez; sayfa kendi düğmesini koyar. */
export function useTopBarActions(): ReactNode {
  return useContext(Ctx)?.actions ?? null;
}

/**
 * Sayfa üst bara düğme yerleştirir. `deps` değiştikçe yeniden yerleştirilir;
 * sayfa kapanınca temizlenir, aksi hâlde bir sonraki sayfada asılı kalır.
 */
export function useSetTopBarActions(node: ReactNode, deps: unknown[]): void {
  const ctx = useContext(Ctx);
  useEffect(() => {
    ctx?.setActions(node);
    return () => ctx?.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
```

- [ ] **Step 2: `TopBar.tsx`'i yeniden yaz**

Tasarım: `Ana Ekran.dc.html` üst bar bölümü. Arama kutusu **bu işe dahil değil** (kapsam dışı notuna bak).

```tsx
import { useLocation } from 'react-router-dom';
import { NAV } from '../config/nav';
import NotificationBell from './NotificationBell';
import { useTopBarActions } from './shell/TopBarActions';

function todayLabel(): string {
  const now = new Date();
  const weekday = now.toLocaleDateString('tr-TR', { weekday: 'long' });
  const rest = now.toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  return `${weekday.charAt(0).toLocaleUpperCase('tr-TR')}${weekday.slice(1)} · ${rest}`;
}

function usePageTitle(): string {
  const { pathname } = useLocation();
  const match =
    NAV.find((n) => n.path !== '/' && pathname.startsWith(n.path)) ??
    NAV.find((n) => n.path === pathname) ??
    NAV[0];
  return match.title;
}

export default function TopBar() {
  const title = usePageTitle();
  const actions = useTopBarActions();

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 28px',
        borderBottom: '1px solid var(--line)', background: 'var(--paper)',
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: 'var(--ink-45)', letterSpacing: '0.04em' }}>
          {todayLabel()}
        </div>
        <div className="wl-display" style={{ fontSize: 19, marginTop: 1 }}>
          {title}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {actions}
        {actions && (
          <span
            style={{
              width: 1, height: 22, background: 'var(--ink-20)', margin: '0 4px',
            }}
          />
        )}
        <NotificationBell />
      </div>
    </div>
  );
}
```

Eski `TopBar` "Mesaj gönder" / "Yeni randevu" düğmelerini kendi içinde tutuyordu ve `modals.tsx`'ten uydurma veriyle beslenen modaller açıyordu. Bunlar kaldırılıyor: tasarımda o düğmeler Ana Ekran'a ait ve Ana Ekran işi geldiğinde gerçek verisiyle geri gelecek.

- [ ] **Step 3: `Layout.tsx`'i güncelle**

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { TopBarActionsProvider } from './shell/TopBarActions';

export default function Layout() {
  return (
    <TopBarActionsProvider>
      <div
        className="wl"
        style={{
          display: 'flex', width: '100%', height: '100vh',
          background: 'var(--cream)', overflow: 'hidden',
        }}
      >
        <Sidebar />
        <div
          style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            minWidth: 0, height: '100vh',
          }}
        >
          <TopBar />
          <div
            style={{
              flex: 1, minHeight: 0, padding: '20px 28px 28px', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </TopBarActionsProvider>
  );
}
```

Eski `stage` sarmalayıcısı (1440×1024 sabit sahne) kaldırıldı: tasarım tam ekran bir uygulama kabuğu tarif ediyor. `stage` sınıfı başka yerde kullanılıyorsa CSS'te kalır, zararı yok.

- [ ] **Step 4: `stage` kaldırmanın bir şeyi bozmadığını doğrula**

```bash
cd ~/Desktop/kisisel/w-lush-web && grep -rn "stage" src/ --include="*.tsx" --include="*.css" | head
```

Giriş/kayıt sayfaları `stage` kullanıyorsa dokunma — onlar bu planın kapsamında değil.

- [ ] **Step 5: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck 2>&1 | tail -5 && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

`modals.tsx`'ten import kalmadığı için "unused" hataları çıkabilir; import satırlarını temizle.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/TopBar.tsx src/components/Layout.tsx src/components/shell/
git commit -m "$(cat <<'EOF'
Rebuild the top bar and the layout spacing

Page-specific buttons move into a context: the shell should not know that a
calendar has a "new appointment" button. The old top bar hard-coded two of
them and opened modals fed by fabricated data; they come back with the Ana
Ekran work, on real data.

The search box the design puts here is deliberately left out — there is no
search endpoint behind it, and an input that does nothing is a promise the
panel cannot keep.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Doğrulama ve PR

- [ ] **Step 1: Kabuğun her rotada ayakta olduğunu doğrula**

Tarayıcı bağlı değilse yapılabilecek en iyi kontrol, her sayfanın hâlâ derlenip render edilebildiğidir. `npm run build` bunu kapsar; ek olarak eski kabuğa ait kalıntı olmadığını göster:

```bash
cd ~/Desktop/kisisel/w-lush-web
echo "--- eski üst bar düğmeleri kaldı mı ---"
grep -rn "NewAppointmentModal\|MessageComposerModal" src/components/TopBar.tsx || echo "temiz"
echo "--- eski token değerleri kaldı mı ---"
grep -rn "#5B9F7E\|#F4F8F4\|#2A3530" src/ --include="*.tsx" --include="*.css" || echo "temiz"
echo "--- kabuk dosyalarının satır sayısı ---"
wc -l src/components/Sidebar.tsx src/components/TopBar.tsx src/components/Layout.tsx src/styles/design-system.css
```

- [ ] **Step 2: Tarayıcı turu**

Chrome eklentisi bağlıysa panele gir ve şunları gör: lacivert kenar menü, aktif öğenin yeşil ikonu, gerçek rozet sayıları, WhatsApp durum satırı, üst barda Lora başlık ve tarih, içerik boşlukları.

Bağlı değilse **bu adımı atla ve PR'da atlandığını yaz.** Tasarım "pixel-perfect" istiyor; görmeden bunu iddia etme.

- [ ] **Step 3: PR aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git push -u origin feature/tasarim-kabuk
gh pr create --base main --head feature/tasarim-kabuk \
  --title "Yeni tasarım: token seti ve uygulama kabuğu" \
  --body "$(cat <<'EOF'
Yeni tasarımın (`design_handoff_klinik_redesign`) ilk parçası: token seti,
kenar menü, üst bar, yerleşim. Her ekran bunun üzerine oturduğu için ilk iş bu.

## Token stratejisi
Mevcut değişkenler zaten rol adlı (`--paper`, `--ink`, `--line`, `--forest`…),
o yüzden **değerleri** yeni palete çevrildi. Böylece bütün uygulama tek
hamlede yeni renklere geçti ve hiçbir ekran kırılmadı.

Eski palet adları (`--champagne*`, `--sage*`, `--lavender*`, `--blush*`,
`--sand*`) silinmedi, yeni palete **eşlendi**. Ekranlar henüz yeni tasarıma
geçmedi ve onlara başvuruyorlar; silmek o ekranları renksiz bırakırdı. Blok
her ekran yenilendikçe küçülecek.

## Fontlar
Handoff Google Fonts diyor; `@fontsource/hanken-grotesk` ve `@fontsource/lora`
kuruldu. Repo zaten böyle çalışıyor ve panel çevrimdışı da açılıyor.

## Kenar menü rozetleri gerçek
Tasarımdaki 3 ve 2 örnek veriydi. CRM rozeti "yeni" aşamasındaki adayları,
Mesajlar rozeti son sözü müşterinin söylediği konuşmaları sayıyor — ikisi de
mevcut uçlardan, backend işi olmadan. Sayı 0 ise rozet hiç çizilmiyor.

## Üst bar
Sayfaya özel düğmeler bir bağlama taşındı: kabuğun, takvimde "Yeni randevu"
düğmesi olduğunu bilmesi gerekmiyor. Eski üst bar bu iki düğmeyi sabit
tutuyor ve uydurma veriyle beslenen modaller açıyordu; Ana Ekran işiyle
gerçek verisiyle geri gelecekler.

**Tasarımdaki arama kutusu (⌘K) bilerek eklenmedi:** arkasında bir arama ucu
yok ve hiçbir şey yapmayan bir input, panelin tutamayacağı bir söz olurdu.
Ana Ekran işinde ele alınacak.

## Kapsam
Bu PR **yalnızca kabuğu** bitirir. Ekranlar eski yerleşimleriyle, yeni
renklerde görünüyor; sırayla ele alınacaklar.

## Doğrulama
- `typecheck`, `test` (24), `build` — hepsi 0.
- Rozet sayıları API'den bağımsız hesaplanıp karşılaştırıldı.
- Eski token değerlerinin (`#5B9F7E`, `#F4F8F4`, `#2A3530`) kodda kalmadığı
  tarandı.
- **Tarayıcıda açılmadı** — Chrome eklentisi bağlı değil. Tasarım
  pixel-perfect istiyor; görsel doğruluk iddia edilmiyor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Sonraki işler (bu planın dışında)

Sırayla, her biri kendi speci/planıyla:

1. **Ana Ekran** — arama (⌘K, yeni uç gerekir), hızlı işlem düğmeleri, hoş geldiniz turu.
2. **Randevu Takvimi** — uzman renkleri, detay/oluşturma popupları.
3. **Mesajlar** — asistan devral/devret şeridi, balon tasarımı.
4. **CRM + Danışan Profili** — kanban, "toplam harcama" (backend gerekir).
5. **Gelir + Giderler + Rapor** — KPI/kırılım/tablo düzenleri.
6. **Sistem** — en çok yeni özellik: klinik tipi, telefon/adres, hizmet süresi,
   düzenlenebilir WhatsApp şablonları, AI asistan ayarları.
7. **Giriş + kurulum sihirbazı** — klinik tipi, tipe göre hizmet ön ayarları,
   randevu aralığı.
