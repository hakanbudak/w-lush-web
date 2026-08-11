# Panelden Randevu Oluşturma — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operatörün panelden randevu girebilmesi, ve kapasite kuralının klinik başına değil personel başına çalışması.

**Architecture:** Kapasite kuralı veritabanı index'inde `coalesce(staff_id, 0)` ile personel başına taşınır; bot randevuyu yazarken müsait ilk aktif personeli kendisi seçer, böylece kapasite uygulama katmanında sayılmadan garanti edilir. Panel yeni bir `POST /api/appointments` ucunu çağırır; uç, botun da kullandığı `clinic_service.create_appointment` fonksiyonunu paylaşır. Ekranda form ayrı bir modal bileşenidir, `SlotGrid` saf kalır.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, React 18 + TypeScript, Vite.

## Global Constraints

- İki repo: backend `~/Desktop/kisisel/w-lush`, frontend `~/Desktop/kisisel/w-lush-web`. Backend PR'ı önce merge edilir.
- Repoda test koşucusu yok. Doğrulama, çalışan API'ye karşı python/node parçacıklarıyla ve `ruff` / `typecheck` / `build` kapılarıyla yapılır.
- Backend kapıları: `.venv/bin/ruff check app` temiz, `import app.main` çalışır.
- Frontend kapıları: `npm run typecheck` ve `npm run build` 0 ile çıkar.
- Kullanıcıya görünen tüm hata metinleri Türkçe ve `app/content/messages.py` içinde tanımlı.
- Yeni hata metinleri (spec'ten birebir): `ERR_SLOT_TAKEN` = "Bu saat dolu.", `ERR_SLOT_NOT_CONFIGURED` = "Bu saat kliniğin çalışma saatleri arasında değil.", `ERR_STAFF_BUSY` = "Bu personelin o saatte başka randevusu var."
- Kayıt panelden oluşturulduğunda `status = "confirmed"`, bottan oluşturulduğunda `status = "pending"`.
- Commit mesajları `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` ile biter.
- Migration'lar elle yazılır (autogenerate'e güvenilmez); yeni revision `down_revision = "e4a8c1d73b52"` üzerine oturur.
- `ANTHROPIC_API_KEY` ve Meta/WhatsApp kimlik bilgileri sistemde yok. Gerçek WhatsApp gönderimi doğrulanamaz; `notified: false` yolu doğrulanır, `notified: true` yolu doğrulanamaz ve PR'da böyle yazılır.
- Kimlik bilgileri hiçbir dosyaya yazılmaz.

## Dosya Yapısı

**Backend (dal: `feature/randevu-olusturma`)**

| Dosya | Sorumluluk |
|---|---|
| `app/clinic/models.py` | `Appointment.__table_args__` — index ifadesi değişir |
| `alembic/versions/a1c9e4d820f3_staff_aware_appointment_slot.py` (yeni) | Eski index düşer, `coalesce`'lu yenisi kurulur |
| `app/content/messages.py` | Üç yeni hata metni |
| `app/staff/service.py` | `active_count`, `first_free` — personel sorguları |
| `app/clinic/service.py` | `create_appointment` iki yeni parametre; `booked_counts` + `slots_for_day` kapasiteye göre |
| `app/whatsapp/flow.py` | Bot randevuyu yazarken personel seçer |
| `app/clinic/schemas.py` | `AppointmentIn`, `AppointmentCreatedOut` |
| `app/clinic/router.py` | `POST /api/appointments`; atama ucuna 409 |

**Frontend (dal: `feature/randevu-olusturma`)**

| Dosya | Sorumluluk |
|---|---|
| `src/api/client.ts` | `ApiError` — durum kodu artık okunabilir |
| `src/api/clinic.ts` | `createAppointment` |
| `src/components/randevu/AppointmentModal.tsx` (yeni) | Formun tamamı |
| `src/components/randevu/SlotGrid.tsx` | İsteğe bağlı `onEmptyClick` |
| `src/pages/RandevuTakvimi.tsx` | Düğme, modal durumu, bildirim uyarısı |

---

### Task 1: Kapasite index'i personel başına

**Files:**
- Modify: `app/clinic/models.py:56-66`
- Create: `alembic/versions/a1c9e4d820f3_staff_aware_appointment_slot.py`
- Modify: `app/content/messages.py`

**Interfaces:**
- Consumes: yok (ilk task).
- Produces: `msg.ERR_SLOT_TAKEN`, `msg.ERR_SLOT_NOT_CONFIGURED`, `msg.ERR_STAFF_BUSY` sabitleri; `uq_active_appointment_slot` index'i artık `(clinic_id, appt_date, appt_time, coalesce(staff_id, 0))`.

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush
git checkout main && git pull
git checkout -b feature/randevu-olusturma
```

- [ ] **Step 2: Modeldeki index ifadesini değiştir**

`app/clinic/models.py` içinde `Appointment.__table_args__` bloğunu tamamen bununla değiştir:

```python
    __table_args__ = (
        # One active (non-cancelled) appointment per clinic/date/time/staff.
        #
        # coalesce() is not cosmetic: NULLs are distinct in a unique index, so
        # a plain staff_id column would let unassigned rows collide freely and
        # the bot would lose its double-booking guard entirely. Folding NULL to
        # 0 makes "unassigned" behave like a single virtual staff member.
        Index(
            "uq_active_appointment_slot",
            "clinic_id", "appt_date", "appt_time",
            text("coalesce(staff_id, 0)"),
            unique=True,
            sqlite_where=text("status != 'cancelled'"),
            postgresql_where=text("status != 'cancelled'"),
        ),
    )
```

`text` zaten `app/clinic/models.py:19` içinde import edilmiş durumda; yeni import gerekmez.

- [ ] **Step 3: Migration dosyasını yaz**

`alembic/versions/a1c9e4d820f3_staff_aware_appointment_slot.py`:

```python
"""staff-aware unique index for active appointment slots

Capacity moves from "one appointment per clinic slot" to "one per staff
member per slot". coalesce(staff_id, 0) keeps unassigned rows constrained:
NULLs are distinct in a unique index, so without it the bot would lose its
double-booking guard.

The rule only gets looser, so no existing row can violate the new index and
the upgrade needs no data migration. The downgrade can legitimately fail on a
clinic that has since booked two staff into the same slot — that is the
tightening direction and the operator must resolve it by hand.

Revision ID: a1c9e4d820f3
Revises: e4a8c1d73b52
Create Date: 2026-08-11

"""
import sqlalchemy as sa
from alembic import op

revision = "a1c9e4d820f3"
down_revision = "e4a8c1d73b52"
branch_labels = None
depends_on = None

INDEX_NAME = "uq_active_appointment_slot"
ACTIVE_ONLY = "status != 'cancelled'"


