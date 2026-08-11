# Yeni Tasarım: Randevu Takvimi — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Randevu Takvimi'ni yeni tasarıma geçirmek: uzman renkleri, lejant, detay popup'ı, üst bara taşınan kontroller.

**Architecture:** Izgara zaten gerçek veriye bağlı; bu iş görsel katman + detay popup'ı. Sayfanın altındaki `AppointmentList` kaldırılıyor, ama taşıdığı **personel atama** yeteneği detay popup'ına taşınıyor — çalışan bir özelliği, onu düşünmemiş bir maketle eşleşmek için atmıyoruz. Toast paylaşılan bir kabuk bileşeni oluyor; tasarım onu her ekranda kullanıyor.

**Tech Stack:** React 18 + TypeScript. **Backend değişikliği yok.**

**Tasarım kaynağı:** `design_handoff_klinik_redesign/Randevu Takvimi.dc.html` + `README.md` §3.

## Global Constraints

- Yalnızca frontend. Kapılar: `typecheck`, `test`, `build`.
- Renk sabiti yazılmaz, `var(--…)` kullanılır.
- Hiçbir rakam uydurulmaz.
- Commit trailer'ı: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Tasarımdan bilinçli sapmalar

1. **Detay popup'ında personel ataması var.** Tasarımda yok, ama `AppointmentList` kaldırılınca atama yapacak başka yer kalmıyor. Uç zaten var (`PUT /appointments/{id}/staff`, 409'lu çakışma kontrolüyle).
2. **"Mesaj gönder" yalnızca konuşması olan danışan için etkin.** API yabancı numaraya yazmayı 404 ile reddediyor (selamet/w-lush#19). Konuşma yoksa düğme pasif ve nedeni yazıyor.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/components/shell/Toast.tsx` (yeni) | Alt-orta bildirim; sağlayıcı + `useToast()` |
| `src/components/Layout.tsx` | Toast sağlayıcısı |
| `src/components/randevu/staffColors.ts` (yeni) | Uzman renk paleti, tek kaynak |
| `src/components/randevu/SlotGrid.tsx` | Renk üçlüsü, boş hücre hover, lejant |
| `src/components/randevu/AppointmentDetail.tsx` (yeni) | Detay popup'ı |
| `src/pages/RandevuTakvimi.tsx` | Üst bar kontrolleri, popup, toast; liste kaldırılır |
| `src/components/randevu/AppointmentList.tsx` | **silinir** |

---

### Task 1: Toast

**Files:**
- Create: `src/components/shell/Toast.tsx`
- Modify: `src/components/Layout.tsx`

**Interfaces:**
- Produces: `<ToastProvider>`, `useToast(): (text: string) => void`.

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/tasarim-takvim
```

- [ ] **Step 2: `Toast.tsx`'i yaz**

Tasarım: alt-orta sabit lacivert pill, yeşil ✓, ~3.2sn.

```tsx
import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';

const Ctx = createContext<(text: string) => void>(() => {});

/** Bildirim süresi — tasarımdan. */
const LIFETIME = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setText(next);
    timer.current = window.setTimeout(() => setText(null), LIFETIME);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {text && (
        <div
          style={{
            position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)',
            zIndex: 90, display: 'flex', alignItems: 'center', gap: 9,
            background: 'var(--navy)', color: 'var(--navy-ink)',
            padding: '10px 18px', borderRadius: 999, fontSize: 12.5,
            boxShadow: '0 18px 40px -12px rgba(23,35,61,0.45)',
            animation: 'wl-fade .25s ease both',
          }}
        >
          <span style={{ color: 'var(--accent-soft)', fontWeight: 700 }}>✓</span>
          {text}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): (text: string) => void {
  return useContext(Ctx);
}
```

- [ ] **Step 3: Layout'a bağla**

`Layout.tsx` içinde `TopBarActionsProvider`'ın **içine** `ToastProvider` koy (toast kabuğun üstünde çizilmeli):

```tsx
import { ToastProvider } from './shell/Toast';
```

```tsx
    <TopBarActionsProvider>
      <ToastProvider>
        … mevcut içerik …
      </ToastProvider>
    </TopBarActionsProvider>
```

- [ ] **Step 4: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
git add src/components/shell/Toast.tsx src/components/Layout.tsx
git commit -m "$(cat <<'EOF'
Add the shared toast

The design uses one on every screen, so it belongs in the shell rather than
being rebuilt per page.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Uzman renkleri ve ızgara

**Files:**
- Create: `src/components/randevu/staffColors.ts`
- Modify: `src/components/randevu/SlotGrid.tsx`

**Interfaces:**
- Produces: `staffColor(index: number | null): { bg: string; bar: string; text: string }` — `null` = atanmamış.
- `SlotItem.colorIndex` → `number | null` olur.

- [ ] **Step 1: Renk kaynağını yaz**

```ts
/**
 * Uzman renkleri. Tasarımda her uzmana bir zemin/bar/metin üçlüsü düşüyor;
 * atanmamış randevular nötr gri. Tek kaynak, çünkü aynı renk hem ızgarada
 * hem lejantta hem detay popup'ında kullanılıyor.
 */
export interface StaffColor {
  bg: string;
  bar: string;
  text: string;
}

const PALETTE: StaffColor[] = [
  { bg: 'var(--forest-3)', bar: 'var(--forest)', text: 'var(--forest-2)' },
  { bg: 'var(--blue-soft)', bar: 'var(--blue)', text: '#2F5E85' },
  { bg: 'var(--ai-soft)', bar: 'var(--ai)', text: 'var(--ai-dark)' },
];

export const UNASSIGNED_COLOR: StaffColor = {
  bg: 'var(--neutral-soft)',
  bar: 'var(--neutral)',
  text: '#5E5A4C',
};

/** `null` ya da paletin dışı → atanmamış rengi. */
export function staffColor(index: number | null): StaffColor {
  if (index === null || index < 0) return UNASSIGNED_COLOR;
  return PALETTE[index % PALETTE.length];
}

export const PALETTE_SIZE = PALETTE.length;
```

- [ ] **Step 2: `SlotGrid.tsx`'i güncelle**

Üç değişiklik:

1. Dosyanın başındaki `COLORS` dizisini sil, `staffColor`'ı import et.
2. `SlotItem.colorIndex` tipini `number | null` yap; blok içinde `const color = staffColor(item.colorIndex);`
3. Boş hücreye hover ekle: hücrenin `<td>` stiline dokunmak yerine, boş hücre düğmesinin `style-hover` karşılığı yok — bunun yerine `<td>`'ye `onMouseEnter/Leave` değil, CSS sınıfı ver. `design-system.css`'e ekle:

```css
/* Takvim ızgarasında boş hücre — tıklanınca randevu oluşturur. */
.wl-slot-cell:hover { background: var(--cream-2); }
```

ve `<td key={c.key} className="wl-slot-cell" …>` yap.

- [ ] **Step 3: Lejantı ekle**

`SlotGrid` tablosunun altına, bileşenin döndürdüğü `<div>` içine:

```tsx
      {legend.length > 0 && (
        <div
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 14, padding: '10px 12px 4px',
            borderTop: '1px solid var(--line)', marginTop: 8,
          }}
        >
          {legend.map((l) => (
            <span
              key={l.label}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-60)' }}
            >
              <span
                style={{
                  width: 10, height: 10, borderRadius: 3, background: l.color.bar,
                }}
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
```

ve prop ekle:

```tsx
  /** Renk lejantı. Boş dizi verilirse çizilmez. */
  legend?: { label: string; color: StaffColor }[];
```

varsayılanı `legend = []`.

- [ ] **Step 4: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
git add src/components/randevu/staffColors.ts src/components/randevu/SlotGrid.tsx src/styles/design-system.css
git commit -m "$(cat <<'EOF'
Give each staff member a colour and add the legend

The palette lives in one file because the same colour appears in the grid,
the legend and the detail popup; three copies would drift.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Detay popup'ı

**Files:**
- Create: `src/components/randevu/AppointmentDetail.tsx`

**Interfaces:**
- Consumes: `Appointment`, `StaffMember`, `confirmAppointment`, `cancelAppointment`, `assignAppointmentStaff`, `listConversations`, `Modal`, `staffColor`.
- Produces:

```ts
export default function AppointmentDetail({
  appointment, staff, onClose, onChanged, onMessage,
}: {
  appointment: Appointment;
  staff: StaffMember[];
  onClose: () => void;
  onChanged: (updated: Appointment, message: string) => void;
  onMessage: (phone: string, name: string) => void;
}): JSX.Element
```

- [ ] **Step 1: Dosyayı yaz**

```tsx
import { useEffect, useState } from 'react';
import { ApiError } from '../../api/client';
import {
  assignAppointmentStaff, cancelAppointment, confirmAppointment,
  type Appointment,
} from '../../api/clinic';
import { listConversations } from '../../api/conversations';
import type { StaffMember } from '../../api/staff';
import { Modal } from '../modals';

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  confirmed: { label: 'Onaylı', bg: 'var(--forest-3)', color: 'var(--forest-2)' },
  pending: { label: 'Bekliyor', bg: 'var(--warn-soft)', color: 'var(--warn)' },
  cancelled: { label: 'İptal', bg: 'var(--neutral-soft)', color: 'var(--neutral)' },
};

const maskPhone = (p: string): string => (p.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-2)}` : p);

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 13, alignItems: 'baseline' }}>
      <span style={{ width: 88, color: 'var(--ink-45)', flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

export default function AppointmentDetail({
  appointment,
  staff,
  onClose,
  onChanged,
  onMessage,
}: {
  appointment: Appointment;
  staff: StaffMember[];
  onClose: () => void;
  onChanged: (updated: Appointment, message: string) => void;
  onMessage: (phone: string, name: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Konuşması olmayan numaraya API yazmaya izin vermiyor; düğmeyi boşuna
  // göstermek yerine nedenini yazıyoruz.
  const [hasThread, setHasThread] = useState<boolean | null>(null);

  useEffect(() => {
    listConversations()
      .then((rows) => setHasThread(rows.some((r) => r.phone === appointment.phone)))
      .catch(() => setHasThread(false));
  }, [appointment.phone]);

  const run = (
    fn: () => Promise<Appointment>,
    message: string,
  ) => {
    setBusy(true);
    setError(null);
    fn()
      .then((updated) => {
        onChanged(updated, message);
        onClose();
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        setError(api?.detail || 'İşlem tamamlanamadı.');
        setBusy(false);
      });
  };

  const who = appointment.customer_name || maskPhone(appointment.phone);
  const st = STATUS[appointment.status] ?? {
    label: appointment.status, bg: 'var(--neutral-soft)', color: 'var(--neutral)',
  };

  return (
    <Modal title="Randevu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              width: 42, height: 42, borderRadius: '50%', background: 'var(--forest)',
              color: 'var(--navy-ink)', display: 'grid', placeItems: 'center',
              fontSize: 14, fontWeight: 600, flexShrink: 0,
            }}
          >
            {initials(who)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="wl-display" style={{ fontSize: 16 }}>{who}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-45)' }}>
              {maskPhone(appointment.phone)}
            </div>
          </div>
          <span
            style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
              background: st.bg, color: st.color,
            }}
          >
            {st.label}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Line label="Tarih · saat">
            {appointment.appt_date} · {appointment.appt_time}
          </Line>
          <Line label="Hizmet">{appointment.service_name || '—'}</Line>
          <Line label="Uzman">
            <select
              value={appointment.staff_id === null ? '' : String(appointment.staff_id)}
              disabled={busy}
              onChange={(e) =>
                run(
                  () =>
                    assignAppointmentStaff(
                      appointment.id,
                      e.target.value === '' ? null : Number(e.target.value),
                    ),
                  'Personel ataması güncellendi.',
                )
              }
              style={{
                width: '100%', border: '1px solid var(--line-strong)', borderRadius: 8,
                padding: '7px 9px', font: 'inherit', fontSize: 13, background: 'var(--cream)',
              }}
            >
              <option value="">Atanmamış</option>
              {staff.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </select>
          </Line>
        </div>

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        {hasThread === false && (
          <div style={{ fontSize: 11, color: 'var(--ink-45)' }}>
            Bu numarayla henüz bir WhatsApp konuşmanız yok, mesaj gönderilemez.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {appointment.status === 'pending' && (
            <button
              type="button"
              className="wl-btn wl-btn-sm"
              disabled={busy}
              onClick={() =>
                run(() => confirmAppointment(appointment.id), 'Randevu onaylandı.')
              }
            >
              Onayla
            </button>
          )}
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            disabled={busy || hasThread !== true}
            onClick={() => onMessage(appointment.phone, who)}
          >
            Mesaj gönder
          </button>
          {appointment.status !== 'cancelled' && (
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ color: 'var(--bad)' }}
              disabled={busy}
              onClick={() =>
                run(() => cancelAppointment(appointment.id), 'Randevu iptal edildi.')
              }
            >
              İptal et
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
git add src/components/randevu/AppointmentDetail.tsx
git commit -m "$(cat <<'EOF'
Add the appointment detail popup

Staff assignment lives here even though the mock does not show it: removing
the list below the grid would otherwise delete a working feature, and the
endpoint already exists.

"Mesaj gönder" is disabled without an existing conversation, with the reason
stated — the API refuses numbers the clinic never talked to.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Sayfayı yeniden düzenle

**Files:**
- Modify: `src/pages/RandevuTakvimi.tsx`
- Delete: `src/components/randevu/AppointmentList.tsx`

- [ ] **Step 1: Üst bar kontrollerini taşı**

`useSetTopBarActions` ile Gün/Hafta segmented + `‹ Bugün ›` + "＋ Yeni randevu" üst bara taşınır; sayfadaki gezinme kartı kalkar.

Segmented stil (tasarım): `--cream` ray, aktif buton beyaz + hafif gölge.

```tsx
  useSetTopBarActions(
    <>
      <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: 9, padding: 3 }}>
        {([['gun', 'Gün'], ['hafta', 'Hafta']] as [View, string][]).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setView(k)}
            className="wl-btn wl-btn-sm"
            style={{
              height: 28, borderRadius: 7, fontSize: 12,
              background: view === k ? 'var(--paper)' : 'transparent',
              color: view === k ? 'var(--ink)' : 'var(--ink-60)',
              boxShadow: view === k ? '0 1px 2px rgba(23,35,61,0.12)' : 'none',
            }}
          >
            {lbl}
          </button>
        ))}
      </div>
      <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 9 }} onClick={() => step(-1)}>‹</button>
      <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 9, fontSize: 12 }} onClick={() => setAnchor(new Date())}>Bugün</button>
      <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 9 }} onClick={() => step(1)}>›</button>
      <span style={{ fontSize: 12.5, fontWeight: 600, marginLeft: 4 }}>
        {view === 'gun' ? fullDate(anchor) : `${dayLabel(range.start)} – ${dayLabel(range.end)}`}
      </span>
      <button
        type="button"
        className="wl-btn wl-btn-sm"
        style={{ height: 34, borderRadius: 9, fontSize: 12.5, fontWeight: 600, marginLeft: 4 }}
        disabled={slots.length === 0}
        onClick={() => setCreating({ date: isoDate(anchor), time: slots[0] ?? '', staffId: null })}
      >
        {Icon.plus}Yeni randevu
      </button>
    </>,
    [view, anchor, slots.length, range.start, range.end],
  );
