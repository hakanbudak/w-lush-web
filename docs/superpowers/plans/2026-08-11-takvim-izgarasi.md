# Randevu Takvimi Izgarası Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/randevu` ekranındaki takvim ızgarası gerçek randevuları göstersin; sahte veri kalmasın.

**Architecture:** Backend'e yalnız tarih aralığı süzgeci eklenir (şema değişmez). Frontend'de ızgara saf bir sunum bileşenine (`SlotGrid`) çıkarılır; sayfa kabuğu veriyi çeker, randevuları hücrelere eşler ve iki görünüm arasında yalnız **eksen eşlemesini** değiştirir. Mevcut gerçek randevu listesi kendi dosyasına taşınır (`Sistem` işindeki desen).

**Tech Stack:** Backend FastAPI + SQLAlchemy 2.0 (şema değişikliği YOK). Frontend React 18 + TypeScript + Vite. Yeni bağımlılık YOK.

**Spec:** `docs/superpowers/specs/2026-08-11-takvim-izgarasi-design.md`

## Global Constraints

| Repo | Yol | Branch |
|---|---|---|
| Backend | `~/Desktop/kisisel/w-lush` | `feature/appointment-range` (main üstünde) |
| Frontend | `~/Desktop/kisisel/w-lush-web` | `feature/takvim-izgarasi` (branch `docs/takvim-spec` üstünde) |

