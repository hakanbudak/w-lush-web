# CRM ve Danışan Profili — Gerçek Veriye Bağlama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** CRM panosu ve Danışan Profili, dosya içine gömülü sahte diziler yerine gerçek müşteri verisiyle çalışsın.

**Architecture:** Backend'e `app/customers/` altında iki uç eklenir: liste (`GET /api/customers`) ve detay (`GET /api/customers/{phone}`). Aşama ve sıcaklık veritabanına yazılmaz; `app/customers/derive.py` içindeki saf fonksiyonlarla hesaplanır. Frontend'de tek bir `src/api/customers.ts` katmanı ve iki sayfanın yeniden yazımı yer alır.

**Tech Stack:** Backend FastAPI + SQLAlchemy 2.0 (`selamet/w-lush`). Frontend React 18 + TypeScript + react-router-dom v6 + Vite (`hakanbudak/w-lush-web`). Yeni bağımlılık YOK.

**Spec:** `w-lush-web/docs/superpowers/specs/2026-08-05-crm-danisan-design.md`

## Global Constraints

**İki repo, iki branch — karıştırma:**

| Repo | Yol | Branch |
|---|---|---|
| Backend | `~/Desktop/kisisel/w-lush` | `feature/customers-api` |
| Frontend | `~/Desktop/kisisel/w-lush-web` | `feature/crm-real-data` (branch `docs/crm-customers-spec` üstünde açılır) |

- **Şema değişmez, Alembic migration eklenmez.** Yeni tablo/kolon yok.
- **Yeni bağımlılık eklenmez** (ne pip ne npm).
- Kod, tip ve fonksiyon adları **İngilizce**; kullanıcıya görünen metinler **Türkçe**. Backend'de kullanıcıya görünen TR metin yalnız `app/content/messages.py` içinde durur.
- Frontend renkleri mevcut CSS değişkenleriyle: `--paper`, `--cream`, `--line`, `--line-strong`, `--ink`, `--ink-40`, `--ink-60`, `--champagne-2`, `--forest`, `--sage`, `--blush`, `--bad`.
- Frontend HTTP çağrıları **yalnız** `src/api/*.ts` içinden.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK** (`Co-authored-by` / Claude izi). Backend reposunda `.githooks` bunu zorluyor, CI de reddediyor.
- Backend kapıları: `ruff check app` temiz, `python -c "from app.main import app"` geçer, `alembic revision --autogenerate` **boş** migration üretir.
- Frontend kapıları: `npm run typecheck` ve `npm run build` **exit 0**.
- Zaman: veritabanı naive UTC saklıyor; backend'de `datetime.utcnow()` kullanılır (mevcut idiom, bkz. `app/whatsapp/connect_router.py:110`). Frontend `toUtcIso()` ile normalize eder.
- Hiçbir task push/merge/PR yapmaz — bunların hepsi Task 7'de.

## Test durumu — önemli

Backend reposunda test suite **silinmiş**, frontend'de test koşucusu **hiç olmadı**; bu plan ikisini de kurmuyor (ayrı bir karar). Doğrulama **derleyici/linter + saf fonksiyon assert'leri + canlı uç + tarayıcı** ile yapılır. Her doğrulama adımı gerçek bir komut ve beklenen çıktı içerir.

**Ön koşul — ikisi de ayakta olmalı:**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python -m uvicorn app.main:app --port 8000
cd ~/Desktop/kisisel/w-lush-web && npm run dev
```

Test hesabı: `smoke2@example.com` / `Test12345!` (clinic_id=1). `curl` bu ortamda bloklu — HTTP kontrolleri python heredoc ile yapılır.

**Test verisi (dört aşamayı da üretir)** — `import app.main` **ilk sırada** olmalı, yoksa SQLAlchemy `NoReferencedTableError` verir:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main  # tüm modelleri kaydeder
from datetime import date, timedelta
from app.core.database import SessionLocal
from app.clinic.models import Appointment
from app.conversations import service as conv
from app.customers import service as cust

today = date.today()
with SessionLocal() as db:
    # 1) "new" — yalnızca müşteri yazmış, randevu yok
    c = cust.get_or_create(db, 1, "905321110001")
    cust.set_name(db, c, "Yeni Aday")
    conv.record(db, 1, "905321110001", conv.IN, "Merhaba, fiyat öğrenebilir miyim?")

    # 2) "contacted" — karşılıklı yazışma, randevu yok
    c = cust.get_or_create(db, 1, "905321110002")
    cust.set_name(db, c, "Temas Kurulan")
    conv.record(db, 1, "905321110002", conv.IN, "Lazer paketi var mı?")
    conv.record(db, 1, "905321110002", conv.OUT, "Tabii, detayları gönderiyorum.")

    # 3) "consult" — gelecekte randevusu var
    c = cust.get_or_create(db, 1, "905321110003")
    cust.set_name(db, c, "Konsültasyon Bekleyen")
    conv.record(db, 1, "905321110003", conv.IN, "Cumartesi uygun mu?")
    db.add(Appointment(
        clinic_id=1, phone="905321110003", customer_name="Konsültasyon Bekleyen",
        service_name="Cilt Analizi", appt_date=today + timedelta(days=3),
        appt_time="14:30", status="confirmed",
    ))

    # 4) "customer" — geçmiş seansı var (+ bir de iptal)
    c = cust.get_or_create(db, 1, "905321110004")
    cust.set_name(db, c, "Sadık Müşteri")
    conv.record(db, 1, "905321110004", conv.IN, "Teşekkürler!")
    db.add(Appointment(
        clinic_id=1, phone="905321110004", customer_name="Sadık Müşteri",
        service_name="Hydrafacial", appt_date=today - timedelta(days=10),
        appt_time="11:00", status="confirmed",
    ))
    db.add(Appointment(
        clinic_id=1, phone="905321110004", customer_name="Sadık Müşteri",
        service_name="Mezoterapi", appt_date=today - timedelta(days=4),
        appt_time="16:00", status="cancelled",
    ))
    db.commit()
    print("test verisi hazır")
PY
```

Beklenen çıktı: `test verisi hazır`. Randevu tablosunda `(clinic_id, appt_date, appt_time)` üzerinde iptal-dışı benzersizlik indeksi var; script iki kez çalıştırılırsa `IntegrityError` verir — bu normaldir, veri zaten oradadır.

---

### Task 1: Backend — türetme kuralları (saf fonksiyonlar)