def upgrade() -> None:
    op.drop_index(INDEX_NAME, table_name="appointments")
    op.create_index(
        INDEX_NAME,
        "appointments",
        ["clinic_id", "appt_date", "appt_time", sa.text("coalesce(staff_id, 0)")],
        unique=True,
        postgresql_where=sa.text(ACTIVE_ONLY),
        sqlite_where=sa.text(ACTIVE_ONLY),
    )


def downgrade() -> None:
    op.drop_index(INDEX_NAME, table_name="appointments")
    op.create_index(
        INDEX_NAME,
        "appointments",
        ["clinic_id", "appt_date", "appt_time"],
        unique=True,
        postgresql_where=sa.text(ACTIVE_ONLY),
        sqlite_where=sa.text(ACTIVE_ONLY),
    )
```

- [ ] **Step 4: Hata metinlerini ekle**

`app/content/messages.py` içinde `ERR_STAFF_INACTIVE` satırının hemen altına:

```python
ERR_SLOT_TAKEN = "Bu saat dolu."
ERR_SLOT_NOT_CONFIGURED = "Bu saat kliniğin çalışma saatleri arasında değil."
ERR_STAFF_BUSY = "Bu personelin o saatte başka randevusu var."
```

- [ ] **Step 5: Migration'ı çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/alembic upgrade head
.venv/bin/alembic current
```

Beklenen: `a1c9e4d820f3 (head)`.

- [ ] **Step 6: Yeni kuralın gerçekten yürürlükte olduğunu doğrula**

Bu, planın en kritik doğrulaması: index doğru kurulmadıysa her şey sessizce çalışır ama koruma yoktur.

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main  # noqa: F401
from sqlalchemy import text
from app.core.database import SessionLocal

with SessionLocal() as db:
    sql = db.scalar(text(
        "select sql from sqlite_master "
        "where type='index' and name='uq_active_appointment_slot'"
    ))
    print(sql)
    assert "coalesce" in sql.lower(), "coalesce ifadesi index'te yok!"
    assert "status != 'cancelled'" in sql, "kısmi index koşulu kayıp!"
print("INDEX OK")
PY
```

Beklenen: son satır `INDEX OK`.

- [ ] **Step 7: Kapıları çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app && .venv/bin/python -c "import app.main; print('import ok')"
```

Beklenen: `All checks passed!` ve `import ok`.

**Not:** Bu index bir ifade (expression) içerdiği için `alembic revision --autogenerate` onu güvenilir biçimde karşılaştıramaz ve sürekli "yeniden oluştur" önerebilir. Bu yüzden bu planda autogenerate-farkı-sıfır kontrolü yapılmıyor; yerine Step 6'daki doğrudan index okuması kullanılıyor.

- [ ] **Step 8: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
git add app/clinic/models.py app/content/messages.py alembic/versions/a1c9e4d820f3_staff_aware_appointment_slot.py
git commit -m "$(cat <<'EOF'
Move appointment capacity from clinic to staff

The grid shows staff columns but the unique index allowed one appointment
per clinic slot, so two staff could never work the same hour.

coalesce(staff_id, 0) is required rather than a plain column: NULLs are
distinct in a unique index, so unassigned rows would otherwise stop
colliding with each other and the bot would lose its guard.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Personel sorguları ve botun personel seçmesi

**Files:**
- Modify: `app/staff/service.py`
- Modify: `app/clinic/service.py:133-171`
- Modify: `app/whatsapp/flow.py:319-321`

**Interfaces:**
- Consumes: Task 1'in index'i.
- Produces:
  - `staff_service.active_count(db: Session, clinic_id: int) -> int`
  - `staff_service.first_free(db: Session, clinic_id: int, day: date, time: str) -> int | None`
  - `clinic_service.booked_counts(db: Session, clinic_id: int, day: date) -> dict[str, int]`
  - `clinic_service.create_appointment(..., staff_id: int | None = None, status: str = "pending") -> Appointment | None`

- [ ] **Step 1: `taken_times`'ın başka yerde kullanılmadığını doğrula**

```bash
cd ~/Desktop/kisisel/w-lush && grep -rn "taken_times" app
```

Beklenen: yalnızca iki satır — tanımı (`app/clinic/service.py:133`) ve `slots_for_day` içindeki çağrısı. Başka bir çağrı çıkarsa bu adımda dur ve bildir; fonksiyon kaldırılamaz.

- [ ] **Step 2: Personel sorgularını ekle**

`app/staff/service.py` sonuna. Dosya `Appointment` ve `select`'i zaten import ediyor; `date` importu yoksa dosyanın en üstüne `from datetime import date` ekle.

```python
def active_count(db: Session, clinic_id: int) -> int:
    """How many people can take an appointment at the same time."""
    stmt = select(func.count(Staff.id)).where(
        Staff.clinic_id == clinic_id, Staff.active.is_(True)
    )
    return db.scalar(stmt) or 0


def first_free(db: Session, clinic_id: int, day: date, time: str) -> int | None:
    """The first active staff member with no active appointment in that slot.

    Returns None in two very different situations, which the caller must tell
    apart with active_count(): no staff defined at all (leave staff_id empty —
    the index then treats unassigned as one virtual person and the pre-staff
    "one appointment per slot" behaviour is preserved), or every active person
    already busy (the slot is full and booking must be refused).
    """
    busy = set(
        db.scalars(
            select(Appointment.staff_id).where(
                Appointment.clinic_id == clinic_id,
                Appointment.appt_date == day,
                Appointment.appt_time == time,
                Appointment.status != "cancelled",
            )
        ).all()
    )
    for person in listing(db, clinic_id):
        if person.active and person.id not in busy:
            return person.id
    return None
```

`func` importunu üstteki satıra ekle: `from sqlalchemy import func, select`.

- [ ] **Step 3: `taken_times`'ı sayan sürümle değiştir**

`app/clinic/service.py` içindeki `taken_times` fonksiyonunu tamamen bununla değiştir:

```python
def booked_counts(db: Session, clinic_id: int, day: date) -> dict[str, int]:
    """How many active appointments each slot already holds on a given day."""
    stmt = (
        select(Appointment.appt_time, func.count(Appointment.id))
        .where(
            Appointment.clinic_id == clinic_id,
            Appointment.appt_date == day,
            Appointment.status != "cancelled",
        )
        .group_by(Appointment.appt_time)
    )
    return {time: count for time, count in db.execute(stmt).all()}
```

`func`'ın import edildiğinden emin ol; `app/clinic/service.py` üstündeki sqlalchemy importuna yoksa ekle.

- [ ] **Step 4: `slots_for_day`'i kapasiteye göre yaz**

```python
def slots_for_day(db: Session, clinic_id: int, day: date) -> list[str]:
    """Configured slots for the day, minus the ones with no free staff.

    Capacity is the number of active staff. A clinic with no staff defined
    gets capacity 1, which is exactly the behaviour from before staff existed.
    """
    capacity = staff_service.active_count(db, clinic_id) or 1
    counts = booked_counts(db, clinic_id, day)
    configured = list(get_setting(db, clinic_id, "slot_times"))
    return [t for t in configured if counts.get(t, 0) < capacity][:10]
```

