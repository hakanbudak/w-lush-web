# Yeni Tasarım: Gelir Raporu ve Giderler — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** İki finans ekranını yeni tasarıma geçirmek ve ödemeleri danışana bağlamak.

**Architecture:** İki ekran aynı iskeleti paylaşıyor (dönem seçici → 3 KPI → kırılım + yan kart → tablo), o yüzden ortak parçalar `components/finance/` altında toplanıyor. Ödeme formu artık danışanı mevcut kayıtlardan seçtiriyor ve telefonu da yazıyor — Danışan Profili'ndeki "toplam harcama" bunun üstüne kurulacak.

**Tech Stack:** React 18 + TypeScript. **Backend değişikliği yok** (`PaymentIn` zaten `phone` alıyor).

**Tasarım kaynağı:** `Gelir Raporu.dc.html`, `Giderler.dc.html`, `README.md` §7–8.

## Global Constraints

- Yalnızca frontend. Kapılar: `typecheck`, `test`, `build`.
- Renk sabiti yazılmaz, `var(--…)`.
- Hiçbir rakam uydurulmaz; veri yoksa "kayıt yok" denir.
- Commit trailer'ı: `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

## Neden bu ekran sıraya öne alındı

Danışan Profili'ndeki "toplam harcama" ödemelerden hesaplanıyor, ama **hiçbir
ödemenin telefonu yok** (3/3 boş) çünkü form onu opsiyonel bırakıyor ve kimse
doldurmuyor. Bugün o kartı eklemek herkes için ₺0 gösterirdi. Kök neden burada,
o yüzden önce burası düzeltiliyor.

## Tasarımdan bilinçli sapmalar

1. **Dönem seçenekleri değişiyor:** "Çeyrek" kalkıyor, "Bugün" ve "Hafta"
   geliyor (tasarım: Bugün/Hafta/Ay/Yıl).
2. **Ödeme satırındaki hizmet metni** tasarımda "Kanal tedavisi (2/2)" gibi
   seans bilgisi taşıyor; sistemde seans sayacı yok, yalnızca hizmet adı yazılır.
3. **Danışan alanı serbest metin olarak da kalıyor.** Kayıtsız bir ziyaretçi
   nakit ödeyebilir; onu zorla bir danışana bağlamak veriyi bozar. O ödemeler
   toplamlara girer, kişi bazlı harcamaya girmez.

## Dosya yapısı

| Dosya | Sorumluluk |
|---|---|
| `src/utils/period.ts` | `Period` = gun/hafta/ay/yil; `rangeFor` |
| `src/utils/period.test.ts` (yeni) | Dönem aralıkları |
| `src/components/finance/PeriodPicker.tsx` | Dört seçenek, segmented görünüm |
| `src/components/finance/KpiTrio.tsx` (yeni) | Üç KPI kartı, accent parametreli |
| `src/components/finance/BreakdownBars.tsx` | Yatay bar + tutar + yüzde |
| `src/components/finance/CustomerPicker.tsx` (yeni) | Danışan seç / serbest yaz |
| `src/components/PaymentModal.tsx` | Danışan seçici |
| `src/pages/GelirRaporu.tsx` | Yeni yerleşim, satır içi silme onayı |
| `src/pages/Giderler.tsx` | Yeni yerleşim, denge kartı |

---

### Task 1: Dönemler

**Files:**
- Modify: `src/utils/period.ts`, `src/components/finance/PeriodPicker.tsx`
- Create: `src/utils/period.test.ts`

**Interfaces:**
- Produces: `type Period = 'gun' | 'hafta' | 'ay' | 'yil'`; `rangeFor(period, today?)`; `periodLabel(period, range)`.

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/tasarim-finans
```

- [ ] **Step 2: `period.ts`'i yaz**

```ts
// Dönem düğmeleri → somut tarih aralığı. Backend dönem kavramı bilmez,
// yalnız start/end alır; "bu ay"ın ne olduğu arayüzün kararıdır.

export type Period = 'gun' | 'hafta' | 'ay' | 'yil';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** JS getDay() → ISO gün numarası (1 = Pazartesi … 7 = Pazar). */
const isoDay = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

/**
 * Seçili dönemin ilk ve son günü (bugün dahil, yerel takvime göre).
 *
 * Hafta Pazartesi başlar — kliniğin `open_days` ayarı da ISO gün numarası
 * kullanıyor, iki yerde farklı hafta başlangıcı olması karışıklık yaratırdı.
 */