Veritabanına dokunmayan, tek sorumluluğu "ham gerçekleri yoruma çevirmek" olan bir modül. Ayrı dosyada durur çünkü tek başına doğrulanabilir ve iki farklı sorgu yolu (liste ve detay) aynı kuralı paylaşır.

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/customers-api`

**Files:**
- Create: `app/customers/derive.py`

**Interfaces:**
- Consumes: yok (saf modül, yalnız `datetime`)
- Produces:
  - `stage(*, has_past_appointment: bool, has_upcoming_appointment: bool, has_outgoing_message: bool) -> str`
  - `warmth(last_message_at: datetime | None, *, now: datetime | None = None) -> str | None`
  - Sabitler: `NEW`, `CONTACTED`, `CONSULT`, `CUSTOMER`, `HOT`, `WARM`, `COLD`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush && git checkout main && git pull && git checkout -b feature/customers-api
```

- [ ] **Step 2: `app/customers/derive.py` dosyasını oluştur**

```python
"""Pure rules that turn raw facts into the CRM's derived fields.

Nothing here touches the database: the caller loads the facts, these
functions interpret them. Stage and warmth are never stored — the schema
has no column for either, and both are cheap to recompute.
"""
from datetime import datetime, timedelta

# Stage values. The API speaks these; Turkish labels live in the frontend.
NEW = "new"
CONTACTED = "contacted"
CONSULT = "consult"
CUSTOMER = "customer"

# Warmth values.
HOT = "hot"
WARM = "warm"
COLD = "cold"

HOT_WITHIN = timedelta(hours=1)
WARM_WITHIN = timedelta(hours=24)


def stage(
    *,
    has_past_appointment: bool,
    has_upcoming_appointment: bool,
    has_outgoing_message: bool,
) -> str:
    """First match wins, so someone who came before is a customer even if
    they also have an upcoming appointment.

    Appointments here are always the non-cancelled ones; the caller filters.
    """
    if has_past_appointment:
        return CUSTOMER
    if has_upcoming_appointment:
        return CONSULT
    if has_outgoing_message:
        return CONTACTED
    return NEW


def warmth(last_message_at: datetime | None, *, now: datetime | None = None) -> str | None:
    """How fresh the conversation is. None when there is no conversation at
    all (appointment-only records) — the UI then draws no badge.

    `now` is injectable so the rule can be checked without waiting an hour.
    Timestamps are naive UTC, matching what the database stores.
    """
    if last_message_at is None:
        return None
    since = (now or datetime.utcnow()) - last_message_at
    if since < HOT_WITHIN:
        return HOT
    if since < WARM_WITHIN:
        return WARM
    return COLD
```

- [ ] **Step 3: Kuralları assert'lerle doğrula**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
from datetime import datetime, timedelta
from app.customers import derive as d

now = datetime(2026, 8, 5, 12, 0, 0)

# stage: ilk eşleşen kazanır
assert d.stage(has_past_appointment=True, has_upcoming_appointment=True, has_outgoing_message=True) == "customer"
assert d.stage(has_past_appointment=False, has_upcoming_appointment=True, has_outgoing_message=True) == "consult"
assert d.stage(has_past_appointment=False, has_upcoming_appointment=False, has_outgoing_message=True) == "contacted"
assert d.stage(has_past_appointment=False, has_upcoming_appointment=False, has_outgoing_message=False) == "new"

# warmth: eşikler
assert d.warmth(None, now=now) is None
assert d.warmth(now - timedelta(minutes=30), now=now) == "hot"
assert d.warmth(now - timedelta(minutes=61), now=now) == "warm"
assert d.warmth(now - timedelta(hours=23, minutes=59), now=now) == "warm"
assert d.warmth(now - timedelta(hours=24), now=now) == "cold"
assert d.warmth(now - timedelta(days=9), now=now) == "cold"
# saat kayması negatif fark üretirse en taze kovaya düşer, patlamaz
assert d.warmth(now + timedelta(minutes=5), now=now) == "hot"
print("KURALLAR OK")
PY
```

Expected: son satır `KURALLAR OK`, başka çıktı yok.

- [ ] **Step 4: Lint kapısını çalıştır**

Run: `cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app`
Expected: `All checks passed!`

- [ ] **Step 5: Commit**

```bash
git add app/customers/derive.py
git commit -m "Add pure stage and warmth rules for the CRM

Neither value has a column: stage reads the customer's appointments and
message directions, warmth reads how recently they wrote. Keeping the rules
in one pure module means the list and detail endpoints cannot drift apart."
```

---

### Task 2: Backend — liste ucu `GET /api/customers`

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/customers-api`

**Files:**
- Modify: `app/customers/service.py` (yeni `overview()`)
- Create: `app/customers/schemas.py`
- Create: `app/customers/router.py`
- Modify: `app/main.py` (import + `include_router`)

**Interfaces:**
- Consumes: `derive.stage`, `derive.warmth` (Task 1); `Customer` (`app/customers/models.py`), `Message` + `conversations.service.OUT` (`app/conversations/`), `Appointment` (`app/clinic/models.py`), `get_current_user` (`app/core/deps.py`), `get_db` (`app/core/database.py`)
- Produces:
  - `service.overview(db: Session, clinic_id: int, limit: int = 200) -> list[dict]`
  - `GET /api/customers` → `list[CustomerOut]`
  - Şemalar: `NextAppointmentOut`, `CustomerOut`

- [ ] **Step 1: `overview()` fonksiyonunu `app/customers/service.py` sonuna ekle**

Dosyanın en üstündeki import bloğunu şununla değiştir:

```python
"""Customer lookup / creation helpers and the operator-facing overview."""
from datetime import date, datetime

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.clinic.models import Appointment
from app.conversations.models import Message
from app.conversations.service import OUT
from app.customers import derive
from app.customers.models import Customer
```

Mevcut `get` / `get_or_create` / `set_name` fonksiyonlarına dokunma. Dosyanın **sonuna** ekle:

