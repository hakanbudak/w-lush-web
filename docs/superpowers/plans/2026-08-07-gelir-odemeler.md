# Gelir / Ödemeler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operatör aldığı parayı panele kaydedebilsin ve Gelir Raporu ekranı bu gerçek kayıtları göstersin.

**Architecture:** Backend'e yeni bir `app/payments/` modülü ve `payments` tablosu gelir (projenin **ilk şema değişikliği**, elle yazılmış Alembic migration'ı ile). Dört uç: oluştur, listele, sil, özet. Özet toplamları SQL `GROUP BY` ile sunucuda hesaplanır. Frontend'de `src/api/payments.ts` katmanı, yeniden yazılmış `GelirRaporu.tsx` ve ayrı bir ödeme giriş modali yer alır.

**Tech Stack:** Backend FastAPI + SQLAlchemy 2.0 + Alembic (`selamet/w-lush`). Frontend React 18 + TypeScript + react-router-dom v6 + Vite (`hakanbudak/w-lush-web`). Yeni bağımlılık YOK.

**Spec:** `w-lush-web/docs/superpowers/specs/2026-08-07-gelir-odemeler-design.md`

## Global Constraints

**İki repo, iki branch — karıştırma:**

| Repo | Yol | Branch |
|---|---|---|
| Backend | `~/Desktop/kisisel/w-lush` | `feature/payments-api` (main üstünde) |
| Frontend | `~/Desktop/kisisel/w-lush-web` | `feature/gelir-real-data` (branch `docs/payments-spec` üstünde) |

