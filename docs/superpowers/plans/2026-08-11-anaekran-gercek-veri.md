# Ana Ekranı Gerçek Veriye Bağlama — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `RichDashboard`'daki her rakamı gerçek veriden hesaplamak, hesaplanamayanları uydurmak yerine kaldırmak.

**Architecture:** Tüm hesaplar `utils/dashboard.ts` içinde saf fonksiyonlar olarak durur — tarayıcı olmadan doğrulanabilmelerinin tek yolu bu. 501 satırlık `AnaEkran.tsx`, Sistem ve Takvim ekranlarında yaptığımız gibi `components/anaekran/` altına bölünür. Backend'de tek alan açılır (`CustomerOut.first_seen`), yeni uç yoktur.

**Tech Stack:** React 18 + TypeScript, Vite; backend tarafında FastAPI + Pydantic (tek şema alanı).

## Global Constraints

- İki repo: backend `~/Desktop/kisisel/w-lush`, frontend `~/Desktop/kisisel/w-lush-web`. Backend PR'ı önce merge edilir.
- **Backend commit mesajlarında Claude atfı yasak** — `.githooks/commit-msg` reddeder. Frontend'de trailer kalır (`Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`).
- Repoda test koşucusu yok. Doğrulama: `ruff` / `typecheck` / `build` kapıları, saf fonksiyonlar için node parçacıkları, uçlar için çalışan API'ye istek.
- Hiçbir rakam uydurulmaz. Hesaplanamayan şey ya kaldırılır ya da "yeterli kayıt yok" der.
- Kullanıcıya görünen metinler Türkçe.
- `FirstTimeDashboard`'ın davranışı değişmez; yalnızca dosyası taşınır.
- Eğilim eşiği (spec'ten birebir): önceki dönemde **en az 3 ödeme ve en az ₺1.000**.
- Aktif randevu = `status !== 'cancelled'`.

## Dosya yapısı

**Backend (dal: `feature/customer-created-at`)**

| Dosya | Sorumluluk |
|---|---|
| `app/customers/schemas.py` | `CustomerOut`'a `first_seen` |
| `app/customers/service.py` | `first_seen` hesabı (ilk mesaj / ilk randevu) |

**Frontend (dal: `feature/anaekran-gercek-veri`)**

| Dosya | Sorumluluk |
|---|---|
| `src/utils/dashboard.ts` (yeni) | Saf hesaplar: doluluk, eğilim, günlük gruplama |
| `src/components/anaekran/FirstTimeDashboard.tsx` (yeni) | Bugünkü kod, birebir taşınır |
| `src/components/anaekran/KpiRow.tsx` (yeni) | Dört kart |
| `src/components/anaekran/TrendStrip.tsx` (yeni) | Eğilim şeridi |
| `src/components/anaekran/TodayAppointments.tsx` (yeni) | Bugünün randevuları |
| `src/components/anaekran/InboxPanel.tsx` (yeni) | Gelen kutusu |
| `src/components/anaekran/DailyRevenueChart.tsx` (yeni) | Günlük gelir grafiği |
| `src/components/anaekran/RichDashboard.tsx` (yeni) | Veri çekme + panelleri dizme |
| `src/pages/AnaEkran.tsx` | Yalnızca sarmalayıcı kalır |
| `src/api/customers.ts` | `CustomerSummary`'ye `first_seen` |

---

### Task 1: Backend — `CustomerOut.first_seen` ✅ TAMAMLANDI

selamet/w-lush#18 olarak merge edildi.

**Planlanan ile yapılan farkı:** plan `customers.created_at` sütununu dışa
vermeyi söylüyordu. Kod okununca çalışmayacağı görüldü — `overview()` listesi
`customers` tablosundan değil, mesajı veya randevusu olan **her telefondan**
üretiliyor; o sütun satırların çoğunda boş kalırdı.

Bunun yerine `CustomerOut`'a `first_seen: datetime` eklendi: ilk mesaj ile ilk
randevudan hangisi önceyse. Mesaj tarafı `_message_facts`'teki mevcut group-by
sorgusuna `func.min(Message.created_at)` olarak bindi (ek sorgu yok); randevu
tarafı `_appointment_facts`'in Python döngüsünde katlandı.

**Doğrulandı:** `ruff` temiz, `import ok`, `GET /api/customers` 12 satırın
hepsinde `first_seen` dolu, mevcut alanların tamamı korunuyor, ve mesajı olan
her satırda `first_seen <= last_message_at`.

---

### Task 2: Saf hesaplar

**Files:**
- Create: `src/utils/dashboard.ts`
- Modify: `src/api/customers.ts`

**Interfaces:**
- Consumes: `ServiceTotal` (`{ service_name: string; amount: number; count: number }`), `Payment` (`{ paid_at: string; amount: number; ... }`) — ikisi de `src/api/payments.ts`'ten.
- Produces:
  - `occupancy(appointments, slotCount, staffCount): { used: number; capacity: number; percent: number } | null`
  - `compareServices(current, previous): ServiceMove[]`
  - `type ServiceMove = { service_name: string; from: number; to: number; percent: number }`
  - `dailyTotals(payments, start, end): { day: string; amount: number }[]`
  - `monthRange(today?): { start: string; end: string }`, `dayRange(offset, today?)`, `last30(today?)`, `prev30(today?)`, `prevMonthToDate(today?)` — hepsi `{ start: string; end: string }` döner
  - `src/api/customers.ts`: `CustomerSummary.first_seen: string`

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/anaekran-gercek-veri
```

- [ ] **Step 2: `CustomerSummary`'ye alanı ekle**

`src/api/customers.ts` içindeki `CustomerSummary` arayüzüne, `name` satırının altına:

```ts
  first_seen: string; // ISO — ilk mesaj ya da ilk randevu
```

`listCustomers` gövdesinde `last_message_at` gibi `toUtcIso`'dan geçirilmesi **gerekir**, çünkü backend naive datetime döndürüyor:

```ts
export const listCustomers = () =>
  request<CustomerSummary[]>('/api/customers').then((rows) =>
    rows.map((r) => ({
      ...r,
      first_seen: toUtcIso(r.first_seen),
      last_message_at: r.last_message_at ? toUtcIso(r.last_message_at) : null,
    })),
  );
```

- [ ] **Step 3: `utils/dashboard.ts`'i yaz**

```ts
// Ana ekranın hesapları. Bileşenlerden ayrı duruyorlar çünkü tarayıcı
// olmadan doğrulanabilmelerinin tek yolu bu.
import type { Payment, ServiceTotal } from '../api/payments';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Bugünden `offset` gün önceki tek günlük aralık (0 = bugün). */
export function dayRange(offset: number, today = new Date()): { start: string; end: string } {
  const d = new Date(today);
  d.setDate(d.getDate() - offset);
  return { start: iso(d), end: iso(d) };
}

/** Ayın 1'inden bugüne. */
export function monthRange(today = new Date()): { start: string; end: string } {
  return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end: iso(today) };
}