```python
# Cancelled appointments say nothing about where a person stands.
_LIVE = Appointment.status != "cancelled"


def _message_facts(db: Session, clinic_id: int) -> dict[str, dict]:
    """Per phone: the newest message and whether we ever replied.

    Two queries, not one per phone. max(id) rather than max(created_at):
    ids are monotonic, so two messages sharing a timestamp cannot tie.
    """
    grouped = db.execute(
        select(
            Message.phone,
            func.max(Message.id),
            func.max(case((Message.direction == OUT, 1), else_=0)),
        )
        .where(Message.clinic_id == clinic_id)
        .group_by(Message.phone)
    ).all()
    if not grouped:
        return {}

    bodies = {
        m.id: m
        for m in db.scalars(
            select(Message).where(Message.id.in_([row[1] for row in grouped]))
        ).all()
    }
    facts = {}
    for phone, last_id, has_out in grouped:
        last = bodies[last_id]
        facts[phone] = {
            "last_message": last.body,
            "last_message_at": last.created_at,
            "has_outgoing": bool(has_out),
        }
    return facts


def _appointment_facts(db: Session, clinic_id: int, today: date) -> dict[str, dict]:
    """Per phone: past/upcoming flags and the next appointment.

    One query. The clinic-wide set of live appointments is small enough to
    fold in Python, and doing so keeps the date logic in one readable place.
    """
    rows = db.scalars(
        select(Appointment)
        .where(Appointment.clinic_id == clinic_id, _LIVE)
        .order_by(Appointment.appt_date, Appointment.appt_time)
    ).all()

    facts: dict[str, dict] = {}
    for appt in rows:
        fact = facts.setdefault(
            appt.phone,
            {"has_past": False, "has_upcoming": False, "next": None, "last_at": None},
        )
        if appt.appt_date < today:
            fact["has_past"] = True
            fact["last_at"] = appt.created_at
        else:
            fact["has_upcoming"] = True
            # Rows arrive in date order, so the first upcoming one is the next.
            if fact["next"] is None:
                fact["next"] = appt
                fact["last_at"] = appt.created_at
    return facts


def overview(db: Session, clinic_id: int, limit: int = 200) -> list[dict]:
    """One row per person the clinic has any trace of: a message or an
    appointment. The `customers` table alone is not enough — an appointment
    can exist for a phone that was never written into it.
    """
    today = date.today()
    now = datetime.utcnow()
    messages = _message_facts(db, clinic_id)
    appointments = _appointment_facts(db, clinic_id, today)

    phones = set(messages) | set(appointments)
    if not phones:
        return []

    names = dict(
        db.execute(
            select(Customer.phone, Customer.name).where(
                Customer.clinic_id == clinic_id, Customer.phone.in_(phones)
            )
        ).all()
    )

    rows = []
    for phone in phones:
        msg = messages.get(phone, {})
        appt = appointments.get(phone, {})
        nxt = appt.get("next")
        last_message_at = msg.get("last_message_at")
        rows.append(
            {
                "phone": phone,
                "name": names.get(phone) or "",
                "stage": derive.stage(
                    has_past_appointment=appt.get("has_past", False),
                    has_upcoming_appointment=appt.get("has_upcoming", False),
                    has_outgoing_message=msg.get("has_outgoing", False),
                ),
                "warmth": derive.warmth(last_message_at, now=now),
                "last_message": msg.get("last_message", ""),
                "last_message_at": last_message_at,
                "next_appointment": nxt,
                # Sorting only; not part of the response.
                "_activity": max(
                    [t for t in (last_message_at, appt.get("last_at")) if t is not None]
                ),
            }
        )

    rows.sort(key=lambda r: r["_activity"], reverse=True)
    for row in rows:
        del row["_activity"]
    return rows[:limit]
```

- [ ] **Step 2: `app/customers/schemas.py` dosyasını oluştur**

```python
"""Response shapes for the operator's customer views."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class NextAppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    appt_date: date
    appt_time: str
    service_name: str


class CustomerOut(BaseModel):
    """One card on the CRM board. `stage` and `warmth` are derived."""

    phone: str
    name: str
    stage: str
    warmth: str | None
    last_message: str
    last_message_at: datetime | None
    next_appointment: NextAppointmentOut | None
```

- [ ] **Step 3: `app/customers/router.py` dosyasını oluştur**

```python
"""Customer views for the operator panel (clinic-scoped, auth-protected)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.models import User
from app.core.database import get_db
from app.core.deps import get_current_user
from app.customers import service
from app.customers.schemas import CustomerOut

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """CRM board: everyone with a message or an appointment, newest first."""
    return service.overview(db, current.clinic_id)
```

- [ ] **Step 4: Router'ı `app/main.py`'ye bağla**

Import bloğuna (alfabetik sırada, `app.core.config`'ten önce) ekle:

```python
from app.customers.router import router as customers_router
```

`app.include_router(conversations_router)` satırının **altına** ekle:

```python
app.include_router(customers_router)
```

- [ ] **Step 5: Lint ve import kapılarını çalıştır**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"
```

Expected: `All checks passed!` ve `import ok`.

- [ ] **Step 6: Şemanın değişmediğini kanıtla**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/alembic revision --autogenerate -m "should be empty" 2>&1 | tail -3
```

Expected: üretilen dosyada `upgrade()` gövdesi yalnız `pass` olmalı. Kontrol et ve **sil**:

```bash
ls -t alembic/versions/*.py | head -1 | xargs grep -c "op\." ; ls -t alembic/versions/*.py | head -1 | xargs rm
```

Expected: `grep -c` çıktısı `0` (hiç `op.` çağrısı yok), sonra dosya silinir.

- [ ] **Step 7: Ucu canlı doğrula**

Önce "Test verisi" bölümündeki seed script'ini çalıştır (bir kez). Sunucu ayakta olmalı. Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import json, urllib.request
B = "http://localhost:8000"

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:300] if hasattr(e, "read") else str(e))

cred = {"email": "smoke2@example.com", "password": "Test12345!"}
s, b = req("/api/auth/login", "POST", cred)
assert s == 200, b
tok = json.loads(b)["token"]["access_token"]

s, b = req("/api/customers", token=tok)
print("GET /api/customers ->", s)
assert s == 200, b
rows = json.loads(b)
by_phone = {r["phone"]: r for r in rows}
assert set(by_phone["905321110001"]) == {
    "phone", "name", "stage", "warmth", "last_message", "last_message_at", "next_appointment"
}, "ŞEMA UYUŞMUYOR"
assert by_phone["905321110001"]["stage"] == "new", by_phone["905321110001"]
assert by_phone["905321110002"]["stage"] == "contacted"
assert by_phone["905321110003"]["stage"] == "consult"
assert by_phone["905321110003"]["next_appointment"]["service_name"] == "Cilt Analizi"
assert by_phone["905321110004"]["stage"] == "customer"
assert by_phone["905321110001"]["warmth"] in {"hot", "warm", "cold"}
print("yetkisiz kontrolü:", req("/api/customers")[0])
print("LİSTE OK")
PY
```

Expected: `GET /api/customers -> 200`, `yetkisiz kontrolü: 401`, son satır `LİSTE OK`.

- [ ] **Step 8: Commit**

```bash
git add app/customers/service.py app/customers/schemas.py app/customers/router.py app/main.py
git commit -m "Add GET /api/customers for the CRM board