- **Şema DEĞİŞİYOR** — bu iş bir tablo ekliyor. Migration **elle yazılır** (autogenerate'e bırakılmaz), `upgrade` ve `downgrade` ikisi de çalışır durumda olmalı.
- Yeni model `app/core/registry.py`'ye **eklenmek zorunda**; yoksa `Base.metadata` eksik kalır ve Alembic tabloyu görmez.
- **Yeni bağımlılık eklenmez** (ne pip ne npm).
- Kod, tip ve fonksiyon adları **İngilizce**; kullanıcıya görünen metinler **Türkçe**. Backend'de kullanıcıya görünen TR metin yalnız `app/content/messages.py` içinde durur ve nokta ile bitmez (mevcut üslup: `"Randevu bulunamadı"`).
- Tutarlar **tam sayı TRY** (`Service.price` ile aynı kural). Kuruş yok.
- Frontend renkleri mevcut CSS değişkenleriyle: `--paper`, `--cream`, `--cream-2`, `--line`, `--ink`, `--ink-40`, `--ink-60`, `--forest`, `--champagne`, `--sage`, `--lavender`, `--bad`.
- Frontend HTTP çağrıları **yalnız** `src/api/*.ts` içinden.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK** (`Co-authored-by` / Claude izi). Backend'de `.githooks` ve CI bunu reddediyor.
- Backend kapıları: `ruff check app` temiz, `python -c "from app.main import app"` geçer, `alembic upgrade head` çalışır, migration'dan **sonra** `alembic revision --autogenerate` boş üretir.
- Frontend kapıları: `npm run typecheck` ve `npm run build` **exit 0**.
- Hiçbir task push/merge/PR yapmaz — bunların hepsi Task 7'de.

## Test durumu — önemli

Test koşucusu iki repoda da yok ve bu plan onu kurmuyor (ayrı bir karar). Doğrulama **derleyici/linter + migration turu + canlı uç + tarayıcı** ile yapılır.

**Ön koşul — ikisi de ayakta olmalı:**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python -m uvicorn app.main:app --port 8000
cd ~/Desktop/kisisel/w-lush-web && npm run dev
```

Backend kodu değiştikten sonra sunucu **yeniden başlatılmalı** (`--reload` kullanılmıyor):

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN -t | xargs -r kill; sleep 1
cd ~/Desktop/kisisel/w-lush && (.venv/bin/python -m uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &)
```

Test hesabı: `smoke2@example.com` / `Test12345!` (clinic_id=1). `curl` bu ortamda bloklu — HTTP kontrolleri python heredoc ile yapılır.

**Ortak HTTP yardımcısı** (aşağıdaki doğrulama script'lerinin hepsi bunu tekrar eder):

```python
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

def login():
    s, b = req("/api/auth/login", "POST", {"email": "smoke2@example.com", "password": "Test12345!"})
    assert s == 200, b
    return json.loads(b)["token"]["access_token"]
```

---

### Task 1: Backend — `payments` tablosu ve migration

Bu task'ın sonunda tablo veritabanında vardır ve migration çift yönlü çalışır. Uç yok, kod henüz kimse tarafından kullanılmıyor.

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/payments-api`

**Files:**
- Create: `app/payments/__init__.py` (boş)
- Create: `app/payments/models.py`
- Create: `alembic/versions/b7c1a4e92f10_add_payments_table.py`
- Modify: `app/core/registry.py` (yeni modeli import et)

**Interfaces:**
- Consumes: `Base` (`app/core/database.py`), `clinics` ve `appointments` tabloları (FK hedefleri)
- Produces: `Payment` ORM modeli ve `METHODS` sabiti (`app/payments/models.py`)

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush && git checkout main && git pull && git checkout -b feature/payments-api
```

- [ ] **Step 2: Boş `app/payments/__init__.py` dosyasını oluştur**

```bash
mkdir -p app/payments && touch app/payments/__init__.py
```

- [ ] **Step 3: `app/payments/models.py` dosyasını oluştur**

```python
"""Payments: money the clinic actually received."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# Accepted payment methods. Plain strings rather than an Enum so adding one
# later needs no migration.
METHODS = ("cash", "card", "transfer", "other")


class Payment(Base):
    """One payment. Amounts are whole TRY, matching Service.price."""

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    # The calendar day the money arrived; no time, no timezone questions.
    paid_at: Mapped[date] = mapped_column(Date, index=True)
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(20), default="cash")
    # Nullable: a walk-in sale belongs to no customer and no appointment.
    phone: Mapped[str | None] = mapped_column(String(32), index=True, nullable=True)
    appointment_id: Mapped[int | None] = mapped_column(
        ForeignKey("appointments.id"), nullable=True
    )
    # Snapshots, not foreign keys: renaming or deleting a service must not
    # rewrite an accounting record.
    customer_name: Mapped[str] = mapped_column(String(120), default="")
    service_name: Mapped[str] = mapped_column(String(120), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
```

- [ ] **Step 4: Modeli `app/core/registry.py`'ye ekle**

`from app.notifications import models as notification_models  # noqa: F401` satırının **üstüne** (alfabetik sıra) ekle:

```python
from app.payments import models as payment_models  # noqa: F401
```

Bu adım atlanırsa Alembic tabloyu göremez ve Step 7'deki autogenerate kontrolü yanlış sonuç verir.

- [ ] **Step 5: Migration dosyasını elle yaz**

`alembic/versions/b7c1a4e92f10_add_payments_table.py`:

```python
"""add payments table

Revision ID: b7c1a4e92f10
Revises: 5fd42d9f312a
Create Date: 2026-08-07

"""
import sqlalchemy as sa
from alembic import op

revision = "b7c1a4e92f10"
down_revision = "5fd42d9f312a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clinic_id", sa.Integer(), nullable=False),
        sa.Column("paid_at", sa.Date(), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("method", sa.String(length=20), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("appointment_id", sa.Integer(), nullable=True),
        sa.Column("customer_name", sa.String(length=120), nullable=False),
        sa.Column("service_name", sa.String(length=120), nullable=False),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["clinic_id"], ["clinics.id"]),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_clinic_id", "payments", ["clinic_id"])
    op.create_index("ix_payments_paid_at", "payments", ["paid_at"])
    op.create_index("ix_payments_phone", "payments", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_payments_phone", table_name="payments")
    op.drop_index("ix_payments_paid_at", table_name="payments")
    op.drop_index("ix_payments_clinic_id", table_name="payments")
    op.drop_table("payments")
```

`down_revision` değeri mevcut head'dir. Doğrula: `.venv/bin/alembic heads` çıktısı `5fd42d9f312a (head)` olmalı. Farklıysa dosyadaki `down_revision`'ı o değere çevir.

- [ ] **Step 6: Migration'ı çift yönlü çalıştır**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && \
.venv/bin/alembic upgrade head && \
.venv/bin/python -c "
import sqlite3; c = sqlite3.connect('w_lush.db')
cols = [r[1] for r in c.execute('PRAGMA table_info(payments)')]
print('kolonlar:', cols); assert 'amount' in cols and 'paid_at' in cols" && \
.venv/bin/alembic downgrade -1 && \
.venv/bin/python -c "
import sqlite3; c = sqlite3.connect('w_lush.db')
n = c.execute(\"SELECT count(*) FROM sqlite_master WHERE name='payments'\").fetchone()[0]
print('downgrade sonrası tablo sayısı:', n); assert n == 0" && \
.venv/bin/alembic upgrade head && echo "MIGRATION ÇİFT YÖNLÜ OK"
```

Expected: kolon listesi basılır, downgrade sonrası `0`, son satır `MIGRATION ÇİFT YÖNLÜ OK`.

- [ ] **Step 7: Model ile şemanın uyuştuğunu kanıtla**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/alembic revision --autogenerate -m "should be empty" > /dev/null 2>&1
F=$(ls -t alembic/versions/*.py | head -1); grep -c "op\." "$F"; rm "$F"
```

Expected: `0` (autogenerate ekleyecek bir fark bulamadı), ardından geçici dosya silinir.

- [ ] **Step 8: Lint ve import kapıları**

Run: `cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"`
Expected: `All checks passed!` ve `import ok`.

- [ ] **Step 9: Commit**

```bash
git add app/payments/__init__.py app/payments/models.py app/core/registry.py alembic/versions/b7c1a4e92f10_add_payments_table.py
git commit -m "Add the payments table

First schema change in this project, so the migration is written by hand and
both directions are exercised. Amounts are whole TRY like Service.price, and
customer_name/service_name are snapshots rather than foreign keys so renaming
a service cannot rewrite an accounting record."
```

---

### Task 2: Backend — ödeme oluştur / listele / sil

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/payments-api`

**Files:**
- Create: `app/payments/schemas.py`
- Create: `app/payments/service.py`
- Create: `app/payments/router.py`
- Modify: `app/content/messages.py` (dört yeni TR metin)
- Modify: `app/main.py` (import + `include_router`)

**Interfaces:**
- Consumes: `Payment`, `METHODS` (Task 1); `Appointment` (`app/clinic/models.py`); `get_db`, `get_current_user`
- Produces:
  - `service.listing(db, clinic_id, start=None, end=None, limit=200) -> list[Payment]`
  - `service.create(db, clinic_id, payload: PaymentIn, appointment: Appointment | None) -> Payment`
  - `service.get(db, clinic_id, payment_id) -> Payment | None`
  - `service.remove(db, payment: Payment) -> None`
  - Şemalar: `PaymentIn`, `PaymentOut`
  - Uçlar: `GET /api/payments`, `POST /api/payments` (201), `DELETE /api/payments/{id}` (204)

- [ ] **Step 1: `app/payments/schemas.py` dosyasını oluştur**

```python
"""Request/response shapes for payments."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class PaymentIn(BaseModel):
    paid_at: date
    amount: int
    method: str = "cash"
    phone: str | None = None
    appointment_id: int | None = None
    # Left empty on purpose: when an appointment is given these are copied
    # from it. An explicit value in the request wins.
    customer_name: str = ""
    service_name: str = ""
    note: str = ""


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    paid_at: date
    amount: int
    method: str
    phone: str | None
    appointment_id: int | None
    customer_name: str
    service_name: str
    note: str
    created_at: datetime
```

- [ ] **Step 2: `app/payments/service.py` dosyasını oluştur**

```python
"""Payment persistence. Query helpers only — validation lives in the router."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clinic.models import Appointment
from app.payments.models import Payment
from app.payments.schemas import PaymentIn


def _scoped(stmt, clinic_id: int, start: date | None, end: date | None):
    """Clinic isolation plus the optional date window, in one place."""
    stmt = stmt.where(Payment.clinic_id == clinic_id)
    if start is not None:
        stmt = stmt.where(Payment.paid_at >= start)
    if end is not None:
        stmt = stmt.where(Payment.paid_at <= end)
    return stmt


def listing(
    db: Session,
    clinic_id: int,
    start: date | None = None,
    end: date | None = None,
    limit: int = 200,
) -> list[Payment]:
    stmt = _scoped(select(Payment), clinic_id, start, end)
    stmt = stmt.order_by(Payment.paid_at.desc(), Payment.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def get(db: Session, clinic_id: int, payment_id: int) -> Payment | None:
    payment = db.get(Payment, payment_id)
    if payment is None or payment.clinic_id != clinic_id:
        return None
    return payment


def create(
    db: Session,
    clinic_id: int,
    payload: PaymentIn,
    appointment: Appointment | None,
) -> Payment:
    """Store the payment, copying customer/service details from the linked
    appointment for any field the caller left blank.
    """
    data = payload.model_dump()
    if appointment is not None:
        data["phone"] = data["phone"] or appointment.phone
        data["customer_name"] = data["customer_name"] or appointment.customer_name
        data["service_name"] = data["service_name"] or appointment.service_name
    payment = Payment(clinic_id=clinic_id, **data)
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def remove(db: Session, payment: Payment) -> None:
    db.delete(payment)
    db.commit()
```

- [ ] **Step 3: TR metinlerini `app/content/messages.py`'ye ekle**

`ERR_CUSTOMER_NOT_FOUND = "Bu numaraya ait kayıt bulunamadı"` satırının hemen altına ekle (mevcut üslup: nokta yok):

```python
ERR_PAYMENT_NOT_FOUND = "Ödeme kaydı bulunamadı"
ERR_PAYMENT_AMOUNT = "Tutar sıfırdan büyük olmalı"
ERR_PAYMENT_METHOD = "Geçersiz ödeme yöntemi"
ERR_PAYMENT_FUTURE_DATE = "Ödeme tarihi gelecekte olamaz"
```

- [ ] **Step 4: `app/payments/router.py` dosyasını oluştur**

```python
"""Payment endpoints for the operator panel (clinic-scoped, auth-protected)."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.models import User
from app.clinic.models import Appointment
from app.content import messages as msg
from app.core.database import get_db
from app.core.deps import get_current_user
from app.payments import service
from app.payments.models import METHODS
from app.payments.schemas import PaymentIn, PaymentOut

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut])
def list_payments(
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Newest first. Without a date window, the most recent 200 rows."""
    return service.listing(db, current.clinic_id, start, end)


@router.post("", response_model=PaymentOut, status_code=201)
def create_payment(
    payload: PaymentIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if payload.amount <= 0:
        raise HTTPException(422, msg.ERR_PAYMENT_AMOUNT)
    if payload.method not in METHODS:
        raise HTTPException(422, msg.ERR_PAYMENT_METHOD)
    # A date in the future is almost always a typo, and it would silently
    # skew every period total.
    if payload.paid_at > date.today():
        raise HTTPException(422, msg.ERR_PAYMENT_FUTURE_DATE)

    appointment = None
    if payload.appointment_id is not None:
        appointment = db.get(Appointment, payload.appointment_id)
        if appointment is None or appointment.clinic_id != current.clinic_id:
            raise HTTPException(404, msg.ERR_APPOINTMENT_NOT_FOUND)

    return service.create(db, current.clinic_id, payload, appointment)


@router.delete("/{payment_id}", status_code=204)
def delete_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Corrections happen by deleting and re-entering: editing an accounting
    row in place would hide what changed.
    """
    payment = service.get(db, current.clinic_id, payment_id)
    if payment is None:
        raise HTTPException(404, msg.ERR_PAYMENT_NOT_FOUND)
    service.remove(db, payment)
```

- [ ] **Step 5: Router'ı `app/main.py`'ye bağla**

Import bloğuna (alfabetik sıra: `app.notifications.router`'dan sonra) ekle:

```python
from app.payments.router import router as payments_router
```

`app.include_router(customers_router)` satırının altına ekle:

```python
app.include_router(payments_router)
```

- [ ] **Step 6: Lint ve import kapıları**

Run: `cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"`
Expected: `All checks passed!` ve `import ok`.

- [ ] **Step 7: Sunucuyu yeniden başlat ve uçları canlı doğrula**

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN -t | xargs -r kill; sleep 1
cd ~/Desktop/kisisel/w-lush && (.venv/bin/python -m uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &); sleep 3
```

Run:

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

tok = json.loads(req("/api/auth/login", "POST", {"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
today = date.today().isoformat()

s, b = req("/api/payments", "POST", {"paid_at": today, "amount": 4100, "method": "card", "service_name": "Mezoterapi"}, tok)
print("oluştur ->", s)
assert s == 201, b
created = json.loads(b)
assert set(created) == {"id","paid_at","amount","method","phone","appointment_id","customer_name","service_name","note","created_at"}, "ŞEMA UYUŞMUYOR"

# Doğrulama yolları
print("amount=0     ->", req("/api/payments","POST",{"paid_at":today,"amount":0,"method":"cash"},tok)[0])
print("amount<0     ->", req("/api/payments","POST",{"paid_at":today,"amount":-5,"method":"cash"},tok)[0])
print("kötü yöntem  ->", req("/api/payments","POST",{"paid_at":today,"amount":10,"method":"bitcoin"},tok)[0])
future = (date.today() + timedelta(days=2)).isoformat()
st, body = req("/api/payments","POST",{"paid_at":future,"amount":10,"method":"cash"},tok)
print("gelecek tarih->", st, json.loads(body)["detail"])
assert st == 422
print("olmayan randevu ->", req("/api/payments","POST",{"paid_at":today,"amount":10,"method":"cash","appointment_id":999999},tok)[0])

rows = json.loads(req("/api/payments", token=tok)[1])
assert any(r["id"] == created["id"] for r in rows), "listede yok"
print("liste satır:", len(rows))
print("sil ->", req(f"/api/payments/{created['id']}", "DELETE", token=tok)[0])
print("tekrar sil ->", req(f"/api/payments/{created['id']}", "DELETE", token=tok)[0])
print("yetkisiz ->", req("/api/payments")[0])
print("CRUD OK")
PY
```

Expected: `oluştur -> 201`; dört doğrulama satırı `422`; olmayan randevu `404`; `sil -> 204`; `tekrar sil -> 404`; `yetkisiz -> 401`; son satır `CRUD OK`.

- [ ] **Step 8: Commit**

```bash
git add app/payments/schemas.py app/payments/service.py app/payments/router.py app/content/messages.py app/main.py
git commit -m "Add payment create, list and delete endpoints

Corrections happen by delete-and-reenter rather than PATCH: editing an
accounting row in place hides what changed. Linking an appointment copies its
customer and service into the payment so the operator types them once."
```

---

### Task 3: Backend — özet ucu

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/payments-api`

**Files:**
- Modify: `app/payments/service.py` (yeni `summary()`)
- Modify: `app/payments/schemas.py` (dört yeni şema)
- Modify: `app/payments/router.py` (yeni uç)

**Interfaces:**
- Consumes: Task 2'nin `_scoped()` yardımcısı
- Produces:
  - `service.summary(db, clinic_id, start=None, end=None) -> dict`
  - `GET /api/payments/summary` → `SummaryOut` (`total`, `count`, `by_service`, `by_method`, `by_month`)

- [ ] **Step 1: `summary()` fonksiyonunu `app/payments/service.py` sonuna ekle**

Üstteki import bloğunu şununla değiştir:

```python
from datetime import date

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from app.clinic.models import Appointment
from app.payments.models import Payment
from app.payments.schemas import PaymentIn
```

Dosyanın **sonuna** ekle:

```python
# "2026-08" from a date column. substr over the ISO text works on both
# SQLite (dev) and PostgreSQL (prod); strftime/to_char would not.
_MONTH = func.substr(cast(Payment.paid_at, String), 1, 7)


def summary(
    db: Session,
    clinic_id: int,
    start: date | None = None,
    end: date | None = None,
) -> dict:
    """Income totals for a date window, aggregated in SQL.

    Four GROUP BY queries rather than pulling every row into Python: the
    screen only ever shows the totals.
    """
    totals = db.execute(
        _scoped(select(func.coalesce(func.sum(Payment.amount), 0), func.count()),
                clinic_id, start, end)
    ).one()

    by_service = db.execute(
        _scoped(
            select(Payment.service_name, func.sum(Payment.amount), func.count()),
            clinic_id, start, end,
        )
        .group_by(Payment.service_name)
        .order_by(func.sum(Payment.amount).desc())
    ).all()

    by_method = db.execute(
        _scoped(
            select(Payment.method, func.sum(Payment.amount), func.count()),
            clinic_id, start, end,
        )
        .group_by(Payment.method)
        .order_by(func.sum(Payment.amount).desc())
    ).all()

    by_month = db.execute(
        _scoped(select(_MONTH, func.sum(Payment.amount)), clinic_id, start, end)
        .group_by(_MONTH)
        .order_by(_MONTH)
    ).all()

    return {
        "total": totals[0],
        "count": totals[1],
        "by_service": [
            {"service_name": name, "amount": amount, "count": count}
            for name, amount, count in by_service
        ],
        "by_method": [
            {"method": method, "amount": amount, "count": count}
            for method, amount, count in by_method
        ],
        "by_month": [{"month": month, "amount": amount} for month, amount in by_month],
    }
```

- [ ] **Step 2: Özet şemalarını `app/payments/schemas.py` sonuna ekle**

```python
class ServiceTotalOut(BaseModel):
    service_name: str
    amount: int
    count: int


class MethodTotalOut(BaseModel):
    method: str
    amount: int
    count: int


class MonthTotalOut(BaseModel):
    month: str  # "YYYY-MM"
    amount: int


class SummaryOut(BaseModel):
    """The whole income screen in one response."""

    total: int
    count: int
    by_service: list[ServiceTotalOut]
    by_method: list[MethodTotalOut]
    by_month: list[MonthTotalOut]
```

- [ ] **Step 3: Ucu `app/payments/router.py`'ye ekle**

Import satırını şununla değiştir:

```python
from app.payments.schemas import PaymentIn, PaymentOut, SummaryOut
```

Ucu `list_payments`'ın **hemen altına**, `delete_payment`'tan **önce** ekle (sabit yol, parametreli yoldan önce gelsin):

```python
@router.get("/summary", response_model=SummaryOut)
def payment_summary(
    start: date | None = None,
    end: date | None = None,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return service.summary(db, current.clinic_id, start, end)
```

- [ ] **Step 4: Lint ve import kapıları**

Run: `cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"`
Expected: `All checks passed!` ve `import ok`.

- [ ] **Step 5: Özeti canlı doğrula — toplam elle hesaplananla eşleşmeli**

Sunucuyu yeniden başlat (Task 2 Step 7'deki komut), sonra Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import json, urllib.request
from datetime import date
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
today = date.today().isoformat()

made = []
for amount, method, svc in [(4100,"card","Mezoterapi"), (1800,"cash","Hydrafacial"), (900,"card","Mezoterapi")]:
    s, b = req("/api/payments","POST",{"paid_at":today,"amount":amount,"method":method,"service_name":svc},tok)
    assert s == 201, b
    made.append(json.loads(b)["id"])

s, b = req(f"/api/payments/summary?start={today}&end={today}", token=tok)
print("özet ->", s)
d = json.loads(b)
assert set(d) == {"total","count","by_service","by_method","by_month"}, "ŞEMA UYUŞMUYOR"
assert d["total"] == 6800, d
assert d["count"] == 3, d
svc = {r["service_name"]: r for r in d["by_service"]}
assert svc["Mezoterapi"]["amount"] == 5000 and svc["Mezoterapi"]["count"] == 2, svc
mth = {r["method"]: r["amount"] for r in d["by_method"]}
assert mth["card"] == 5000 and mth["cash"] == 1800, mth
assert d["by_month"][0]["month"] == today[:7], d["by_month"]
print("  toplam:", d["total"], "| hizmet:", svc["Mezoterapi"]["amount"], "| ay:", d["by_month"])

# Silme özeti düşürmeli
req(f"/api/payments/{made[0]}", "DELETE", token=tok)
d2 = json.loads(req(f"/api/payments/summary?start={today}&end={today}", token=tok)[1])
assert d2["total"] == 2700, d2
print("  silme sonrası toplam:", d2["total"])

# Kapsayan aralık dışı boş dönmeli
empty = json.loads(req("/api/payments/summary?start=2000-01-01&end=2000-01-31", token=tok)[1])
assert empty["total"] == 0 and empty["count"] == 0 and empty["by_service"] == [], empty
print("  boş dönem:", empty["total"])

for pid in made[1:]:
    req(f"/api/payments/{pid}", "DELETE", token=tok)
print("ÖZET OK")
PY
```

Expected: `özet -> 200`, toplam `6800`, silme sonrası `2700`, boş dönem `0`, son satır `ÖZET OK`.

- [ ] **Step 6: Commit**

```bash
git add app/payments/service.py app/payments/schemas.py app/payments/router.py
git commit -m "Add the payment summary endpoint

Totals come from four GROUP BY queries instead of loading rows into Python.
The month bucket uses substr over the ISO date text because strftime and
to_char are dialect-specific and this runs on both SQLite and PostgreSQL."
```

---

### Task 4: Frontend — API katmanı ve `KpiCard` düzeltmesi

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/gelir-real-data`

**Files:**
- Create: `src/api/payments.ts`
- Create: `src/utils/period.ts`
- Modify: `src/components/ui.tsx:136-150` (`delta` / `deltaTone` opsiyonel)

**Interfaces:**
- Consumes: `request<T>()` (`src/api/client.ts`)
- Produces:
  - `type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'`
  - `interface Payment`, `PaymentInput`, `ServiceTotal`, `MethodTotal`, `MonthTotal`, `PaymentSummary`
  - `listPayments(start?, end?)`, `getSummary(start?, end?)`, `createPayment(input)`, `deletePayment(id)`
  - `type Period = 'ay' | 'ceyrek' | 'yil'`, `rangeFor(period): { start: string; end: string }`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush-web && git checkout docs/payments-spec && git checkout -b feature/gelir-real-data
```

- [ ] **Step 2: `src/api/payments.ts` dosyasını oluştur**

```ts
// Ödemeler / gelir — backend: app/payments/ (klinik kapsamlı, auth'lu).
import { request } from './client';
import { toUtcIso } from '../utils/time';

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

/** Tek ödeme kaydı. */
export interface Payment {
  id: number;
  paid_at: string; // YYYY-MM-DD (takvim günü)
  amount: number; // tam sayı TRY
  method: PaymentMethod;
  phone: string | null;
  appointment_id: number | null;
  customer_name: string;
  service_name: string;
  note: string;
  created_at: string; // ISO
}

/** Yeni ödeme gövdesi. Boş bırakılan alanlar randevudan doldurulur. */
export interface PaymentInput {
  paid_at: string;
  amount: number;
  method: PaymentMethod;
  phone?: string | null;
  appointment_id?: number | null;
  customer_name?: string;
  service_name?: string;
  note?: string;
}

export interface ServiceTotal {
  service_name: string;
  amount: number;
  count: number;
}

export interface MethodTotal {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface MonthTotal {
  month: string; // YYYY-MM
  amount: number;
}

export interface PaymentSummary {
  total: number;
  count: number;
  by_service: ServiceTotal[];
  by_method: MethodTotal[];
  by_month: MonthTotal[];
}

const query = (start?: string, end?: string): string => {
  const p = new URLSearchParams();
  if (start) p.set('start', start);
  if (end) p.set('end', end);
  const s = p.toString();
  return s ? `?${s}` : '';
};

// paid_at bir takvim günü; toUtcIso'dan geçirmek tarihi kaydırabilir.
// created_at ise zaman damgası, o normalize edilir.
export const listPayments = (start?: string, end?: string) =>
  request<Payment[]>(`/api/payments${query(start, end)}`).then((rows) =>
    rows.map((p) => ({ ...p, created_at: toUtcIso(p.created_at) })),
  );

export const getSummary = (start?: string, end?: string) =>
  request<PaymentSummary>(`/api/payments/summary${query(start, end)}`);

export const createPayment = (input: PaymentInput) =>
  request<Payment>('/api/payments', {
    method: 'POST',
    body: JSON.stringify(input),
  }).then((p) => ({ ...p, created_at: toUtcIso(p.created_at) }));

export const deletePayment = (id: number) =>
  request<void>(`/api/payments/${id}`, { method: 'DELETE' });
```

- [ ] **Step 3: `src/utils/period.ts` dosyasını oluştur**

```ts
// Dönem düğmeleri → somut tarih aralığı. Backend dönem kavramı bilmez,
// yalnız start/end alır; "bu ay"ın ne olduğu arayüzün kararıdır.

export type Period = 'ay' | 'ceyrek' | 'yil';

const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Seçili dönemin ilk ve son günü (bugün dahil, yerel takvime göre). */
export function rangeFor(period: Period, today = new Date()): { start: string; end: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  if (period === 'ay') {
    return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  }
  if (period === 'ceyrek') {
    const firstMonth = Math.floor(m / 3) * 3;
    return {
      start: iso(new Date(y, firstMonth, 1)),
      end: iso(new Date(y, firstMonth + 3, 0)),
    };
  }
  return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
}

/** "2026-08" → "Ağu 2026" — aylık seyir barlarının etiketi. */
export const monthLabel = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
};
```

- [ ] **Step 4: `KpiCard`'ın `delta`'sını opsiyonele çevir**

`src/components/ui.tsx` içindeki imzayı şununla değiştir:

```tsx
export function KpiCard({
  label,
  value,
  delta,
  deltaTone,
  sparkline,
  accent,
}: {
  label: string;
  value: string;
  // Opsiyonel: önceki döneme kıyas verisi olmayan ekranlar rozet çizmez.
  delta?: string;
  deltaTone?: 'good' | 'bad' | 'warn';
  sparkline?: string;
  accent: string;
}) {
```

Gövdedeki rozet bloğunu (`<div style={{ fontSize: 11, fontWeight: 500, color: ... }}>{delta}</div>`) koşullu hale getir: bloğun tamamını `{delta && ( ... )}` içine al. `deltaTone === 'good' ? ... : ...` zinciri olduğu gibi kalır; `delta` yoksa hiç değerlendirilmez.

- [ ] **Step 5: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`. `KpiCard`'ı kullanan diğer sayfalar (`AnaEkran`, `GelirRaporu`) hâlâ değer geçtiği için etkilenmez.

- [ ] **Step 6: Sözleşmenin backend'le uyuştuğunu canlı doğrula**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
from datetime import date
B = "http://localhost:5173"  # Vite proxy → :8000

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
today = date.today().isoformat()
s, b = req("/api/payments","POST",{"paid_at":today,"amount":2500,"method":"transfer","service_name":"Saç Mezoterapisi"},tok)
assert s == 201, b
pid = json.loads(b)["id"]
d = json.loads(req(f"/api/payments/summary?start={today}&end={today}", token=tok)[1])
assert {"total","count","by_service","by_method","by_month"} == set(d), d
rows = json.loads(req("/api/payments", token=tok)[1])
assert {"id","paid_at","amount","method","phone","appointment_id","customer_name","service_name","note","created_at"} == set(rows[0])
req(f"/api/payments/{pid}", "DELETE", token=tok)
print("SÖZLEŞME OK")
PY
```

Expected: son satır `SÖZLEŞME OK`.

- [ ] **Step 7: Commit**

```bash
git add src/api/payments.ts src/utils/period.ts src/components/ui.tsx
git commit -m "Add payments API client and make the KPI delta optional

KpiCard demanded a delta badge from every caller, which the income screen
cannot supply: there is no previous-period comparison in the data. Making it
optional beats inventing a percentage."
```

---

### Task 5: Frontend — Gelir Raporu ekranı (okuma)

Bu task'ın sonunda ekran gerçek özeti gösterir. Ödeme **ekleme** ve **silme** Task 6'da gelir.

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/gelir-real-data`

**Files:**
- Modify: `src/pages/GelirRaporu.tsx` (tam yeniden yazım — `CATEGORIES`, `STAFF`, şube/hizmet filtreleri silinir)

**Interfaces:**
- Consumes: `getSummary`, `listPayments`, `PaymentSummary`, `Payment`, `PaymentMethod` (Task 4); `rangeFor`, `monthLabel`, `Period` (Task 4); `KpiCard` (`src/components/ui.tsx`)
- Produces: `export default function GelirRaporu(): JSX.Element`

- [ ] **Step 1: `src/pages/GelirRaporu.tsx` dosyasının tamamını şununla değiştir**

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  getSummary,
  listPayments,
  type Payment,
  type PaymentMethod,
  type PaymentSummary,
} from '../api/payments';
import { KpiCard } from '../components/ui';
import { monthLabel, rangeFor, type Period } from '../utils/period';

const fmt = (n: number): string => '₺ ' + n.toLocaleString('tr-TR');

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  card: 'Kart',
  transfer: 'Havale',
  other: 'Diğer',
};

const BAR_COLORS = ['var(--champagne)', 'var(--forest)', 'var(--lavender)', 'var(--sage)', 'var(--ink-40)'];

/** YYYY-MM-DD → "12 May" */
const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

export default function GelirRaporu() {
  const [period, setPeriod] = useState<Period>('ay');
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const { start, end } = rangeFor(period);
    setError(null);
    Promise.all([getSummary(start, end), listPayments(start, end)])
      .then(([s, r]) => {
        setSummary(s);
        setRows(r);
      })
      .catch(() => setError('Gelir verileri yüklenemedi.'));
  }, [period]);

  useEffect(load, [load]);

  const avg = summary && summary.count > 0 ? Math.round(summary.total / summary.count) : 0;
  const maxMonth = summary ? Math.max(1, ...summary.by_month.map((m) => m.amount)) : 1;

  return (
    <>
      {/* dönem seçici */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 8, padding: 3,
          }}
        >
          {([['ay', 'Bu ay'], ['ceyrek', 'Çeyrek'], ['yil', 'Yıl']] as [Period, string][]).map(
            ([k, lbl]) => (
              <button
                key={k}
                onClick={() => setPeriod(k)}
                className="wl-btn wl-btn-sm"
                style={{
                  height: 28, borderRadius: 6, fontSize: 12,
                  background: period === k ? 'var(--cream-2)' : 'transparent',
                  color: period === k ? 'var(--ink)' : 'var(--ink-60)',
                }}
              >
                {lbl}
              </button>
            ),
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-60)' }}>
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

      {!error && summary === null && (
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--ink-40)' }}>Yükleniyor…</div>
      )}

      {!error && summary && (
        <>
          {/* KPI satırı */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <div style={{ flex: 1 }}>
              <KpiCard label="Toplam gelir" value={fmt(summary.total)} accent="var(--forest)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard label="Ödeme sayısı" value={String(summary.count)} accent="var(--champagne)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard label="Ortalama ödeme" value={fmt(avg)} accent="var(--sage)" />
            </div>
          </div>

          {/* hizmet kırılımı + yöntem dağılımı */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
            <div
              style={{
                flex: 2, background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Hizmet kırılımı</div>
              {summary.by_service.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>
                  Bu dönemde kayıtlı ödeme yok.
                </div>
              )}
              {summary.by_service.map((s, i) => {
                const pct = summary.total > 0 ? Math.round((s.amount / summary.total) * 100) : 0;
                return (
                  <div key={s.service_name || `_${i}`} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span>{s.service_name || 'Belirtilmemiş'}</span>
                      <span style={{ color: 'var(--ink-60)' }}>
                        {fmt(s.amount)} · %{pct}
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'var(--cream)', borderRadius: 999 }}>
                      <div
                        style={{
                          width: `${pct}%`, height: '100%', borderRadius: 999,
                          background: BAR_COLORS[i % BAR_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                flex: 1, background: 'var(--paper)', border: '1px solid var(--line)',
                borderRadius: 12, padding: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Ödeme yöntemi</div>
              {summary.by_method.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Kayıt yok.</div>
              )}
              {summary.by_method.map((m) => (
                <div
                  key={m.method}
                  style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 10 }}
                >
                  <span>{METHOD_LABEL[m.method] ?? m.method}</span>
                  <span style={{ color: 'var(--ink-60)' }}>{fmt(m.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* aylık seyir */}
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: 12, padding: 20, marginTop: 12,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Aylık seyir</div>
            {summary.by_month.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Kayıt yok.</div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 120 }}>
              {summary.by_month.map((m) => (
                <div key={m.month} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: Math.max(4, Math.round((m.amount / maxMonth) * 96)),
                      background: 'var(--forest)', borderRadius: 6, marginBottom: 6,
                    }}
                    title={fmt(m.amount)}
                  />
                  <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>{monthLabel(m.month)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* son ödemeler */}
          <div
            style={{
              background: 'var(--paper)', border: '1px solid var(--line)',
              borderRadius: 12, marginTop: 12, overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 600 }}>
              Son ödemeler
            </div>
            {rows?.length === 0 && (
              <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
                Bu dönemde kayıtlı ödeme yok.
              </div>
            )}
            {rows?.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                  borderBottom: '1px solid var(--line)', fontSize: 12,
                }}
              >
                <span style={{ width: 70, color: 'var(--ink-60)' }}>{dayLabel(p.paid_at)}</span>
                <span style={{ width: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.customer_name || p.phone || '—'}
                </span>
                <span style={{ flex: 1, minWidth: 0, color: 'var(--ink-60)' }}>
                  {p.service_name || 'Belirtilmemiş'}
                </span>
                <span style={{ width: 60, color: 'var(--ink-40)' }}>{METHOD_LABEL[p.method] ?? p.method}</span>
                <span style={{ width: 90, textAlign: 'right', fontWeight: 600 }}>{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 3: Canlı doğrula**

Önce API üzerinden bu ay içine üç ödeme yaz:

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
from datetime import date
B = "http://localhost:5173"
def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()
tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
today = date.today().isoformat()
for amount, method, svc, who in [(4100,"card","Mezoterapi","Ayşe Yılmaz"), (1800,"cash","Hydrafacial","Berfin Çağlar"), (900,"transfer","Lazer Epilasyon","")]:
    print(req("/api/payments","POST",{"paid_at":today,"amount":amount,"method":method,"service_name":svc,"customer_name":who},tok)[0])
PY
```

Tarayıcıda `http://localhost:5173/gelir` aç. Beklenen: Toplam gelir **₺ 6.800**, Ödeme sayısı **3**, Ortalama **₺ 2.267**; hizmet kırılımında üç satır ve yüzdeleri; ödeme yöntemi listesinde Kart/Nakit/Havale; aylık seyirde tek bar; son ödemeler tablosunda üç satır, adı olmayan kayıt "—" gösterir. "Çeyrek" ve "Yıl" düğmeleri aynı toplamı verir (kayıtlar bu ay). Konsolda hata olmamalı.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GelirRaporu.tsx
git commit -m "Drive the income report from real payments

The category and staff arrays are gone. Period buttons now resolve to real
date ranges, and every number on the screen comes from the summary endpoint."
```

---

### Task 6: Frontend — ödeme ekleme ve silme

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/gelir-real-data`

**Files:**
- Create: `src/components/PaymentModal.tsx`
- Modify: `src/pages/GelirRaporu.tsx` ("Gelir ekle" düğmesi, modal bağlantısı, satır içi silme)

**Interfaces:**
- Consumes: `createPayment`, `PaymentInput`, `PaymentMethod` (Task 4); `Modal` (`src/components/modals.tsx:17`)
- Produces: `export default function PaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }): JSX.Element`

- [ ] **Step 1: `src/components/PaymentModal.tsx` dosyasını oluştur**

```tsx
import { useState } from 'react';
import { createPayment, type PaymentMethod } from '../api/payments';
import { Modal } from './modals';

const METHODS: [PaymentMethod, string][] = [
  ['cash', 'Nakit'],
  ['card', 'Kart'],
  ['transfer', 'Havale'],
  ['other', 'Diğer'],
];

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const field: React.CSSProperties = {
  width: '100%', border: '1px solid var(--line)', borderRadius: 8,
  padding: '8px 10px', font: 'inherit', fontSize: 12, background: 'var(--cream)',
};

export default function PaymentModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [paidAt, setPaidAt] = useState(todayIso());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [serviceName, setServiceName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Tutar sıfırdan büyük olmalı.');
      return;
    }
    setSaving(true);
    setError(null);
    createPayment({
      paid_at: paidAt,
      amount: Math.round(value),
      method,
      service_name: serviceName.trim(),
      customer_name: customerName.trim(),
      phone: phone.trim() || null,
      note: note.trim(),
    })
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((e: Error) => {
        // 422 gövdesindeki TR metni doğrudan göster; yoksa genel mesaj.
        const detail = e.message.split('detail":"')[1]?.split('"')[0];
        setError(detail || 'Ödeme kaydedilemedi.');
        setSaving(false);
      });
  };

  return (
    <Modal title="Gelir ekle" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
          Tarih
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} style={field} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
          Tutar (₺)
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="4100"
            style={field}
          />
        </label>
        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
          Ödeme yöntemi
          <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} style={field}>
            {METHODS.map(([k, lbl]) => (
              <option key={k} value={k}>{lbl}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
          Hizmet
          <input value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Mezoterapi" style={field} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
          Danışan adı
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={field} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
          Telefon (opsiyonel)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="905321112233" style={field} />
        </label>
        <label style={{ fontSize: 11, color: 'var(--ink-60)' }}>
          Not
          <input value={note} onChange={(e) => setNote(e.target.value)} style={field} />
        </label>

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          <button type="button" className="wl-btn wl-btn-sm" onClick={submit} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

`Modal`'ın imzası doğrulandı (`src/components/modals.tsx:17`): `{ title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }`. Yukarıdaki kullanım buna uyuyor; `footer` kullanılmıyor çünkü düğmeler gövdenin akışında duruyor.

- [ ] **Step 2: `GelirRaporu.tsx`'e "Gelir ekle" düğmesini ve modali bağla**

Import bloğuna ekle:

```tsx
import { deletePayment } from '../api/payments';
import PaymentModal from '../components/PaymentModal';
```

`const [error, setError] = useState<string | null>(null);` satırının altına ekle:

```tsx
  const [adding, setAdding] = useState(false);
  // Satır içi silme onayı: hangi kaydın "Emin misin?" durumunda olduğu.
  const [confirmId, setConfirmId] = useState<number | null>(null);
```

Dönem seçicinin bulunduğu `div`'in **içine**, kapanış `</div>`'inden hemen önce ekle:

```tsx
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ marginLeft: 'auto', borderRadius: 8, fontSize: 12 }}
          onClick={() => setAdding(true)}
        >
          Gelir ekle
        </button>
```

Bileşenin döndürdüğü `<>` içinde, en sona (kapanış `</>` öncesi) ekle:

```tsx
      {adding && <PaymentModal onClose={() => setAdding(false)} onSaved={load} />}
```

- [ ] **Step 3: Satır içi silmeyi ekle**

Son ödemeler tablosundaki satırın içinde, tutar `<span>`'inden **sonra** ekle:

```tsx
                {confirmId === p.id ? (
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        deletePayment(p.id)
                          .then(() => {
                            setConfirmId(null);
                            load();
                          })
                          .catch(() => setError('Ödeme silinemedi.'));
                      }}
                      style={{
                        border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                        fontSize: 11, color: 'var(--bad)', cursor: 'pointer',
                      }}
                    >
                      Sil
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmId(null)}
                      style={{
                        border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                        fontSize: 11, color: 'var(--ink-40)', cursor: 'pointer',
                      }}
                    >
                      Vazgeç
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmId(p.id)}
                    style={{
                      border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                      fontSize: 11, color: 'var(--ink-40)', cursor: 'pointer',
                    }}
                  >
                    Kaldır
                  </button>
                )}
```

- [ ] **Step 4: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 5: Canlı doğrula — uçtan uca akış**

Tarayıcıda `http://localhost:5173/gelir`:

1. "Gelir ekle" → tarih bugün dolu gelir; tutar `2500`, yöntem **Havale**, hizmet `Saç Mezoterapisi` gir, Kaydet.
2. Modal kapanır, toplam **₺ 2.500 artar**, yeni satır listenin başında görünür, hizmet kırılımına yeni satır düşer.
3. Tutar alanına `0` yazıp Kaydet → form içinde "Tutar sıfırdan büyük olmalı." görünür, istek gönderilmez.
4. Tarihi yarına al, tutar `100`, Kaydet → backend'den gelen "Ödeme tarihi gelecekte olamaz" mesajı formda görünür.
5. Yeni satırda "Kaldır" → "Sil / Vazgeç" çıkar; "Vazgeç" satırı eski haline döndürür; "Sil" satırı kaldırır ve toplam **₺ 2.500 düşer**.

Konsolda hata olmamalı.

- [ ] **Step 6: Commit**

```bash
git add src/components/PaymentModal.tsx src/pages/GelirRaporu.tsx
git commit -m "Add payment entry and inline deletion to the income screen

Deleting asks for confirmation in the row itself rather than through a
browser dialog, matching the rest of the app. The form surfaces the backend's
Turkish validation text instead of restating the rules."
```

---

### Task 7: Kapanış — tam doğrulama ve iki PR

**Files:** yok (yalnız doğrulama ve yayın)

- [ ] **Step 1: Backend kapıları**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && \
.venv/bin/python -c "from app.main import app; print('import ok')" && \
.venv/bin/alembic upgrade head && \
.venv/bin/alembic revision --autogenerate -m "final check" > /dev/null 2>&1
F=$(ls -t alembic/versions/*.py | head -1); grep -c "op\." "$F"; rm "$F"
```

Expected: `All checks passed!`, `import ok`, alembic çıktısı hatasız, son satır `0`.

- [ ] **Step 2: Frontend kapıları**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 3: Değişen dosyaları gözden geçir**

Run: `cd ~/Desktop/kisisel/w-lush && git diff main --stat` ve `cd ~/Desktop/kisisel/w-lush-web && git diff main --stat`

Expected — backend: `app/payments/__init__.py`, `app/payments/models.py`, `app/payments/schemas.py`, `app/payments/service.py`, `app/payments/router.py`, `app/core/registry.py`, `app/content/messages.py`, `app/main.py`, `alembic/versions/b7c1a4e92f10_add_payments_table.py`. **Tam bir migration dosyası olmalı, fazlası olmamalı.**
Frontend: `src/api/payments.ts`, `src/utils/period.ts`, `src/components/ui.tsx`, `src/components/PaymentModal.tsx`, `src/pages/GelirRaporu.tsx` + doküman dosyaları.

- [ ] **Step 4: Backend PR'ı aç**

```bash
cd ~/Desktop/kisisel/w-lush && git push -u origin feature/payments-api
gh pr create --title "Add payments: schema, CRUD and income summary" --body "$(cat <<'EOF'
Yeni `payments` tablosu ve `app/payments/` modülü. Uçlar: `POST /api/payments`, `GET /api/payments`, `DELETE /api/payments/{id}`, `GET /api/payments/summary`.

- **Projenin ilk şema değişikliği.** Migration elle yazıldı; `upgrade` ve `downgrade` ikisi de denendi.
- Tutarlar tam sayı TRY (`Service.price` ile aynı kural). İade/negatif tutar kapsam dışı.
- `customer_name` / `service_name` anlık kopyadır, FK değil: hizmet silinse geçmiş kayıt bozulmaz.
- Düzeltme yolu sil-yeniden gir; `PATCH` bilerek yok.
- Özet dört `GROUP BY` sorgusuyla hesaplanır; ay kovası `substr(cast(paid_at as text), 1, 7)` ile hem SQLite hem PostgreSQL'de çalışır.

Spec: `w-lush-web/docs/superpowers/specs/2026-08-07-gelir-odemeler-design.md`
EOF
)"
```

- [ ] **Step 5: Frontend PR'ı aç**

Backend PR'ı **merge edildikten sonra** aç (frontend onsuz çalışmaz):

```bash
cd ~/Desktop/kisisel/w-lush-web && git push -u origin feature/gelir-real-data
gh pr create --title "Drive the income report from real payments" --body "$(cat <<'EOF'
`GelirRaporu.tsx` içindeki `CATEGORIES` ve `STAFF` dizileri kaldırıldı; ekran `/api/payments` uçlarından besleniyor.

- Dönem düğmeleri gerçek tarih aralığına çevrilir (`src/utils/period.ts`); toplamı sunucu hesaplar.
- Ödeme ekleme modali ve satır içi silme eklendi.
- Personel performansı ve şube filtresi kaldırıldı (backend'de karşılıkları yok; personel kendi alt projesini hak ediyor).
- `KpiCard`'ın `delta`/`deltaTone` propları opsiyonele çevrildi — kıyas verisi olmayan ekran uydurma yüzde göstermesin diye.

**Backend önce merge edilmeli:** selamet/w-lush PR.

Spec: `docs/superpowers/specs/2026-08-07-gelir-odemeler-design.md`
EOF
)"
```

---

## Self-Review

**Spec kapsamı:** Veri modeli + migration → Task 1. Oluştur/listele/sil + doğrulamalar + TR metinler → Task 2. Özet ucu → Task 3. API katmanı + `KpiCard` düzeltmesi → Task 4. Ekranın okuma tarafı (dönem, KPI, kırılım, yöntem, aylık seyir, son ödemeler) → Task 5. Giriş formu + silme → Task 6. Kapılar ve yayın → Task 7. Spec'in "kapsam dışı" listesi (personel, şube, iade, taksit, profilde ödeme) hiçbir task'ta uygulanmıyor — kasıtlı.

**Placeholder taraması:** Tüm adımlar gerçek kod veya çalıştırılabilir komut içeriyor. `Modal` imzası dosyadan doğrulandı, varsayım bırakılmadı.

**Tip tutarlılığı:** Backend `method` değerleri (`cash|card|transfer|other`) ile frontend `PaymentMethod` birleşim tipi aynı. `PaymentIn` alan adları ile `PaymentInput` alan adları birebir. `summary()` sözlük anahtarları (`total`, `count`, `by_service`, `by_method`, `by_month`) `SummaryOut` ve `PaymentSummary` ile eşleşiyor. `rangeFor()` çıktısı (`{start, end}`) `getSummary(start, end)` imzasıyla uyumlu.

**Bilinen kırılganlık:** Task 6'daki 422 metni çıkarma (`e.message.split('detail":"')`), `client.ts`'in hata mesajını `API 422: {"detail":"..."}` biçiminde kurmasına dayanıyor. Çıkarma başarısız olursa genel mesaja düşer, ekran kırılmaz.