```

`Icon` importu gerekiyorsa ekle.

- [ ] **Step 2: Sütun sırasını tasarıma çevir**

Tasarımda uzmanlar önce, "Atanmamış" sonra. `columns` hesabını değiştir:

```tsx
      return [
        ...staff.map((s) => ({ key: String(s.id), title: s.name, sub: s.role })),
        { key: UNASSIGNED, title: 'Atanmamış', sub: '—' },
      ];
```

Hafta görünümünde sütun altına randevu sayısı:

```tsx
      .map((d) => {
        const key = isoDate(d);
        const n = (items ?? []).filter((a) => a.appt_date === key && a.status !== 'cancelled').length;
        return { key, title: dayLabel(d), sub: `${n} randevu` };
      });
```

`columns` bağımlılıklarına `items` eklenmeli.

- [ ] **Step 3: Renkleri yeni kaynağa bağla**

`colorOf` artık paletteki **sırayı** döndürür, atanmamışta `null`:

```tsx
  const colorOf = useCallback(
    (staffId: number | null): number | null => {
      if (staffId === null) return null;
      const idx = staff.findIndex((s) => s.id === staffId);
      return idx < 0 ? null : idx;
    },
    [staff],
  );
```

Lejant:

```tsx
  const legend = useMemo(
    () => [
      ...staff.map((s, i) => ({ label: s.name, color: staffColor(i) })),
      { label: 'Atanmamış', color: UNASSIGNED_COLOR },
    ],
    [staff],
  );