The row set is every phone with a message or an appointment, not the
customers table alone: an appointment can exist for a phone that was never
written into it. Queries are batched per clinic rather than per phone."
```

---

### Task 3: Backend — detay ucu `GET /api/customers/{phone}`

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/customers-api`

**Files:**
- Modify: `app/customers/service.py` (yeni `detail()`)
- Modify: `app/customers/schemas.py` (yeni `AppointmentBriefOut`, `CustomerStatsOut`, `CustomerDetailOut`)
- Modify: `app/customers/router.py` (yeni uç)
- Modify: `app/content/messages.py` (yeni `ERR_CUSTOMER_NOT_FOUND`)

**Interfaces:**
- Consumes: `conversations.service.thread()` (mesaj dizisi — kopyalanmaz, yeniden kullanılır), `conversations.schemas.MessageOut`, Task 1'in `derive` fonksiyonları
- Produces:
  - `service.detail(db: Session, clinic_id: int, phone: str) -> dict | None`
  - `GET /api/customers/{phone}` → `CustomerDetailOut`, kayıt yoksa 404

- [ ] **Step 1: `detail()` fonksiyonunu `app/customers/service.py` sonuna ekle**

Üstteki import bloğuna şu satırı ekle (`from app.conversations.service import OUT` satırının yerine):

```python
from app.conversations.service import OUT, thread
```

Dosyanın **sonuna** ekle:

```python
def detail(db: Session, clinic_id: int, phone: str) -> dict | None:
    """Everything the profile screen shows about one person.

    Returns None when the clinic has no trace of this phone at all — the
    router turns that into a 404.
    """
    today = date.today()
    customer = get(db, clinic_id, phone)
    messages = thread(db, clinic_id, phone)
    appointments = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.clinic_id == clinic_id, Appointment.phone == phone)
            .order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc())
        ).all()
    )
    if customer is None and not messages and not appointments:
        return None

    live = [a for a in appointments if a.status != "cancelled"]
    past = [a for a in live if a.appt_date < today]
    upcoming = [a for a in live if a.appt_date >= today]
    last_message_at = messages[-1].created_at if messages else None

    # An appointment can predate the customers row, or the row may not exist.
    first_seen = [a.created_at for a in appointments] + [m.created_at for m in messages]
    created_at = customer.created_at if customer else min(first_seen)

    return {
        "phone": phone,
        "name": customer.name if customer else "",
        "created_at": created_at,
        "stage": derive.stage(
            has_past_appointment=bool(past),
            has_upcoming_appointment=bool(upcoming),
            has_outgoing_message=any(m.direction == OUT for m in messages),
        ),
        "warmth": derive.warmth(last_message_at),
        "stats": {
            "appointments_total": len(appointments),
            # No 'completed' status exists, so a live appointment whose date
            # has passed is the closest thing to a session that happened.
            "past_sessions": len(past),
            "cancelled": len(appointments) - len(live),
            "last_visit": max((a.appt_date for a in past), default=None),
        },
        "appointments": appointments[:50],
        "messages": messages,
    }
```

- [ ] **Step 2: Şemaları `app/customers/schemas.py` sonuna ekle**

Dosyanın en üstündeki import bloğuna ekle:

```python
from app.conversations.schemas import MessageOut
```

Dosyanın **sonuna** ekle:

```python
class AppointmentBriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    appt_date: date
    appt_time: str
    service_name: str
    status: str


class CustomerStatsOut(BaseModel):
    appointments_total: int
    past_sessions: int
    cancelled: int
    last_visit: date | None


class CustomerDetailOut(BaseModel):
    """The profile screen in one response: identity, counts, history."""

    phone: str
    name: str
    created_at: datetime
    stage: str
    warmth: str | None
    stats: CustomerStatsOut
    appointments: list[AppointmentBriefOut]
    messages: list[MessageOut]
```

- [ ] **Step 3: TR hata metnini `app/content/messages.py`'ye ekle**

`ERR_WHATSAPP_SEND_FAILED` tanımının hemen altına ekle:

```python
ERR_CUSTOMER_NOT_FOUND = "Bu numaraya ait kayıt bulunamadı."
```

- [ ] **Step 4: Ucu `app/customers/router.py`'ye ekle**

Import bloğunu şununla değiştir:

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.models import User
from app.content import messages as msg
from app.core.database import get_db
from app.core.deps import get_current_user
from app.customers import service
from app.customers.schemas import CustomerDetailOut, CustomerOut
```

Dosyanın **sonuna** ekle:

```python
@router.get("/{phone}", response_model=CustomerDetailOut)
def get_customer(
    phone: str,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    found = service.detail(db, current.clinic_id, phone)
    if found is None:
        raise HTTPException(404, msg.ERR_CUSTOMER_NOT_FOUND)
    return found
```

- [ ] **Step 5: Lint, import ve şema kapıları**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')" && .venv/bin/alembic revision --autogenerate -m "should be empty" 2>&1 | tail -1 && ls -t alembic/versions/*.py | head -1 | xargs grep -c "op\."
```

Expected: `All checks passed!`, `import ok`, son satır `0`. Ardından üretilen dosyayı sil: `ls -t alembic/versions/*.py | head -1 | xargs rm`

- [ ] **Step 6: Ucu canlı doğrula**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import json, urllib.request
B = "http://localhost:8000"

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:300] if hasattr(e, "read") else str(e))

cred = {"email": "smoke2@example.com", "password": "Test12345!"}
tok = json.loads(req("/api/auth/login", "POST", cred)[1])["token"]["access_token"]