export function rangeFor(period: Period, today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (period === 'gun') {
    return { start: iso(today), end: iso(today) };
  }
  if (period === 'hafta') {
    const monday = new Date(today);
    monday.setDate(monday.getDate() + 1 - isoDay(today));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return { start: iso(monday), end: iso(sunday) };
  }
  if (period === 'ay') {
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  }
  return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
}

/** "2026-08" → "Ağu 2026" — aylık seyir barlarının etiketi. */
export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
};
```

`ceyrek` kullanan yer kaldıysa `typecheck` yakalar; onları `ay`a çevir.

- [ ] **Step 3: `PeriodPicker`'ı dörde çıkar ve segmented yap**

```tsx
const OPTIONS: [Period, string][] = [
  ['gun', 'Bugün'],
  ['hafta', 'Hafta'],
  ['ay', 'Ay'],
  ['yil', 'Yıl'],
];
```

Kap stilini tasarımın segmented görünümüne çevir: `--cream` ray, aktif buton
`--paper` + `boxShadow: '0 1px 2px rgba(23,35,61,0.12)'`, radius 9/7.

- [ ] **Step 4: Testleri yaz**

`src/utils/period.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { rangeFor } from './period';

describe('rangeFor', () => {
  const wednesday = new Date(2026, 7, 12); // 12 Ağustos 2026, Çarşamba

  it('gives a single day for today', () => {
    expect(rangeFor('gun', wednesday)).toEqual({ start: '2026-08-12', end: '2026-08-12' });
  });

  it('starts the week on Monday', () => {
    // Kliniğin open_days ayarı da ISO gün numarası kullanıyor.
    expect(rangeFor('hafta', wednesday)).toEqual({ start: '2026-08-10', end: '2026-08-16' });
  });

  it('keeps a Monday as the start of its own week', () => {
    expect(rangeFor('hafta', new Date(2026, 7, 10)).start).toBe('2026-08-10');
  });

  it('puts a Sunday in the week that started six days earlier', () => {
    expect(rangeFor('hafta', new Date(2026, 7, 16))).toEqual({
      start: '2026-08-10', end: '2026-08-16',
    });
  });

  it('covers the whole month, including days after today', () => {
    expect(rangeFor('ay', wednesday)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('knows a short month', () => {
    expect(rangeFor('ay', new Date(2026, 1, 5)).end).toBe('2026-02-28');
  });

  it('covers the whole year', () => {
    expect(rangeFor('yil', wednesday)).toEqual({ start: '2026-01-01', end: '2026-12-31' });
  });
});
```

- [ ] **Step 5: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck 2>&1 | tail -5 && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
git add src/utils/period.ts src/utils/period.test.ts src/components/finance/PeriodPicker.tsx src/pages
git commit -m "$(cat <<'EOF'
Change the finance periods to today/week/month/year

The design drops "çeyrek" and adds today and week. The week starts on Monday
to match the clinic's open_days, which is already ISO-numbered; two different
week starts in one product would be a bug waiting to happen.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Danışan seçici ve ödeme formu

**Files:**
- Create: `src/components/finance/CustomerPicker.tsx`
- Modify: `src/components/PaymentModal.tsx`

**Interfaces:**
- Produces:

```ts
export default function CustomerPicker({
  name, phone, onChange,
}: {
  name: string;
  phone: string;
  onChange: (next: { name: string; phone: string }) => void;
}): JSX.Element
```

- [ ] **Step 1: Seçiciyi yaz**

Mevcut danışanı seçmek hem ismi hem telefonu doldurur; kayıtsız kişi için
serbest metin kalır.

```tsx
import { useEffect, useState } from 'react';
import { listCustomers, type CustomerSummary } from '../../api/customers';

const field = {
  width: '100%', border: '1px solid var(--line-strong)', borderRadius: 8,
  padding: '9px 10px', font: 'inherit', fontSize: 13, background: 'var(--cream)',
  marginTop: 4,
} as const;

/**
 * Danışan alanı. Kayıtlı birini seçmek telefonu da doldurur — kişi bazlı
 * harcamanın hesaplanabilmesi buna bağlı. Kayıtsız ziyaretçi için serbest
 * metin bırakılıyor: onu zorla bir kayda bağlamak veriyi bozardı.
 */
export default function CustomerPicker({
  name,
  phone,
  onChange,
}: {
  name: string;
  phone: string;
  onChange: (next: { name: string; phone: string }) => void;
}) {
  const [rows, setRows] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    listCustomers().then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <label style={{ fontSize: 11, color: 'var(--ink-60)', display: 'block' }}>
        Danışan
        <input
          list="wl-customers"
          value={name}
          onChange={(e) => {
            const typed = e.target.value;
            const hit = rows.find((r) => (r.name || r.phone) === typed);
            onChange(hit ? { name: hit.name || '', phone: hit.phone } : { name: typed, phone });
          }}
          placeholder="Kayıtlı danışan seçin ya da isim yazın"
          style={field}
        />
        <datalist id="wl-customers">
          {rows.map((r) => (
            <option key={r.phone} value={r.name || r.phone} />
          ))}
        </datalist>
      </label>

      <label style={{ fontSize: 11, color: 'var(--ink-60)', display: 'block' }}>
        Telefon
        <input
          value={phone}
          onChange={(e) => onChange({ name, phone: e.target.value })}
          placeholder="905321112233"
          style={field}
        />
        <span style={{ fontSize: 10, color: 'var(--ink-45)' }}>
          Telefon girilen ödemeler danışan profilindeki harcamaya sayılır.
        </span>
      </label>
    </>
  );
}
```

- [ ] **Step 2: `PaymentModal`'a bağla**

`customer_name` ve `phone` alanlarını tek bir `CustomerPicker` ile değiştir;
hizmet alanı da `listServices()`'ten gelen bir `select` olsun (tasarım "hizmet
select" diyor). Gönderimde `phone: phone.trim() || null` kalır.

- [ ] **Step 3: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
git add src/components/
git commit -m "$(cat <<'EOF'
Link a payment to a customer

Picking a registered customer fills the phone too, which is what makes
per-customer spend computable — today every payment has an empty phone and
the profile screen would have shown ₺0 for everyone.

Free text stays allowed: a walk-in can pay cash, and forcing them onto a
record would corrupt the data to make a statistic look better.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Gelir Raporu

**Files:**
- Create: `src/components/finance/KpiTrio.tsx`
- Modify: `src/pages/GelirRaporu.tsx`, `src/components/finance/BreakdownBars.tsx`

- [ ] **Step 1: `KpiTrio`'yu yaz**

```tsx
/** Üç KPI kartı — iki finans ekranı da aynı iskeleti kullanıyor. */
export default function KpiTrio({
  accent,
  items,
}: {
  accent: string;
  items: { label: string; value: string; sub?: string }[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      {items.map((k) => (
        <div
          key={k.label}
          style={{
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderTop: `3px solid ${accent}`, borderRadius: 'var(--r-card)',
            padding: '16px 18px',
          }}
        >
          <div className="wl-label">{k.label}</div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 8 }}>
            {k.value}
          </div>
          {k.sub && (
            <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>{k.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Sayfayı yeniden düzenle**

- Üst bar: `useSetTopBarActions` ile `PeriodPicker` + "＋ Gelir ekle" (yeşil).
- KPI: Toplam gelir (`summary.total`), Ödeme sayısı (`summary.count`),
  Ortalama ödeme (`count ? Math.round(total / count) : 0`). Accent
  `var(--forest)`. Alt satırda dönem etiketi ("1 – 12 Ağustos · 96 ödeme")
  — tarihler `rangeFor`'dan, sayı `summary.count`'tan.
- 2fr/1fr: hizmet kırılımı (`BreakdownBars`) + ödeme yöntemi listesi
  (renk noktası + tutar + yüzde). Yüzde `amount / total`.
- Ödemeler tablosu: tarih, danışan, hizmet, yöntem, tutar, sil.
- **Satır içi silme onayı:** "Sil" tıklanınca aynı hücrede
  "Emin misiniz? **Sil** · Vazgeç" çıkar. Silinince `useToast()` ile bildirim.
  Tarayıcı `confirm()` kullanılmaz — bu ekranda tasarım satır içi onay diyor.
- Veri yoksa: "Bu dönemde ödeme kaydı yok."

- [ ] **Step 3: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
git add src/components/finance/KpiTrio.tsx src/pages/GelirRaporu.tsx src/components/finance/BreakdownBars.tsx
git commit -m "$(cat <<'EOF'
Rebuild the income report on the new design

Delete asks for confirmation inside the row rather than through a browser
dialog: the design calls for it, and a native confirm cannot say which
payment it is about.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Giderler

**Files:**
- Modify: `src/pages/Giderler.tsx`, `src/components/ExpenseModal.tsx`

- [ ] **Step 1: Sayfayı yeniden düzenle**

Gelir ile aynı iskelet, farklarıyla:

- KPI accent `var(--bad)`; kartlar: Toplam gider, Gider sayısı, Ortalama gider.
- Kategori kırılımı `BreakdownBars` ile.
- Yan kart **"Gelir–gider dengesi"**: aynı dönemin geliri (`payments/summary`),
  gideri, ve farkı. Net pozitifse `--forest-2`, negatifse `--bad`. Altında
  "AI yorumlu rapor üret →" bağlantısı (`/rapor`).
- Tabloda kategori chip'i renkli; silme yine satır içi onay + toast.

Gelir çağrısı bu ekranda **yeni**: `getSummary(start, end)` da çağrılacak.
İki istek `Promise.all` ile birlikte; biri düşerse denge kartı "hesaplanamadı"
der, sayfanın kalanı çalışmaya devam eder.

- [ ] **Step 2: `ExpenseModal` düğmesi**

Tasarım gider formunda **lacivert** kaydet düğmesi istiyor:
`style={{ background: 'var(--navy)', color: 'var(--navy-ink)' }}`.

- [ ] **Step 3: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
git add src/pages/Giderler.tsx src/components/ExpenseModal.tsx
git commit -m "$(cat <<'EOF'
Rebuild the expenses screen and add the balance card

The balance card needs the income summary too, so the two requests go
together; if one fails the card says so and the rest of the screen still
works.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Doğrulama ve PR

- [ ] **Step 1: Rakamları API'den bağımsız doğrula**

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
from datetime import date, timedelta
B = "http://localhost:5173"
def call(path, token=None):
    r = urllib.request.Request(B + path)
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())
def post(path, body):
    r = urllib.request.Request(B + path, data=json.dumps(body).encode(), method="POST")
    r.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(r) as resp: return json.loads(resp.read().decode())

tok = post("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"})["token"]["access_token"]
today = date.today()
monday = today - timedelta(days=today.isoweekday() - 1)
first = today.replace(day=1)
for label, s, e in [
    ("Bugün", today, today),
    ("Hafta", monday, monday + timedelta(days=6)),
    ("Ay", first, (first.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)),
    ("Yıl", date(today.year, 1, 1), date(today.year, 12, 31)),
]:
    inc = call(f"/api/payments/summary?start={s}&end={e}", tok)
    exp = call(f"/api/expenses/summary?start={s}&end={e}", tok)
    avg = round(inc["total"] / inc["count"]) if inc["count"] else 0
    print(f"{label:>6}: gelir ₺{inc['total']:<8} ({inc['count']} ödeme, ort ₺{avg})  "
          f"gider ₺{exp['total']:<8}  net ₺{inc['total'] - exp['total']}")
PY
```

- [ ] **Step 2: Tarayıcı turu**

Eklenti bağlıysa dört dönem, satır içi silme onayı, denge kartı. Bağlı değilse
**atla ve PR'da yaz.**

- [ ] **Step 3: PR aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git push -u origin feature/tasarim-finans
gh pr create --base main --head feature/tasarim-finans \
  --title "Yeni tasarım: Gelir Raporu ve Giderler" \
  --body "$(cat <<'EOF'
İki finans ekranı yeni tasarıma geçti. **Backend değişikliği yok.**

## Neden sıraya öne alındı
Danışan Profili'ndeki "toplam harcama" ödemelerden hesaplanacak, ama hiçbir
ödemenin telefonu yoktu (3/3 boş) — form onu opsiyonel bırakıyor ve kimse
doldurmuyordu. O kartı önce eklemek herkes için ₺0 gösterirdi. Kök neden bu
ekrandaydı.

## Değişenler
- **Dönemler**: Bugün / Hafta / Ay / Yıl (çeyrek kalktı). Hafta Pazartesi
  başlıyor — kliniğin `open_days` ayarı da ISO gün numarası kullanıyor.
- **Danışan seçici**: kayıtlı danışanı seçmek telefonu da dolduruyor.
  Serbest metin kalıyor; kayıtsız ziyaretçiyi zorla bir kayda bağlamak
  veriyi bozardı.
- **Üç KPI** her iki ekranda, ortak bileşen.
- **Satır içi silme onayı** — tarayıcı diyaloğu yerine, hangi kaydın
  silindiğini söyleyebilen bir onay.
- **Gelir–gider dengesi kartı** Giderler'de; net pozitif/negatif renklenir,
  altında AI rapora bağlantı.

## Doğrulama
- `typecheck`, `test`, `build` — 0. `rangeFor` yedi testle kilitlendi
  (Pazartesi başlangıcı, Pazar'ın hangi haftaya düştüğü, kısa ay dahil).
- Dört dönemin rakamları API'den bağımsız hesaplanıp karşılaştırıldı.
- **Tarayıcıda açılmadı** — Chrome eklentisi bağlı değil.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