- **Şema değişmez, migration yok.** `alembic revision --autogenerate` boş üretmeli — bu bir doğrulama kapısı.
- **Bot durum makinesine dokunulmaz.**
- **Randevu oluşturma bu işte YOK.** Boş ve iptal olmuş slotlar yalnız görünür; tıklanabilir "randevu ekle" akışı sunmaz (kendi spec'ini alacak).
- Kod/tip/fonksiyon adları İngilizce; kullanıcıya görünen metinler Türkçe.
- Frontend HTTP çağrıları yalnız `src/api/*.ts` içinden.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK**.
- Kapılar: backend `ruff check app` + import + boş autogenerate; frontend `npm run typecheck` ve `npm run build` exit 0.
- Hiçbir task push/merge/PR yapmaz — hepsi Task 6'da.

## Test durumu

Test koşucusu yok. **Bu görsel ağırlıklı bir iş ve tarayıcı doğrulaması yapılamıyor** (Chrome eklentisi bağlı değil). Telafi: ızgaranın hücre eşlemesi veri düzeyinde, elle hesaplanana karşı doğrulanır (Task 5). Bu, "doğru görünüyor" demek değildir; "doğru hücreye düşüyor" demektir. Fark PR'da yazılır.

**Ön koşul:** iki sunucu ayakta.

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python -m uvicorn app.main:app --port 8000
cd ~/Desktop/kisisel/w-lush-web && npm run dev
```

Backend kodu değişince yeniden başlat:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN -t | xargs -r kill; sleep 1
cd ~/Desktop/kisisel/w-lush && (.venv/bin/python -m uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &); sleep 3
```

Test hesabı: `smoke2@example.com` / `Test12345!` (clinic_id=1).

**Test verisi** — ızgarayı doldurmak için farklı slot/personel/durum kombinasyonları gerekir:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main
from datetime import date, timedelta
from app.core.database import SessionLocal
from app.clinic.models import Appointment
from app.staff.models import Staff

today = date.today()
with SessionLocal() as db:
    names = {s.name: s.id for s in db.query(Staff).filter(Staff.clinic_id == 1).all()}
    ebru = names.get("Ebru B.")
    rows = [
        # (gün ofseti, slot, danışan, hizmet, durum, personel)
        (0, "10:00", "Ayşe Yılmaz", "Hydrafacial", "confirmed", ebru),
        (0, "11:00", "Berfin Çağlar", "Lazer Epilasyon", "pending", None),
        (0, "13:00", "Naz Yıldırım", "Mezoterapi", "cancelled", ebru),
        (1, "10:00", "Ezgi Uçar", "Cilt Analizi", "confirmed", ebru),
        (2, "15:00", "Cem Yıldız", "Konsültasyon", "pending", None),
    ]
    for off, t, who, svc, st, sid in rows:
        db.add(Appointment(
            clinic_id=1, phone="9053200000" + str(off) + t[:2],
            customer_name=who, service_name=svc,
            appt_date=today + timedelta(days=off), appt_time=t,
            status=st, staff_id=sid,
        ))
    db.commit()
    print("takvim test verisi hazır")
PY
```

Aynı `(klinik, tarih, saat)` için iptal olmayan ikinci bir randevu eklenirse benzersizlik indeksi `IntegrityError` verir — script iki kez çalıştırılırsa normaldir.

---

### Task 1: Backend — randevu listesine tarih aralığı

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/appointment-range`

**Files:**
- Modify: `app/clinic/router.py` (`list_appointments`)

**Interfaces:**
- Produces: `GET /api/appointments?start=YYYY-MM-DD&end=YYYY-MM-DD` → `list[AppointmentOut]`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush && git checkout main && git pull && git checkout -b feature/appointment-range
```

- [ ] **Step 2: `list_appointments`'a aralık parametrelerini ekle**

`app/clinic/router.py` içindeki mevcut `list_appointments` fonksiyonunu şununla değiştir:

```python
@router.get("/appointments", response_model=list[AppointmentOut])
def list_appointments(
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Panel list, or a calendar window when a range is given.

    Without a range the old behaviour is kept — newest first — so the
    appointment list below the calendar is unaffected. With a range the order
    flips to chronological, which is what a grid reads.
    """
    stmt = select(Appointment).where(Appointment.clinic_id == current.clinic_id)
    if start is not None:
        stmt = stmt.where(Appointment.appt_date >= start)
    if end is not None:
        stmt = stmt.where(Appointment.appt_date <= end)

    if start is None and end is None:
        stmt = stmt.order_by(Appointment.created_at.desc())
    else:
        stmt = stmt.order_by(Appointment.appt_date, Appointment.appt_time)
    return list(db.scalars(stmt).all())
```

Dosyanın import bloğuna ekle (yoksa):

```python
from datetime import date
```

- [ ] **Step 3: Kapılar**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"
.venv/bin/alembic revision --autogenerate -m "should be empty" > /dev/null 2>&1
F=$(ls -t alembic/versions/*.py | head -1)
case "$F" in
  *should_be_empty*) grep -c "op\." "$F"; rm "$F";;
  *) echo "UYARI: autogenerate dosya üretmedi — silme atlandı";;
esac
```

Expected: `All checks passed!`, `import ok`, `0`.

- [ ] **Step 4: Aralığı canlı doğrula**

Sunucuyu yeniden başlat, test verisini üret, sonra Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import json, urllib.request
from datetime import date, timedelta
B = "http://localhost:8000"

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:300] if hasattr(e, "read") else str(e))

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
today = date.today()

allr = json.loads(req("/api/appointments", token=tok)[1])
oneday = json.loads(req(f"/api/appointments?start={today}&end={today}", token=tok)[1])
week = json.loads(req(f"/api/appointments?start={today}&end={today + timedelta(days=6)}", token=tok)[1])

print("parametresiz:", len(allr), "| bugün:", len(oneday), "| 7 gün:", len(week))
assert len(oneday) <= len(week) <= len(allr), (len(oneday), len(week), len(allr))
assert all(r["appt_date"] == today.isoformat() for r in oneday), "aralık dışı kayıt sızdı"

# Aralıklı çağrı kronolojik sırada olmalı
keys = [(r["appt_date"], r["appt_time"]) for r in week]
assert keys == sorted(keys), keys

# İptal edilmiş randevu da dönmeli (ızgarada gösterilecek)
print("iptal edilmiş dönen kayıt:", sum(1 for r in week if r["status"] == "cancelled"))
print("yetkisiz:", req("/api/appointments?start=2026-01-01&end=2026-12-31")[0])
print("ARALIK OK")
PY
```

Expected: üç sayı basılır, aralık dışı kayıt sızmaz, kronolojik sıra doğrulanır, iptal edilmiş kayıt sayısı ≥ 1, yetkisiz `401`, son satır `ARALIK OK`.

- [ ] **Step 5: Commit**

```bash
git add app/clinic/router.py
git commit -m "Let the appointment list take a date range

The calendar reads a day or a week; without a range the endpoint keeps its
old newest-first behaviour so the list under the calendar is untouched."
```

---

### Task 2: Frontend — API çağrısı ve mevcut listenin taşınması

Bu task ızgaraya hazırlık: gerçek liste kendi dosyasına çıkar, sayfa kabuğu sadeleşir. Davranış değişmez.

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/takvim-izgarasi`

**Files:**
- Modify: `src/api/clinic.ts` (`listAppointments` aralık alır)
- Create: `src/components/randevu/AppointmentList.tsx` (mevcut `WhatsAppRandevulari` birebir taşınır)
- Modify: `src/pages/RandevuTakvimi.tsx`

**Interfaces:**
- Produces: `listAppointments(start?: string, end?: string): Promise<Appointment[]>`; `export default function AppointmentList(): JSX.Element`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush-web && git checkout docs/takvim-spec && git checkout -b feature/takvim-izgarasi
mkdir -p src/components/randevu
```

- [ ] **Step 2: `listAppointments`'a aralık ekle**

`src/api/clinic.ts` içindeki satırı şununla değiştir:

```ts
// Aralık verilmezse backend eski davranışını korur (tüm randevular, yeniden eskiye).
export const listAppointments = (start?: string, end?: string) => {
  const p = new URLSearchParams();
  if (start) p.set('start', start);
  if (end) p.set('end', end);
  const q = p.toString();
  return request<Appointment[]>(`/api/appointments${q ? `?${q}` : ''}`);
};
```

- [ ] **Step 3: Gerçek listeyi kendi dosyasına taşı**

`src/pages/RandevuTakvimi.tsx`'teki `WhatsAppRandevulari` fonksiyonunu (satır ~119'dan başlayan) ve yalnız onun kullandığı üç yardımcıyı (`fmtDate`, `maskPhone`, `statusInfo`) **birebir** `src/components/randevu/AppointmentList.tsx`'e taşı. Fonksiyon adını `AppointmentList` yap ve `export default` et. Dosyanın başına:

```tsx
import { useEffect, useState } from 'react';
import {
  assignAppointmentStaff,
  cancelAppointment,
  confirmAppointment,
  listAppointments,
  type Appointment,
} from '../../api/clinic';
import { listStaff, type StaffMember } from '../../api/staff';
import { Icon } from '../icons';
import { Chip } from '../ui';
```

Gövdeyi **değiştirme** — JSX, stil, metin aynen kalsın.

- [ ] **Step 4: Kabuktan sil ve import et**

`src/pages/RandevuTakvimi.tsx`'ten `WhatsAppRandevulari`, `fmtDate`, `maskPhone`, `statusInfo` tanımlarını sil. Kullanım yerini (`<WhatsAppRandevulari />`) `<AppointmentList />` yap ve import ekle:

```tsx
import AppointmentList from '../components/randevu/AppointmentList';
```

Artık kullanılmayan import'ları `tsc` adlandıracak; onları temizle.

- [ ] **Step 5: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add src/api/clinic.ts src/components/randevu/AppointmentList.tsx src/pages/RandevuTakvimi.tsx
git commit -m "Move the appointment list into its own component

Nothing about it changes; the page shell is being cleared so the real grid
can take the space the mock one occupies."
```

---

### Task 3: Frontend — `SlotGrid` sunum bileşeni

Izgara saf bir bileşendir: veri çekmez, tarih bilmez, randevu kavramı taşımaz. Yalnız satır (slot) × sütun eşlemesini çizer. İki görünümün tek bileşeni paylaşabilmesinin sebebi budur.

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/takvim-izgarasi`

**Files:**
- Create: `src/components/randevu/SlotGrid.tsx`

**Interfaces:**
- Produces:
  - `interface SlotColumn { key: string; title: string; sub?: string }`
  - `interface SlotItem { id: number; slot: string; columnKey: string; title: string; subtitle: string; status: string; colorIndex: number }`
  - `export default function SlotGrid({ slots, columns, items, selectedId, onSelect }): JSX.Element`

- [ ] **Step 1: `src/components/randevu/SlotGrid.tsx` dosyasını oluştur**

```tsx
/**
 * Slot ızgarası: satırlar kliniğin slot saatleri, sütunlar çağıranın verdiği
 * eksen (gün görünümünde personel, hafta görünümünde gün).
 *
 * Bileşen veri çekmez ve randevu kavramı bilmez — bu yüzden iki görünüm de
 * aynı bileşeni kullanabiliyor.
 */

const COLORS = [
  { bg: 'var(--forest-3)', bar: 'var(--forest)', text: 'var(--forest-2)' },
  { bg: 'var(--champagne-3)', bar: 'var(--champagne)', text: 'var(--champagne-2)' },
  { bg: 'var(--lavender-soft)', bar: 'var(--lavender)', text: 'var(--lavender-2)' },
  { bg: 'var(--sage-soft)', bar: 'var(--sage)', text: 'var(--sage-2)' },
  { bg: 'var(--cream-2)', bar: 'var(--ink-40)', text: 'var(--ink-60)' },
];

/** Bir hücrede en fazla bu kadar blok çizilir; kalanı "+N" olur. */
const MAX_PER_CELL = 2;

export interface SlotColumn {
  key: string;
  title: string;
  sub?: string;
}

export interface SlotItem {
  id: number;
  slot: string; // "HH:MM" — hangi satır
  columnKey: string; // hangi sütun
  title: string; // danışan
  subtitle: string; // hizmet
  status: string; // pending | confirmed | cancelled
  colorIndex: number;
}

export default function SlotGrid({
  slots,
  columns,
  items,
  selectedId,
  onSelect,
}: {
  slots: string[];
  columns: SlotColumn[];
  items: SlotItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const cell = (slot: string, columnKey: string) =>
    items.filter((i) => i.slot === slot && i.columnKey === columnKey);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        className="wl-table"
        style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}
      >
        <thead>
          <tr>
            <th style={{ width: 64 }}></th>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{c.title}</div>
                {c.sub && (
                  <div style={{ fontSize: 10, color: 'var(--ink-40)', fontWeight: 400 }}>
                    {c.sub}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((slot) => (
            <tr key={slot}>
              <td
                className="wl-mono"
                style={{ fontSize: 11, color: 'var(--ink-40)', verticalAlign: 'top' }}
              >
                {slot}
              </td>
              {columns.map((c) => {
                const here = cell(slot, c.key);
                return (
                  <td key={c.key} style={{ verticalAlign: 'top', padding: 4 }}>
                    {here.slice(0, MAX_PER_CELL).map((item) => {
                      const color = COLORS[item.colorIndex % COLORS.length];
                      const cancelled = item.status === 'cancelled';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelect(item.id)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            font: 'inherit',
                            cursor: 'pointer',
                            marginBottom: 4,
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: cancelled ? 'var(--cream)' : color.bg,
                            borderLeft: `3px solid ${cancelled ? 'var(--bad)' : color.bar}`,
                            border: item.status === 'pending' ? '1px dashed var(--line-strong)' : 'none',
                            borderLeftWidth: 3,
                            borderLeftStyle: 'solid',
                            borderLeftColor: cancelled ? 'var(--bad)' : color.bar,
                            outline: selectedId === item.id ? '2px solid var(--forest)' : 'none',
                            opacity: cancelled ? 0.55 : 1,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: cancelled ? 'var(--bad)' : 'var(--ink)',
                              textDecoration: cancelled ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.title}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: cancelled ? 'var(--bad)' : color.text,
                              textDecoration: cancelled ? 'line-through' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.subtitle}
                          </div>
                        </button>
                      );
                    })}
                    {here.length > MAX_PER_CELL && (
                      <div style={{ fontSize: 10, color: 'var(--ink-40)', paddingLeft: 8 }}>
                        +{here.length - MAX_PER_CELL} randevu
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`. (Bileşen henüz kullanılmıyor; `tsc` bunu sorun etmez çünkü dışa aktarılıyor.)

- [ ] **Step 3: Commit**

```bash
git add src/components/randevu/SlotGrid.tsx
git commit -m "Add the slot grid component

It knows nothing about appointments or dates: rows are slot labels, columns
are whatever axis the caller hands it. That is why one component serves both
the day and the week view."
```

---

### Task 4: Frontend — tarih yardımcıları

**Files:**
- Create: `src/utils/calendar.ts`

**Interfaces:**
- Produces: `isoDate(d: Date): string`, `startOfWeek(d: Date): Date`, `addDays(d: Date, n: number): Date`, `dayLabel(d: Date): string`, `fullDate(d: Date): string`

- [ ] **Step 1: `src/utils/calendar.ts` dosyasını oluştur**

```ts
// Takvim ızgarasının tarih hesapları. Finans dönemlerinden (utils/period.ts)
// ayrı: orada dönem aralıkları, burada gün/hafta gezinmesi var.

export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number): Date => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

/** Haftanın ilk günü = Pazartesi (kliniğin open_days'i ISO: 1 = Pazartesi). */
export const startOfWeek = (d: Date): Date => {
  const out = new Date(d);
  const iso = out.getDay() === 0 ? 7 : out.getDay(); // JS: 0=Paz → ISO 7
  return addDays(out, 1 - iso);
};

/** JS getDay() → ISO gün numarası (1 = Pazartesi … 7 = Pazar). */
export const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

/** "12 Ağu Sal" — hafta görünümünün sütun başlığı. */
export const dayLabel = (d: Date): string =>
  d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' });

/** "12 Ağustos 2026 Salı" — gün görünümünün başlığı. */
export const fullDate = (d: Date): string =>
  d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
```

- [ ] **Step 2: Hafta hesabını doğrula**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && node --input-type=module -e "
const isoDay = (d) => (d.getDay() === 0 ? 7 : d.getDay());
const addDays = (d, n) => { const o = new Date(d); o.setDate(o.getDate() + n); return o; };
const startOfWeek = (d) => addDays(new Date(d), 1 - isoDay(new Date(d)));
for (const s of ['2026-08-11','2026-08-09','2026-08-10','2026-08-16']) {
  const d = new Date(s + 'T12:00:00');
  const w = startOfWeek(d);
  console.log(s, '(ISO gün', isoDay(d) + ') → hafta başı', w.toISOString().slice(0,10), 'ISO gün', isoDay(w));
}
"
```

Expected: her satırda hafta başının ISO günü `1` (Pazartesi). Pazar (`2026-08-09`) bir **önceki** Pazartesiye düşmeli — bu, ISO haftasının tanımıdır ve kolay yapılan hatadır.

- [ ] **Step 3: Commit**

```bash
git add src/utils/calendar.ts
git commit -m "Add calendar date helpers

Kept apart from utils/period.ts: that file answers 'which range is this
month', this one answers 'which day am I looking at'."
```

---

### Task 5: Frontend — sayfayı gerçek ızgaraya bağla

Sahte verinin tamamı bu task'ta gidiyor.

**Files:**
- Modify: `src/pages/RandevuTakvimi.tsx` (tam yeniden yazım)

**Interfaces:**
- Consumes: `SlotGrid`, `SlotColumn`, `SlotItem` (Task 3); `isoDate`, `startOfWeek`, `addDays`, `isoDay`, `dayLabel`, `fullDate` (Task 4); `listAppointments` (Task 2); `listStaff`; `getSettings`; `AppointmentList` (Task 2)

- [ ] **Step 1: `src/pages/RandevuTakvimi.tsx` dosyasının tamamını şununla değiştir**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  cancelAppointment,
  confirmAppointment,
  getSettings,
  listAppointments,
  type Appointment,
} from '../api/clinic';
import { listStaff, type StaffMember } from '../api/staff';
import AppointmentList from '../components/randevu/AppointmentList';
import SlotGrid, { type SlotColumn, type SlotItem } from '../components/randevu/SlotGrid';
import { Chip } from '../components/ui';
import { addDays, dayLabel, fullDate, isoDate, isoDay, startOfWeek } from '../utils/calendar';

type View = 'gun' | 'hafta';

const UNASSIGNED = 'none';

const STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  confirmed: { label: 'Onaylı', tone: 'good' },
  pending: { label: 'Bekliyor', tone: 'warn' },
  cancelled: { label: 'İptal', tone: 'bad' },
};

const maskPhone = (p: string): string => (p.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-2)}` : p);

const card: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: 20,
};

export default function RandevuTakvimi() {
  const [view, setView] = useState<View>('gun');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [openDays, setOpenDays] = useState<number[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Görünen aralık: gün görünümünde tek gün, hafta görünümünde Pzt–Paz.
  const range = useMemo(() => {
    if (view === 'gun') return { start: anchor, end: anchor };
    const first = startOfWeek(anchor);
    return { start: first, end: addDays(first, 6) };
  }, [view, anchor]);

  const load = useCallback(() => {
    setError(null);
    listAppointments(isoDate(range.start), isoDate(range.end))
      .then(setItems)
      .catch(() => setError('Randevular yüklenemedi.'));
  }, [range]);

  useEffect(load, [load]);

  useEffect(() => {
    listStaff()
      .then((rows) => setStaff(rows.filter((s) => s.active)))
      .catch(() => setStaff([]));
    getSettings()
      .then((s) => {
        setSlots(s.slot_times ?? []);
        setOpenDays(s.open_days ?? []);
      })
      .catch(() => {
        setSlots([]);
        setOpenDays([]);
      });
  }, []);

  // Gün görünümü: sütun = personel (+ Atanmamış). Hafta: sütun = açık günler.
  const columns: SlotColumn[] = useMemo(() => {
    if (view === 'gun') {
      return [
        { key: UNASSIGNED, title: 'Atanmamış' },
        ...staff.map((s) => ({ key: String(s.id), title: s.name, sub: s.role })),
      ];
    }
    const first = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(first, i))
      .filter((d) => openDays.includes(isoDay(d)))
      .map((d) => ({ key: isoDate(d), title: dayLabel(d) }));
  }, [view, staff, anchor, openDays]);

  // Renk personelden gelir; atanmamış son rengi alır.
  const colorOf = useCallback(
    (staffId: number | null) => {
      if (staffId === null) return 4;
      const idx = staff.findIndex((s) => s.id === staffId);
      return idx < 0 ? 4 : idx;
    },
    [staff],
  );

  const gridItems: SlotItem[] = useMemo(
    () =>
      (items ?? []).map((a) => ({
        id: a.id,
        slot: a.appt_time,
        columnKey: view === 'gun' ? String(a.staff_id ?? UNASSIGNED) : a.appt_date,
        title: a.customer_name || maskPhone(a.phone),
        subtitle: a.service_name,
        status: a.status,
        colorIndex: colorOf(a.staff_id),
      })),
    [items, view, colorOf],
  );

  const selected = (items ?? []).find((a) => a.id === selectedId) ?? null;

  const step = (dir: -1 | 1) => setAnchor((d) => addDays(d, view === 'gun' ? dir : dir * 7));

  const act = async (id: number, kind: 'confirm' | 'cancel') => {
    setError(null);
    try {
      const updated = await (kind === 'confirm' ? confirmAppointment(id) : cancelAppointment(id));
      setItems((cur) => (cur ? cur.map((a) => (a.id === id ? updated : a)) : cur));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* gezinme */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: 'var(--cream)', borderRadius: 8, padding: 3 }}>
          {([['gun', 'Gün'], ['hafta', 'Hafta']] as [View, string][]).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className="wl-btn wl-btn-sm"
              style={{
                height: 28, borderRadius: 6, fontSize: 12,
                background: view === k ? 'var(--paper)' : 'transparent',
                color: view === k ? 'var(--ink)' : 'var(--ink-60)',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={() => step(-1)}>
            ‹
          </button>
          <button
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8, fontSize: 12 }}
            onClick={() => setAnchor(new Date())}
          >
            Bugün
          </button>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={() => step(1)}>
            ›
          </button>
        </div>

        <div style={{ fontSize: 13, fontWeight: 600, marginLeft: 8 }}>
          {view === 'gun'
            ? fullDate(anchor)
            : `${dayLabel(range.start)} – ${dayLabel(range.end)}`}
        </div>
      </div>

      {/* ızgara */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 600 }}>
          Takvim
        </div>

        {error && (
          <div style={{ padding: 20, fontSize: 13, color: 'var(--ink-60)' }}>
            {error}{' '}
            <button
              type="button"
              onClick={load}
              style={{
                border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                fontSize: 13, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Tekrar dene
            </button>
          </div>
        )}

        {!error && slots.length === 0 && (
          <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
            Çalışma saatleri tanımlanmamış — Sistem &gt; Klinik bilgisi bölümünden ayarlayabilirsiniz.
          </div>
        )}

        {!error && slots.length > 0 && items === null && (
          <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
        )}

        {!error && slots.length > 0 && items !== null && (
          <>
            {view === 'gun' && staff.length === 0 && (
              <div style={{ padding: '12px 20px', fontSize: 11, color: 'var(--ink-40)' }}>
                Personel tanımlanmamış — Sistem &gt; Personel bölümünden ekleyebilirsiniz.
              </div>
            )}
            <div style={{ padding: 12 }}>
              <SlotGrid
                slots={slots}
                columns={columns}
                items={gridItems}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </>
        )}
      </div>

      {/* detay */}
      {selected && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {selected.customer_name || maskPhone(selected.phone)}
            </div>
            <Chip tone={STATUS[selected.status]?.tone ?? 'warn'} small>
              {STATUS[selected.status]?.label ?? selected.status}
            </Chip>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {selected.status === 'pending' && (
                <>
                  <button
                    className="wl-btn wl-btn-sm"
                    style={{ borderRadius: 8, fontSize: 12 }}
                    onClick={() => act(selected.id, 'confirm')}
                  >
                    Onayla
                  </button>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8, fontSize: 12, color: 'var(--bad)' }}
                    onClick={() => act(selected.id, 'cancel')}
                  >
                    İptal et
                  </button>
                </>
              )}
              <button
                className="wl-btn wl-btn-ghost wl-btn-sm"
                style={{ borderRadius: 8, fontSize: 12 }}
                onClick={() => setSelectedId(null)}
              >
                Kapat
              </button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-60)', marginTop: 8, lineHeight: 1.6 }}>
            {selected.appt_date} · {selected.appt_time} · {selected.service_name}
            <br />
            Personel: {selected.staff_name || 'Atanmamış'}
          </div>
        </div>
      )}

      {/* gerçek randevu listesi (onay/iptal/atama burada) */}
      <AppointmentList />
    </div>
  );
}
```

- [ ] **Step 2: Sahte verinin kalmadığını kanıtla**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && grep -cE "APPTS|AI_SLOT|PX_PER_MIN|const STAFF|const CAT" src/pages/RandevuTakvimi.tsx
```

Expected: `0`.

- [ ] **Step 3: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/RandevuTakvimi.tsx
git commit -m "Drive the appointment calendar from real data

The grid rows are the clinic's own slot times rather than a hardcoded
09:00-20:00 range, which is what the booking flow actually writes into. The
invented category colours, channel badges, prices, risk scores and the AI
slot suggestion are gone — none of them had data behind them."
```

---

### Task 6: Doğrulama, kapanış ve iki PR

- [ ] **Step 1: Hücre eşlemesini veri düzeyinde doğrula**

Bu, tarayıcı olmadan yapılabilecek en güçlü kontrol: ızgaranın hangi randevuyu hangi hücreye koyacağı, elle hesaplananla karşılaştırılır.

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
from datetime import date, timedelta
B = "http://localhost:5173"

def req(path, token=None):
    r = urllib.request.Request(B + path)
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())

def post(path, body):
    r = urllib.request.Request(B + path, data=json.dumps(body).encode(), method="POST")
    r.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())

tok = post("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"})["token"]["access_token"]
settings = req("/api/settings", tok)
slots = settings["slot_times"]; open_days = settings["open_days"]
staff = [s for s in req("/api/staff", tok) if s["active"]]

today = date.today()
week_start = today - timedelta(days=(today.isoweekday() - 1))
rows = req(f"/api/appointments?start={week_start}&end={week_start + timedelta(days=6)}", tok)
print("hafta aralığı:", week_start, "→", week_start + timedelta(days=6), "| randevu:", len(rows))

# GÜN görünümü eşlemesi: sütun = staff_id ya da "none"
day_rows = [r for r in rows if r["appt_date"] == today.isoformat()]
cols = ["none"] + [str(s["id"]) for s in staff]
print("\nGÜN görünümü —", today)
for slot in slots:
    line = []
    for c in cols:
        here = [r for r in day_rows if r["appt_time"] == slot and str(r["staff_id"] or "none") == c]
        line.append(",".join((r["customer_name"] or r["phone"])[:8] + ("(iptal)" if r["status"]=="cancelled" else "") for r in here) or "·")
    print(f"  {slot} | " + " | ".join(line))
print("  sütunlar:", ["Atanmamış"] + [s["name"] for s in staff])

# Aralık dışına randevu düşmemeli
assert all(week_start.isoformat() <= r["appt_date"] <= (week_start + timedelta(days=6)).isoformat() for r in rows)
# Her randevunun slotu kliniğin slot listesinde olmalı — değilse ızgarada görünmez
orphan = [r for r in rows if r["appt_time"] not in slots]
print("\nslot listesinde olmayan randevu:", len(orphan), [r["appt_time"] for r in orphan])
# Hafta görünümü sütunları: yalnız açık günler
week_cols = [(week_start + timedelta(days=i)) for i in range(7) if (week_start + timedelta(days=i)).isoweekday() in open_days]
print("hafta sütunları:", [d.isoformat() for d in week_cols])
print("EŞLEME OK")
PY
```

Expected: gün görünümü tablosu basılır ve randevular beklenen slot/personel hücresinde görünür; iptal edilen `(iptal)` etiketiyle görünür; **slot listesinde olmayan randevu sayısı** raporlanır (0 değilse bu bir bulgudur, PR'da yazılır); hafta sütunları yalnız açık günleri içerir; son satır `EŞLEME OK`.

- [ ] **Step 2: Kapılar ve diff**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "frontend exit=$?" && git diff main --stat
cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && git diff main --stat
```

Expected — frontend: `src/api/clinic.ts`, `src/components/randevu/{AppointmentList,SlotGrid}.tsx`, `src/utils/calendar.ts`, `src/pages/RandevuTakvimi.tsx` + doküman. Backend: yalnız `app/clinic/router.py`.

- [ ] **Step 3: Tarayıcı turu (mümkünse)**

`http://localhost:5173/randevu`: gün/hafta geçişi, ‹ / Bugün / › gezinmesi, bloğa tıklayınca detay kartı, iptal edilmiş randevunun soluk/çizili/kırmızı görünmesi, "Atanmamış" sütununun varlığı.

Chrome eklentisi bağlı değilse **atla ve PR'da atlandığını yaz** — yapılmış gibi gösterme.

- [ ] **Step 4: Backend PR'ı aç**

```bash
cd ~/Desktop/kisisel/w-lush && git push -u origin feature/appointment-range
gh pr create --title "Let the appointment list take a date range" --body "$(cat <<'EOF'
`GET /api/appointments` isteğe bağlı `start` / `end` alır. Takvim bir gün ya da bir hafta okuyor.

- Aralık verilmezse **eski davranış korunur** (tüm randevular, yeniden eskiye) — takvimin altındaki mevcut liste etkilenmez.
- Aralık verilirse sıralama kronolojiğe döner (`appt_date, appt_time`), ızgaranın okuduğu sıra budur.
- **Şema değişmedi:** `alembic revision --autogenerate` boş üretiyor.

Spec: `w-lush-web/docs/superpowers/specs/2026-08-11-takvim-izgarasi-design.md`
EOF
)"
```

- [ ] **Step 5: Frontend PR'ı aç**

Backend merge edildikten sonra:

```bash
cd ~/Desktop/kisisel/w-lush-web && git push -u origin feature/takvim-izgarasi
gh pr create --title "Drive the appointment calendar from real data" --body "$(cat <<'EOF'
Takvim ızgarası artık gerçek randevuları gösteriyor. `/randevu` ekranında sahte veri kalmadı.

**Tasarımı belirleyen bulgu:** kliniğin `slot_times` ayarı saat başı ve bot randevuları yalnız o slotlara yazıyor. Yani takvim bir zaman tuvali değil, **satırları slot olan bir tablo** — ve `appointments`'ta bitiş saati olmaması sorun olmaktan çıkıyor. Sahte ekrandaki `PX_PER_MIN` piksel hesabı ve 09:00–20:00 aralığı veriye uymuyordu.

- Gün görünümü: satır = slot, sütun = **Atanmamış** + aktif personel. Hafta görünümü: sütun = kliniğin açık günleri. İki görünüm tek veri çekimini ve tek `SlotGrid` bileşenini paylaşıyor; yalnız eksen eşlemesi değişiyor.
- İptal edilmiş randevular ızgarada **kalıyor** — soluk, üstü çizili, kırmızı; boşalan slotu işaret ediyor.
- Blok rengi personelden türetiliyor (kategori yok, personel var) — veritabanına renk kolonu eklenmeden.
- Silinenler: `APPTS`, `STAFF`, `AI_SLOT` ("%92 uyum"), `CAT` kategori renkleri, kanal ve tutar alanları, "İptal riski %62" rozeti. Hiçbirinin arkasında veri yoktu.
- Mevcut gerçek randevu listesi kendi bileşenine taşındı (davranışı değişmedi).

**Kapsam dışı:** panelden randevu oluşturma — uç yok, çakışma indeksi var ve "müşteriye WhatsApp mesajı gitsin mi" kararı gerekiyor. Kendi spec'ini alacak; o gelene kadar boş ve iptal olmuş slotlar yalnız görünür.

**Backend önce merge edilmeli:** selamet/w-lush PR.

**Doğrulama.** `typecheck` + `build` exit 0. Hücre eşlemesi veri düzeyinde doğrulandı: hafta aralığındaki randevular beklenen slot/personel hücresine düşüyor, iptal edilenler dönüyor, hafta sütunları yalnız açık günleri içeriyor.

Spec: `docs/superpowers/specs/2026-08-11-takvim-izgarasi-design.md`
EOF
)"
```

---

## Self-Review

**Spec kapsamı:** Tarih aralığı ucu → Task 1. API çağrısı + listenin taşınması → Task 2. `SlotGrid` → Task 3. Tarih yardımcıları → Task 4. Sayfanın yeniden yazımı, sahte verinin silinmesi, iki görünüm, durum gösterimi, detay kartı, gezinme → Task 5. Doğrulama ve yayın → Task 6. Spec'in kapsam dışı listesi (randevu oluşturma, sürükle-bırak, personel çalışma saatleri, `modals.tsx`) hiçbir task'ta uygulanmıyor.

**Placeholder taraması:** Tüm adımlar gerçek kod veya çalıştırılabilir komut içeriyor. Task 2'deki taşıma işlemi bilerek kod bloğu içermiyor — `Sistem` bölme işindeki gibi **birebir taşınacak** kod; plana kopyalamak değiştirme riskini artırırdı.

**Tip tutarlılığı:** `SlotItem` alanları (`id`, `slot`, `columnKey`, `title`, `subtitle`, `status`, `colorIndex`) Task 5'teki `gridItems` eşlemesiyle birebir. `SlotColumn.key` ile `SlotItem.columnKey` aynı uzayda: gün görünümünde `String(staff_id)` veya `"none"`, hafta görünümünde `isoDate(gün)`. `Appointment.staff_id` / `staff_name` alanları personel işinden geliyor ve mevcut.

**Bilinen kırılganlık:** Bir randevunun `appt_time`'ı kliniğin `slot_times` listesinde yoksa ızgarada **hiç görünmez** — satırı yok. Bugün bot yalnız slot saatlerine yazdığı için bu olmamalı, ama ayarlar sonradan değiştirilirse eski randevular ızgaradan düşer. Task 6 Step 1 bunu sayıp raporluyor; sıfırdan farklıysa PR'da yazılmalı ve ayrı bir iş olarak ele alınmalı.