s, b = req("/api/customers/905321110004", token=tok)
print("GET detay ->", s)
assert s == 200, b
d = json.loads(b)
assert set(d) == {"phone","name","created_at","stage","warmth","stats","appointments","messages"}, "ŞEMA UYUŞMUYOR"
assert d["stage"] == "customer", d["stage"]
assert d["stats"]["appointments_total"] == 2, d["stats"]
assert d["stats"]["past_sessions"] == 1, d["stats"]
assert d["stats"]["cancelled"] == 1, d["stats"]
assert d["stats"]["last_visit"] is not None
assert len(d["messages"]) >= 1 and d["messages"][0]["direction"] in {"in", "out"}
print("404 kontrolü:", req("/api/customers/900000000000", token=tok)[0])
print("DETAY OK")
PY
```

Expected: `GET detay -> 200`, `404 kontrolü: 404`, son satır `DETAY OK`.

- [ ] **Step 7: Commit**

```bash
git add app/customers/service.py app/customers/schemas.py app/customers/router.py app/content/messages.py
git commit -m "Add GET /api/customers/{phone} for the profile screen

Identity, derived counts, appointment history and the message thread in one
response. The thread comes from conversations.service.thread rather than a
second copy of the same query."
```

---

### Task 4: Frontend — müşteri API katmanı

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/crm-real-data`

**Files:**
- Create: `src/api/customers.ts`

**Interfaces:**
- Consumes: `request<T>()` (`src/api/client.ts`), `toUtcIso()` (`src/utils/time.ts`), `ChatMessage` tipi (`src/api/conversations.ts`)
- Produces:
  - `type Stage = 'new' | 'contacted' | 'consult' | 'customer'`
  - `type Warmth = 'hot' | 'warm' | 'cold'`
  - `interface NextAppointment`, `CustomerSummary`, `AppointmentBrief`, `CustomerStats`, `CustomerDetail`
  - `listCustomers(): Promise<CustomerSummary[]>`
  - `getCustomer(phone: string): Promise<CustomerDetail>`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush-web && git checkout docs/crm-customers-spec && git checkout -b feature/crm-real-data
```

- [ ] **Step 2: `src/api/customers.ts` dosyasını oluştur**

```ts
// Müşteri görünümleri — backend: app/customers/ (klinik kapsamlı, auth'lu).
import { toUtcIso } from '../utils/time';
import type { ChatMessage } from './conversations';
import { request } from './client';

/** CRM panosunun kolonları. Backend'de türetilir, yazılamaz. */
export type Stage = 'new' | 'contacted' | 'consult' | 'customer';

/** Son mesajın tazeliği. Hiç mesajı olmayan kayıtta null gelir. */
export type Warmth = 'hot' | 'warm' | 'cold';

export interface NextAppointment {
  appt_date: string; // YYYY-MM-DD
  appt_time: string; // HH:MM
  service_name: string;
}

/** CRM kartı. */
export interface CustomerSummary {
  phone: string;
  name: string; // "" olabilir — o zaman telefon gösterilir
  stage: Stage;
  warmth: Warmth | null;
  last_message: string;
  last_message_at: string | null; // ISO
  next_appointment: NextAppointment | null;
}

export interface AppointmentBrief {
  id: number;
  appt_date: string;
  appt_time: string;
  service_name: string;
  status: string; // pending | confirmed | cancelled
}

export interface CustomerStats {
  appointments_total: number;
  past_sessions: number;
  cancelled: number;
  last_visit: string | null; // YYYY-MM-DD
}

/** Profil ekranının tamamı tek yanıtta. */
export interface CustomerDetail {
  phone: string;
  name: string;
  created_at: string; // ISO
  stage: Stage;
  warmth: Warmth | null;
  stats: CustomerStats;
  appointments: AppointmentBrief[];
  messages: ChatMessage[];
}

export const listCustomers = () =>
  request<CustomerSummary[]>('/api/customers').then((rows) =>
    rows.map((r) => ({
      ...r,
      last_message_at: r.last_message_at ? toUtcIso(r.last_message_at) : null,
    })),
  );

// Telefon yol parçası olarak gidiyor; kodlamadan geçirmek şart.
export const getCustomer = (phone: string) =>
  request<CustomerDetail>(`/api/customers/${encodeURIComponent(phone)}`).then((d) => ({
    ...d,
    created_at: toUtcIso(d.created_at),
    messages: d.messages.map((m) => ({ ...m, created_at: toUtcIso(m.created_at) })),
  }));
```

`appt_date` ve `last_visit` bilerek `toUtcIso`'dan geçmez: bunlar saat içermeyen takvim günleri, UTC'ye çevirmek tarihi bir gün kaydırabilir.

- [ ] **Step 3: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && echo "exit=$?"`
Expected: çıktı yok, `exit=0`.

- [ ] **Step 4: Sözleşmenin backend'le uyuştuğunu canlı doğrula**

Vite proxy `/api`'yi 8000'e taşır; frontend'in gerçekte gördüğü yol budur. Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:5173"

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp:
        return resp.status, resp.read().decode()

cred = {"email": "smoke2@example.com", "password": "Test12345!"}
tok = json.loads(req("/api/auth/login", "POST", cred)[1])["token"]["access_token"]
s, b = req("/api/customers", token=tok)
rows = json.loads(b)
print("liste ->", s, "satır:", len(rows))
assert {"phone","name","stage","warmth","last_message","last_message_at","next_appointment"} == set(rows[0])
s, b = req("/api/customers/" + rows[0]["phone"], token=tok)
d = json.loads(b)
print("detay ->", s, "sekmeler:", sorted(d["stats"]))
assert {"appointments_total","past_sessions","cancelled","last_visit"} == set(d["stats"])
print("SÖZLEŞME OK")
PY
```

Expected: son satır `SÖZLEŞME OK`.

- [ ] **Step 5: Commit**

```bash
git add src/api/customers.ts
git commit -m "Add customers API client

Mirrors the two backend endpoints. Calendar dates stay untouched while
timestamps go through toUtcIso, since shifting a date-only value to UTC can
move it a day."
```

---

### Task 5: Frontend — CRM panosu

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/crm-real-data`

**Files:**
- Modify: `src/pages/CRM.tsx` (tam yeniden yazım — `INITIAL_LEADS`, `blankLead`, aday ekleme modali silinir)
- Modify: `src/config/nav.ts:16` (sahte `count: 12` kaldırılır)

**Interfaces:**
- Consumes: `listCustomers`, `CustomerSummary`, `Stage`, `Warmth` (Task 4); `Avatar`, `Chip` (`src/components/ui.tsx`); `relativeTime` (`src/utils/time.ts`); `useNavigate` (react-router-dom)
- Produces: `export default function CRM(): JSX.Element` (prop almaz)

