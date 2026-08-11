# Yeni Tasarım: Ana Ekran — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ana Ekran'ı yeni tasarıma geçirmek ve kabuğun bıraktığı üç eksiği tamamlamak: arama (⌘K), hızlı işlemler, hoş geldiniz turu.

**Architecture:** Arama için tek yeni backend ucu (`GET /api/search`), üç kaynağı tek yanıtta döndürür. Hızlı işlemler mevcut modalleri kullanır; "Mesaj gönder" alıcıyı serbest bırakmaz, mevcut konuşmalardan seçtirir. Tur saf frontend, `getBoundingClientRect` ile hedefi ölçen bir bileşen.

**Tech Stack:** FastAPI + SQLAlchemy (arama ucu), React 18 + TypeScript.

**Tasarım kaynağı:** `design_handoff_klinik_redesign/Ana Ekran.dc.html` + `README.md` §2.

## Global Constraints

- İki repo; backend PR'ı önce merge edilir.
- **Backend commit mesajlarında Claude atfı yasak** (`.githooks/commit-msg` + CI `commit-lint`). Frontend'de trailer serbest.
- Kapılar: backend `ruff check app tests` + `pytest`; frontend `typecheck` + `test` + `build`.
- Yeni backend davranışı **teste bağlanır** — altyapı var, kullanılmazsa çürür.
- Hiçbir rakam uydurulmaz. Veri yoksa bölüm "kayıt yok" der.
- Terminoloji "danışan".
- Tasarım token'ları kabuk işinde tanımlandı; yeni renk sabiti yazılmaz, `var(--…)` kullanılır.

## Tasarımdan bilinçli sapmalar

1. **"Mesaj gönder" alıcı seçimi.** Tasarım serbest alıcı gösteriyor; API yalnızca kliniğin **mevcut konuşması olan** numaraya yazmaya izin veriyor (`_own_thread`, selamet/w-lush#19). Bu bir kısıt değil, kasıtlı koruma: hiç yazışmamış birine serbest metin göndermek Meta politikasını ihlal eder ve kliniğin numarasını kapattırır. Modal bu yüzden mevcut konuşmalardan seçtirir.
2. **"Fatura" araması.** Sistemde fatura kavramı yok; ödeme kaydı var. Arama ödemeleri tarar, sonuç grubunun başlığı "Ödemeler".
3. **Turun tetikleyicisi.** Tasarım `?tour=1` ile kurulum sihirbazından geliyor; sihirbaz henüz yok. Tur `?tour=1` ile ve Sistem'den elle açılabilir olacak; sihirbaz geldiğinde tek satırla bağlanır.

## Dosya yapısı

**Backend (dal: `feature/arama-ucu`)**

| Dosya | Sorumluluk |
|---|---|
| `app/search/__init__.py`, `service.py`, `schemas.py`, `router.py` (yeni) | `GET /api/search` |
| `app/main.py` | router kaydı |
| `tests/test_search.py` (yeni) | kapsam, yalıtım, sınırlar |

**Frontend (dal: `feature/tasarim-anaekran`)**

| Dosya | Sorumluluk |
|---|---|
| `src/api/search.ts` (yeni) | arama istemcisi |
| `src/components/shell/SearchBox.tsx` (yeni) | ⌘K kutusu + sonuç listesi |
| `src/components/TopBar.tsx` | arama kutusunu ortaya alır |
| `src/components/anaekran/QuickActions.tsx` (yeni) | "Mesaj gönder" + "Yeni randevu" |
| `src/components/anaekran/SendMessageModal.tsx` (yeni) | mevcut konuşmaya mesaj |
| `src/components/anaekran/Tour.tsx` (yeni) | 5 adımlı hoş geldiniz turu |
| `src/components/anaekran/KpiRow.tsx` | üst kenar rengi + delta chip |
| `src/components/anaekran/DailyRevenueChart.tsx` | 31 gün, geçmiş/bugün/gelecek |
| `src/components/anaekran/RichDashboard.tsx` | yeni parçaları bağlar |

---

### Task 1: Arama ucu

**Files:**
- Create: `app/search/__init__.py`, `app/search/schemas.py`, `app/search/service.py`, `app/search/router.py`
- Modify: `app/main.py`

**Interfaces:**
- Produces: `GET /api/search?q=<metin>` →

```json
{
  "customers":    [{"phone": "9053...", "name": "Ayşe Yılmaz"}],
  "appointments": [{"id": 4, "appt_date": "2026-08-11", "appt_time": "10:00",
                    "customer_name": "Ayşe Yılmaz", "service_name": "Hydrafacial",
                    "status": "confirmed"}],
  "payments":     [{"id": 1, "paid_at": "2026-08-07", "amount": 4100,
                    "customer_name": "Ayşe Yılmaz", "service_name": "Mezoterapi"}]
}
```

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush
git checkout main && git pull
git checkout -b feature/arama-ucu
```

- [ ] **Step 2: Şemaları yaz**

`app/search/__init__.py` boş dosya. `app/search/schemas.py`:

```python
"""Response shapes for the panel's global search."""
from datetime import date

from pydantic import BaseModel


class CustomerHit(BaseModel):
    phone: str
    name: str


class AppointmentHit(BaseModel):
    id: int
    appt_date: date
    appt_time: str
    customer_name: str
    service_name: str
    status: str


class PaymentHit(BaseModel):
    id: int
    paid_at: date
    amount: int
    customer_name: str
    service_name: str


class SearchOut(BaseModel):
    """Three groups in one response: the box shows them under headings."""

    customers: list[CustomerHit]
    appointments: list[AppointmentHit]
    payments: list[PaymentHit]
```

- [ ] **Step 3: Servisi yaz**

`app/search/service.py`:

```python
"""Global search across the panel's three record types.

One query per type rather than a union: the results are grouped in the UI
anyway, and three small indexed queries beat one that cannot use an index.
"""
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.clinic.models import Appointment
from app.conversations.models import Message
from app.customers.models import Customer
from app.payments.models import Payment

# Per group. The box is a shortcut, not a report; more rows would push the
# other groups off screen.
LIMIT = 5


def _like(term: str) -> str:
    # Escape the wildcards so a customer searching for "%" finds "%".
    cleaned = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{cleaned}%"


def customers(db: Session, clinic_id: int, term: str) -> list[dict]:
    """Name or phone. Phones that only ever appear on an appointment are
    covered by the appointment group, so this stays on the customers table.
    """
    pattern = _like(term)
    stmt = (
        select(Customer.phone, Customer.name)
        .where(
            Customer.clinic_id == clinic_id,
            or_(Customer.name.ilike(pattern), Customer.phone.ilike(pattern)),
        )
        .order_by(Customer.name)
        .limit(LIMIT)
    )
    return [{"phone": p, "name": n or ""} for p, n in db.execute(stmt).all()]


def appointments(db: Session, clinic_id: int, term: str) -> list[Appointment]:
    pattern = _like(term)
    stmt = (
        select(Appointment)
        .where(
            Appointment.clinic_id == clinic_id,
            or_(
                Appointment.customer_name.ilike(pattern),
                Appointment.phone.ilike(pattern),
                Appointment.service_name.ilike(pattern),
            ),
        )
        .order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc())
        .limit(LIMIT)
    )
    return list(db.scalars(stmt).all())