/** Geçen ayın 1'inden, geçen ayın "bugün"üne — ay kıyası için. */
export function prevMonthToDate(today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  const first = new Date(y, m - 1, 1);
  // Geçen ay bugünkü gün numarasını içermiyorsa (31 Mart → Şubat) ayın
  // son gününe kırpılır; new Date(y, m, 0) o ayın son günüdür.
  const lastDayOfPrev = new Date(y, m, 0).getDate();
  const end = new Date(y, m - 1, Math.min(today.getDate(), lastDayOfPrev));
  return { start: iso(first), end: iso(end) };
}

/** Son 30 gün (bugün dahil). */
export function last30(today = new Date()): { start: string; end: string } {
  const s = new Date(today);
  s.setDate(s.getDate() - 29);
  return { start: iso(s), end: iso(today) };
}

/** Ondan önceki 30 gün. */
export function prev30(today = new Date()): { start: string; end: string } {
  const e = new Date(today);
  e.setDate(e.getDate() - 30);
  const s = new Date(today);
  s.setDate(s.getDate() - 59);
  return { start: iso(s), end: iso(e) };
}

/**
 * Doluluk. Kapasite = slot sayısı × aktif personel; personel yoksa çarpan 1,
 * yani personel öncesi davranış. Slot tanımlı değilse hesap anlamsızdır ve
 * null döner — kart "—" gösterir.
 */
export function occupancy(
  activeAppointments: number,
  slotCount: number,
  staffCount: number,
): { used: number; capacity: number; percent: number } | null {
  if (slotCount <= 0) return null;
  const capacity = slotCount * Math.max(1, staffCount);
  return {
    used: activeAppointments,
    capacity,
    percent: Math.round((activeAppointments / capacity) * 100),
  };
}

export interface ServiceMove {
  service_name: string;
  from: number;
  to: number;
  percent: number;
}

/** Karşılaştırmaya girmek için önceki dönemde gereken alt sınırlar. */
export const MIN_COUNT = 3;
export const MIN_AMOUNT = 1000;

/**
 * İki dönemin hizmet kırılımını karşılaştırır, en çok değişen önce.
 *
 * Eşik olmadan bu hesap yalan söyler: önceki dönemde tek ödemesi olan bir
 * hizmet sıfıra düşünce "−%100" yazardı. O yüzden hizmetin önceki dönemde
 * en az MIN_COUNT ödemesi ve MIN_AMOUNT tutarı olmalı.
 */
export function compareServices(
  current: ServiceTotal[],
  previous: ServiceTotal[],
): ServiceMove[] {
  const now = new Map(current.map((s) => [s.service_name, s.amount]));
  return previous
    .filter((p) => p.count >= MIN_COUNT && p.amount >= MIN_AMOUNT)
    .map((p) => {
      const to = now.get(p.service_name) ?? 0;
      return {
        service_name: p.service_name,
        from: p.amount,
        to,
        percent: Math.round(((to - p.amount) / p.amount) * 100),
      };
    })
    .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));
}

/**
 * Ödemeleri güne göre toplar. Ödemesiz günler 0 ile doldurulur — aksi hâlde
 * grafik boş günleri atlar ve seyir olduğundan düz görünür.
 */