`app/clinic/service.py` importlarına ekle:

```python
from app.staff import service as staff_service
```

- [ ] **Step 5: `create_appointment`'a iki parametre ekle**

`app/clinic/service.py` içindeki fonksiyonu bununla değiştir:

```python
def create_appointment(
    db: Session, clinic_id: int, phone: str, name: str, service_name: str,
    day: date, time: str, staff_id: int | None = None, status: str = "pending",
) -> Appointment | None:
    """Create an appointment, or return None if the slot is already taken.

    A partial unique index on (clinic_id, appt_date, appt_time,
    coalesce(staff_id, 0)) for active rows enforces this even under concurrent
    bookings — which is why the caller never counts appointments itself.

    The bot leaves `status` at its default; the panel passes "confirmed",
    because an appointment the operator typed in needs no approval.
    """
    appt = Appointment(
        clinic_id=clinic_id, phone=phone, customer_name=name,
        service_name=service_name, appt_date=day, appt_time=time,
        status=status, staff_id=staff_id,
    )
    db.add(appt)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return None
    db.refresh(appt)
    return appt
```

- [ ] **Step 6: Botun personel seçmesini sağla**

`app/whatsapp/flow.py:319` civarındaki çağrıyı bununla değiştir:

```python
        with SessionLocal() as db:
            # The customer is never asked "with whom?" — the flow does not
            # change. Recording a person is what makes per-staff capacity
            # enforceable at the index instead of by counting.
            chosen = staff_service.first_free(db, clinic_id, d, time)
            if chosen is None and staff_service.active_count(db, clinic_id):
                # Staff exist but all are busy: the slot filled up while the
                # customer was choosing. Booking unassigned here would slip
                # past the index (coalesce(NULL, 0) may still be free) and
                # overbook the clinic.
                appt = None
            else:
                appt = clinic_service.create_appointment(
                    db, clinic_id, to, _customer_name(clinic_id, to),
                    sess.data["service_name"], d, time, staff_id=chosen,
                )
```

`appt is None` durumu zaten var olan `_reoffer_times` dalına düşer — müşteriye
kalan boş saatler yeniden sunulur. Yeni bir dal eklenmiyor.

`app/whatsapp/flow.py` importlarına ekle:

```python
from app.staff import service as staff_service
```

- [ ] **Step 7: Kapıları çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app && .venv/bin/python -c "import app.main; print('import ok')"
```

Beklenen: `All checks passed!` ve `import ok`. `import ok` yerine `ImportError: cannot import name ... (most likely due to a circular import)` görürsen dur ve bildir — `clinic.service` ile `staff.service` arasında döngü oluşmuş demektir.

- [ ] **Step 8: Kapasite mantığını doğrula**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main  # noqa: F401
from datetime import date, timedelta
from app.core.database import SessionLocal
from app.clinic import service as cs
from app.staff import service as ss

day = date.today() + timedelta(days=90)  # kesin boş bir gün
with SessionLocal() as db:
    n = ss.active_count(db, 1)
    print("aktif personel:", n)
    slots = cs.slots_for_day(db, 1, day)
    print("boş günde slot sayısı:", len(slots))
    assert slots, "boş günde hiç slot dönmedi"

    first = slots[0]
    made = []
    for i in range(n + 1):  # kapasitenin bir fazlasını dene
        # flow.py'deki mantığın aynısı: personel var ama hepsi doluysa yazma.
        chosen = ss.first_free(db, 1, day, first)
        if chosen is None and n:
            a = None
        else:
            a = cs.create_appointment(
                db, 1, f"90555000{i:04d}", f"Test {i}", "Kapasite testi", day,
                first, staff_id=chosen,
            )
        made.append(a)
        print(f"  deneme {i + 1}: ", "oluştu" if a else "REDDEDİLDİ")

    ok = [a for a in made if a is not None]
    assert len(ok) == n, f"kapasite {n} olmalıydı, {len(ok)} randevu oluştu"
    assert made[-1] is None, "kapasite aşıldı — index korumuyor"
    assert first not in cs.slots_for_day(db, 1, day), "dolu slot hâlâ sunuluyor"

    for a in ok:  # temizlik
        db.delete(a)
    db.commit()
print("KAPASİTE OK")
PY
```

Beklenen: kapasite kadar "oluştu", bir tane "REDDEDİLDİ", son satır `KAPASİTE OK`.

Klinikte tek aktif personel varsa bu test 1 oluşturup 1 reddeder — yine geçerlidir. `aktif personel: 0` yazıyorsa `n + 1 = 1` denemesi yapılır ve `len(ok) == 0` beklenir, ki bu yanlıştır; bu durumda önce Sistem ekranından bir personel ekle ve testi tekrarla.

- [ ] **Step 9: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
git add app/staff/service.py app/clinic/service.py app/whatsapp/flow.py
git commit -m "$(cat <<'EOF'
Let the bot pick a staff member when it books

Per-staff capacity only works if bot bookings carry a person: otherwise
every bot row folds to coalesce(staff_id, 0) = 0 and a slot still holds
one appointment.

The customer is not asked "with whom?" — the WhatsApp flow is unchanged.
Picking here rather than counting in slots_for_day keeps the race-safety
in the index.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `POST /api/appointments`

**Files:**
- Modify: `app/clinic/schemas.py`
- Modify: `app/clinic/router.py`

**Interfaces:**
- Consumes: `clinic_service.create_appointment(..., staff_id=..., status=...)`, `msg.ERR_SLOT_TAKEN`, `msg.ERR_SLOT_NOT_CONFIGURED`.
- Produces: `POST /api/appointments` → 201 `{appointment, notified, notify_error}`.

- [ ] **Step 1: Şemaları ekle**

`app/clinic/schemas.py` içinde `AssignStaffIn`'in hemen üstüne:

```python
class AppointmentIn(BaseModel):
    """Panel-created appointment. The bot does not use this shape."""

    phone: str
    customer_name: str = ""
    service_name: str = ""
    appt_date: date
    appt_time: str
    staff_id: int | None = None
    notify: bool = True


class AppointmentCreatedOut(BaseModel):
    """Wraps the appointment so the screen can tell "saved but not messaged".

    A bare AppointmentOut could not express that the row exists while the
    WhatsApp notification failed.
    """

    appointment: AppointmentOut
    notified: bool
    notify_error: str | None = None
```

- [ ] **Step 2: Ucu yaz**

`app/clinic/router.py` içinde `list_appointments`'ın hemen altına:

```python
@router.post("/appointments", response_model=AppointmentCreatedOut, status_code=201)
async def create_appointment(
    payload: AppointmentIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Book an appointment from the panel (phone calls, walk-ins).

    Created as "confirmed": the operator typed it in, so there is nothing to
    approve. Notification failure does not fail the request — the appointment
    is real either way, and the response says which happened.
    """
    settings = clinic_service.all_settings(db, current.clinic_id)
    if payload.appt_time not in settings.get("slot_times", []):
        # Rejected rather than stored: an off-slot appointment would never
        # appear in the grid, which draws one row per configured slot.
        raise HTTPException(422, msg.ERR_SLOT_NOT_CONFIGURED)

    if payload.staff_id is not None:
        person = staff_service.get(db, current.clinic_id, payload.staff_id)
        if person is None:
            raise HTTPException(404, msg.ERR_STAFF_NOT_FOUND)
        if not person.active:
            raise HTTPException(422, msg.ERR_STAFF_INACTIVE)

    appt = clinic_service.create_appointment(
        db, current.clinic_id, payload.phone, payload.customer_name,
        payload.service_name, payload.appt_date, payload.appt_time,
        staff_id=payload.staff_id, status="confirmed",
    )
    if appt is None:
        raise HTTPException(409, msg.ERR_SLOT_TAKEN)

    notified = False
    notify_error = None
    if payload.notify:
        try:
            await flow.send_post_confirm(
                current.clinic_id, appt.phone, appt.service_name,
                appt.appt_date, appt.appt_time,
            )
            notified = True
        except Exception as exc:
            # Deliberately broad: the appointment is already committed and no
            # send failure justifies losing it. The reason goes to the screen.
            notify_error = str(exc)

    return AppointmentCreatedOut(
        appointment=appt, notified=notified, notify_error=notify_error,
    )
```

`app/clinic/router.py` importlarına `AppointmentCreatedOut` ve `AppointmentIn` ekle (alfabetik sıra: `AppointmentCreatedOut`, `AppointmentIn`, `AppointmentOut`, `AssignStaffIn`, ...).

- [ ] **Step 3: Kapıları çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app && .venv/bin/python -c "import app.main; print('import ok')"
```

Beklenen: `All checks passed!` ve `import ok`.

- [ ] **Step 4: Sunucuyu ayağa kaldır**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &
sleep 3 && curl -s localhost:8000/health
```

- [ ] **Step 5: Ucu uçtan uca doğrula**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import json, urllib.request, urllib.error
from datetime import date, timedelta
B = "http://localhost:8000"

def call(path, body=None, method="GET", token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

_, tok = call("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"}, "POST")
tok = tok["token"]["access_token"]
_, settings = call("/api/settings", token=tok)
slot = settings["slot_times"][0]
day = (date.today() + timedelta(days=91)).isoformat()
_, staff = call("/api/staff", token=tok)
active = [s for s in staff if s["active"]]

def make(sid, time=slot, phone="905550000001"):
    return call("/api/appointments", {
        "phone": phone, "customer_name": "Panel Testi",
        "service_name": "Konsültasyon", "appt_date": day,
        "appt_time": time, "staff_id": sid, "notify": False,
    }, "POST", tok)

created = []
s1, b1 = make(active[0]["id"] if active else None)
print("1. randevu:", s1)
assert s1 == 201, b1
assert b1["appointment"]["status"] == "confirmed", "panel kaydı confirmed doğmalı"
assert b1["notified"] is False and b1["notify_error"] is None, b1
created.append(b1["appointment"]["id"])

s2, b2 = make(active[0]["id"] if active else None)
print("aynı personel, aynı slot:", s2, "→ 409 bekleniyor")
assert s2 == 409, b2

if len(active) > 1:
    s3, b3 = make(active[1]["id"])
    print("farklı personel, aynı slot:", s3, "→ 201 bekleniyor")
    assert s3 == 201, b3
    created.append(b3["appointment"]["id"])
else:
    print("farklı personel testi ATLANDI — klinikte tek aktif personel var")

s4, b4 = make(None, time="03:17")
print("slot dışı saat:", s4, "→ 422 bekleniyor")
assert s4 == 422, b4

s5, b5 = make(999999)
print("olmayan personel:", s5, "→ 404 bekleniyor")
assert s5 == 404, b5

s6, _ = call("/api/appointments", {"phone":"9", "appt_date":day, "appt_time":slot}, "POST")
print("token'sız:", s6, "→ 401 bekleniyor")
assert s6 == 401

for i in created:
    call(f"/api/appointments/{i}/cancel", {}, "POST", tok)
print("UÇ OK — temizlendi:", created)
PY
```

Beklenen: her satır beklenen kodu yazar, son satır `UÇ OK`.

Not: `notify: false` gönderiliyor çünkü WhatsApp kimlik bilgileri yok; `notify: true` yolu Task 5'te ayrıca yoklanır.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
git add app/clinic/schemas.py app/clinic/router.py
git commit -m "$(cat <<'EOF'
Add POST /api/appointments for panel bookings

Off-slot times are rejected with 422 rather than stored: the grid draws one
row per configured slot, so such a row would exist but never be visible.

The response wraps the appointment because notification failure must not
fail the request — the booking is real either way.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Atama ucunda dolu personel kontrolü

**Files:**
- Modify: `app/clinic/router.py` (`assign_appointment_staff`)

**Interfaces:**
- Consumes: `msg.ERR_STAFF_BUSY`.
- Produces: `PUT /api/appointments/{id}/staff` → 409 (hedef personel o slotta dolu).

- [ ] **Step 1: Çakışma kontrolünü ekle**

`assign_appointment_staff` içinde, `if not person.active: ...` bloğunun hemen altına:

```python
        clash = db.scalar(
            select(Appointment.id).where(
                Appointment.clinic_id == current.clinic_id,
                Appointment.appt_date == appt.appt_date,
                Appointment.appt_time == appt.appt_time,
                Appointment.staff_id == person.id,
                Appointment.status != "cancelled",
                Appointment.id != appt.id,
            )
        )
        if clash is not None:
            raise HTTPException(409, msg.ERR_STAFF_BUSY)
        appt.staff_id = person.id
```

(Var olan `appt.staff_id = person.id` satırının yerine geçer — iki kez yazma.)

- [ ] **Step 2: Commit'i yarışa karşı koru**

Fonksiyonun sonundaki `db.commit()` / `db.refresh(appt)` ikilisini bununla değiştir:

```python
    try:
        db.commit()
    except IntegrityError:
        # Someone assigned the same person to the same slot in between; the
        # index caught what the SELECT above could not.
        db.rollback()
        raise HTTPException(409, msg.ERR_STAFF_BUSY) from None
    db.refresh(appt)
    return appt
```

`app/clinic/router.py` importlarına ekle: `from sqlalchemy.exc import IntegrityError`.

- [ ] **Step 3: Kapılar ve doğrulama**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app && .venv/bin/python -c "import app.main; print('import ok')"
pkill -f "uvicorn app.main" ; sleep 1
.venv/bin/uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &
sleep 3
```

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import json, urllib.request, urllib.error
from datetime import date, timedelta
B = "http://localhost:8000"