def payments(db: Session, clinic_id: int, term: str) -> list[Payment]:
    pattern = _like(term)
    stmt = (
        select(Payment)
        .where(
            Payment.clinic_id == clinic_id,
            or_(
                Payment.customer_name.ilike(pattern),
                Payment.service_name.ilike(pattern),
                Payment.note.ilike(pattern),
            ),
        )
        .order_by(Payment.paid_at.desc(), Payment.id.desc())
        .limit(LIMIT)
    )
    return list(db.scalars(stmt).all())
```

`Message` importu kullanılmıyorsa sil — ruff yakalar.

- [ ] **Step 4: Router'ı yaz**

`app/search/router.py`:

```python
"""Global search for the panel's top bar."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.search import service
from app.search.schemas import SearchOut

router = APIRouter(prefix="/api", tags=["search"])

# Below this a search matches most of the table and helps nobody.
MIN_LENGTH = 2


@router.get("/search", response_model=SearchOut)
def search(
    q: str = "",
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Customers, appointments and payments in one response, grouped.

    A short query returns empty groups rather than an error: the box calls
    this on every keystroke and an error on "a" would be noise.
    """
    term = q.strip()
    if len(term) < MIN_LENGTH:
        return SearchOut(customers=[], appointments=[], payments=[])
    return SearchOut(
        customers=service.customers(db, current.clinic_id, term),
        appointments=service.appointments(db, current.clinic_id, term),
        payments=service.payments(db, current.clinic_id, term),
    )
```

`app/main.py`'de diğer router kayıtlarının yanına ekle:

```python
from app.search.router import router as search_router
...
app.include_router(search_router)
```

- [ ] **Step 5: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app && .venv/bin/python -c "import app.main; print('import ok')"
```

- [ ] **Step 6: Testleri yaz**

`tests/test_search.py`:

```python
"""Global search: coverage, scoping and limits."""


def _book(client, clinic, auth, *, phone, name, service, date="2026-09-20"):
    slots = client.get("/api/settings", headers=auth(clinic)).json()["slot_times"]
    res = client.post(
        "/api/appointments",
        json={
            "phone": phone, "customer_name": name, "service_name": service,
            "appt_date": date, "appt_time": slots[0], "staff_id": None,
            "notify": False,
        },
        headers=auth(clinic),
    )
    assert res.status_code == 201, res.text
    return res.json()["appointment"]


def _pay(client, clinic, auth, *, name, service, amount=1000):
    res = client.post(
        "/api/payments",
        json={
            "paid_at": "2026-09-20", "amount": amount, "method": "cash",
            "service_name": service, "customer_name": name, "phone": None,
            "note": "",
        },
        headers=auth(clinic),
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_a_short_query_returns_nothing(client, clinic_a, auth):
    """The box calls this on every keystroke; "a" must not be an error."""
    res = client.get("/api/search?q=a", headers=auth(clinic_a))
    assert res.status_code == 200
    assert res.json() == {"customers": [], "appointments": [], "payments": []}


def test_it_finds_an_appointment_by_customer_name(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110001", name="Ayşe Yılmaz",
          service="Hydrafacial")
    hits = client.get("/api/search?q=Ayşe", headers=auth(clinic_a)).json()
    assert [a["customer_name"] for a in hits["appointments"]] == ["Ayşe Yılmaz"]


def test_it_finds_an_appointment_by_service(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110002", name="Cem", service="Botoks")
    hits = client.get("/api/search?q=botoks", headers=auth(clinic_a)).json()
    assert len(hits["appointments"]) == 1, "search should ignore case"


def test_it_finds_a_payment(client, clinic_a, auth):
    _pay(client, clinic_a, auth, name="Zeynep Kaya", service="Mezoterapi")
    hits = client.get("/api/search?q=mezoterapi", headers=auth(clinic_a)).json()
    assert [p["customer_name"] for p in hits["payments"]] == ["Zeynep Kaya"]


def test_it_finds_a_customer_by_phone(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321119876", name="Deniz",
          service="Konsültasyon")
    hits = client.get("/api/search?q=9876", headers=auth(clinic_a)).json()
    assert any(c["phone"].endswith("9876") for c in hits["customers"]) or \
        any(a["id"] for a in hits["appointments"]), "phone should match somewhere"


def test_another_clinics_records_never_appear(client, clinic_a, clinic_b, auth):
    _book(client, clinic_a, auth, phone="905321110003", name="Gizli Danışan",
          service="Hydrafacial")
    _pay(client, clinic_a, auth, name="Gizli Danışan", service="Hydrafacial")
    hits = client.get("/api/search?q=Gizli", headers=auth(clinic_b)).json()
    assert hits == {"customers": [], "appointments": [], "payments": []}


def test_search_needs_a_token(client):
    assert client.get("/api/search?q=test").status_code == 401


def test_a_wildcard_is_searched_literally(client, clinic_a, auth):
    """"%" must find a record containing "%", not every record."""
    _book(client, clinic_a, auth, phone="905321110004", name="İndirim %20",
          service="Konsültasyon")
    _book(client, clinic_a, auth, phone="905321110005", name="Başka Biri",
          service="Konsültasyon", date="2026-09-21")
    hits = client.get("/api/search?q=%25", headers=auth(clinic_a)).json()
    names = [a["customer_name"] for a in hits["appointments"]]
    assert names == ["İndirim %20"], f"wildcard leaked: {names}"


def test_each_group_is_capped(client, clinic_a, auth):
    for i in range(7):
        _pay(client, clinic_a, auth, name=f"Tekrar {i}", service="Tekrarlı Hizmet")
    hits = client.get("/api/search?q=Tekrarlı", headers=auth(clinic_a)).json()
    assert len(hits["payments"]) == 5, "the box is a shortcut, not a report"
```

- [ ] **Step 7: Testleri çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest tests/test_search.py -p no:cacheprovider 2>&1 | grep -iE "passed|failed|FAILED|assert" | tail -8
```

Beklenen: 9 test PASSED.

`test_a_wildcard_is_searched_literally` düşerse `_like` kaçışı çalışmıyordur — SQLite'ta `ilike` için `escape` belirtmek gerekebilir. O durumda `Customer.name.ilike(pattern, escape="\\")` biçimine geç ve üç sorguda da uygula.

`test_it_finds_a_customer_by_phone` düşerse: randevu oluşturmak `customers` tablosuna satır yazmıyor olabilir. Testin iddiası zaten "ikisinden birinde bulunsun" — yine düşerse `overview` mantığına bakıp testi gerçeğe göre daralt, uçları değil.

- [ ] **Step 8: Tüm takım ve commit**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests && .venv/bin/pytest -p no:cacheprovider 2>&1 | grep -iE "passed|failed"
git add app/search app/main.py tests/test_search.py
git commit -m "$(cat <<'EOF'
Add global search for the panel's top bar

Three small scoped queries rather than one union: the results are grouped in
the UI anyway, and a union across three tables cannot use an index.

LIKE wildcards in the query are escaped. Without that a search for "%" would
match every row, which is both useless and a way to pull the whole table five
rows at a time.

A query shorter than two characters returns empty groups instead of an error:
the box calls this on every keystroke.
EOF
)"
```

- [ ] **Step 9: PR aç ve merge et**

```bash
cd ~/Desktop/kisisel/w-lush
git push -u origin feature/arama-ucu
gh pr create --base main --head feature/arama-ucu \
  --title "Panel araması: GET /api/search" \
  --body "$(cat <<'EOF'
Yeni tasarımdaki üst bar aramasının (⌘K) arkası. Danışan, randevu ve ödeme
kayıtlarını tek yanıtta, gruplu döndürür.

Tasarım "fatura" diyor; sistemde fatura kavramı yok, ödeme var — grup başlığı
buna göre.

## Kararlar
- Üç ayrı sorgu, union değil: sonuçlar arayüzde zaten gruplu ve üç küçük
  sorgu indeks kullanabilirken union kullanamaz.
- Sorgudaki LIKE joker karakterleri kaçırılıyor. Aksi hâlde "%" araması her
  satırı eşler — hem işe yaramaz hem de tabloyu beşer beşer dökmenin yolu olur.
- 2 karakterden kısa sorgu boş grup döndürür, hata değil: kutu her tuş
  vuruşunda çağırıyor.
- Grup başına 5 sonuç. Kutu bir kısayol, rapor değil.

## Doğrulama
9 test: isimle/hizmetle/telefonla bulma, büyük-küçük harf, ödeme bulma,
**başka kliniğin kaydının hiç görünmemesi**, token'sız 401, joker karakterin
harfi harfine aranması, grup sınırı.
EOF
)"
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

### Task 2: Arama kutusu

**Files:**
- Create: `src/api/search.ts`, `src/components/shell/SearchBox.tsx`
- Modify: `src/components/TopBar.tsx`

**Interfaces:**
- Produces: `searchAll(q: string): Promise<SearchResults>`; `<SearchBox />`.

- [ ] **Step 1: Dalı aç ve istemciyi yaz**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/tasarim-anaekran
```