```

`<SlotGrid … legend={view === 'gun' ? legend : []} />` — hafta görünümünde sütun zaten gün, uzman lejantı orada da anlamlı olduğu için **her iki görünümde de** verilebilir; `legend={legend}` yeterli.

- [ ] **Step 4: Detay kartını popup'la değiştir**

Sayfadaki `{selected && ( … )}` inline kartını sil, yerine:

```tsx
      {selected && (
        <AppointmentDetail
          appointment={selected}
          staff={staff}
          onClose={() => setSelectedId(null)}
          onChanged={(updated, message) => {
            setItems((cur) => (cur ? cur.map((a) => (a.id === updated.id ? updated : a)) : cur));
            toast(message);
          }}
          onMessage={(phone, name) => {
            setSelectedId(null);
            navigate(`/mesajlar?phone=${encodeURIComponent(phone)}`);
            toast(`${name} ile konuşma açıldı.`);
          }}
        />
      )}
```

`useToast()` ve `useNavigate()` import edilir.

**Not:** `/mesajlar` sayfası şu an `?phone=` parametresini okumuyor. Bu iş kapsamında **okumasını sağlamıyoruz** — Mesajlar ekranı sıradaki iş ve orada ele alınacak. Şimdilik bağlantı sayfayı açar, konuşmayı operatör seçer. Bu, PR'da yazılır.

- [ ] **Step 5: `AppointmentList`'i kaldır**

```bash
cd ~/Desktop/kisisel/w-lush-web
grep -rn "AppointmentList" src/ | grep -v "components/randevu/AppointmentList.tsx"
```

Yalnızca `RandevuTakvimi.tsx` kullanıyorsa oradan importu ve `<AppointmentList />` satırını sil, sonra:

```bash
git rm src/components/randevu/AppointmentList.tsx
```

Başka kullanan varsa **durma noktası**: silmeden önce bildir.

- [ ] **Step 6: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck 2>&1 | tail -6 && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add -A
git commit -m "$(cat <<'EOF'
Move the calendar controls into the top bar and drop the list below the grid

The list is gone because the design replaces it with a detail popup; its one
irreplaceable feature, staff assignment, moved into that popup rather than
being lost.

Staff columns come before "Atanmamış" now, and week columns carry their
appointment count, both per the design.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Doğrulama ve PR

- [ ] **Step 1: Veri düzeyinde kontrol**

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
from datetime import date
B = "http://localhost:5173"
def call(path, body=None, method="GET", token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())
tok = call("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"}, "POST")["token"]["access_token"]
staff = [s for s in call("/api/staff", token=tok) if s["active"]]
today = date.today().isoformat()
appts = call(f"/api/appointments?start={today}&end={today}", token=tok)
print("gün görünümü sütunları (tasarım sırası):",
      [s["name"] for s in staff] + ["Atanmamış"])
print("lejant:", [f"{s['name']}=palet[{i}]" for i, s in enumerate(staff)] + ["Atanmamış=nötr"])
for a in appts:
    idx = next((i for i, s in enumerate(staff) if s["id"] == a["staff_id"]), None)
    print(f"  {a['appt_time']} {a['customer_name']:<16} → sütun {a['staff_id'] or 'Atanmamış'}, renk {idx if idx is not None else 'nötr'}")
PY
```