def call(path, body=None, method="GET", token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

_, tok = call("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"}, "POST")
tok = tok["token"]["access_token"]
_, settings = call("/api/settings", token=tok)
slot = settings["slot_times"][0]
day = (date.today() + timedelta(days=92)).isoformat()
_, staff = call("/api/staff", token=tok)
active = [s for s in staff if s["active"]]
assert active, "test için en az bir aktif personel gerekli"
sid = active[0]["id"]

def make(sid_, phone):
    return call("/api/appointments", {
        "phone": phone, "customer_name": "Atama Testi",
        "service_name": "Konsültasyon", "appt_date": day,
        "appt_time": slot, "staff_id": sid_, "notify": False,
    }, "POST", tok)

_, a = make(sid, "905550000011")       # personele atanmış
_, b = make(None, "905550000012")      # atanmamış (coalesce=0, çakışmaz)
ids = [a["appointment"]["id"], b["appointment"]["id"]]

st, body = call(f"/api/appointments/{ids[1]}/staff", {"staff_id": sid}, "PUT", tok)
print("dolu personele atama:", st, "→ 409 bekleniyor")
assert st == 409, body
assert "başka randevusu" in body, body

st2, _ = call(f"/api/appointments/{ids[0]}/staff", {"staff_id": sid}, "PUT", tok)
print("kendi randevusunu aynı personele atama:", st2, "→ 200 bekleniyor")
assert st2 == 200, "kendi kaydını kendine atamak çakışma sayılmamalı"

for i in ids:
    call(f"/api/appointments/{i}/cancel", {}, "POST", tok)
print("ATAMA OK")
PY
```

Beklenen: son satır `ATAMA OK`. İkinci kontrol önemlidir: `Appointment.id != appt.id` koşulu unutulursa bir randevuyu zaten atanmış olduğu personele yeniden atamak 409 verir.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
git add app/clinic/router.py
git commit -m "$(cat <<'EOF'
Reject assigning a staff member who is busy in that slot

Per-staff capacity made this endpoint able to produce conflicts. The SELECT
gives a clear Turkish error; the IntegrityError catch covers the race the
SELECT cannot.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Backend PR

**Files:** yok (yalnızca doğrulama ve PR).

- [ ] **Step 1: `notify: true` yolunu yokla**

WhatsApp kimlik bilgileri yok, yani bu istek `notified: false` dönmeli — ve **randevu yine de oluşmalı**. Asıl doğrulanan budur.

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import json, urllib.request, urllib.error
from datetime import date, timedelta
B = "http://localhost:8000"

def call(path, body=None, method="GET", token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

_, tok = call("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"}, "POST")
tok = tok["token"]["access_token"]
_, settings = call("/api/settings", token=tok)
day = (date.today() + timedelta(days=93)).isoformat()
st, b = call("/api/appointments", {
    "phone": "905550000021", "customer_name": "Bildirim Testi",
    "service_name": "Konsültasyon", "appt_date": day,
    "appt_time": settings["slot_times"][0], "staff_id": None, "notify": True,
}, "POST", tok)
print("durum:", st)
print("notified:", b["notified"])
print("notify_error:", (b["notify_error"] or "")[:120])
assert st == 201, b
assert b["appointment"]["id"], "randevu oluşmadı"
call(f"/api/appointments/{b['appointment']['id']}/cancel", {}, "POST", tok)
print("BİLDİRİM YOLU OK — randevu gönderim başarısızlığına rağmen oluştu")
PY
```

Beklenen: `durum: 201`, `notified: False`, `notify_error` dolu. `notified: True` çıkarsa gerçekten mesaj gitmiş demektir — bu beklenmiyor, dur ve bildir.

- [ ] **Step 2: Diff'i gözden geçir**

```bash
cd ~/Desktop/kisisel/w-lush && git diff main --stat && git diff main
```

Diff'i baştan sona oku. Aradıkların: yanlışlıkla bırakılmış `print`, yoruma alınmış kod, `taken_times`'tan kalan ölü referans, kimlik bilgisi içeren satır.

- [ ] **Step 3: PR aç**

```bash
cd ~/Desktop/kisisel/w-lush
git push -u origin feature/randevu-olusturma
gh pr create --base main --head feature/randevu-olusturma \
  --title "Panelden randevu oluşturma ve personel başına kapasite" \
  --body "$(cat <<'EOF'
Panelin randevu yaratabilmesi için yeni bir uç, ve bunun ortaya çıkardığı
kapasite çelişkisinin giderilmesi.

## Kapasite: klinik başına → personel başına
Izgara personel sütunları gösteriyordu ama unique index klinik başına saatte
tek randevuya izin veriyordu; iki personel aynı saatte çalışamıyordu. Index
artık `(clinic_id, appt_date, appt_time, coalesce(staff_id, 0))`.

`coalesce` şart: unique index'lerde NULL'lar birbirinden farklı sayılır, düz
`staff_id` yazılsaydı atanmamış randevular birbiriyle hiç çakışmaz ve botun
çifte rezervasyon koruması tamamen kaybolurdu.

Bunun gereği olarak **bot randevuyu yazarken müsait ilk aktif personeli
kendisi seçiyor**. Müşteriye "kiminle?" diye sorulmuyor — WhatsApp akışı
değişmedi. Personel kaydetmek, kapasiteyi uygulama katmanında saymak yerine
index'te garanti altına almayı sağlıyor. Klinikte aktif personel yoksa
`staff_id` boş kalır ve kapasite 1 olur; yani personel öncesi davranış aynen
korunur.

## Yeni uç
`POST /api/appointments` — panel kaydı `confirmed` doğar (operatör girdiği
için onay beklemesi anlamsız). Slot dolu → 409. `slot_times` dışı saat → 422;
böyle bir kayıt saklansaydı ızgarada hiç görünmezdi.

Yanıt düz `AppointmentOut` değil: `{appointment, notified, notify_error}`.
Bildirim başarısızlığı isteği başarısız yapmaz — randevu her hâlükârda
gerçektir ve ekranın ikisini ayırt edebilmesi gerekir.

`PUT /appointments/{id}/staff` artık 409 verebiliyor: hedef personelin o
saatte başka randevusu varsa.

## Doğrulama
- `ruff check app` temiz, `import ok`.
- Index'in `coalesce` ve kısmi koşulu taşıdığı doğrudan `sqlite_master`'dan
  okundu.
- Kapasite testi: aktif personel sayısı kadar randevu oluştu, bir fazlası
  reddedildi, dolan slot artık bota sunulmuyor.
- Uç testleri: aynı personel+slot 409, farklı personel+aynı slot 201, slot
  dışı saat 422, olmayan personel 404, token'sız 401.
- Atama: dolu personele 409; bir randevuyu zaten atandığı personele yeniden
  atamak 200 (çakışma sayılmıyor).
- Bildirim: `notify: true` isteği 201 döndü, `notified: false` ve
  `notify_error` dolu geldi, randevu oluştu.

**Doğrulanamayan:** gerçek WhatsApp gönderimi. Meta kimlik bilgileri sistemde
yok, yani `notified: true` yolu hiç çalıştırılmadı.

**Not:** `uq_active_appointment_slot` bir ifade (expression) içerdiği için
alembic autogenerate onu güvenilir karşılaştıramaz ve fark raporlayabilir;
bu yüzden bu PR'da autogenerate-farkı-sıfır kontrolü yerine index'in
doğrudan okunması kullanıldı.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Merge et**

```bash
cd ~/Desktop/kisisel/w-lush
gh pr merge --squash --delete-branch
git checkout main && git pull && git log --oneline -1
```

---

### Task 6: Frontend API katmanı

**Files:**
- Modify: `src/api/client.ts`
- Modify: `src/api/clinic.ts`

**Interfaces:**
- Consumes: Task 3'ün `POST /api/appointments` ucu.
- Produces:
  - `class ApiError extends Error { status: number; detail: string }`
  - `createAppointment(input: NewAppointment): Promise<AppointmentCreated>`
  - `interface NewAppointment { phone, customer_name, service_name, appt_date, appt_time, staff_id: number|null, notify: boolean }`
  - `interface AppointmentCreated { appointment: Appointment; notified: boolean; notify_error: string|null }`

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/randevu-olusturma
```