`src/api/search.ts`:

```ts
import { request } from './client';

export interface CustomerHit {
  phone: string;
  name: string;
}

export interface AppointmentHit {
  id: number;
  appt_date: string;
  appt_time: string;
  customer_name: string;
  service_name: string;
  status: string;
}

export interface PaymentHit {
  id: number;
  paid_at: string;
  amount: number;
  customer_name: string;
  service_name: string;
}

export interface SearchResults {
  customers: CustomerHit[];
  appointments: AppointmentHit[];
  payments: PaymentHit[];
}

export const searchAll = (q: string) =>
  request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`);
```

- [ ] **Step 2: `SearchBox.tsx`'i yaz**

Tasarım: `Ana Ekran.dc.html` üst bar bölümü — 400px, 36px yükseklik, `--cream` zemin, sol arama ikonu, sağda ⌘K etiketi, odakta yeşil kenar.

```tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchAll, type SearchResults } from '../../api/search';
import { Icon } from '../icons';

const EMPTY: SearchResults = { customers: [], appointments: [], payments: [] };

const money = (n: number): string => `₺ ${n.toLocaleString('tr-TR')}`;

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: '6px 0' }}>
      <div className="wl-label" style={{ padding: '4px 12px' }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ onClick, primary, secondary }: {
  onClick: () => void;
  primary: string;
  secondary: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={onClick}
      style={{
        display: 'flex', width: '100%', alignItems: 'baseline', gap: 8,
        padding: '7px 12px', border: 'none', background: 'transparent',
        font: 'inherit', textAlign: 'left', cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 13 }}>{primary}</span>
      <span style={{ fontSize: 11, color: 'var(--ink-45)' }}>{secondary}</span>
    </button>
  );
}