export function dailyTotals(
  payments: Payment[],
  start: string,
  end: string,
): { day: string; amount: number }[] {
  const sums = new Map<string, number>();
  for (const p of payments) {
    sums.set(p.paid_at, (sums.get(p.paid_at) ?? 0) + p.amount);
  }
  const out: { day: string; amount: number }[] = [];
  const cur = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cur <= last) {
    const key = iso(cur);
    out.push({ day: key, amount: sums.get(key) ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
```

- [ ] **Step 4: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

Beklenen: ikisi de 0 ile çıkar.

- [ ] **Step 5: Hesapları node ile doğrula**

Bu adım planın en önemli doğrulaması: bu fonksiyonlar ekranın söylediği her rakamı üretiyor.

```bash
cd ~/Desktop/kisisel/w-lush-web && npx tsx -e "
import {
  occupancy, compareServices, dailyTotals, prevMonthToDate, last30, prev30, monthRange,
} from './src/utils/dashboard';

const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(ok ? 'OK  ' : 'HATA', label, '→', JSON.stringify(got));
  if (!ok) { console.log('     beklenen:', JSON.stringify(want)); process.exit(1); }
};

// --- doluluk
eq('doluluk 2 personel', occupancy(7, 8, 2), { used: 7, capacity: 16, percent: 44 });
eq('doluluk personelsiz', occupancy(3, 8, 0), { used: 3, capacity: 8, percent: 38 });
eq('doluluk slotsuz', occupancy(3, 0, 2), null);
eq('doluluk tam', occupancy(8, 8, 1), { used: 8, capacity: 8, percent: 100 });

// --- eğilim eşikleri
const prev = [
  { service_name: 'Lazer', amount: 18400, count: 8 },
  { service_name: 'Tek seferlik', amount: 400, count: 1 },   // sayı ve tutar düşük
  { service_name: 'Ucuz ama sık', amount: 600, count: 5 },   // tutar düşük
  { service_name: 'Pahalı ama seyrek', amount: 9000, count: 2 }, // sayı düşük
];
const cur = [{ service_name: 'Lazer', amount: 14200, count: 6 }];
eq('yalnızca eşiği geçen', compareServices(cur, prev), [
  { service_name: 'Lazer', from: 18400, to: 14200, percent: -23 },
]);
eq('eşiği geçen yok', compareServices([], [{ service_name: 'X', amount: 500, count: 2 }]), []);

// --- günlük gruplama
eq('ödemesiz günler 0', dailyTotals(
  [{ paid_at: '2026-08-02', amount: 100 }, { paid_at: '2026-08-02', amount: 50 }],
  '2026-08-01', '2026-08-03',
), [
  { day: '2026-08-01', amount: 0 },
  { day: '2026-08-02', amount: 150 },
  { day: '2026-08-03', amount: 0 },
]);

// --- tarih aralıkları (sabit bir 'bugün' ile)
const t = new Date(2026, 7, 11); // 11 Ağustos 2026
eq('bu ay', monthRange(t), { start: '2026-08-01', end: '2026-08-11' });
eq('son 30', last30(t), { start: '2026-07-13', end: '2026-08-11' });
eq('önceki 30', prev30(t), { start: '2026-06-13', end: '2026-07-12' });
eq('geçen ay aynı güne', prevMonthToDate(t), { start: '2026-07-01', end: '2026-07-11' });
// 31 Mart → Şubat'ta 31 yok, ayın sonuna kırpılmalı
eq('kısa aya kırpma', prevMonthToDate(new Date(2026, 2, 31)), { start: '2026-02-01', end: '2026-02-28' });

console.log('HESAPLAR OK');
" 2>&1 | tail -20
```

Beklenen: her satır `OK`, son satır `HESAPLAR OK`.

`npx tsx` yoksa hata verir; o durumda `npx --yes tsx` dene, o da olmazsa bu adımı `node --experimental-strip-types` ile çalıştır. Hiçbiri yoksa **dur ve bildir** — bu doğrulama atlanamaz.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/utils/dashboard.ts src/api/customers.ts
git commit -m "$(cat <<'EOF'
Add the dashboard's calculations as pure functions

They live apart from the components because that is the only way to verify
them without a browser.

compareServices carries a threshold on purpose: without it a service with one
payment last month dropping to zero would read "-100%", which is noise
dressed as insight.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `FirstTimeDashboard`'ı taşı

**Files:**
- Create: `src/components/anaekran/FirstTimeDashboard.tsx`
- Modify: `src/pages/AnaEkran.tsx`

**Interfaces:**
- Consumes: yok.
- Produces: `export default function FirstTimeDashboard({ clinicName }: { clinicName: string })`

Bu task **davranış değiştirmez**. Amacı, sonraki task'ların diff'inin okunabilir olması: taşıma ile yeniden yazımı aynı commit'e koyarsak gözden geçiren ikisini ayırt edemez.

- [ ] **Step 1: Kodu taşı**

`src/pages/AnaEkran.tsx` içindeki `type Step = ...` satırından `FirstTimeDashboard` fonksiyonunun kapanış `}`'ine kadar olan bloğun tamamını kes, `src/components/anaekran/FirstTimeDashboard.tsx` dosyasına yapıştır. Dosyanın başına gereken importları koy:

```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons';
import { getConnection } from '../../api/whatsapp';
import { listServices, type Service } from '../../api/clinic';
```

Fonksiyon bildirimini dışa aç:

```tsx
export default function FirstTimeDashboard({ clinicName }: { clinicName: string }) {
```

Göreli yol derinliği değişti (`../` → `../../`); dosyadaki tüm importları buna göre düzelt. `typecheck` kalanı yakalar.

- [ ] **Step 2: Sayfada import et**

`src/pages/AnaEkran.tsx` importlarına:

```tsx
import FirstTimeDashboard from '../components/anaekran/FirstTimeDashboard';
```

- [ ] **Step 3: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

Beklenen: ikisi de 0. `Icon` veya `Link` için "unused import" hatası gelirse `AnaEkran.tsx`'te artık kullanılmıyor demektir; oradan sil.

- [ ] **Step 4: Taşımanın gerçekten taşıma olduğunu doğrula**

```bash
cd ~/Desktop/kisisel/w-lush-web && git diff --stat
```

Beklenen: `AnaEkran.tsx` yaklaşık taşınan satır kadar küçülmüş, yeni dosya o kadar büyümüş. Toplam satır sayısı kabaca korunmalı — büyük bir artış, taşırken yeniden yazdığın anlamına gelir.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/FirstTimeDashboard.tsx src/pages/AnaEkran.tsx
git commit -m "$(cat <<'EOF'
Move FirstTimeDashboard out of the page

Pure move, no behaviour change — kept separate so the rewrite commits that
follow stay readable.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: KPI satırı

**Files:**
- Create: `src/components/anaekran/KpiRow.tsx`

**Interfaces:**
- Consumes: `occupancy` (`utils/dashboard`), `KpiCard` (`components/ui`).
- Produces:

```ts
export interface KpiData {
  todayRevenue: number;
  yesterdayRevenue: number;
  monthRevenue: number;
  prevMonthToDateRevenue: number;
  occupancy: { used: number; capacity: number; percent: number } | null;
  newCustomersThisMonth: number;
}
export default function KpiRow({ data }: { data: KpiData }): JSX.Element
```

Bileşen veri çekmez; `RichDashboard` hesaplayıp verir.

- [ ] **Step 1: Dosyayı yaz**

```tsx
import { KpiCard } from '../ui';

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

/** Yüzde fark rozeti. Önceki dönem 0 ise oran tanımsızdır, rozet çizilmez. */
function delta(now: number, before: number): { text: string; tone: 'good' | 'bad' } | null {
  if (before <= 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { text: `${pct >= 0 ? '+' : ''}%${Math.abs(pct)}`, tone: pct >= 0 ? 'good' : 'bad' };
}

export interface KpiData {
  todayRevenue: number;
  yesterdayRevenue: number;
  monthRevenue: number;
  prevMonthToDateRevenue: number;
  occupancy: { used: number; capacity: number; percent: number } | null;
  newCustomersThisMonth: number;
}

export default function KpiRow({ data }: { data: KpiData }) {
  const today = delta(data.todayRevenue, data.yesterdayRevenue);
  const month = delta(data.monthRevenue, data.prevMonthToDateRevenue);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <KpiCard
        label="Bugün gelir"
        value={money(data.todayRevenue)}
        delta={today?.text}
        deltaTone={today?.tone}
        accent="var(--forest)"
      />
      <KpiCard
        label="Bugün doluluk"
        value={data.occupancy ? `%${data.occupancy.percent}` : '—'}
        delta={data.occupancy ? `${data.occupancy.used}/${data.occupancy.capacity}` : undefined}
        accent="var(--sage)"
      />
      <KpiCard
        label="Bu ay gelir"
        value={money(data.monthRevenue)}
        delta={month?.text}
        deltaTone={month?.tone}
        accent="var(--champagne)"
      />
      <KpiCard
        label="Bu ay yeni danışan"
        value={String(data.newCustomersThisMonth)}
        accent="var(--lavender)"
      />
    </div>
  );
}
```

Sparkline hiçbir kartta yok: `KpiCard`'ın `sparkline` alanı opsiyonel ve elimizde günlük seri yalnızca gelir için var, o da sayfanın altında tam genişlikte çiziliyor.

- [ ] **Step 2: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/KpiRow.tsx
git commit -m "$(cat <<'EOF'
Add the KPI row

No sparklines: the only daily series we have is revenue, and it is drawn
full-width below. The fabricated SVG paths are gone rather than replaced.

The delta badge is skipped when the previous period is zero — a percentage
against nothing is not a comparison.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Eğilim şeridi

**Files:**
- Create: `src/components/anaekran/TrendStrip.tsx`

**Interfaces:**
- Consumes: `ServiceMove` (`utils/dashboard`), `Icon` (`components/icons`).
- Produces:

```ts
export default function TrendStrip({
  moves, paymentCount,
}: { moves: ServiceMove[]; paymentCount: number }): JSX.Element
```

- [ ] **Step 1: Dosyayı yaz**

```tsx
import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import type { ServiceMove } from '../../utils/dashboard';

const money = (n: number): string => `₺${n.toLocaleString('tr-TR')}`;

function MoveLine({ m }: { m: ServiceMove }) {
  const down = m.percent < 0;
  return (
    <span>
      <strong>{m.service_name}</strong>{' '}
      <strong style={{ color: down ? 'var(--bad)' : 'var(--forest)' }}>
        {m.percent > 0 ? '+' : ''}%{Math.abs(m.percent)}
      </strong>{' '}
      <span style={{ color: 'var(--ink-40)' }}>
        ({money(m.from)} → {money(m.to)})
      </span>
    </span>
  );
}

export default function TrendStrip({
  moves,
  paymentCount,
}: {
  moves: ServiceMove[];
  paymentCount: number;
}) {
  // En çok düşen ve en çok artan. moves zaten |yüzde|'ye göre sıralı.
  const worst = moves.find((m) => m.percent < 0) ?? null;
  const best = moves.find((m) => m.percent > 0) ?? null;
  const enough = worst !== null || best !== null;

  return (
    <div
      style={{
        background:
          'linear-gradient(110deg, var(--paper) 0%, var(--paper) 55%, var(--cream-2) 100%)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 36, height: 36, borderRadius: 8, background: 'var(--cream-2)',
          display: 'grid', placeItems: 'center', color: 'var(--ink-60)', flexShrink: 0,
        }}
      >
        {Icon.chart ?? Icon.sparkle}
      </div>

      <div style={{ flex: 1 }}>
        {enough ? (
          <>
            <div style={{ fontSize: 13, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {worst && <MoveLine m={worst} />}
              {best && <MoveLine m={best} />}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>
              son 30 gün vs önceki 30 gün · {paymentCount} ödeme
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-60)' }}>
            Karşılaştırma için henüz yeterli ödeme kaydı yok — Gelir ekranından ödeme
            girdikçe burası dolar.
          </div>
        )}
      </div>

      <Link
        to="/gelir"
        className="wl-btn wl-btn-sm"
        style={{
          background: 'var(--cream-2)', color: 'var(--ink)', borderRadius: 8,
          fontSize: 12, textDecoration: 'none',
        }}
      >
        Gelir raporunda aç
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: `Icon.chart` var mı, `/gelir` doğru yol mu — doğrula**

```bash
cd ~/Desktop/kisisel/w-lush-web && grep -n "chart\|sparkle" src/components/icons.tsx | head -5
grep -n "gelir\|GelirRaporu" src/nav.ts src/App.tsx | head -5
```

`Icon.chart` yoksa yukarıdaki `??` zaten `Icon.sparkle`'a düşer ama TypeScript bilinmeyen alana izin vermez — o durumda satırı yalnızca `{Icon.sparkle}` yap. Yol `/gelir` değilse `Link to=` değerini gerçek yolla değiştir.

- [ ] **Step 3: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/TrendStrip.tsx
git commit -m "$(cat <<'EOF'
Replace the fabricated AI strip with a real comparison

The old strip claimed "AI scanned 4 minutes ago, 247 customers" and made up
every number. This one divides two payment summaries and says which period it
compared.

When no service clears the threshold it says so instead of inventing a trend.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Bugünün randevuları

**Files:**
- Create: `src/components/anaekran/TodayAppointments.tsx`

**Interfaces:**
- Consumes: `Appointment` (`api/clinic`).
- Produces:

```ts
export default function TodayAppointments({
  items, slots,
}: { items: Appointment[]; slots: string[] }): JSX.Element
```

- [ ] **Step 1: Dosyayı yaz**

```tsx
import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import type { Appointment } from '../../api/clinic';

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: 'Onaylı', cls: 'wl-chip wl-chip-good' },
  pending: { label: 'Bekliyor', cls: 'wl-chip wl-chip-warn' },
  cancelled: { label: 'İptal', cls: 'wl-chip wl-chip-cream' },
};

const maskPhone = (p: string): string => (p.length > 6 ? `${p.slice(0, 6)}•••${p.slice(-2)}` : p);

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

const AVATAR = ['var(--forest)', 'var(--sage)', 'var(--champagne)', 'var(--lavender)'];

export default function TodayAppointments({
  items,
  slots,
}: {
  items: Appointment[];
  slots: string[];
}) {
  const active = items.filter((a) => a.status !== 'cancelled');
  const taken = new Set(active.map((a) => a.appt_time));
  const free = slots.filter((s) => !taken.has(s)).length;
  const hours = slots.length > 0 ? `${slots[0]} — ${slots[slots.length - 1]}` : 'Saat tanımsız';

  return (
    <div
      style={{
        background: 'var(--paper)', border: '1px solid var(--line)',
        borderRadius: 12, overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--line)',
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Bugünün randevuları</div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
            {hours} · {active.length} seans · {free} boş slot
          </div>
        </div>
        <Link
          to="/randevu"
          className="wl-btn wl-btn-ghost wl-btn-sm"
          style={{ borderRadius: 6, fontSize: 12, textDecoration: 'none' }}
        >
          Takvimde aç {Icon.arrow}
        </Link>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
          Bugün için randevu yok.
        </div>
      ) : (
        <table className="wl-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Saat</th>
              <th>Danışan</th>
              <th>Hizmet</th>
              <th>Uzman</th>
              <th style={{ width: 110 }}>Durum</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a, i) => {
              const who = a.customer_name || maskPhone(a.phone);
              const st = STATUS[a.status] ?? { label: a.status, cls: 'wl-chip wl-chip-cream' };
              return (
                <tr key={a.id}>
                  <td>
                    <span className="wl-mono" style={{ fontSize: 12 }}>{a.appt_time}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 26, height: 26, borderRadius: 999,
                          background: AVATAR[i % AVATAR.length], color: 'var(--cream)',
                          display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 500,
                        }}
                      >
                        {initials(who)}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{who}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>{a.service_name}</td>
                  <td style={{ color: 'var(--ink-60)', fontSize: 12 }}>
                    {a.staff_name || 'Atanmamış'}
                  </td>
                  <td><span className={st.cls}>{st.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

Kanal sütunu yok: `Appointment` modelinde kanal alanı yok. "Boş slot / AI %92 uyum" satırı yok: tahmin üreteci yok. Liste/Takvim anahtarı yok: gerçek ızgara `/randevu`'da.

- [ ] **Step 2: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/TodayAppointments.tsx
git commit -m "$(cat <<'EOF'
Show today's real appointments

Three things did not survive the move to real data: the channel column (the
model has no channel), the "empty slot, AI suggests Berfin at 92% fit" row
(nothing computes that), and the list/calendar toggle (the real grid is one
click away).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Gelen kutusu

**Files:**
- Create: `src/components/anaekran/InboxPanel.tsx`

**Interfaces:**
- Consumes: `Conversation` (`api/conversations`).
- Produces: `export default function InboxPanel({ items }: { items: Conversation[] }): JSX.Element`

- [ ] **Step 1: Dosyayı yaz**

```tsx
import { Link } from 'react-router-dom';
import { Icon } from '../icons';
import type { Conversation } from '../../api/conversations';

const MAX = 5;

const initials = (name: string): string =>
  name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || '••';

/** "2 dk", "1 sa", "3 gün" — gelen kutusu için kaba yeterli. */
function ago(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} dk`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} sa`;
  return `${Math.round(mins / (60 * 24))} gün`;
}

export default function InboxPanel({ items }: { items: Conversation[] }) {
  const waiting = items.filter((c) => c.waiting).length;
  const shown = items.slice(0, MAX);

  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12 }}>
      <div
        style={{
          padding: '14px 16px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ color: 'var(--wa-green)' }}>{Icon.whatsapp}</span>
        <div style={{ fontSize: 13, fontWeight: 600 }}>WhatsApp</div>
        {waiting > 0 && (
          <span
            style={{
              marginLeft: 'auto', fontSize: 10, padding: '1px 6px', borderRadius: 4,
              background: '#DCF8C6', color: '#075E54', fontWeight: 600,
            }}
          >
            {waiting} yanıt bekliyor
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>
          Henüz konuşma yok.
        </div>
      ) : (
        shown.map((c, i) => (
          <Link
            key={c.phone}
            to="/mesajlar"
            style={{
              padding: '12px 16px',
              borderBottom: i < shown.length - 1 ? '1px solid var(--line)' : 'none',
              display: 'flex', gap: 10, alignItems: 'center',
              textDecoration: 'none', color: 'inherit',
            }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: 999, background: 'var(--cream-3)',
                color: 'var(--ink)', display: 'grid', placeItems: 'center',
                fontSize: 10, fontWeight: 500, flexShrink: 0,
              }}
            >
              {initials(c.customer_name || c.phone)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500 }}>
                  {c.customer_name || c.phone}
                </div>
                <span style={{ fontSize: 10, color: 'var(--ink-40)' }}>{ago(c.last_at)}</span>
              </div>
              <div
                style={{
                  fontSize: 11, color: 'var(--ink-60)', marginTop: 2, overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {/* ✦ = botun konuşmayı sürdürdüğü anlamına gelir; handoff ise
                    operatör devralmıştır. */}
                {!c.handoff && <span style={{ color: 'var(--lavender-2)' }}>✦ </span>}
                {c.last_message}
              </div>
            </div>
            {c.waiting && (
              <span
                className="wl-chip wl-chip-warn"
                style={{ height: 18, fontSize: 9, flexShrink: 0 }}
              >
                Bekliyor
              </span>
            )}
          </Link>
        ))
      )}
    </div>
  );
}
```

Okunmamış sayacı yok: `Conversation` böyle bir alan taşımıyor. "Aday" rozeti yok: aşama bilgisi CRM'de.

- [ ] **Step 2: Kapılar ve `/mesajlar` yolunu doğrula**

```bash
cd ~/Desktop/kisisel/w-lush-web && grep -n "mesajlar" src/nav.ts src/App.tsx | head -3
npm run typecheck && npm run build
```

Yol farklıysa `Link to=` değerini düzelt.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/InboxPanel.tsx
git commit -m "$(cat <<'EOF'
Show real conversations in the inbox panel

The green unread counter is gone: Conversation carries no unread field, so
the number was pure invention. "waiting" — the customer spoke last — is real
and more useful to whoever is at the desk.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Günlük gelir grafiği

**Files:**
- Create: `src/components/anaekran/DailyRevenueChart.tsx`

**Interfaces:**
- Consumes: `dailyTotals` çıktısı (`{ day: string; amount: number }[]`).
- Produces:

```ts
export default function DailyRevenueChart({
  days, monthToDate, prevMonthToDate,
}: {
  days: { day: string; amount: number }[];
  monthToDate: number;
  prevMonthToDate: number;
}): JSX.Element
```

- [ ] **Step 1: Dosyayı yaz**

`components/finance/MonthlyBars.tsx` örüntüsü izleniyor; o bileşen ay etiketi bastığı için doğrudan kullanılamıyor.

```tsx
const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

const monthTitle = (day: string): string => {
  const [y, m] = day.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
};

/** Günlük bar grafiği. En yüksek gün 120px'e ölçeklenir. */
export default function DailyRevenueChart({
  days,
  monthToDate,
  prevMonthToDate,
}: {
  days: { day: string; amount: number }[];
  monthToDate: number;
  prevMonthToDate: number;
}) {
  const hasAny = days.some((d) => d.amount > 0);
  const max = Math.max(1, ...days.map((d) => d.amount));

  return (
    <div
      style={{
        background: 'var(--paper)', border: '1px solid var(--line)',
        borderRadius: 12, padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {days.length > 0 ? `${monthTitle(days[0].day)} · gelir` : 'Gelir'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
            günlük · ayın 1'inden bugüne
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Bugüne kadar</div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {money(monthToDate)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>Geçen ay aynı güne kadar</div>
            <div
              style={{
                fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em',
                color: 'var(--ink-60)',
              }}
            >
              {money(prevMonthToDate)}
            </div>
          </div>
        </div>
      </div>

      {!hasAny ? (
        <div style={{ fontSize: 12, color: 'var(--ink-40)', padding: '24px 0' }}>
          Bu ay henüz ödeme kaydı yok.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
            {days.map((d) => (
              <div
                key={d.day}
                title={`${d.day} · ${money(d.amount)}`}
                style={{
                  flex: 1,
                  height: Math.max(2, Math.round((d.amount / max) * 120)),
                  background: d.amount > 0 ? 'var(--forest)' : 'var(--line)',
                  borderRadius: 3,
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 8,
              fontSize: 10, color: 'var(--ink-40)', fontFamily: 'Geist Mono, monospace',
            }}
          >
            <span>{days[0]?.day.slice(-2)}</span>
            <span>{days[days.length - 1]?.day.slice(-2)}</span>
          </div>
        </>
      )}
    </div>
  );
}
```

"AI ay sonu tahmini" ve "Hedef" yok: ilkini üretecek model, ikincisini tutacak alan yok.

- [ ] **Step 2: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/DailyRevenueChart.tsx
git commit -m "$(cat <<'EOF'
Draw this month's real daily revenue

The old chart had a hardcoded SVG path, a hardcoded "Mayıs" title, an "AI
month-end forecast" with no model behind it, and a "target" the system has no
field for. Only "so far this month" survived; the forecast and target are
replaced by last month to the same day, which is a comparison rather than a
guess.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `RichDashboard` — veriyi çek, panelleri diz

**Files:**
- Create: `src/components/anaekran/RichDashboard.tsx`
- Modify: `src/pages/AnaEkran.tsx`

**Interfaces:**
- Consumes: Task 2–8'in hepsi.
- Produces: `export default function RichDashboard(): JSX.Element`

- [ ] **Step 1: Dosyayı yaz**

```tsx
import { useEffect, useState } from 'react';
import { listAppointments, getSettings, type Appointment } from '../../api/clinic';
import { listStaff } from '../../api/staff';
import { listCustomers } from '../../api/customers';
import { listConversations, type Conversation } from '../../api/conversations';
import { getSummary, listPayments } from '../../api/payments';
import {
  compareServices, dailyTotals, dayRange, last30, monthRange, occupancy,
  prev30, prevMonthToDate, type ServiceMove,
} from '../../utils/dashboard';
import DailyRevenueChart from './DailyRevenueChart';
import InboxPanel from './InboxPanel';
import KpiRow, { type KpiData } from './KpiRow';
import TodayAppointments from './TodayAppointments';
import TrendStrip from './TrendStrip';

interface Loaded {
  kpi: KpiData;
  moves: ServiceMove[];
  trendPaymentCount: number;
  appts: Appointment[];
  slots: string[];
  conversations: Conversation[];
  days: { day: string; amount: number }[];
}

export default function RichDashboard() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const today = new Date();
    const t = dayRange(0, today);
    const y = dayRange(1, today);
    const month = monthRange(today);
    const prevMonth = prevMonthToDate(today);
    const c30 = last30(today);
    const p30 = prev30(today);

    Promise.all([
      getSummary(t.start, t.end),
      getSummary(y.start, y.end),
      getSummary(month.start, month.end),
      getSummary(prevMonth.start, prevMonth.end),
      getSummary(c30.start, c30.end),
      getSummary(p30.start, p30.end),
      listAppointments(t.start, t.end),
      getSettings(),
      listStaff(),
      listCustomers(),
      listConversations(),
      listPayments(month.start, month.end),
    ])
      .then(([
        todayS, yestS, monthS, prevMonthS, cur30S, prv30S,
        appts, settings, staff, customers, conversations, monthPayments,
      ]) => {
        const slots = settings.slot_times ?? [];
        const activeStaff = staff.filter((s) => s.active).length;
        const activeAppts = appts.filter((a) => a.status !== 'cancelled').length;
        const monthPrefix = month.start.slice(0, 7);

        setData({
          kpi: {
            todayRevenue: todayS.total,
            yesterdayRevenue: yestS.total,
            monthRevenue: monthS.total,
            prevMonthToDateRevenue: prevMonthS.total,
            occupancy: occupancy(activeAppts, slots.length, activeStaff),
            newCustomersThisMonth: customers.filter(
              (c) => c.first_seen.slice(0, 7) === monthPrefix,
            ).length,
          },
          moves: compareServices(cur30S.by_service, prv30S.by_service),
          trendPaymentCount: cur30S.count,
          appts,
          slots,
          conversations,
          days: dailyTotals(monthPayments, month.start, month.end),
        });
      })
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>
        Pano yüklenemedi.
      </div>
    );
  }
  if (data === null) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>
        Yükleniyor…
      </div>
    );
  }

  return (
    <>
      <TrendStrip moves={data.moves} paymentCount={data.trendPaymentCount} />
      <KpiRow data={data.kpi} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <TodayAppointments items={data.appts} slots={data.slots} />
        <InboxPanel items={data.conversations} />
      </div>
      <DailyRevenueChart
        days={data.days}
        monthToDate={data.kpi.monthRevenue}
        prevMonthToDate={data.kpi.prevMonthToDateRevenue}
      />
    </>
  );
}
```

`Promise.all` bilerek: bir uç düşerse pano yarım rakam göstermek yerine tek bir hata mesajı verir. Yarım pano, uydurma pano kadar yanıltıcıdır.

- [ ] **Step 2: `AnaEkran.tsx`'i sadeleştir**

Dosyada yalnızca sarmalayıcı kalmalı. Tamamı:

```tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { listAppointments, listRequests, type Appointment, type ClinicRequest } from '../api/clinic';
import FirstTimeDashboard from '../components/anaekran/FirstTimeDashboard';
import RichDashboard from '../components/anaekran/RichDashboard';

/* ── Veri-farkında sarmalayıcı: boş klinik → ilk-deneyim ──── */
export default function AnaEkran() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [reqs, setReqs] = useState<ClinicRequest[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAppointments(), listRequests()])
      .then(([a, r]) => {
        setAppts(a);
        setReqs(r);
      })
      .catch(() => {
        setAppts([]);
        setReqs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>
        Yükleniyor…
      </div>
    );
  }

  const hasData = (appts?.length ?? 0) > 0 || (reqs?.length ?? 0) > 0;
  if (!hasData) {
    return <FirstTimeDashboard clinicName={user?.clinic.name ?? 'klinik'} />;
  }
  return <RichDashboard />;
}
```

Bu, `APPTS` / `SUGGESTIONS` / `INBOX` dizilerini ve eski `RichDashboard` gövdesini dosyadan tamamen çıkarır.

- [ ] **Step 3: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

Beklenen: ikisi de 0. `CampaignModal` / `SuggestionsModal` / `MessageComposerModal` için "unused" uyarısı gelirse importları sil — bu ekran artık onları kullanmıyor.

- [ ] **Step 4: Uydurma kalıntısı kalmadığını göster**

```bash
cd ~/Desktop/kisisel/w-lush-web
echo "--- sayfa ---"
grep -cE "APPTS|SUGGESTIONS|INBOX|M0,22|1\.18M|612\.840|48\.420|247 danışan" src/pages/AnaEkran.tsx
echo "--- anaekran ağacı ---"
grep -rcE "APPTS|SUGGESTIONS|INBOX|1\.18M|612\.840|48\.420" src/components/anaekran/ | grep -v ":0" || echo "temiz"
wc -l src/pages/AnaEkran.tsx
```

Beklenen: ilk sayı **0**, ikinci blok `temiz`, sayfa ~40 satır.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/RichDashboard.tsx src/pages/AnaEkran.tsx
git commit -m "$(cat <<'EOF'
Assemble the dashboard from real data

Promise.all is deliberate: if one endpoint fails the panel shows a single
error instead of a half-filled dashboard. A half-filled dashboard misleads as
much as a fabricated one.

AnaEkran.tsx drops from 501 lines to a wrapper.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Doğrulama ve PR

**Files:** yok.

- [ ] **Step 1: Ekrandaki rakamları API'den elle doğrula**

Ekranın söyleyeceği rakamları bağımsız hesaplayıp karşılaştır.

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request, urllib.error
from datetime import date, timedelta
B = "http://localhost:5173"

def call(path, body=None, method="GET", token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e: return {"_err": e.code, "_body": e.read().decode()}

tok = call("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"}, "POST")
tok = tok["token"]["access_token"]

today = date.today()
first = today.replace(day=1)
settings = call("/api/settings", token=tok)
staff = [s for s in call("/api/staff", token=tok) if s["active"]]
appts = call(f"/api/appointments?start={today}&end={today}", token=tok)
active = [a for a in appts if a["status"] != "cancelled"]
month = call(f"/api/payments/summary?start={first}&end={today}", token=tok)
customers = call("/api/customers", token=tok)

slots = settings["slot_times"]
capacity = len(slots) * max(1, len(staff))
print("bugün aktif randevu :", len(active))
print("kapasite            :", f"{len(slots)} slot × {max(1, len(staff))} personel = {capacity}")
print("doluluk             :", f"%{round(len(active) / capacity * 100)}" if capacity else "—")
print("bu ay gelir         :", month["total"])
print("bu ay yeni danışan  :", sum(1 for c in customers if c["first_seen"][:7] == str(today)[:7]))
print("konuşma sayısı      :", len(call("/api/conversations", token=tok)))
assert "first_seen" in customers[0], "first_seen gelmedi — backend PR'ı merge edildi mi?"
print("VERİ OK — bu rakamlar ekranda görünmeli")
PY
```

Bu çıktıyı sakla; PR gövdesine yazılacak.

- [ ] **Step 2: Diff'i gözden geçir**

```bash
cd ~/Desktop/kisisel/w-lush-web && git diff main --stat && git diff main
```

Baştan sona oku: kalıntı `console.log`, kullanılmayan import, uydurma rakam.

- [ ] **Step 3: Tarayıcı turu**

Chrome eklentisi bağlıysa ana ekranı aç; KPI'ların Step 1'deki rakamlarla aynı olduğunu, eğilim şeridinin ya gerçek karşılaştırma ya da "yeterli kayıt yok" dediğini, grafiğin bu ayı çizdiğini gör.

Eklenti bağlı değilse **bu adımı atla ve PR'da atlandığını yaz**. Yapılmamış kontrolü yapılmış gibi raporlama.

- [ ] **Step 4: PR aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git push -u origin feature/anaekran-gercek-veri
gh pr create --base main --head feature/anaekran-gercek-veri \
  --title "Ana ekranı gerçek veriye bağla" \
  --body "$(cat <<'EOF'
`RichDashboard` tamamen uydurmaydı: tek gerçek randevusu olan klinik
"₺48.420 günlük gelir, %87 doluluk, 247 danışan, AI ay sonu tahmini ₺1.18M"
görüyordu. Panelin en görünür ekranı, sistemin en büyük yalanıydı.

Backend tarafı: selamet/w-lush#<NUMARA> (merge edildi) — tek alan,
`CustomerOut.first_seen`.

## Ne gerçekleşti
- **KPI'lar:** Bugün gelir, Bugün doluluk, Bu ay gelir, Bu ay yeni danışan.
  Doluluk paydası slot sayısı × aktif personel — personel yoksa çarpan 1.
- **Eğilim şeridi:** iki `payments/summary` çağrısının farkı. AI değil,
  aritmetik; hangi dönemi karşılaştırdığını da yazıyor.
- **Bugünün randevuları, gelen kutusu, gelir grafiği:** gerçek uçlardan.

## Ne silindi (yerine bir şey uydurulmadı)
- `APPTS`, `SUGGESTIONS`, `INBOX` dizileri.
- Dört sahte sparkline ve sabit SVG gelir eğrisi.
- "AI ay sonu tahmini ₺1.18M" — tahmin modeli yok.
- "Hedef ₺1.10M" — sistemde hedef kavramı hiç yok.
- "%92 uyum", "iptal riski %62", "Boş slot" satırı — tahmin üreteci yok.
- Randevudaki kanal sütunu — modelde kanal alanı yok.
- Gelen kutusundaki yeşil okunmamış sayacı — `Conversation` böyle bir alan
  taşımıyor. Yerine gerçek olan: "yanıt bekliyor".

## Eğilim eşiği
Önceki dönemde tek ödemesi olan bir hizmet sıfıra düşünce "−%100" yazmak
gürültüyü içgörü gibi gösterirdi. Karşılaştırmaya girmek için hizmetin önceki
dönemde en az 3 ödemesi ve ₺1.000 tutarı olmalı. Hiçbiri geçemezse şerit
"yeterli ödeme kaydı yok" der.

## Bölme
`AnaEkran.tsx` 501 satırdı; Sistem ve Takvim'de yaptığımız gibi bölündü.
Hesaplar `utils/dashboard.ts` içinde saf fonksiyon — tarayıcısız
doğrulanabilmelerinin tek yolu bu.

## Doğrulama
- `typecheck` ve `build` 0 ile çıkıyor.
- `utils/dashboard.ts` node ile doğrulandı: doluluk (personelli/personelsiz/
  slotsuz), eğilim eşikleri (üç ayrı eleme durumu + hiç geçen yok), günlük
  gruplama (ödemesiz günler 0), tarih aralıkları (31 Mart → Şubat kırpması
  dahil).
- Ekranın göstereceği rakamlar API'den bağımsız hesaplanıp karşılaştırıldı.
- Uydurma kalıntısı taraması `AnaEkran` ağacında 0 döndü.
- **Tarayıcıda açılmadı** — Chrome eklentisi bu oturumda bağlı değil.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR gövdesindeki `<NUMARA>` yerine Task 1'de açılan backend PR'ının gerçek numarasını yaz.

- [ ] **Step 5: Merge**

Kullanıcı onaylarsa:

```bash
cd ~/Desktop/kisisel/w-lush-web
gh pr merge --squash --delete-branch
git checkout main && git pull && npm run typecheck
```

`git pull` "divergent branches" derse: spec/plan commit'leri `main`'de yerel kalmış ve PR'ın squash'ı onları da içermiştir. Önce `git fetch origin` ve `git diff main origin/main --stat` ile içeriğin uzakta olduğunu **doğrula**, sonra `git reset --hard origin/main`. Doğrulamadan reset atma.

---

## Bu planın kapsamadıkları

- `FirstTimeDashboard`'ın içeriği (yalnızca taşınıyor).
- `components/modals.tsx` içindeki `CONTACTS` / `SERVICES` / `STAFF` /
  `TEMPLATES` dizileri. Bu ekran onları kullanmayı bırakıyor ama diziler
  başka ekranlarda duruyor; ayrı temizlik işi.
- Sistem ekranındaki `TEMPLATES` mock'u.
- Okunmamış mesaj sayacı (backend'de böyle bir kavram yok; istenirse ayrı iş).