- [ ] **Step 2: `ApiError`'ı ekle**

`src/api/client.ts` içinde, `request` fonksiyonunun üstüne:

```ts
/**
 * Durum kodu okunabilen hata. Bu ekran 409 (slot dolu) ile 422'yi (slot
 * tanımsız) ayırt etmek zorunda; metin ayıklamakla yapılamaz.
 *
 * `message` biçimi bilerek değiştirilmedi — mevcut dört ekran hata metnini
 * `e.message.split('detail":"')` ile ayıklıyor ve çalışmaya devam etmeli.
 */
export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}
```

Ardından `if (!res.ok) { ... }` bloğunu bununla değiştir:

```ts
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let detail = '';
    try {
      detail = (JSON.parse(body) as { detail?: string }).detail ?? '';
    } catch {
      detail = '';
    }
    throw new ApiError(res.status, detail, `API ${res.status}: ${body || res.statusText}`);
  }
```

- [ ] **Step 3: `createAppointment`'ı ekle**

`src/api/clinic.ts` içinde `assignAppointmentStaff`'ın hemen üstüne:

```ts
export interface NewAppointment {
  phone: string;
  customer_name: string;
  service_name: string;
  appt_date: string; // YYYY-MM-DD
  appt_time: string; // HH:MM — kliniğin slot_times listesinden olmalı
  staff_id: number | null;
  notify: boolean;
}

// Randevu ile bildirim sonucu ayrı: gönderim başarısız olsa da randevu gerçek.
export interface AppointmentCreated {
  appointment: Appointment;
  notified: boolean;
  notify_error: string | null;
}

export const createAppointment = (input: NewAppointment) =>
  request<AppointmentCreated>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(input),
  });
```

- [ ] **Step 4: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

Beklenen: ikisi de 0 ile çıkar.

- [ ] **Step 5: Mevcut hata ayıklamalarının bozulmadığını doğrula**

`ApiError`, `Error`'dan türediği ve `message` biçimi korunduğu için dört ekran çalışmaya devam etmeli. Ayıklamayı yapan yerleri listele ve `e.message` kullandıklarını gör:

```bash
cd ~/Desktop/kisisel/w-lush-web && grep -rn "detail\":\"" src/
```

Beklenen: her satır `e.message.split(...)` biçiminde. `e.detail` bekleyen bir satır çıkarsa bu task'ta değiştirilmemiş demektir; sorun değil, ama not al.

- [ ] **Step 6: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/api/client.ts src/api/clinic.ts
git commit -m "$(cat <<'EOF'
Give API errors a readable status code

The booking form must tell 409 (slot taken) from 422 (slot not configured),
which text matching cannot do reliably.

ApiError extends Error and keeps the message format byte-identical, so the
four screens that parse e.message keep working untouched.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Randevu formu

**Files:**
- Create: `src/components/randevu/AppointmentModal.tsx`

**Interfaces:**
- Consumes: `createAppointment`, `NewAppointment`, `ApiError`, `listServices`, `listStaff`, `getCustomer`, `Modal`.
- Produces:

```ts
export default function AppointmentModal({
  slots, staff, initial, onClose, onCreated,
}: {
  slots: string[];
  staff: StaffMember[];              // yalnızca aktif olanlar
  initial: { date: string; time: string; staffId: number | null };
  onClose: () => void;
  onCreated: (created: AppointmentCreated) => void;
}): JSX.Element
```

- [ ] **Step 1: Dosyayı yaz**