export default function SearchBox() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // ⌘K / Ctrl+K odaklar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Yazmayı bırakınca ara. Her tuşta istek atmak sunucuyu boşuna yorar.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      return;
    }
    const t = setTimeout(() => {
      searchAll(term)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => setResults(EMPTY));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path: string) => {
    setOpen(false);
    setQ('');
    navigate(path);
  };

  const total =
    results.customers.length + results.appointments.length + results.payments.length;

  return (
    <div style={{ width: 400, position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute', left: 13, display: 'flex', color: 'var(--ink-40)',
          }}
        >
          {Icon.search}
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder="Danışan, randevu, ödeme ara"
          style={{
            width: '100%', height: 36, padding: '0 52px 0 38px',
            border: '1px solid var(--line-strong)', borderRadius: 9,
            background: 'var(--cream)', font: 'inherit', fontSize: 13,
            color: 'var(--ink)', outline: 'none',
          }}
        />
        <span
          style={{
            position: 'absolute', right: 10, fontSize: 10, color: 'var(--ink-40)',
            border: '1px solid var(--line-strong)', padding: '2px 6px',
            borderRadius: 5, background: 'var(--paper)',
          }}
        >
          ⌘K
        </span>
      </div>

      {open && q.trim().length >= 2 && (
        <div
          style={{
            position: 'absolute', top: 42, left: 0, right: 0, zIndex: 40,
            background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 12, boxShadow: '0 18px 40px -12px rgba(23,35,61,0.28)',
            maxHeight: 380, overflowY: 'auto',
          }}
        >
          {total === 0 ? (
            <div style={{ padding: 14, fontSize: 12, color: 'var(--ink-45)' }}>
              Sonuç yok.
            </div>
          ) : (
            <>
              {results.customers.length > 0 && (
                <Group title="Danışanlar">
                  {results.customers.map((c) => (
                    <Row
                      key={c.phone}
                      primary={c.name || c.phone}
                      secondary={c.name ? c.phone : ''}
                      onClick={() => go(`/danisan/${encodeURIComponent(c.phone)}`)}
                    />
                  ))}
                </Group>
              )}
              {results.appointments.length > 0 && (
                <Group title="Randevular">
                  {results.appointments.map((a) => (
                    <Row
                      key={a.id}
                      primary={a.customer_name || '—'}
                      secondary={`${a.appt_date} · ${a.appt_time} · ${a.service_name}`}
                      onClick={() => go('/randevu')}
                    />
                  ))}
                </Group>
              )}
              {results.payments.length > 0 && (
                <Group title="Ödemeler">
                  {results.payments.map((p) => (
                    <Row
                      key={p.id}
                      primary={p.customer_name || '—'}
                      secondary={`${p.paid_at} · ${money(p.amount)} · ${p.service_name}`}
                      onClick={() => go('/gelir')}
                    />
                  ))}
                </Group>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

`onMouseDown` kullanılıyor çünkü `onBlur` listeyi `onClick`'ten önce kapatır ve tıklama kaybolur.

- [ ] **Step 3: Üst bara yerleştir**

`src/components/TopBar.tsx` içinde `<div style={{ flex: 1 }} />` yerine:

```tsx
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <SearchBox />
      </div>
```

ve importu ekle: `import SearchBox from './shell/SearchBox';`

- [ ] **Step 4: Kapılar ve doğrulama**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

Arama ucunun proxy üzerinden çalıştığını doğrula:

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
for term in ("ay", "mezo", "yok-boyle-bir-sey"):
    r = call(f"/api/search?q={urllib.parse.quote(term)}" if False else "/api/search?q=" + term, token=tok)
    print(f"{term:>22} → danışan {len(r['customers'])}, randevu {len(r['appointments'])}, ödeme {len(r['payments'])}")
PY
```

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/api/search.ts src/components/shell/SearchBox.tsx src/components/TopBar.tsx
git commit -m "$(cat <<'EOF'
Add the top bar search

Results are grouped and each row navigates to the screen that owns the
record. The box waits 250ms after typing stops — one request per keystroke
would hammer the server for nothing.

Rows use onMouseDown: onBlur closes the list before onClick fires, so a
click would otherwise never land.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Hızlı işlemler

**Files:**
- Create: `src/components/anaekran/SendMessageModal.tsx`, `src/components/anaekran/QuickActions.tsx`
- Modify: `src/components/anaekran/RichDashboard.tsx`

**Interfaces:**
- Consumes: `listConversations`, `sendReply`, `AppointmentModal`, `useSetTopBarActions`.
- Produces: `<QuickActions onCreated={...} />` — üst bara iki düğme koyar.

- [ ] **Step 1: `SendMessageModal.tsx`'i yaz**

```tsx
import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError } from '../../api/client';
import { listConversations, sendReply, type Conversation } from '../../api/conversations';
import { Modal } from '../modals';

const field: CSSProperties = {
  width: '100%', border: '1px solid var(--line-strong)', borderRadius: 8,
  padding: '9px 10px', font: 'inherit', fontSize: 13, background: 'var(--cream)',
  marginTop: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 11, color: 'var(--ink-60)', display: 'block',
};

/**
 * Mevcut bir konuşmaya mesaj. Alıcı serbest bırakılmıyor: API yalnızca
 * kliniğin daha önce yazıştığı numaraya izin veriyor ve bu kasıtlı — hiç
 * yazışmamış birine serbest metin göndermek kliniğin WhatsApp numarasını
 * kapattırır.
 */
export default function SendMessageModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (name: string) => void;
}) {
  const [rows, setRows] = useState<Conversation[] | null>(null);
  const [phone, setPhone] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    listConversations()
      .then((r) => {
        setRows(r);
        if (r.length > 0) setPhone(r[0].phone);
      })
      .catch(() => setRows([]));
  }, []);

  const submit = () => {
    const body = text.trim();
    if (!phone) {
      setError('Alıcı seçilmeli.');
      return;
    }
    if (!body) {
      setError('Mesaj boş olamaz.');
      return;
    }
    setSending(true);
    setError(null);
    sendReply(phone, body)
      .then(() => {
        const who = rows?.find((r) => r.phone === phone);
        onSent(who?.customer_name || phone);
        onClose();
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        setError(api?.detail || 'Mesaj gönderilemedi.');
        setSending(false);
      });
  };

  return (
    <Modal title="Mesaj gönder" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows !== null && rows.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.5 }}>
            Henüz hiç konuşma yok. WhatsApp'tan size yazan danışanlara buradan
            yanıt verebilirsiniz.
          </div>
        ) : (
          <>
            <label style={labelStyle}>
              Alıcı
              <select
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={field}
              >
                {(rows ?? []).map((r) => (
                  <option key={r.phone} value={r.phone}>
                    {r.customer_name || r.phone}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              Mesaj
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                style={{ ...field, resize: 'vertical' }}
              />
            </label>
          </>
        )}

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          {rows !== null && rows.length > 0 && (
            <button
              type="button"
              className="wl-btn wl-btn-sm"
              onClick={submit}
              disabled={sending}
            >
              {sending ? 'Gönderiliyor…' : 'Gönder'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: `QuickActions.tsx`'i yaz**

```tsx
import { useState } from 'react';
import { getSettings, type AppointmentCreated } from '../../api/clinic';
import { listStaff, type StaffMember } from '../../api/staff';
import { useEffect } from 'react';
import { Icon } from '../icons';
import AppointmentModal from '../randevu/AppointmentModal';
import { useSetTopBarActions } from '../shell/TopBarActions';
import SendMessageModal from './SendMessageModal';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Üst bardaki iki düğme ve açtıkları modaller. */
export default function QuickActions({
  onCreated,
  onSent,
}: {
  onCreated: (created: AppointmentCreated) => void;
  onSent: (name: string) => void;
}) {
  const [modal, setModal] = useState<'msg' | 'appt' | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    getSettings().then((s) => setSlots(s.slot_times ?? [])).catch(() => setSlots([]));
    listStaff().then((r) => setStaff(r.filter((s) => s.active))).catch(() => setStaff([]));
  }, []);

  useSetTopBarActions(
    <>
      <button
        type="button"
        onClick={() => setModal('msg')}
        className="wl-btn wl-btn-ghost wl-btn-sm"
        style={{ height: 34, borderRadius: 9, fontSize: 12.5, gap: 7 }}
      >
        <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.chat}</span>
        Mesaj gönder
      </button>
      <button
        type="button"
        onClick={() => setModal('appt')}
        className="wl-btn wl-btn-sm"
        style={{ height: 34, borderRadius: 9, fontSize: 12.5, fontWeight: 600 }}
        disabled={slots.length === 0}
      >
        {Icon.plus}Yeni randevu
      </button>
    </>,
    [slots.length],
  );

  return (
    <>
      {modal === 'msg' && (
        <SendMessageModal onClose={() => setModal(null)} onSent={onSent} />
      )}
      {modal === 'appt' && (
        <AppointmentModal
          slots={slots}
          staff={staff}
          initial={{ date: iso(new Date()), time: slots[0] ?? '', staffId: null }}
          onClose={() => setModal(null)}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
```

İki `useEffect` importu tek satıra toplanmalı; ruff yok ama `typecheck` ve okunabilirlik için düzelt.

- [ ] **Step 3: Panoya bağla**

`RichDashboard.tsx` içinde, `return (` bloğunun başına `<QuickActions … />` ekle ve bir bildirim satırı durumu tut:

```tsx
  const [notice, setNotice] = useState<string | null>(null);
```

```tsx
      <QuickActions
        onCreated={(created) => {
          setNotice(
            created.notified
              ? 'Randevu oluşturuldu, müşteriye WhatsApp bilgisi gönderildi.'
              : 'Randevu oluşturuldu, ancak müşteriye mesaj iletilemedi.',
          );
          load();
        }}
        onSent={(name) => setNotice(`${name} kişisine mesaj gönderildi.`)}
      />
```

`RichDashboard`'ın veri çekmesi şu an `useEffect` içinde tek seferlik; `load` diye ayrı bir fonksiyona çıkar ki randevu oluşunca pano tazelensin. Mevcut `useEffect` gövdesini `const load = useCallback(() => { … }, [])` içine al ve `useEffect(load, [load])` ile çağır.

Bildirim satırını KPI'ların üstünde göster:

```tsx
      {notice && (
        <div
          style={{
            background: 'var(--forest-3)', color: 'var(--forest-2)',
            border: '1px solid var(--line)', borderRadius: 'var(--r-card)',
            padding: '10px 16px', fontSize: 12.5, display: 'flex', gap: 12,
            alignItems: 'center',
          }}
        >
          <span style={{ flex: 1 }}>{notice}</span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            onClick={() => setNotice(null)}
          >
            Tamam
          </button>
        </div>
      )}
```

- [ ] **Step 4: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck 2>&1 | tail -6 && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/
git commit -m "$(cat <<'EOF'
Add the top bar quick actions

"Mesaj gönder" picks from existing conversations instead of a free recipient
field. The API refuses numbers the clinic never talked to, and that refusal
is deliberate: free text to someone who never wrote in is what gets a
WhatsApp number banned.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: KPI kartları ve gelir grafiği

**Files:**
- Modify: `src/components/anaekran/KpiRow.tsx`, `src/components/anaekran/DailyRevenueChart.tsx`

- [ ] **Step 1: KPI kartlarını tasarıma göre yaz**

Tasarım: üst kenarda 3px renkli çizgi, etiket küçük uppercase, değer büyük, delta chip. `ui.tsx`'teki genel `KpiCard` başka ekranlarda da kullanılıyor; **onu değiştirme**, Ana Ekran'a özel kart bu dosyada tanımlansın.

`KpiRow.tsx` içindeki `KpiCard` kullanımını şu yerel bileşenle değiştir:

```tsx
function Card({
  label, value, delta, tone, accent,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'good' | 'bad';
  accent: string;
}) {
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderTop: `3px solid ${accent}`,
        borderRadius: 'var(--r-card)',
        padding: '16px 18px',
      }}
    >
      <div className="wl-label">{label}</div>
      <div
        style={{
          display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {delta && (
          <span
            style={{
              fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
              background: tone === 'bad' ? 'var(--bad-soft)' : 'var(--forest-3)',
              color: tone === 'bad' ? 'var(--bad)' : 'var(--forest-2)',
            }}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}
```

Dört kartın accent renkleri: gelir `var(--forest)`, doluluk `var(--blue)`, ay geliri `var(--ai)`, yeni danışan `var(--warn)`. `KpiCard` importu artık kullanılmıyorsa sil.

- [ ] **Step 2: Grafiği ayın tamamına genişlet**

Tasarım ayın 31 gününü çiziyor: geçmiş lacivert, bugün yeşil, gelecek `--ink-08` üstünde 3px tırnak.

`DailyRevenueChart.tsx` içindeki bar döngüsünü şununla değiştir ve bileşene `today: string` prop'u ekle:

```tsx
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140 }}>
            {days.map((d) => {
              const future = d.day > today;
              const isToday = d.day === today;
              return (
                <div
                  key={d.day}
                  title={`${d.day} · ${money(d.amount)}`}
                  style={{
                    flex: 1,
                    height: future ? 3 : Math.max(2, Math.round((d.amount / max) * 120)),
                    background: future
                      ? 'var(--ink-08)'
                      : isToday
                        ? 'var(--forest)'
                        : 'var(--navy)',
                    borderRadius: 3,
                    transformOrigin: 'bottom',
                    animation: 'wl-grow .5s ease both',
                  }}
                />
              );
            })}
          </div>
```

`RichDashboard`'da `dailyTotals`'a verilen bitiş tarihi ayın **son gününe** çıkarılmalı ki gelecek günler de çizilsin. `utils/dashboard.ts`'e ekle:

```ts
/** Ayın tamamı — grafik gelecek günleri de boş tırnak olarak çiziyor. */
export function monthFull(today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
}
```

`RichDashboard`: `days: dailyTotals(monthPayments, monthFull(today).start, monthFull(today).end)` ve `<DailyRevenueChart … today={iso-bugün} />`.

`design-system.css`'e animasyonu ekle:

```css
@keyframes wl-grow {
  from { transform: scaleY(0); }
  to   { transform: scaleY(1); }
}
```

- [ ] **Step 3: `monthFull` için test yaz**

`src/utils/dashboard.test.ts` içindeki "date ranges" bloğuna:

```ts
  it('covers the whole month, not just up to today', () => {
    // The chart draws future days as empty nubs, so the range must reach the
    // end of the month.
    expect(monthFull(t)).toEqual({ start: '2026-08-01', end: '2026-08-31' });
  });

  it('knows a short month', () => {
    expect(monthFull(new Date(2026, 1, 10)).end).toBe('2026-02-28');
  });
```

importa `monthFull` ekle.

- [ ] **Step 4: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

Beklenen: 26 test.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/anaekran/ src/utils/dashboard.ts src/utils/dashboard.test.ts src/styles/design-system.css
git commit -m "$(cat <<'EOF'
Restyle the KPI cards and widen the revenue chart to the month

The chart now draws the whole month: past days navy, today green, days that
have not happened yet as flat nubs. Stopping at today made a half-finished
month look like a collapse.

The shared KpiCard is left alone — other screens use it; this variant is
local to the dashboard.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Hoş geldiniz turu

**Files:**
- Create: `src/components/anaekran/Tour.tsx`
- Modify: `src/components/anaekran/RichDashboard.tsx`

**Interfaces:**
- Produces: `<Tour steps={…} onDone={…} />`; hedefler `data-tour` özniteliğiyle bulunur.

- [ ] **Step 1: `Tour.tsx`'i yaz**

Hedefi `ref` yerine `data-tour` ile bulmak, turun kabuktaki öğeleri (kenar menü, arama, aksiyonlar) de gösterebilmesi için gerekli — onlar bu ağacın dışında.

```tsx
import { useCallback, useEffect, useState } from 'react';

export interface TourStep {
  target: string; // data-tour değeri
  place: 'right' | 'below' | 'left';
  title: string;
  text: string;
}

interface Box { x: number; y: number; w: number; h: number }

const PAD = 6;

export default function Tour({
  steps,
  onDone,
}: {
  steps: TourStep[];
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${steps[i].target}"]`);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
  }, [i, steps]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Hedef bulunamazsa tur sessizce biter: ekranda olmayan bir şeyi
  // işaret eden boş bir spot, turun kendisinden kötüdür.
  useEffect(() => {
    if (box === null) onDone();
  }, [box, onDone]);

  if (box === null) return null;

  const step = steps[i];
  const tip =
    step.place === 'right'
      ? { left: box.x + box.w + 18, top: Math.max(20, box.y) }
      : step.place === 'left'
        ? { left: Math.max(20, box.x - 318), top: Math.max(20, box.y) }
        : { left: Math.max(20, box.x), top: box.y + box.h + 14 };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
      <div
        style={{
          position: 'absolute',
          left: box.x, top: box.y, width: box.w, height: box.h,
          border: '2px solid var(--forest)',
          borderRadius: 10,
          boxShadow: '0 0 0 9999px var(--scrim)',
          transition: 'all .35s ease',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute', ...tip, width: 300,
          background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 'var(--r-card)', padding: 16,
          boxShadow: '0 18px 40px -12px rgba(23,35,61,0.4)',
          transition: 'all .35s ease',
        }}
      >
        <div className="wl-label" style={{ marginBottom: 6 }}>
          {i + 1} / {steps.length}
        </div>
        <div className="wl-display" style={{ fontSize: 15, marginBottom: 6 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-60)', lineHeight: 1.5 }}>
          {step.text}
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8, marginTop: 14,
          }}
        >
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ fontSize: 12 }}
            onClick={onDone}
          >
            Turu atla
          </button>
          <div style={{ flex: 1 }} />
          {i > 0 && (
            <button
              type="button"
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ fontSize: 12 }}
              onClick={() => setI(i - 1)}
            >
              Geri
            </button>
          )}
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ fontSize: 12 }}
            onClick={() => (i + 1 < steps.length ? setI(i + 1) : onDone())}
          >
            {i + 1 < steps.length ? 'İleri' : 'Bitir'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Hedefleri işaretle**

`data-tour` özniteliklerini ekle:

- `Sidebar.tsx` → `<nav data-tour="nav" …>`
- `SearchBox.tsx` → en dış `<div data-tour="search" …>`
- `TopBar.tsx` → aksiyonları saran `<div data-tour="actions" …>`
- `KpiRow.tsx` → en dış grid `<div data-tour="kpi" …>`
- `InboxPanel.tsx` → en dış kart `<div data-tour="inbox" …>`

- [ ] **Step 3: Panoya bağla**

`RichDashboard.tsx`:

```tsx
import { useSearchParams } from 'react-router-dom';
import Tour, { type TourStep } from './Tour';

const TOUR: TourStep[] = [
  { target: 'nav', place: 'right', title: 'Her şey solda',
    text: 'Randevudan rapora tüm modüller kenar menüde. Rozetler bekleyen işleri gösterir.' },
  { target: 'search', place: 'below', title: 'Tek arama, her kayıt',
    text: 'Danışan, randevu ya da ödeme — ⌘K ile her yerden arayın.' },
  { target: 'actions', place: 'below', title: 'İki tıkta işlem',
    text: 'Yeni randevu oluşturun ya da WhatsApp mesajı gönderin — sayfa değiştirmeden.' },
  { target: 'kpi', place: 'below', title: 'Günün nabzı',
    text: 'Gelir, doluluk ve yeni danışan sayısı her sabah burada sizi karşılar.' },
  { target: 'inbox', place: 'left', title: 'WhatsApp panelde',
    text: '✦ işaretli yanıtları asistan verdi; "Bekliyor" olanlar sizi bekliyor.' },
];
```

Bileşen içinde:

```tsx
  const [params, setParams] = useSearchParams();
  const [tourOn, setTourOn] = useState(params.get('tour') === '1');

  const endTour = useCallback(() => {
    setTourOn(false);
    if (params.get('tour')) {
      params.delete('tour');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);
```

ve render'ın sonunda:

```tsx
      {tourOn && data !== null && <Tour steps={TOUR} onDone={endTour} />}
```

`data !== null` şart: tur, henüz çizilmemiş KPI kartını ölçemez.

- [ ] **Step 4: Kapılar ve elle kontrol**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

Tur ancak tarayıcıda görülebilir. Eklenti bağlıysa `http://localhost:5173/?tour=1` adresini aç ve beş adımı gez. Bağlı değilse **atla ve PR'da yaz** — turun görsel doğruluğu iddia edilemez.

Tarayıcısız yapılabilecek kontrol: beş hedefin de DOM'a işaretlendiği.

```bash
cd ~/Desktop/kisisel/w-lush-web
for t in nav search actions kpi inbox; do
  n=$(grep -rl "data-tour=\"$t\"" src/ | wc -l | tr -d ' ')
  echo "  data-tour=$t → $n dosyada"
done
```

Beklenen: her biri 1.

- [ ] **Step 5: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/
git commit -m "$(cat <<'EOF'
Add the welcome tour

Targets are found by data-tour rather than refs: three of the five live in
the shell, outside this component's tree.

If a target is missing the tour ends instead of drawing a spotlight around
nothing.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Doğrulama ve PR

- [ ] **Step 1: Kalıntı taraması**

```bash
cd ~/Desktop/kisisel/w-lush-web
echo "--- uydurma veri ---"; grep -rnE "APPTS|SUGGESTIONS|1\.18M|48\.420" src/components/anaekran/ || echo "temiz"
echo "--- eski KpiCard kullanımı ---"; grep -rn "KpiCard" src/components/anaekran/ || echo "yerel karta geçilmiş"
npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

- [ ] **Step 2: Tarayıcı turu**

Eklenti bağlıysa: arama (⌘K), iki hızlı işlem, tur, KPI üst kenarları, ayın tamamını çizen grafik. Bağlı değilse **atla ve PR'da yaz.**

- [ ] **Step 3: PR aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git push -u origin feature/tasarim-anaekran
gh pr create --base main --head feature/tasarim-anaekran \
  --title "Yeni tasarım: Ana Ekran" \
  --body "$(cat <<'EOF'
Ana Ekran yeni tasarıma geçti ve kabuğun bıraktığı üç eksik tamamlandı.
Backend tarafı: selamet/w-lush#<NUMARA> (merge edildi).

## Yeni
- **Arama (⌘K)** — danışan, randevu, ödeme; gruplu sonuç, satıra tıklayınca
  ilgili sayfaya gider. 250ms bekleyip arar.
- **Hızlı işlemler** — "Yeni randevu" mevcut modali kullanır; "Mesaj gönder"
  aşağıdaki nedenle mevcut konuşmalardan seçtirir.
- **Hoş geldiniz turu** — 5 adım, `?tour=1` ile açılır. Hedefler `data-tour`
  ile bulunuyor; beşinin üçü kabukta, bu bileşenin ağacı dışında.

## Tasarımdan sapmalar (bilinçli)
1. **"Mesaj gönder" serbest alıcı almıyor.** API yalnızca kliniğin daha önce
   yazıştığı numaraya izin veriyor ve bu kasıtlı bir koruma: hiç yazışmamış
   birine serbest metin göndermek Meta politikasını ihlal eder ve kliniğin
   numarasını kapattırır (selamet/w-lush#19).
2. **"Fatura" araması yok, "ödeme" var.** Sistemde fatura kavramı yok.
3. **Turun tetikleyicisi** tasarımda kurulum sihirbazının sonu; sihirbaz
   henüz yok, tur şimdilik `?tour=1` ile açılıyor.

## Görsel
- KPI kartlarında üst kenar rengi + delta chip.
- Gelir grafiği artık ayın tamamını çiziyor: geçmiş lacivert, bugün yeşil,
  olmamış günler düz tırnak. Bugünde kesmek, yarım ayı çöküş gibi
  gösteriyordu.

## Doğrulama
- `typecheck`, `test`, `build` — 0.
- Arama ucu 9 testle kilitlendi (kiracı yalıtımı ve joker karakter kaçışı
  dahil).
- `monthFull` iki testle eklendi.
- Beş tur hedefinin de DOM'da işaretli olduğu tarandı.
- **Tarayıcıda açılmadı** — Chrome eklentisi bağlı değil. Tur ve yerleşim
  gözle kontrol edilmedi.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Sıradaki işler

1. **Randevu Takvimi** — uzman renkleri, detay/oluşturma popupları, lejant.
2. **Mesajlar** — asistan devral/devret şeridi, balon tasarımı.
3. **CRM + Danışan Profili** — kanban, "toplam harcama" (backend).
4. **Gelir + Giderler + Rapor** — kullanıcının özellikle işaret ettiği yer;
   şu an yalnızca renkleri değişmiş, yerleşim eski.
5. **Sistem** — en çok yeni özellik.
6. **Giriş + kurulum sihirbazı** — turun gerçek tetikleyicisi burada bağlanır.