- [ ] **Step 1: `src/pages/CRM.tsx` dosyasının tamamını şununla değiştir**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCustomers, type CustomerSummary, type Stage, type Warmth } from '../api/customers';
import { Avatar, Chip } from '../components/ui';
import { relativeTime } from '../utils/time';

/** Kolonlar. Sıra panonun soldan sağa akışı. */
const STAGES: { key: Stage; label: string; hint: string }[] = [
  { key: 'new', label: 'Yeni', hint: 'Henüz dönülmedi' },
  { key: 'contacted', label: 'İlk temas', hint: 'Mesajlaşıldı' },
  { key: 'consult', label: 'Konsültasyon', hint: 'Randevu verildi' },
  { key: 'customer', label: 'Müşteri', hint: 'Seansa geldi' },
];

const WARMTH: Record<Warmth, { label: string; tone: 'sage' | 'champagne' | 'blush' }> = {
  hot: { label: 'Sıcak', tone: 'sage' },
  warm: { label: 'Ilık', tone: 'champagne' },
  cold: { label: 'Soğuk', tone: 'blush' },
};

const displayName = (c: CustomerSummary): string => c.name || c.phone;

/** "9 Ağu 14:30 · Lazer" — takvim günü, saat dilimi çevrimi yok. */
const apptLabel = (a: NonNullable<CustomerSummary['next_appointment']>): string => {
  const day = new Date(`${a.appt_date}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  });
  return `${day} ${a.appt_time} · ${a.service_name}`;
};

export default function CRM() {
  const [items, setItems] = useState<CustomerSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(() => {
    setError(null);
    listCustomers()
      .then(setItems)
      .catch(() => setError('Danışan adayları yüklenemedi.'));
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <div style={{ padding: 24, fontSize: 13, color: 'var(--ink-60)' }}>
        {error}{' '}
        <button
          type="button"
          onClick={load}
          style={{
            border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit',
            fontSize: 13, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Tekrar dene
        </button>
      </div>
    );
  }

  if (items === null) {
    return <div style={{ padding: 24, fontSize: 13, color: 'var(--ink-40)' }}>Yükleniyor…</div>;
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {STAGES.map((stage) => {
        const cards = items.filter((c) => c.stage === stage.key);
        return (
          <div
            key={stage.key}
            style={{
              flex: 1,
              minWidth: 0,
              background: 'var(--paper)',
              border: '1px solid var(--line)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{stage.label}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-40)' }}>{cards.length}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>{stage.hint}</div>
            </div>

            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cards.length === 0 && (
                <div style={{ padding: 12, fontSize: 11, color: 'var(--ink-40)' }}>
                  Bu aşamada kimse yok.
                </div>
              )}
              {cards.map((c, i) => (
                <button
                  key={c.phone}
                  type="button"
                  onClick={() => navigate(`/danisan/${encodeURIComponent(c.phone)}`)}
                  style={{
                    textAlign: 'left', width: '100%', cursor: 'pointer', font: 'inherit',
                    background: 'var(--cream)', border: '1px solid var(--line)',
                    borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={displayName(c)} i={i} />
                    <span
                      style={{
                        fontSize: 12, fontWeight: 600, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {displayName(c)}
                    </span>
                    {c.warmth && (
                      <Chip tone={WARMTH[c.warmth].tone} small style={{ marginLeft: 'auto' }}>
                        {WARMTH[c.warmth].label}
                      </Chip>
                    )}
                  </div>

                  {c.last_message && (
                    <div
                      style={{
                        fontSize: 11, color: 'var(--ink-60)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {c.last_message}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--ink-40)' }}>
                    {c.last_message_at && <span>{relativeTime(c.last_message_at)}</span>}
                    {c.next_appointment && (
                      <span
                        style={{
                          marginLeft: 'auto', overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {apptLabel(c.next_appointment)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Sahte sidebar rozetini kaldır**

`src/config/nav.ts:16` satırındaki CRM girdisinden `count: 12` kısmını sil. Satır şuna dönüşür:

```ts
  { key: 'crm', label: 'CRM', title: 'CRM · Danışan adayları', path: '/crm', icon: 'users' },
```

`NavItem` arayüzündeki `count?: number` alanı **kalır** (opsiyonel, başka bir girdi ileride kullanabilir).

- [ ] **Step 3: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build && echo "exit=$?"`
Expected: `exit=0`, build hatasız.

- [ ] **Step 4: Canlı doğrula**

Tarayıcıda `http://localhost:5173/crm` aç (giriş yapılmış olmalı). Beklenen: dört kolon; seed verisiyle "Yeni Aday" → Yeni, "Temas Kurulan" → İlk temas, "Konsültasyon Bekleyen" → Konsültasyon (kartında yaklaşan randevu satırı), "Sadık Müşteri" → Müşteri. Bir karta tıklayınca URL `/danisan/905321110004` olmalı (sayfa Task 6'ya kadar sahte veri gösterebilir — bu adımda yalnız yönlendirme doğrulanır). Konsolda hata olmamalı.

- [ ] **Step 5: Commit**

```bash
git add src/pages/CRM.tsx src/config/nav.ts
git commit -m "Drive the CRM board from real customer data

Cards come from GET /api/customers and land in columns by the derived stage.
Drag-and-drop and the lead form are gone: stage is computed, not stored, and
there is no endpoint that creates a customer by hand."
```

---

### Task 6: Frontend — Danışan Profili

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/crm-real-data`

Düzen: sol liste + sağ detay korunur. Sağ detayın üst bloğu **kimlik + sayılar**, altında iki sekme: **Randevular** ve **Mesajlar** (salt okunur).

**Files:**
- Modify: `src/pages/DanisanProfili.tsx` (tam yeniden yazım — `CLIENTS` dizisi ve karşılıksız tipler silinir)
- Modify: `src/App.tsx` (yeni rota `/danisan/:phone`)

**Interfaces:**
- Consumes: `listCustomers`, `getCustomer`, `CustomerSummary`, `CustomerDetail` (Task 4); `Avatar`, `Chip`; `clockTime`, `relativeTime` (`src/utils/time.ts`); `useNavigate`, `useParams` (react-router-dom)
- Produces: `export default function DanisanProfili(): JSX.Element`

- [ ] **Step 1: `src/pages/DanisanProfili.tsx` dosyasının tamamını şununla değiştir**

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getCustomer,
  listCustomers,
  type CustomerDetail,
  type CustomerSummary,
} from '../api/customers';
import { Avatar, Chip } from '../components/ui';
import { clockTime, relativeTime } from '../utils/time';

type Tab = 'randevular' | 'mesajlar';

const STATUS: Record<string, { label: string; tone: 'good' | 'warn' | 'bad' }> = {
  confirmed: { label: 'Onaylı', tone: 'good' },
  pending: { label: 'Bekliyor', tone: 'warn' },
  cancelled: { label: 'İptal', tone: 'bad' },
};

const displayName = (c: { name: string; phone: string }): string => c.name || c.phone;

/** YYYY-MM-DD → "12 May 2026". Takvim günü; saat dilimi çevrimi yok. */
const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function DanisanProfili() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();

  const [list, setList] = useState<CustomerSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Tab>('randevular');

  const loadList = useCallback(() => {
    setListError(null);
    listCustomers()
      .then(setList)
      .catch(() => setListError('Danışanlar yüklenemedi.'));
  }, []);

  useEffect(loadList, [loadList]);

  const loadDetail = useCallback(() => {
    if (!phone) {
      setDetail(null);
      return;
    }
    setDetail(null);
    setDetailError(null);
    getCustomer(phone)
      .then(setDetail)
      .catch((e: Error) =>
        setDetailError(
          e.message.includes('404')
            ? 'Bu numaraya ait kayıt bulunamadı.'
            : 'Danışan bilgileri yüklenemedi.',
        ),
      );
  }, [phone]);

  useEffect(loadDetail, [loadDetail]);

  const filtered = useMemo(() => {
    if (!list) return [];
    const needle = q.trim().toLocaleLowerCase('tr-TR');
    if (!needle) return list;
    return list.filter(
      (c) =>
        c.name.toLocaleLowerCase('tr-TR').includes(needle) || c.phone.includes(needle),
    );
  }, [list, q]);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {/* ── sol: danışan listesi ── */}
      <div
        style={{
          width: 280, flexShrink: 0, background: 'var(--paper)',
          border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
        }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid var(--line)' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İsim veya telefon ara"
            style={{
              width: '100%', border: '1px solid var(--line)', borderRadius: 8,
              padding: '8px 10px', font: 'inherit', fontSize: 12, background: 'var(--cream)',
            }}
          />
        </div>
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {listError && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-60)' }}>
              {listError}{' '}
              <button
                type="button"
                onClick={loadList}
                style={{
                  border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                  fontSize: 12, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Tekrar dene
              </button>
            </div>
          )}
          {!listError && list === null && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
          )}
          {!listError && list?.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
              Henüz danışan yok — WhatsApp’tan mesaj geldiğinde burada görünür.
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.phone}
              type="button"
              onClick={() => navigate(`/danisan/${encodeURIComponent(c.phone)}`)}
              style={{
                width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit',
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                border: 'none', borderBottom: '1px solid var(--line)',
                background: c.phone === phone ? 'var(--cream)' : 'transparent',
              }}
            >
              <Avatar name={displayName(c)} i={i} />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: 'block', fontSize: 12, fontWeight: 600,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {displayName(c)}
                </span>
                <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-40)' }}>
                  {c.last_message_at ? relativeTime(c.last_message_at) : 'Mesaj yok'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── sağ: detay ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!phone && (
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
              padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ink-40)',
            }}
          >
            Soldan bir danışan seçin.
          </div>
        )}

        {phone && detailError && (
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
              padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ink-60)',
            }}
          >
            {detailError}{' '}
            <button
              type="button"
              onClick={loadDetail}
              style={{
                border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                fontSize: 13, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Tekrar dene
            </button>
          </div>
        )}

        {phone && !detailError && detail === null && (
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 12,
              padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--ink-40)',
            }}
          >
            Yükleniyor…
          </div>
        )}

        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* kimlik */}
            <div
              style={{
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20, display: 'flex', alignItems: 'center', gap: 14,
              }}
            >
              <Avatar name={displayName(detail)} size={44} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{displayName(detail)}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-40)', marginTop: 2 }}>
                  {detail.phone} · İlk kayıt {relativeTime(detail.created_at)}
                </div>
              </div>
            </div>

            {/* sayılar */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { l: 'Toplam randevu', v: String(detail.stats.appointments_total) },
                { l: 'Geçmiş seans', v: String(detail.stats.past_sessions) },
                { l: 'İptal', v: String(detail.stats.cancelled) },
                {
                  l: 'Son ziyaret',
                  v: detail.stats.last_visit ? dayLabel(detail.stats.last_visit) : '—',
                },
              ].map((s) => (
                <div
                  key={s.l}
                  style={{
                    flex: 1, background: 'var(--paper)', border: '1px solid var(--line)',
                    borderRadius: 12, padding: 16,
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--ink-40)' }}>{s.l}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* sekmeler */}
            <div
              style={{
                background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
                {([
                  ['randevular', 'Randevu geçmişi'],
                  ['mesajlar', 'Mesaj geçmişi'],
                ] as [Tab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTab(key)}
                    style={{
                      padding: '12px 18px', border: 'none', cursor: 'pointer', font: 'inherit',
                      fontSize: 12, fontWeight: tab === key ? 600 : 400,
                      color: tab === key ? 'var(--ink)' : 'var(--ink-40)',
                      background: tab === key ? 'var(--cream)' : 'transparent',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {tab === 'randevular' && (
                <div>
                  {detail.appointments.length === 0 && (
                    <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
                      Henüz randevu yok.
                    </div>
                  )}
                  {detail.appointments.map((a) => {
                    const st = STATUS[a.status] ?? { label: a.status, tone: 'warn' as const };
                    return (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                          borderBottom: '1px solid var(--line)', fontSize: 12,
                        }}
                      >
                        <span style={{ width: 130, color: 'var(--ink-60)' }}>
                          {dayLabel(a.appt_date)}
                        </span>
                        <span style={{ width: 50, color: 'var(--ink-40)' }}>{a.appt_time}</span>
                        <span style={{ flex: 1, minWidth: 0 }}>{a.service_name || '—'}</span>
                        <Chip tone={st.tone} small>{st.label}</Chip>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'mesajlar' && (
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.messages.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Henüz mesaj yok.</div>
                  )}
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: m.direction === 'out' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%', padding: '8px 12px', borderRadius: 10, fontSize: 12,
                        background: m.direction === 'out' ? 'var(--forest)' : 'var(--cream)',
                        color: m.direction === 'out' ? 'var(--cream)' : 'var(--ink)',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div style={{ whiteSpace: 'pre-wrap' }}>{m.body}</div>
                      <div style={{ fontSize: 9, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
                        {clockTime(m.created_at)}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 10, color: 'var(--ink-40)', textAlign: 'center', marginTop: 4 }}>
                    Cevap yazmak için Mesajlar ekranını kullanın.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Rotayı `src/App.tsx`'e ekle**

`<Route path="/danisan" element={<DanisanProfili />} />` satırının hemen **altına** ekle:

```tsx
          <Route path="/danisan/:phone" element={<DanisanProfili />} />
```

- [ ] **Step 3: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 4: Canlı doğrula — uçtan uca akış**

Tarayıcıda sırayla:
1. `http://localhost:5173/danisan` → sol listede seed'deki dört kişi, sağda "Soldan bir danışan seçin."
2. "Sadık Müşteri"ye tıkla → URL `/danisan/905321110004`; kimlik bloğunda isim + telefon; sayılar **Toplam randevu 2, Geçmiş seans 1, İptal 1**, Son ziyaret dolu.
3. "Randevu geçmişi" sekmesi → iki satır, biri "İptal" rozetli.
4. "Mesaj geçmişi" sekmesi → seed mesajı görünür, altında "Cevap yazmak için Mesajlar ekranını kullanın." satırı.
5. Arama kutusuna `9053211100` yaz → liste daralır.
6. Adres çubuğuna `/danisan/900000000000` yaz → "Bu numaraya ait kayıt bulunamadı." görünür (beyaz ekran değil).

Konsolda hata olmamalı.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DanisanProfili.tsx src/App.tsx
git commit -m "Drive the customer profile from real data

Identity, derived counts, appointment history and the message thread now
come from GET /api/customers/{phone}. The invented sections (payments,
packages, loyalty, notes, AI) are gone, and the thread is read-only so
replying stays in one place."
```

---

### Task 7: Kapanış — tam doğrulama ve iki PR

**Files:** yok (yalnız doğrulama ve yayın)

- [ ] **Step 1: Backend kapıları**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')" && .venv/bin/alembic revision --autogenerate -m "final check" 2>&1 | tail -1 && ls -t alembic/versions/*.py | head -1 | xargs grep -c "op\."
```

Expected: `All checks passed!`, `import ok`, `0`. Ardından: `ls -t alembic/versions/*.py | head -1 | xargs rm`

- [ ] **Step 2: Frontend kapıları**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 3: Değişen dosyaları gözden geçir**

Run: `cd ~/Desktop/kisisel/w-lush && git diff main --stat` ve `cd ~/Desktop/kisisel/w-lush-web && git diff main --stat`

Expected — backend: `app/customers/derive.py`, `app/customers/service.py`, `app/customers/schemas.py`, `app/customers/router.py`, `app/content/messages.py`, `app/main.py`. Başka dosya olmamalı; `alembic/versions/` altında yeni dosya **olmamalı**.
Frontend: `src/api/customers.ts`, `src/pages/CRM.tsx`, `src/pages/DanisanProfili.tsx`, `src/config/nav.ts`, `src/App.tsx` + doküman dosyaları.

- [ ] **Step 4: Backend PR'ı aç**

```bash
cd ~/Desktop/kisisel/w-lush && git push -u origin feature/customers-api
gh pr create --title "Add customer endpoints for the CRM and profile screens" --body "$(cat <<'EOF'
İki yeni uç: `GET /api/customers` (CRM panosu) ve `GET /api/customers/{phone}` (danışan profili).

- Aşama ve sıcaklık **saklanmaz**, `app/customers/derive.py` içindeki saf fonksiyonlarla türetilir.
- Şema değişmedi: `alembic revision --autogenerate` boş migration üretiyor.
- Mesaj dizisi `conversations.service.thread()` ile yeniden kullanılır, kopyalanmaz.

Spec: `w-lush-web/docs/superpowers/specs/2026-08-05-crm-danisan-design.md`
EOF
)"
```

- [ ] **Step 5: Frontend PR'ı aç**

Backend PR'ı **merge edildikten sonra** aç (frontend onsuz çalışmaz):

```bash
cd ~/Desktop/kisisel/w-lush-web && git push -u origin feature/crm-real-data
gh pr create --title "Drive the CRM and customer profile from real data" --body "$(cat <<'EOF'
`CRM.tsx` ve `DanisanProfili.tsx` içindeki sahte diziler kaldırıldı; iki ekran da `/api/customers` uçlarından besleniyor.

- CRM: kartlar türetilmiş aşamaya göre kolonlara dağılır; sürükle-bırak ve aday formu kaldırıldı (aşama hesaplanır, yazılamaz).
- Profil: kimlik, sayılar, randevu geçmişi ve salt okunur mesaj dizisi. Ödeme/paket/sadakat/AI/not bölümleri kaldırıldı.
- Sidebar'daki sahte `count: 12` rozeti kaldırıldı.

Backend: selamet/w-lush PR (önce merge edilmeli).
Spec: `docs/superpowers/specs/2026-08-05-crm-danisan-design.md`
EOF
)"
```

---

## Self-Review

**Spec kapsamı:** Türetme kuralları → Task 1. Liste ucu → Task 2. Detay ucu + 404 + TR metin → Task 3. Frontend API katmanı → Task 4. CRM ekranı + sahte rozet → Task 5. Profil ekranı + rotalar → Task 6. Doğrulama kapıları → her task + Task 7. Spec'teki "silinen kod" listesi Task 5 ve 6'daki tam yeniden yazımlarla karşılanıyor.

**Spec'ten sapma (bilinçli):** Spec liste ucu için "3 sorgu" diyordu; gerçek uygulama 4 sorgu kullanıyor (mesaj gruplama, mesaj gövdeleri, randevular, isimler). Önemli olan garanti korunuyor: sorgu sayısı sabit, telefon başına sorgu yok. Spec bu sayıyla güncellenmeli.

**Tip tutarlılığı:** `stage`/`warmth` değerleri backend sabitleri (`derive.NEW` vb.) ile frontend birleşim tipleri arasında birebir aynı. `CustomerSummary.last_message_at` her iki tarafta da null olabilir. `ChatMessage` tipi `conversations.ts`'ten yeniden kullanılıyor, kopyalanmıyor.