```tsx
import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError } from '../../api/client';
import { getCustomer } from '../../api/customers';
import {
  createAppointment,
  listServices,
  type AppointmentCreated,
  type Service,
} from '../../api/clinic';
import type { StaffMember } from '../../api/staff';
import { Modal } from '../modals';

const field: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 10px',
  font: 'inherit',
  fontSize: 12,
  background: 'var(--cream)',
  marginTop: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-60)',
  display: 'block',
};

const UNASSIGNED = '';

export default function AppointmentModal({
  slots,
  staff,
  initial,
  onClose,
  onCreated,
}: {
  slots: string[];
  staff: StaffMember[];
  initial: { date: string; time: string; staffId: number | null };
  onClose: () => void;
  onCreated: (created: AppointmentCreated) => void;
}) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [known, setKnown] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [day, setDay] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [staffId, setStaffId] = useState<string>(
    initial.staffId === null ? UNASSIGNED : String(initial.staffId),
  );
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listServices()
      .then((rows) => setServices(rows.filter((s) => s.active)))
      .catch(() => setServices([]));
  }, []);

  // Telefon yazılmayı bıraktıktan sonra mevcut danışan aranır.
  useEffect(() => {
    const digits = phone.trim();
    if (digits.length < 10) {
      setKnown(false);
      return;
    }
    const t = setTimeout(() => {
      getCustomer(digits)
        .then((c) => {
          setKnown(true);
          // İsim yalnızca operatör henüz bir şey yazmadıysa doldurulur.
          setName((cur) => cur || c.customer_name || '');
        })
        // 404 normal sonuçtur: yeni danışan. Hata gösterilmez.
        .catch(() => setKnown(false));
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);

  const submit = () => {
    if (!phone.trim()) {
      setError('Telefon zorunlu.');
      return;
    }
    if (!time) {
      setError('Saat seçilmeli.');
      return;
    }
    setSaving(true);
    setError(null);
    createAppointment({
      phone: phone.trim(),
      customer_name: name.trim(),
      service_name: serviceName.trim(),
      appt_date: day,
      appt_time: time,
      staff_id: staffId === UNASSIGNED ? null : Number(staffId),
      notify,
    })
      .then((created) => {
        onCreated(created);
        onClose();
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        // 409'da form açık kalır: operatör başka saat/personel seçebilsin.
        setError(api?.detail || 'Randevu oluşturulamadı.');
        setSaving(false);
      });
  };

  return (
    <Modal title="Yeni randevu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={labelStyle}>
          Telefon
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="905321112233"
            style={field}
          />
        </label>

        {known && (
          <div style={{ fontSize: 11, color: 'var(--forest)' }}>
            Mevcut danışan — geçmişi Danışan Profili'nde.
          </div>
        )}

        <label style={labelStyle}>
          Danışan adı
          <input value={name} onChange={(e) => setName(e.target.value)} style={field} />
        </label>

        <label style={labelStyle}>
          Hizmet
          <select
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            style={field}
          >
            <option value="">Seçilmedi</option>
            {services.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Tarih
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              style={field}
            />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Saat
            <select value={time} onChange={(e) => setTime(e.target.value)} style={field}>
              <option value="">Seçilmedi</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Personel
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} style={field}>
            <option value={UNASSIGNED}>Atanmamış</option>
            {staff.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          Müşteriye WhatsApp'tan bilgi ver
        </label>

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor…' : 'Randevu oluştur'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: `getCustomer`'ın dönüş alanını doğrula**

Yukarıdaki kod `c.customer_name` okuyor. Gerçek alan adını kontrol et:

```bash
cd ~/Desktop/kisisel/w-lush-web && sed -n '45,70p' src/api/customers.ts
```

`CustomerDetail` içinde alan `customer_name` değilse (örneğin `name`), `AppointmentModal.tsx` içindeki satırı gerçek ada göre düzelt. Bu adımı atlama — `typecheck` zaten yakalar ama nedenini bilerek düzeltmek gerekir.

- [ ] **Step 3: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

Beklenen: ikisi de 0. `Modal` importu hata verirse `src/components/modals.tsx` dosyasındaki export adını kontrol et.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/randevu/AppointmentModal.tsx
git commit -m "$(cat <<'EOF'
Add the appointment form

Phone lookup treats 404 as the normal "new customer" result rather than an
error, and never overwrites a name the operator already typed.

On 409 the form stays open so the operator can pick another slot instead of
retyping everything.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Izgaradan boş hücreye tıklama

**Files:**
- Modify: `src/components/randevu/SlotGrid.tsx`

**Interfaces:**
- Consumes: yok.
- Produces: `SlotGrid` isteğe bağlı `onEmptyClick?: (slot: string, columnKey: string) => void` alır. Verilmezse bugünkü çıktı birebir aynıdır.

- [ ] **Step 1: Prop'u ekle**

`SlotGrid` imzasına ekle (hem tip hem parametre listesi):

```tsx
  onEmptyClick,
}: {
  slots: string[];
  columns: SlotColumn[];
  items: SlotItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Boş (veya yalnızca iptal içeren) hücreye tıklanınca. Verilmezse hücre pasiftir. */
  onEmptyClick?: (slot: string, columnKey: string) => void;
}) {
```

- [ ] **Step 2: Hücrenin sonuna ekleme düğmesini koy**

`<td>` içinde, `{here.length > MAX_PER_CELL && ...}` bloğunun hemen altına:

```tsx
                    {onEmptyClick && here.every((i) => i.status === 'cancelled') && (
                      <button
                        type="button"
                        onClick={() => onEmptyClick(slot, c.key)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          font: 'inherit',
                          fontSize: 10,
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px dashed var(--line)',
                          background: 'transparent',
                          color: 'var(--ink-40)',
                        }}
                      >
                        + Randevu ekle
                      </button>
                    )}
```

`here.every(...)` boş dizide `true` döner — yani hem tamamen boş hücre hem de yalnızca iptal içeren hücre düğmeyi gösterir. İptal edilmiş randevu yerinde kalır, düğme onun altına gelir. Spec'in istediği davranış budur.

- [ ] **Step 3: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/components/randevu/SlotGrid.tsx
git commit -m "$(cat <<'EOF'
Let an empty grid cell start a booking

The handler is optional so the component stays presentational and callers
that do not book keep their current output byte-for-byte.

here.every() is true for an empty array, which is why a cell holding only
cancelled appointments offers the button too — the slot is genuinely free.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Sayfayı bağla

**Files:**
- Modify: `src/pages/RandevuTakvimi.tsx`

**Interfaces:**
- Consumes: `AppointmentModal`, `SlotGrid`'in `onEmptyClick`'i, `AppointmentCreated`.
- Produces: kullanıcıya görünen tam akış.

- [ ] **Step 1: Import ve durum ekle**

Importlara:

```tsx
import AppointmentModal from '../components/randevu/AppointmentModal';
import { type AppointmentCreated } from '../api/clinic';
```

(`AppointmentCreated`, mevcut `../api/clinic` import bloğuna eklenebilir.)

Bileşenin içine, `const [error, setError] = useState<string | null>(null);` satırının altına:

```tsx
  // null = kapalı. Açıkken formun ön dolumunu taşır.
  const [creating, setCreating] = useState<
    { date: string; time: string; staffId: number | null } | null
  >(null);
  const [notifyWarning, setNotifyWarning] = useState<string | null>(null);
```

- [ ] **Step 2: Boş hücre tıklamasını yaz**

`const step = (dir: -1 | 1) => ...` satırının üstüne:

```tsx
  // Gün görünümünde sütun personeldir, haftada gündür — ön dolum buna göre.
  const openCreate = (slot: string, columnKey: string) =>
    setCreating(
      view === 'gun'
        ? {
            date: isoDate(anchor),
            time: slot,
            staffId: columnKey === UNASSIGNED ? null : Number(columnKey),
          }
        : { date: columnKey, time: slot, staffId: null },
    );

  const afterCreate = (created: AppointmentCreated) => {
    setNotifyWarning(
      created.notified
        ? null
        : `Randevu oluşturuldu, ancak müşteriye mesaj iletilemedi${
            created.notify_error ? `: ${created.notify_error}` : '.'
          }`,
    );
    setSelectedId(created.appointment.id);
    load();
  };
```

- [ ] **Step 3: Başlığa düğmeyi ekle**

Gezinme kartındaki tarih başlığı `<div>`'inin hemen altına (aynı flex kabın içinde):

```tsx
        <button
          type="button"
          className="wl-btn wl-btn-sm"
          style={{ marginLeft: 'auto', borderRadius: 8, fontSize: 12 }}
          onClick={() =>
            setCreating({ date: isoDate(anchor), time: slots[0] ?? '', staffId: null })
          }
          disabled={slots.length === 0}
        >
          Yeni randevu
        </button>
```

- [ ] **Step 4: Izgaraya handler'ı geçir**

`<SlotGrid ... />` çağrısına ekle:

```tsx
                onEmptyClick={openCreate}
