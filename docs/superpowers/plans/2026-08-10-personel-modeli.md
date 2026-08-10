# Personel Modeli Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Klinik personeli tanımlanabilsin ve operatör her randevuyu bir personele atayabilsin.

**Architecture:** Yeni `app/staff/` modülü katalog CRUD'unu taşır. `appointments` tablosuna nullable `staff_id` eklenir; atama ucu **`app/clinic/router.py`'de** yaşar çünkü değiştirdiği kaynak randevudur. `AppointmentOut`'un yeni `staff_name` alanı, join yerine ORM ilişkisi + property ile dolar — böylece liste, onay ve iptal uçlarının üçü de aynı anda kazanır.

**Tech Stack:** Backend FastAPI + SQLAlchemy 2.0 + Alembic. Frontend React 18 + TypeScript + Vite. Yeni bağımlılık YOK.

**Spec:** `w-lush-web/docs/superpowers/specs/2026-08-10-personel-modeli-design.md`

## Global Constraints

| Repo | Yol | Branch |
|---|---|---|
| Backend | `~/Desktop/kisisel/w-lush` | `feature/staff-model` (main üstünde) |
| Frontend | `~/Desktop/kisisel/w-lush-web` | `feature/personel` (branch `docs/personel-spec` üstünde) |

- **Şema değişiyor:** bir tablo + bir kolon, **tek** migration. Elle yazılır, `upgrade`/`downgrade` ikisi de çalışır.
- Yeni model `app/core/registry.py`'ye eklenir; yoksa Alembic tabloyu görmez.
- **Bot durum makinesine (`app/whatsapp/flow.py`) dokunulmaz.** Atamayı yalnız operatör yapar.
- **Yeni bağımlılık yok** (ne pip ne npm).
- Kod/tip/fonksiyon adları İngilizce; kullanıcıya görünen TR metinler yalnız `app/content/messages.py`'de, nokta ile bitmeden. `ERR_APPOINTMENT_NOT_FOUND` **zaten var** — yeniden tanımlanmaz.
- Frontend HTTP çağrıları yalnız `src/api/*.ts` içinden.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK**.
- Backend kapıları: `ruff check app` temiz, `python -c "from app.main import app"` geçer, `alembic upgrade head` çalışır, sonrasında `autogenerate` boş üretir.
- Frontend kapıları: `npm run typecheck` ve `npm run build` exit 0.
- Hiçbir task push/merge/PR yapmaz — hepsi Task 7'de.

## Test durumu

Test koşucusu yok; doğrulama derleyici/linter + migration turu + canlı uç ile.

**Ön koşul:**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python -m uvicorn app.main:app --port 8000
cd ~/Desktop/kisisel/w-lush-web && npm run dev
```

Backend kodu değişince sunucu yeniden başlatılmalı:

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN -t | xargs -r kill; sleep 1
cd ~/Desktop/kisisel/w-lush && (.venv/bin/python -m uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &); sleep 3
```

Test hesabı: `smoke2@example.com` / `Test12345!` (clinic_id=1). `curl` bloklu — HTTP kontrolleri python heredoc ile.