- [ ] **Step 2: Tarayıcı turu**

Eklenti bağlıysa: uzman renkleri, lejant, boş hücre hover, detay popup'ı (onayla/iptal/ata/mesaj), toast. Bağlı değilse **atla ve PR'da yaz.**

- [ ] **Step 3: PR aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git push -u origin feature/tasarim-takvim
gh pr create --base main --head feature/tasarim-takvim \
  --title "Yeni tasarım: Randevu Takvimi" \
  --body "$(cat <<'EOF'
Takvim yeni tasarıma geçti. Backend değişikliği yok.

## Değişenler
- **Uzman renkleri** — her uzmana zemin/bar/metin üçlüsü, atanmamış nötr gri.
  Palet tek dosyada: aynı renk ızgarada, lejantta ve popup'ta kullanılıyor.
- **Lejant** ızgaranın altında.
- **Sütun sırası** tasarıma uydu: uzmanlar önce, "Atanmamış" sonra. Hafta
  görünümünde sütun başlığı altında randevu sayısı.
- **Detay popup'ı** — sayfanın altındaki liste yerine. Onayla / Mesaj gönder /
  İptal et + personel ataması.
- **Kontroller üst barda** — Gün/Hafta, ‹ Bugün ›, "Yeni randevu".
- **Toast** paylaşılan kabuk bileşeni oldu; tasarım her ekranda kullanıyor.

## Tasarımdan sapmalar (bilinçli)
1. **Popup'ta personel ataması var.** Maket bunu göstermiyor ama listeyi
   kaldırınca atama yapacak başka yer kalmıyordu; uç zaten mevcut. Çalışan bir
   özelliği maketle eşleşmek için atmadım.
2. **"Mesaj gönder" konuşması olmayan danışanda pasif** ve nedeni yazıyor.
   API yabancı numaraya yazmayı reddediyor (selamet/w-lush#19).
3. **`/mesajlar?phone=` parametresi henüz okunmuyor** — Mesajlar ekranı
   sıradaki iş, orada bağlanacak. Şimdilik düğme sayfayı açıyor.

## Doğrulama
- `typecheck`, `test`, `build` — 0.
- Sütun sırası ve renk eşlemesi API verisiyle karşılaştırıldı.
- **Tarayıcıda açılmadı** — Chrome eklentisi bağlı değil.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