```

- [ ] **Step 5: Bildirim uyarısını göster**

Izgara kartının (`{/* ızgara */}`) hemen üstüne:

```tsx
      {notifyWarning && (
        <div
          style={{
            ...card,
            padding: '12px 20px',
            fontSize: 12,
            color: 'var(--ink-60)',
            display: 'flex',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <span style={{ flex: 1 }}>{notifyWarning}</span>
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8, fontSize: 12 }}
            onClick={() => setNotifyWarning(null)}
          >
            Tamam
          </button>
        </div>
      )}
```

- [ ] **Step 6: Modalı render et**

`<AppointmentList />` satırının hemen altına, kapanış `</div>`'inden önce:

```tsx
      {creating && (
        <AppointmentModal
          slots={slots}
          staff={staff}
          initial={creating}
          onClose={() => setCreating(null)}
          onCreated={afterCreate}
        />
      )}
```

- [ ] **Step 7: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build
```

Beklenen: ikisi de 0.

- [ ] **Step 8: Commit**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add src/pages/RandevuTakvimi.tsx
git commit -m "$(cat <<'EOF'
Wire the booking form into the calendar

An empty cell prefills the slot it stands for: staff in day view, date in
week view.

Failed notification surfaces as a dismissable line above the grid rather
than an error, because the appointment was created either way.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Doğrulama ve frontend PR

**Files:** yok.

- [ ] **Step 1: Ön dolum mantığını veri düzeyinde doğrula**

Tarayıcı olmadan yapılabilecek en güçlü kontrol: hangi hücrenin forma hangi değerleri taşıdığı.

```bash
cd ~/Desktop/kisisel/w-lush-web && node -e "
const UNASSIGNED = 'none';
const openCreate = (view, anchorIso, slot, columnKey) =>
  view === 'gun'
    ? { date: anchorIso, time: slot, staffId: columnKey === UNASSIGNED ? null : Number(columnKey) }
    : { date: columnKey, time: slot, staffId: null };

const cases = [
  ['gun', '2026-08-12', '11:00', '1',    { date: '2026-08-12', time: '11:00', staffId: 1 }],
  ['gun', '2026-08-12', '14:00', 'none', { date: '2026-08-12', time: '14:00', staffId: null }],
  ['hafta','2026-08-12','10:00', '2026-08-14', { date: '2026-08-14', time: '10:00', staffId: null }],
];
for (const [v, a, s, c, want] of cases) {
  const got = openCreate(v, a, s, c);
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(ok ? 'OK ' : 'HATA', v, s, c, '→', JSON.stringify(got));
  if (!ok) process.exit(1);
}
console.log('ÖN DOLUM OK');
"
```

Beklenen: üç `OK` satırı ve `ÖN DOLUM OK`.

- [ ] **Step 2: Diff'i gözden geçir**

```bash
cd ~/Desktop/kisisel/w-lush-web && git diff main --stat && git diff main
```

Diff'i baştan sona oku: kalıntı `console.log`, kullanılmayan import, uydurma veri var mı?

- [ ] **Step 3: Tarayıcı turu**

Chrome eklentisi bağlıysa `/randevu-takvimi` sayfasını aç ve şunları gör: boş hücrede "+ Randevu ekle", form açılışında slot/personel ön dolumu, aynı slota ikinci kayıtta "Bu saat dolu." mesajı, kayıt sonrası ızgaranın yenilenmesi.

Eklenti bağlı değilse **bu adımı atla ve PR'da atlandığını yaz**. Yapılmamış bir kontrolü yapılmış gibi raporlama.

- [ ] **Step 4: PR aç**

```bash
cd ~/Desktop/kisisel/w-lush-web
git push -u origin feature/randevu-olusturma
gh pr create --base main --head feature/randevu-olusturma \
  --title "Panelden randevu oluşturma" \
  --body "$(cat <<'EOF'
Telefonla arayan veya kliniğe gelen danışan için operatör artık panelden
randevu girebiliyor. Backend tarafı: selamet/w-lush#<NUMARA> (merge edildi).

## Akış
Izgaradaki boş hücreye tıklanır — form o hücreyle dolu açılır: slot saati,
gün görünümünde personel sütunu, hafta görünümünde gün sütunu. Serbest giriş
için başlıkta "Yeni randevu" düğmesi var.

İptal edilmiş randevunun bulunduğu hücre de düğmeyi gösterir; slot aslında
boştur. İptal kaydı soluk/üstü çizili olarak yerinde kalır.

## Değişenler
- `components/randevu/AppointmentModal.tsx` (yeni) — formun tamamı.
  `RandevuTakvimi.tsx` 284 satır ve yeniden şişmemeliydi.
- `components/randevu/SlotGrid.tsx` — isteğe bağlı `onEmptyClick`. Verilmezse
  çıktı birebir eskisi gibi; bileşen saf kalıyor.
- `api/client.ts` — `ApiError` durum kodunu taşıyor. Form 409 (slot dolu) ile
  422'yi (slot tanımsız) ayırt etmek zorunda. `message` biçimi bilerek
  değiştirilmedi, metin ayıklayan dört ekran çalışmaya devam ediyor.
- `api/clinic.ts` — `createAppointment`.

## Davranış ayrıntıları
- Telefon eşleşmesinde 404 **hata değildir** — yeni danışan demektir, sessiz
  geçilir. Eşleşme operatörün yazdığı ismin üstüne yazmaz.
- 409'da form açık kalır; operatör baştan yazmak yerine başka saat/personel
  seçer.
- Bildirim gitmezse ızgaranın üstünde kapatılabilir bir satır çıkar. Randevu
  oluşmuştur, bu bir hata değil bilgidir.

## Doğrulama
- `typecheck` ve `build` 0 ile çıkıyor.
- Ön dolum mantığı veri düzeyinde üç durumda doğrulandı (gün+personel,
  gün+atanmamış, hafta).
- **Tarayıcıda açılmadı** — Chrome eklentisi bu oturumda bağlı değil. Görsel
  kontrol yapılmadı.
- Gerçek WhatsApp gönderimi doğrulanamadı; Meta kimlik bilgileri sistemde yok.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR gövdesindeki `<NUMARA>` yerine Task 5'te açılan backend PR'ının gerçek numarasını yaz.

- [ ] **Step 5: Merge**

Kullanıcı onaylarsa:

```bash
cd ~/Desktop/kisisel/w-lush-web
gh pr merge --squash --delete-branch
git checkout main && git pull && npm run typecheck
```

---

## Bu planın kapsamadıkları

- Randevu düzenleme (tarih/saat/hizmet değiştirme). Bugün de yok.
- Botun müşteriye "kiminle?" diye sorması.
- `slot_times` değişince eski randevuların ızgarada kaybolması (takvim PR'ında
  not edilen ayrı iş).
- `src/components/modals.tsx` içindeki uydurma `CONTACTS` / `SERVICES` /
  `STAFF` / `TEMPLATES` dizileri. Bu planda yalnızca `Modal` kabuğu kullanılıyor,
  o diziler başka ekranlara ait ve ayrı bir temizlik işi.