**Ortak HTTP yardımcısı** (doğrulama script'leri bunu tekrar eder):

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
        return getattr(e, "code", "ERR"), (e.read().decode()[:400] if hasattr(e, "read") else str(e))

def login():
    s, b = req("/api/auth/login", "POST", {"email": "smoke2@example.com", "password": "Test12345!"})
    assert s == 200, b
    return json.loads(b)["token"]["access_token"]
```

**Test randevusu gerekiyor** (atama doğrulaması için) — yoksa şu satırla üret:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main
from datetime import date, timedelta
from app.core.database import SessionLocal
from app.clinic.models import Appointment
with SessionLocal() as db:
    db.add(Appointment(
        clinic_id=1, phone="905321110009", customer_name="Atama Testi",
        service_name="Cilt Analizi", appt_date=date.today() + timedelta(days=5),
        appt_time="15:30", status="pending",
    ))
    db.commit()
    print("test randevusu hazır")
PY
```

---

### Task 1: Backend — `staff` tablosu, `staff_id` kolonu ve migration

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/staff-model`

**Files:**
- Create: `app/staff/__init__.py` (boş), `app/staff/models.py`
- Create: `alembic/versions/e4a8c1d73b52_add_staff_and_appointment_staff.py`
- Modify: `app/clinic/models.py` (ilişki + `staff_name` property), `app/core/registry.py`

**Interfaces:**
- Produces: `Staff` ORM modeli; `Appointment.staff_id`, `Appointment.staff`, `Appointment.staff_name`

- [ ] **Step 1: Branch'i aç ve paketi oluştur**

```bash
cd ~/Desktop/kisisel/w-lush && git checkout main && git pull && git checkout -b feature/staff-model
mkdir -p app/staff && touch app/staff/__init__.py
```

- [ ] **Step 2: `app/staff/models.py` dosyasını oluştur**

```python
"""Clinic staff: who performs an appointment.

A record, not a login. Nobody here signs into the panel — the clinic owner
runs it — so there is no password, no invite flow and no role system. If a
staff member ever needs an account, a `user_id` column can link the two.
"""
from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Staff(Base):
    """One person on the clinic's team.

    Deactivated rather than deleted once used: a past appointment must not
    forget who was going to perform it.
    """

    __tablename__ = "staff"
    __table_args__ = (
        UniqueConstraint("clinic_id", "name", name="uq_staff_clinic_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(80), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
```

- [ ] **Step 3: `app/clinic/models.py`'ye kolonu, ilişkiyi ve property'yi ekle**

Dosyanın en üstündeki `from sqlalchemy.orm import Mapped, mapped_column` satırını şununla değiştir:

```python
from sqlalchemy.orm import Mapped, mapped_column, relationship
```

(Mevcut satır `app/clinic/models.py:21`'de tam olarak `from sqlalchemy.orm import Mapped, mapped_column` — yalnız `relationship` eklenir.)

`Appointment` sınıfında `reminder_sent` satırının **üstüne** ekle:

```python
    # Null is normal: the bot books without asking who will perform it, and
    # the operator assigns afterwards.
    staff_id: Mapped[int | None] = mapped_column(
        ForeignKey("staff.id"), index=True, nullable=True
    )
```

Sınıfın **sonuna** (son kolondan sonra) ekle:

```python
    # lazy="joined": the appointment list would otherwise fire one query per
    # row for the staff name.
    staff = relationship("Staff", lazy="joined")

    @property
    def staff_name(self) -> str:
        """Read by AppointmentOut. Empty string when unassigned — the schema
        stays a plain string and the client needs no null check."""
        return self.staff.name if self.staff else ""
```

`relationship("Staff", ...)` sınıfı **ada göre** çözer; `app/clinic/models.py`'nin `app/staff/models.py`'yi import etmesi gerekmez (registry ikisini de yükler).

- [ ] **Step 4: Modeli `app/core/registry.py`'ye ekle**

`from app.reports import models as report_models  # noqa: F401` satırının **üstüne** (alfabetik sıra) ekle:

```python
from app.staff import models as staff_models  # noqa: F401
```

Sıra önemli değil ama alfabetik tutulur; `staff` `reports`'tan sonra, `whatsapp`'tan önce gelir. Doğru sıra:

```python
from app.payments import models as payment_models  # noqa: F401
from app.reports import models as report_models  # noqa: F401
from app.staff import models as staff_models  # noqa: F401
from app.whatsapp import models as whatsapp_models  # noqa: F401
```

- [ ] **Step 5: Migration dosyasını elle yaz**

`alembic/versions/e4a8c1d73b52_add_staff_and_appointment_staff.py`:

```python
"""add staff table and appointments.staff_id

Revision ID: e4a8c1d73b52
Revises: d9f2b6c40a17
Create Date: 2026-08-10

"""
import sqlalchemy as sa
from alembic import op

revision = "e4a8c1d73b52"
down_revision = "d9f2b6c40a17"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "staff",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clinic_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=80), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["clinic_id"], ["clinics.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clinic_id", "name", name="uq_staff_clinic_name"),
    )
    op.create_index("ix_staff_clinic_id", "staff", ["clinic_id"])

    # SQLite cannot add a FK constraint to an existing table with a plain
    # ALTER, so the constraint is created inside a batch operation. On
    # PostgreSQL this compiles to a normal ALTER TABLE.
    with op.batch_alter_table("appointments") as batch:
        batch.add_column(sa.Column("staff_id", sa.Integer(), nullable=True))
        batch.create_foreign_key(
            "fk_appointments_staff_id", "staff", ["staff_id"], ["id"]
        )
    op.create_index("ix_appointments_staff_id", "appointments", ["staff_id"])


def downgrade() -> None:
    op.drop_index("ix_appointments_staff_id", table_name="appointments")
    with op.batch_alter_table("appointments") as batch:
        batch.drop_constraint("fk_appointments_staff_id", type_="foreignkey")
        batch.drop_column("staff_id")
    op.drop_index("ix_staff_clinic_id", table_name="staff")
    op.drop_table("staff")
```

`down_revision` mevcut head'dir; `.venv/bin/alembic heads` çıktısı `d9f2b6c40a17 (head)` olmalı. Farklıysa dosyadaki değeri ona çevir.

- [ ] **Step 6: Migration'ı çift yönlü çalıştır**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && \
.venv/bin/alembic upgrade head && \
.venv/bin/python -c "
import sqlite3; c = sqlite3.connect('w_lush.db')
staff = [r[1] for r in c.execute('PRAGMA table_info(staff)')]
appt = [r[1] for r in c.execute('PRAGMA table_info(appointments)')]
print('staff:', staff); print('appointments.staff_id var mı:', 'staff_id' in appt)
assert 'sort_order' in staff and 'staff_id' in appt" && \
.venv/bin/alembic downgrade -1 && \
.venv/bin/python -c "
import sqlite3; c = sqlite3.connect('w_lush.db')
n = c.execute(\"SELECT count(*) FROM sqlite_master WHERE name='staff'\").fetchone()[0]
appt = [r[1] for r in c.execute('PRAGMA table_info(appointments)')]
print('downgrade sonrası staff tablosu:', n, '| staff_id kolonu:', 'staff_id' in appt)
assert n == 0 and 'staff_id' not in appt" && \
.venv/bin/alembic upgrade head && echo "MIGRATION ÇİFT YÖNLÜ OK"
```

Expected: kolon listeleri basılır, downgrade sonrası hem tablo hem kolon gider, son satır `MIGRATION ÇİFT YÖNLÜ OK`.

- [ ] **Step 7: Şema uyumu ve lint kapıları**

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

- [ ] **Step 8: İlişkinin ve property'nin çalıştığını doğrula**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main
from app.core.database import SessionLocal
from app.clinic.models import Appointment
from app.staff.models import Staff

with SessionLocal() as db:
    s = Staff(clinic_id=1, name="Geçici Test Personeli", role="Test", active=True, sort_order=0)
    db.add(s); db.commit(); db.refresh(s)

    appt = db.query(Appointment).filter(Appointment.clinic_id == 1).first()
    assert appt is not None, "önce bir randevu üret (plandaki test randevusu script'i)"
    print("atama öncesi staff_name:", repr(appt.staff_name))
    assert appt.staff_name == ""

    appt.staff_id = s.id
    db.commit(); db.refresh(appt)
    print("atama sonrası staff_name:", repr(appt.staff_name))
    assert appt.staff_name == "Geçici Test Personeli"

    # temizlik
    appt.staff_id = None
    db.commit()
    db.delete(s); db.commit()
print("İLİŞKİ OK")
PY
```

Expected: atama öncesi `''`, sonrası `'Geçici Test Personeli'`, son satır `İLİŞKİ OK`.

- [ ] **Step 9: Commit**

```bash
git add app/staff/__init__.py app/staff/models.py app/clinic/models.py app/core/registry.py alembic/versions/e4a8c1d73b52_add_staff_and_appointment_staff.py
git commit -m "Add the staff table and link appointments to it

staff_id is nullable because that is the normal state: the bot books without
asking who will perform the appointment, and the operator assigns later. The
staff name reaches the API through a relationship and a property rather than
a join, so the list, confirm and cancel endpoints all gain it at once."
```

---

### Task 2: Backend — personel CRUD

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/staff-model`

**Files:**
- Create: `app/staff/schemas.py`, `app/staff/service.py`, `app/staff/router.py`
- Modify: `app/content/messages.py`, `app/main.py`

**Interfaces:**
- Consumes: `Staff` (Task 1), `Appointment` (`app/clinic/models.py`)
- Produces:
  - `service.listing(db, clinic_id) -> list[Staff]`
  - `service.get(db, clinic_id, staff_id) -> Staff | None`
  - `service.name_taken(db, clinic_id, name, exclude_id=None) -> bool`
  - `service.in_use(db, staff_id) -> bool`
  - Şemalar: `StaffIn`, `StaffOut`
  - Uçlar: `GET/POST /api/staff`, `PUT/DELETE /api/staff/{id}`

- [ ] **Step 1: `app/staff/schemas.py` dosyasını oluştur**

```python
"""Request/response shapes for staff."""
from pydantic import BaseModel, ConfigDict


class StaffIn(BaseModel):
    name: str
    role: str = ""
    active: bool = True
    sort_order: int = 0


class StaffOut(StaffIn):
    model_config = ConfigDict(from_attributes=True)
    id: int
```

- [ ] **Step 2: `app/staff/service.py` dosyasını oluştur**

```python
"""Staff persistence. Query helpers only — validation lives in the router."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clinic.models import Appointment
from app.staff.models import Staff


def listing(db: Session, clinic_id: int) -> list[Staff]:
    """Active and inactive alike: Settings shows everything, the assignment
    picker filters for itself.
    """
    stmt = (
        select(Staff)
        .where(Staff.clinic_id == clinic_id)
        .order_by(Staff.sort_order, Staff.id)
    )
    return list(db.scalars(stmt).all())


def get(db: Session, clinic_id: int, staff_id: int) -> Staff | None:
    person = db.get(Staff, staff_id)
    if person is None or person.clinic_id != clinic_id:
        return None
    return person


def name_taken(
    db: Session, clinic_id: int, name: str, exclude_id: int | None = None
) -> bool:
    stmt = select(Staff).where(Staff.clinic_id == clinic_id, Staff.name == name)
    if exclude_id is not None:
        stmt = stmt.where(Staff.id != exclude_id)
    return db.scalar(stmt.limit(1)) is not None


def in_use(db: Session, staff_id: int) -> bool:
    """Cancelled appointments count too — they also carry the record of who
    was going to perform them.
    """
    return (
        db.scalar(select(Appointment).where(Appointment.staff_id == staff_id).limit(1))
        is not None
    )
```

- [ ] **Step 3: TR metinlerini `app/content/messages.py`'ye ekle**

`ERR_REPORT_NOT_FOUND = "Rapor bulunamadı"` satırının altına ekle:

```python
ERR_STAFF_NOT_FOUND = "Personel bulunamadı"
ERR_STAFF_NAME_EMPTY = "Personel adı boş olamaz"
ERR_STAFF_NAME_TAKEN = "Bu isimde bir personel zaten var"
ERR_STAFF_IN_USE = (
    "Bu personele bağlı randevular var, silinemez. Bunun yerine pasife alabilirsiniz"
)
ERR_STAFF_INACTIVE = "Pasif personele randevu atanamaz"
```

`ERR_APPOINTMENT_NOT_FOUND` zaten dosyada var — yeniden tanımlama.

- [ ] **Step 4: `app/staff/router.py` dosyasını oluştur**

```python
"""Staff endpoints for the operator panel (clinic-scoped, auth-protected)."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.models import User
from app.content import messages as msg
from app.core.database import get_db
from app.core.deps import get_current_user
from app.staff import service
from app.staff.models import Staff
from app.staff.schemas import StaffIn, StaffOut

router = APIRouter(prefix="/api/staff", tags=["staff"])


@router.get("", response_model=list[StaffOut])
def list_staff(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return service.listing(db, current.clinic_id)


@router.post("", response_model=StaffOut, status_code=201)
def create_staff(
    payload: StaffIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, msg.ERR_STAFF_NAME_EMPTY)
    if service.name_taken(db, current.clinic_id, name):
        raise HTTPException(409, msg.ERR_STAFF_NAME_TAKEN)
    person = Staff(
        clinic_id=current.clinic_id,
        name=name,
        role=payload.role.strip(),
        active=payload.active,
        sort_order=payload.sort_order,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.put("/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: int,
    payload: StaffIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    person = service.get(db, current.clinic_id, staff_id)
    if person is None:
        raise HTTPException(404, msg.ERR_STAFF_NOT_FOUND)
    name = payload.name.strip()
    if not name:
        raise HTTPException(422, msg.ERR_STAFF_NAME_EMPTY)
    if service.name_taken(db, current.clinic_id, name, exclude_id=staff_id):
        raise HTTPException(409, msg.ERR_STAFF_NAME_TAKEN)
    person.name = name
    person.role = payload.role.strip()
    person.active = payload.active
    person.sort_order = payload.sort_order
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{staff_id}", status_code=204)
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Deleting someone who has appointments would erase who was going to
    perform them, so it is refused; deactivating keeps the history.
    """
    person = service.get(db, current.clinic_id, staff_id)
    if person is None:
        raise HTTPException(404, msg.ERR_STAFF_NOT_FOUND)
    if service.in_use(db, staff_id):
        raise HTTPException(409, msg.ERR_STAFF_IN_USE)
    db.delete(person)
    db.commit()
```

- [ ] **Step 5: Router'ı `app/main.py`'ye bağla**

Import bloğuna (alfabetik sıra: `app.reports.router`'dan sonra) ekle:

```python
from app.staff.router import router as staff_router
```

`app.include_router(reports_router)` satırının altına ekle:

```python
app.include_router(staff_router)
```

- [ ] **Step 6: Lint, import ve şema kapıları**

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

- [ ] **Step 7: Personel uçlarını canlı doğrula**

Sunucuyu yeniden başlat, sonra Run:

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
        with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:300] if hasattr(e, "read") else str(e))

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]

print("boş liste ->", req("/api/staff", token=tok)[0])
print("boş ad ->", req("/api/staff","POST",{"name":"   "},tok)[0])

s, b = req("/api/staff","POST",{"name":"Ebru B.","role":"Cilt uzmanı","sort_order":0},tok)
print("oluştur ->", s)
assert s == 201, b
person = json.loads(b)
assert set(person) == {"id","name","role","active","sort_order"}, "ŞEMA UYUŞMUYOR"
sid = person["id"]

print("yinelenen ad ->", req("/api/staff","POST",{"name":"Ebru B."},tok)[0])

s, b = req(f"/api/staff/{sid}","PUT",{"name":"Ebru B.","role":"Kıdemli cilt uzmanı","active":False,"sort_order":1},tok)
print("pasife al ->", s, json.loads(b)["active"], json.loads(b)["role"])
assert s == 200 and json.loads(b)["active"] is False

print("olmayanı güncelle ->", req("/api/staff/999999","PUT",{"name":"X"},tok)[0])
print("kullanılmayanı sil ->", req(f"/api/staff/{sid}","DELETE",token=tok)[0])
print("olmayanı sil ->", req("/api/staff/999999","DELETE",token=tok)[0])
print("yetkisiz ->", req("/api/staff")[0])
print("PERSONEL CRUD OK")
PY
```

Expected: boş liste `200`; boş ad `422`; oluştur `201`; yinelenen ad `409`; pasife al `200 False Kıdemli cilt uzmanı`; olmayanı güncelle `404`; sil `204`; olmayanı sil `404`; yetkisiz `401`; son satır `PERSONEL CRUD OK`.

- [ ] **Step 8: Commit**

```bash
git add app/staff/schemas.py app/staff/service.py app/staff/router.py app/content/messages.py app/main.py
git commit -m "Add staff CRUD

Deleting someone who has appointments is refused rather than cascading: the
appointment carries the record of who was going to perform it, and cancelled
ones carry it too."
```

---

### Task 3: Backend — atama ucu

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/staff-model`

**Files:**
- Modify: `app/clinic/schemas.py` (`AppointmentOut`), `app/clinic/router.py` (yeni uç)

**Interfaces:**
- Consumes: `staff.service.get()` (Task 2); `Appointment.staff_name` (Task 1)
- Produces:
  - `AppointmentOut.staff_id: int | None`, `AppointmentOut.staff_name: str`
  - `PUT /api/appointments/{id}/staff` → `AppointmentOut`
  - Şema: `AssignStaffIn`

- [ ] **Step 1: `AppointmentOut`'a alanları ekle**

`app/clinic/schemas.py` içindeki `AppointmentOut` sınıfında, `status: str` satırının **üstüne** ekle:

```python
    staff_id: int | None = None
    # Filled from the Appointment.staff_name property; "" when unassigned.
    staff_name: str = ""
```

Aynı dosyanın sonuna ekle:

```python
class AssignStaffIn(BaseModel):
    """null clears the assignment."""

    staff_id: int | None = None
```

- [ ] **Step 2: Atama ucunu `app/clinic/router.py`'ye ekle**

`AppointmentOut` import satırını şununla değiştir (aynı satırda `AssignStaffIn` de gelsin):

```python
from app.clinic.schemas import (
    AppointmentOut,
    AssignStaffIn,
    ClinicRequestOut,
    PackageIn,
    PackageOut,
    ServiceIn,
    ServiceOut,
)
```

Mevcut import satırındaki adları koru — dosyada hangi şemalar import ediliyorsa hepsi listede kalmalı; yalnız `AssignStaffIn` eklenir.

`cancel_appointment` ucunun **altına** ekle:

```python
@router.put("/appointments/{appt_id}/staff", response_model=AppointmentOut)
def assign_appointment_staff(
    appt_id: int,
    payload: AssignStaffIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Assign (or clear) the staff member who will perform an appointment.

    This endpoint lives next to confirm/cancel rather than in the staff module
    because the resource it changes is the appointment.
    """
    appt = db.get(Appointment, appt_id)
    if appt is None or appt.clinic_id != current.clinic_id:
        raise HTTPException(404, msg.ERR_APPOINTMENT_NOT_FOUND)

    if payload.staff_id is None:
        appt.staff_id = None
    else:
        person = staff_service.get(db, current.clinic_id, payload.staff_id)
        if person is None:
            raise HTTPException(404, msg.ERR_STAFF_NOT_FOUND)
        # The picker never offers an inactive person, so this is a stale tab
        # or a hand-made request.
        if not person.active:
            raise HTTPException(422, msg.ERR_STAFF_INACTIVE)
        appt.staff_id = person.id

    db.commit()
    db.refresh(appt)
    return appt
```

Dosyanın import bloğuna ekle:

```python
from app.staff import service as staff_service
```

- [ ] **Step 3: Lint ve import kapıları**

Run: `cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"`
Expected: `All checks passed!` ve `import ok`.

- [ ] **Step 4: Atamayı canlı doğrula**

Sunucuyu yeniden başlat. Randevu yoksa plandaki test randevusu script'ini çalıştır. Sonra Run:

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
        with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:300] if hasattr(e, "read") else str(e))

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]

appts = json.loads(req("/api/appointments", token=tok)[1])
assert appts, "randevu yok — plandaki test randevusu script'ini çalıştır"
aid = appts[0]["id"]
assert "staff_id" in appts[0] and "staff_name" in appts[0], "ŞEMA GENİŞLEMEDİ"
print("liste alanları OK, staff_name başlangıçta:", repr(appts[0]["staff_name"]))

active = json.loads(req("/api/staff","POST",{"name":"Selin K.","role":"Lazer teknikeri"},tok)[1])
passive = json.loads(req("/api/staff","POST",{"name":"Pasif Kişi","active":False},tok)[1])

s, b = req(f"/api/appointments/{aid}/staff","PUT",{"staff_id":active["id"]},tok)
print("atama ->", s, json.loads(b)["staff_name"])
assert s == 200 and json.loads(b)["staff_name"] == "Selin K."

st, body = req(f"/api/appointments/{aid}/staff","PUT",{"staff_id":passive["id"]},tok)
print("pasif personele atama ->", st, json.loads(body)["detail"])
assert st == 422

print("olmayan personel ->", req(f"/api/appointments/{aid}/staff","PUT",{"staff_id":999999},tok)[0])
print("olmayan randevu ->", req("/api/appointments/999999/staff","PUT",{"staff_id":active["id"]},tok)[0])

st, b = req(f"/api/staff/{active['id']}","DELETE",token=tok)
print("kullanımdaki personeli sil ->", st, json.loads(b)["detail"][:45])
assert st == 409

s, b = req(f"/api/appointments/{aid}/staff","PUT",{"staff_id":None},tok)
print("atamayı kaldır ->", s, repr(json.loads(b)["staff_name"]))
assert s == 200 and json.loads(b)["staff_name"] == ""

req(f"/api/staff/{active['id']}","DELETE",token=tok)
req(f"/api/staff/{passive['id']}","DELETE",token=tok)
print("ATAMA OK")
PY
```

Expected: liste alanları OK; atama `200 Selin K.`; pasif personele atama `422 Pasif personele randevu atanamaz`; olmayan personel `404`; olmayan randevu `404`; kullanımdaki personeli sil `409`; atamayı kaldır `200 ''`; son satır `ATAMA OK`.

- [ ] **Step 5: Commit**

```bash
git add app/clinic/schemas.py app/clinic/router.py
git commit -m "Add appointment staff assignment

The endpoint sits beside confirm and cancel because the resource it changes
is the appointment, not the staff member. Assigning to a deactivated person
is refused: the picker never offers one, so such a request is a stale tab."
```

---

### Task 4: Frontend — API katmanı

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/personel`

**Files:**
- Create: `src/api/staff.ts`
- Modify: `src/api/clinic.ts` (`Appointment` tipine iki alan + `assignAppointmentStaff`)

**Interfaces:**
- Consumes: `request<T>()` (`src/api/client.ts`)
- Produces:
  - `interface StaffMember`, `StaffInput`; `listStaff()`, `createStaff()`, `updateStaff()`, `deleteStaff()`
  - `assignAppointmentStaff(id: number, staffId: number | null): Promise<Appointment>`
  - `Appointment.staff_id: number | null`, `Appointment.staff_name: string`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush-web && git checkout docs/personel-spec && git checkout -b feature/personel
```

- [ ] **Step 2: `src/api/staff.ts` dosyasını oluştur**

```ts
// Klinik personeli — backend: app/staff/ (klinik kapsamlı, auth'lu).
import { request } from './client';

export interface StaffMember {
  id: number;
  name: string;
  role: string;
  active: boolean;
  sort_order: number;
}

export interface StaffInput {
  name: string;
  role: string;
  active: boolean;
  sort_order: number;
}

/** Aktif + pasif hepsi; atama seçicisi pasifleri kendi eler. */
export const listStaff = () => request<StaffMember[]>('/api/staff');

export const createStaff = (input: StaffInput) =>
  request<StaffMember>('/api/staff', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateStaff = (id: number, input: StaffInput) =>
  request<StaffMember>(`/api/staff/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });

export const deleteStaff = (id: number) =>
  request<void>(`/api/staff/${id}`, { method: 'DELETE' });
```

- [ ] **Step 3: `src/api/clinic.ts`'i genişlet**

`Appointment` arayüzüne, `status` alanının **üstüne** ekle:

```ts
  staff_id: number | null;
  staff_name: string; // atanmamışsa ""
```

`cancelAppointment` tanımının altına ekle:

```ts
// Atama ucu randevuyu değiştirdiği için /api/appointments altında yaşıyor.
export const assignAppointmentStaff = (id: number, staffId: number | null) =>
  request<Appointment>(`/api/appointments/${id}/staff`, {
    method: 'PUT',
    body: JSON.stringify({ staff_id: staffId }),
  });
```

- [ ] **Step 4: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 5: Sözleşmeyi canlı doğrula**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:5173"

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
s, b = req("/api/staff", token=tok)
print("personel listesi ->", s)
appts = json.loads(req("/api/appointments", token=tok)[1])
if appts:
    assert {"staff_id","staff_name"} <= set(appts[0]), appts[0].keys()
    print("randevu alanları OK")
print("SÖZLEŞME OK")
PY
```

Expected: `personel listesi -> 200`, `randevu alanları OK`, son satır `SÖZLEŞME OK`.

- [ ] **Step 6: Commit**

```bash
git add src/api/staff.ts src/api/clinic.ts
git commit -m "Add staff API client and appointment assignment call

The assignment call lives in the clinic client rather than the staff one,
mirroring where the endpoint lives: it changes an appointment."
```

---

### Task 5: Frontend — Sistem'de personel yönetimi

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/personel`

**Files:**
- Modify: `src/pages/Sistem.tsx` (yeni `PersonelSection` + sekmeye bağlama)

**Interfaces:**
- Consumes: `listStaff`, `createStaff`, `updateStaff`, `deleteStaff`, `StaffMember` (Task 4)
- Produces: `PersonelSection` (dosya içi bileşen, dışa aktarılmaz)

- [ ] **Step 1: Import'ları ekle**

`src/pages/Sistem.tsx` içindeki `../api/expenses` import bloğunun altına ekle:

```tsx
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
  type StaffMember,
} from '../api/staff';
```

- [ ] **Step 2: `PersonelSection` bileşenini `GiderKategoriSection` tanımının hemen üstüne ekle**

```tsx
/* ───────── Personel — canlı API (/api/staff) ───────── */
type StaffRow = StaffMember & { _new?: boolean };

function PersonelSection() {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listStaff()
      .then(setRows)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const patch = (i: number, p: Partial<StaffRow>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...p } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: -Date.now(), name: '', role: '', active: true, sort_order: r.length, _new: true },
    ]);

  async function save(i: number) {
    const row = rows[i];
    if (!row.name.trim()) {
      setError('Personel adı boş olamaz');
      return;
    }
    setBusy(row.id);
    setError(null);
    const body = {
      name: row.name.trim(),
      role: row.role.trim(),
      active: row.active,
      sort_order: row.sort_order,
    };
    try {
      const saved = row._new ? await createStaff(body) : await updateStaff(row.id, body);
      setRows((r) => r.map((x, idx) => (idx === i ? saved : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(i: number) {
    const row = rows[i];
    if (row._new) {
      setRows((r) => r.filter((_, idx) => idx !== i));
      return;
    }
    if (!window.confirm(`"${row.name}" silinsin mi?`)) return;
    setBusy(row.id);
    try {
      await deleteStaff(row.id);
      setRows((r) => r.filter((_, idx) => idx !== i));
    } catch (e) {
      // 409: personelin randevuları var. Satır durur, backend'in önerisi görünür.
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600 }}>
          Personel
          <span style={{ fontSize: 11, color: 'var(--ink-40)', fontWeight: 400, marginLeft: 8 }}>
            · Randevular bu kişilere atanır
          </span>
        </div>
        <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={addRow}>
          {Icon.plus}Personel ekle
        </button>
      </div>

      {error && (
        <div
          style={{
            fontSize: 12, color: 'var(--bad)', background: 'var(--cream)',
            border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px',
            marginBottom: 10,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--ink-40)', padding: '20px 0' }}>Yükleniyor…</div>
      ) : (
        <table className="wl-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
          <thead>
            <tr>
              <th>Ad</th>
              <th>Görev</th>
              <th style={{ width: 80 }}>Durum</th>
              <th style={{ width: 150 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ color: 'var(--ink-40)', fontSize: 13 }}>
                  Henüz personel yok — "Personel ekle" ile başlayın.
                </td>
              </tr>
            )}
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <input
                    className="wl-input"
                    value={p.name}
                    placeholder="Ad soyad"
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="wl-input"
                    value={p.role}
                    placeholder="Cilt uzmanı"
                    onChange={(e) => patch(i, { role: e.target.value })}
                  />
                </td>
                <td>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    onClick={() => patch(i, { active: !p.active })}
                  >
                    {p.active ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="wl-btn wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    disabled={busy === p.id}
                    onClick={() => save(i)}
                  >
                    Kaydet
                  </button>
                  <button
                    className="wl-btn wl-btn-ghost wl-btn-sm"
                    style={{ borderRadius: 8 }}
                    disabled={busy === p.id}
                    onClick={() => remove(i)}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Bölümü sekmeye bağla**

`HizmetSection`'ın döndürdüğü en dış `<div>` içinde, `<GiderKategoriSection />` satırının **üstüne** ekle:

```tsx
      <PersonelSection />
```

Böylece sıra: hizmetler → paketler → personel → gider kategorileri.

- [ ] **Step 4: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 5: Canlı doğrula**

Tarayıcıda `http://localhost:5173/sistem` → "Hizmetler & paketler" sekmesi:

1. Sayfada "Personel" tablosu görünür, boşsa "Henüz personel yok…" satırı.
2. "Personel ekle" → ad `Ebru B.`, görev `Cilt uzmanı` → Kaydet → satır kalıcı olur (sayfayı yenileyince durur).
3. İkinci bir personel ekle: `Selin K.` / `Lazer teknikeri`.
4. Aynı adla üçüncüsünü eklemeye çalış → hata kutusunda "Bu isimde bir personel zaten var".
5. Birini "Aktif" → "Pasif" yap → Kaydet.
6. Kullanımda olmayan birini sil → onay diyaloğu → satır kalkar.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Sistem.tsx
git commit -m "Add staff management to Settings

Sits under the existing pricing tab with services, packages and expense
categories: it is catalogue upkeep of the same kind."
```

---

### Task 6: Frontend — randevu listesinde atama

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/personel`

**Files:**
- Modify: `src/pages/RandevuTakvimi.tsx` (gerçek randevu listesine personel seçici)

**Interfaces:**
- Consumes: `listStaff`, `StaffMember` (Task 4); `assignAppointmentStaff`, `Appointment` (Task 4)
- Produces: yok (ekran değişikliği)

- [ ] **Step 1: Import'ları ve personel state'ini ekle**

`src/api/clinic` import bloğuna `assignAppointmentStaff` ekle, ve altına:

```tsx
import { listStaff, type StaffMember } from '../api/staff';
```

Randevu listesini tutan bileşende (`items`, `error`, `loading`, `busy` state'lerinin bulunduğu yer), `const [busy, setBusy] = useState<number | null>(null);` satırının altına ekle:

```tsx
  const [staff, setStaff] = useState<StaffMember[]>([]);
```

`useEffect(load, []);` satırının altına ekle:

```tsx
  // Seçicide yalnız aktif personel görünür; pasife alınmış biri geçmiş
  // randevularda adıyla durur ama yeni atama alamaz.
  useEffect(() => {
    listStaff()
      .then((rows) => setStaff(rows.filter((s) => s.active)))
      .catch(() => setStaff([]));
  }, []);
```

- [ ] **Step 2: Atama fonksiyonunu ekle**

`act` fonksiyonunun altına ekle:

```tsx
  async function assign(id: number, staffId: number | null) {
    setBusy(id);
    setError(null);
    try {
      const updated = await assignAppointmentStaff(id, staffId);
      setItems((cur) => (cur ?? []).map((a) => (a.id === id ? updated : a)));
    } catch (e) {
      // Seçim state'e yazılmadığı için ekran kendiliğinden eski değere döner.
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
```

Seçim doğrudan `items`'tan okunduğu için başarısız istekte ekranda eski değer kalır — ayrıca geri alma kodu gerekmez.

- [ ] **Step 3: Seçiciyi randevu satırına ekle**

Gerçek randevu listesindeki her satırda, onayla/iptal düğmelerinin **yanına** ekle:

```tsx
                <select
                  value={a.staff_id ?? ''}
                  disabled={busy === a.id}
                  onChange={(e) =>
                    assign(a.id, e.target.value === '' ? null : Number(e.target.value))
                  }
                  style={{
                    border: '1px solid var(--line)', borderRadius: 8, padding: '4px 8px',
                    font: 'inherit', fontSize: 11, background: 'var(--cream)',
                  }}
                >
                  <option value="">Atanmamış</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
```

Satırın hangi değişkenle döndüğünü (`a`) dosyadaki mevcut `map` çağrısından doğrula; ad farklıysa ona uydur.

- [ ] **Step 4: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 5: Canlı doğrula**

Tarayıcıda `http://localhost:5173/randevu`:

1. Gerçek randevu listesindeki her satırda "Atanmamış" seçicisi görünür ve Sistem'de tanımladığın aktif personeller listelenir.
2. Bir personel seç → istek gider, satır güncellenir; sayfayı yenileyince seçim **kalır**.
3. "Atanmamış"a geri al → atama kalkar.
4. `Sistem`'den o personeli silmeye çalış → "Bu personele bağlı randevular var, silinemez…" mesajı çıkar, satır kalır.
5. Personeli pasife al → `/randevu` seçicisinde artık **görünmez**, ama atanmış olduğu randevu listede adıyla durur.

Konsolda hata olmamalı.

- [ ] **Step 6: Commit**

```bash
git add src/pages/RandevuTakvimi.tsx
git commit -m "Assign staff from the appointment list

The picker offers only active people. A failed request leaves the previous
value on screen because the select reads from state, not from local input —
a rejected assignment never looks like it worked."
```

---

### Task 7: Kapanış — tam doğrulama ve iki PR

- [ ] **Step 1: Backend kapıları**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && \
.venv/bin/python -c "from app.main import app; print('import ok')" && \
.venv/bin/alembic upgrade head
.venv/bin/alembic revision --autogenerate -m "final check" > /dev/null 2>&1
F=$(ls -t alembic/versions/*.py | head -1)
case "$F" in
  *final_check*) grep -c "op\." "$F"; rm "$F";;
  *) echo "UYARI: autogenerate dosya üretmedi — silme atlandı";;
esac
```

Expected: `All checks passed!`, `import ok`, `0`.

- [ ] **Step 2: Frontend kapıları**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 3: Değişen dosyaları gözden geçir**

Run: `cd ~/Desktop/kisisel/w-lush && git diff main --stat` ve `cd ~/Desktop/kisisel/w-lush-web && git diff main --stat`

Expected — backend: `app/staff/{__init__,models,schemas,service,router}.py`, `app/clinic/{models,schemas,router}.py`, `app/core/registry.py`, `app/content/messages.py`, `app/main.py`, **tek** migration dosyası.
Frontend: `src/api/staff.ts`, `src/api/clinic.ts`, `src/pages/{Sistem,RandevuTakvimi}.tsx` + doküman dosyaları.

- [ ] **Step 4: Backend PR'ı aç**

```bash
cd ~/Desktop/kisisel/w-lush && git push -u origin feature/staff-model
gh pr create --title "Add clinic staff and appointment assignment" --body "$(cat <<'EOF'
Yeni `staff` tablosu, `appointments.staff_id` kolonu ve `app/staff/` modülü. Uçlar: personel CRUD (`/api/staff`) ve atama (`PUT /api/appointments/{id}/staff`).

- **Personel bir kayıt, kullanıcı hesabı değil.** Şifre, davet akışı, rol/yetki sistemi kapsam dışı; ileride gerekirse `staff.user_id` ile bağlanır.
- **Bot durum makinesine dokunulmadı.** Randevu personelsiz gelir, operatör atar. `staff_id` nullable ve bu akışın doğal hâli.
- Atama ucu `app/clinic/router.py`'de, `confirm`/`cancel` yanında — uç, değiştirdiği kaynağın yanında yaşar.
- `staff_name` join yerine ilişki + property ile geliyor; liste, onay ve iptal uçlarının üçü birden kazandı. İlişki `lazy="joined"` (liste satır başına sorgu atmasın).
- Randevusu olan personel silinemez (409), pasife alınır — iptal edilmiş randevular da sayılır.
- Migration `batch_alter_table` kullanıyor: SQLite mevcut tabloya düz ALTER ile FK ekleyemiyor.

Spec: `w-lush-web/docs/superpowers/specs/2026-08-10-personel-modeli-design.md`
EOF
)"
```

- [ ] **Step 5: Frontend PR'ı aç**

Backend PR'ı **merge edildikten sonra**:

```bash
cd ~/Desktop/kisisel/w-lush-web && git push -u origin feature/personel
gh pr create --title "Add staff management and appointment assignment" --body "$(cat <<'EOF'
`Sistem`'e personel bölümü, randevu listesine personel seçici.

- Seçici yalnız aktif personeli sunar; pasife alınan kişi geçmiş randevularda adıyla durur ama yeni atama almaz.
- Başarısız atamada seçim eski değerinde kalır — reddedilen bir atama asla olmuş gibi görünmez.

**Not:** `/randevu` ekranındaki **takvim ızgarası hâlâ sahte**. Bu iş onu değiştirmiyor; ızgara bir sonraki işin konusu ve personel modeli tam da onun ön koşuluydu. Ekran şimdilik karışık: üstte sahte ızgara, altta gerçek liste.

**Backend önce merge edilmeli:** selamet/w-lush PR.

Spec: `docs/superpowers/specs/2026-08-10-personel-modeli-design.md`
EOF
)"
```

---

## Self-Review

**Spec kapsamı:** `staff` tablosu + `staff_id` + migration → Task 1. Personel CRUD + silme/pasife alma kuralı → Task 2. Atama ucu + `AppointmentOut` genişlemesi → Task 3. API katmanı → Task 4. Sistem bölümü → Task 5. Randevu listesinde atama → Task 6. Kapılar ve yayın → Task 7. Spec'in kapsam dışı listesi (çalışma saatleri, renk alanı, performans raporu, personel girişleri) hiçbir task'ta uygulanmıyor. Spec'in "kabul edilen geçici durum" maddesi (sahte ızgara yerinde kalıyor) Task 7'deki frontend PR gövdesinde açıkça yazılı.

**Placeholder taraması:** Tüm adımlar gerçek kod veya çalıştırılabilir komut içeriyor. Task 6 Step 3'teki "satırın değişken adını doğrula" bir belirsizlik değil, dosyaya bakmayı gerektiren tek yer — kod bloğu tam olarak verilmiş durumda.

**Tip tutarlılığı:** `StaffOut` alanları (`id`, `name`, `role`, `active`, `sort_order`) frontend `StaffMember` ile birebir; `StaffIn` ile `StaffInput` aynı. `AssignStaffIn.staff_id: int | None` ile `assignAppointmentStaff(id, staffId: number | null)` eşleşiyor. `Appointment.staff_name` property'si → `AppointmentOut.staff_name: str` → frontend `Appointment.staff_name: string`; atanmamışta üçü de boş dize.

**Bilinen kırılganlık:** `Sistem.tsx` bu işten sonra dört CRUD bölümü barındırıyor (hizmet, paket, personel, gider kategorisi) ve dosya belirgin şekilde büyüdü. Bölümleri ayrı dosyalara çıkarmak sonraki dokunuşta hak edilir; bu planda bilerek yapılmıyor — kapsamı büyütür ve bu işin doğrulanmasını zorlaştırırdı.
