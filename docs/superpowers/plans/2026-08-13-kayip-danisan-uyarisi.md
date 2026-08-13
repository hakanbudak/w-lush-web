# Kayıp Danışan Uyarısı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uzun süredir gelmeyen danışanlar için operatöre bildirim üreten zamanlanmış iş.

**Architecture:** Yeni bir iş (`app/jobs/lapsed.py`) mevcut zamanlayıcıya eklenir. Tekrarı `customers.lapsed_alerted_at` işareti önler; tek kural iki yönde de çalıştığı için ayrı bir "geri geldi mi" kontrolü yoktur. Bildirimler `ref` sütunuyla danışan profiline bağlanır.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic, pytest; frontend tarafında küçük bir React değişikliği.

**Tasarım kaynağı:** `docs/superpowers/specs/2026-08-13-kayip-danisan-uyarisi-design.md`

## Global Constraints

- İki repo: backend `~/Desktop/kisisel/w-lush`, frontend `~/Desktop/kisisel/w-lush-web`. Backend PR'ı önce merge edilir.
- **Commit mesajları İngilizce, atıfsız, konu satırı ASCII.** PR başlıkları da İngilizce (GitHub squash konusu olarak onu kullanıyor). Kanca ve CI ikisini de denetliyor.
- Kapılar: backend `ruff check app tests` + `pytest`; frontend `typecheck` + `test` + `build`.
- Migration elle yazılır; `down_revision = "d5b1c93e7a02"`.
- Kullanıcıya görünen metinler Türkçe, `app/content/messages.py` içinde.
- Yeni davranış teste bağlanır.

## Dosya yapısı

**Backend (dal: `feature/kayip-danisan`)**

| Dosya | Sorumluluk |
|---|---|
| `app/customers/models.py` | `lapsed_alerted_at` sütunu |
| `app/notifications/models.py` | `ref` sütunu |
| `app/notifications/service.py` | `LAPSED` sabiti, `create(..., ref=None)` |
| `app/notifications/schemas.py` | `NotificationOut.ref` |
| `alembic/versions/e7c2a91d4f36_lapsed_alert.py` (yeni) | İki sütun |
| `app/clinic/service.py` | `lapsed_after_days` varsayılanı |
| `app/content/messages.py` | Bildirim metni |
| `app/jobs/lapsed.py` (yeni) | İşin kendisi |
| `app/jobs/scheduler.py` | Yeni işi döngüye ekler |
| `tests/test_lapsed.py` (yeni) | Davranışın tamamı |

**Frontend (dal: `feature/kayip-danisan-bildirimi`)**

| Dosya | Sorumluluk |
|---|---|
| `src/api/notifications.ts` | `ref` alanı |
| `src/components/NotificationBell.tsx` | "Kayıp danışan" etiketi, `ref` hedefi |
| `src/components/sistem/AiSection.tsx` | Eşik alanı, "Yakında" rozetinin kalkması |

---

### Task 1: Sütunlar ve ayar

**Files:**
- Modify: `app/customers/models.py`, `app/notifications/models.py`, `app/notifications/service.py`, `app/notifications/schemas.py`, `app/clinic/service.py`
- Create: `alembic/versions/e7c2a91d4f36_lapsed_alert.py`

**Interfaces:**
- Produces:
  - `Customer.lapsed_alerted_at: datetime | None`
  - `Notification.ref: str | None`, `NotificationOut.ref`
  - `notifications.service.LAPSED = "lapsed"`
  - `notifications.service.create(db, clinic_id, kind, message, ref=None)`
  - `DEFAULT_SETTINGS["lapsed_after_days"] = 120`

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush
git checkout main && git pull
git checkout -b feature/kayip-danisan
```

- [ ] **Step 2: `Customer`'a işaret sütununu ekle**

`app/customers/models.py`, `created_at` satırının üstüne:

```python
    # Bu kişi için kayıp uyarısı üretildiği an. Dolu olması "zaten haber
    # verildi" demek; danışan geri gelince iş bunu temizler.
    lapsed_alerted_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
```

- [ ] **Step 3: `Notification`'a `ref` ekle**

`app/notifications/models.py`, `read` satırının üstüne:

```python
    # Bildirimin işaret ettiği kayıt — şimdilik yalnızca danışan telefonu.
    # Boşsa panel eskisi gibi randevu takvimine gider.
    ref: Mapped[str | None] = mapped_column(String(64), nullable=True)
```

- [ ] **Step 4: Servisi ve şemayı güncelle**

`app/notifications/service.py`:

```python
REQUEST = "request"
LAPSED = "lapsed"


def create(
    db: Session, clinic_id: int, kind: str, message: str, ref: str | None = None
) -> Notification:
    note = Notification(clinic_id=clinic_id, kind=kind, message=message, ref=ref)
```

`app/notifications/schemas.py` içindeki `NotificationOut`'a, `read` satırının üstüne:

```python
    # Bildirimin hedefi; boşsa panel randevu takvimine düşer.
    ref: str | None = None
```

- [ ] **Step 5: Eşik ayarını ekle**

`app/clinic/service.py` içindeki `DEFAULT_SETTINGS`'te, `ai_lapsed_alert` satırının hemen altına:

```python
    # Son ziyaretten kaç gün sonra "kayıp" sayılsın. Klinikler arasında çok
    # değişir: diş kontrolü altı ay, lazer seansı bir ay.
    "lapsed_after_days": 120,
```

- [ ] **Step 6: Migration'ı yaz**

`alembic/versions/e7c2a91d4f36_lapsed_alert.py`:

```python
"""lapsed customer alert: marker column and notification target

Both columns are nullable and nothing backfills them. An empty
lapsed_alerted_at means "not alerted yet", which is the correct starting
state for every existing row; an empty ref means the notification points
nowhere in particular, which is true of every notification written so far.

Revision ID: e7c2a91d4f36
Revises: d5b1c93e7a02
Create Date: 2026-08-13

"""
import sqlalchemy as sa
from alembic import op

revision = "e7c2a91d4f36"
down_revision = "d5b1c93e7a02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "customers", sa.Column("lapsed_alerted_at", sa.DateTime(), nullable=True)
    )
    op.add_column(
        "notifications", sa.Column("ref", sa.String(length=64), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("notifications", "ref")
    op.drop_column("customers", "lapsed_alerted_at")
```

- [ ] **Step 7: Migration'ı çalıştır ve kapıları geç**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/alembic upgrade head 2>&1 | tail -1
.venv/bin/ruff check app && .venv/bin/python -c "import app.main; print('import ok')"
.venv/bin/pytest tests/test_schema.py -p no:cacheprovider 2>&1 | grep -iE "passed|failed"
```

Beklenen: migration çalışır, `All checks passed!`, `import ok`, şema kayma testi **2 passed** (model ile migration aynı sütunları tarif ediyor).

- [ ] **Step 8: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
git add app/customers/models.py app/notifications app/clinic/service.py alembic/versions/e7c2a91d4f36_lapsed_alert.py
git commit -m "$(cat <<'EOF'
Add the columns the lapsed-customer alert needs

Both are nullable with no backfill. An empty marker means "not alerted yet",
which is the right starting state for every existing customer, and an empty
ref means the notification points nowhere in particular — true of every
notification written so far.
EOF
)"
```

---

### Task 2: İşin kendisi

**Files:**
- Create: `app/jobs/lapsed.py`
- Modify: `app/content/messages.py`

**Interfaces:**
- Consumes: Task 1'in sütunları ve sabitleri.
- Produces: `run_lapsed_check(now: datetime | None = None) -> int` — üretilen bildirim sayısını döner.

- [ ] **Step 1: Bildirim metnini ekle**

`app/content/messages.py`, `ERR_CLINIC_TYPE_INVALID` satırının altına:

```python
def notify_lapsed(name: str, days: int) -> str:
    """Gün sayısı kesin ve doğrulanabilir; "4 aydır" yuvarlaması veriye
    sadık değil."""
    return f"{name} · son ziyareti {days} gün önce"
```

- [ ] **Step 2: İşi yaz**

`app/jobs/lapsed.py`:

```python
"""Lapsed customer alert.

A customer who stops coming disappears quietly: nobody notices and nobody
calls. This job notices, once per customer, and tells the operator.

Nothing is sent to the customer. Reaching out after months of silence needs
an approved WhatsApp template — free text outside the 24-hour window is what
gets a number banned — so the decision stays with a human.
"""
import logging
from datetime import date, datetime

from sqlalchemy import select

from app.clinic.models import Appointment
from app.clinic import service as clinic_service
from app.content import messages as msg
from app.core.database import SessionLocal
from app.customers.models import Customer
from app.notifications import service as notifications_service

logger = logging.getLogger("jobs.lapsed")

LIVE = Appointment.status != "cancelled"


def _visits_by_phone(db, clinic_id: int, today: date) -> dict[str, dict]:
    """Per phone: the last past visit and whether anything is booked ahead.

    One query for the clinic rather than one per customer: the live set is
    small and folding it in Python keeps the date logic in one readable place.
    """
    rows = db.scalars(
        select(Appointment).where(Appointment.clinic_id == clinic_id, LIVE)
    ).all()
    facts: dict[str, dict] = {}
    for appt in rows:
        fact = facts.setdefault(appt.phone, {"last_visit": None, "upcoming": False})
        if appt.appt_date < today:
            if fact["last_visit"] is None or appt.appt_date > fact["last_visit"]:
                fact["last_visit"] = appt.appt_date
        else:
            fact["upcoming"] = True
    return facts


def _is_lapsed(fact: dict | None, today: date, after_days: int) -> tuple[bool, int]:
    """Lapsed, and by how many days.

    Someone who never came is not lapsed — that is a lead, and the CRM's job.
    """
    if fact is None or fact["last_visit"] is None or fact["upcoming"]:
        return False, 0
    days = (today - fact["last_visit"]).days
    return days >= after_days, days


def run_lapsed_check(now: datetime | None = None) -> int:
    """Alert on customers who stopped coming. Returns how many were alerted.

    `now` is injectable so a "137 days ago" scenario can be built in a test
    without waiting for the clock.
    """
    today = (now or datetime.now()).date()
    created = 0

    with SessionLocal() as db:
        clinic_ids = list(db.scalars(select(Customer.clinic_id).distinct()).all())
        for clinic_id in clinic_ids:
            if not clinic_service.get_setting(db, clinic_id, "ai_lapsed_alert"):
                # Klinik kapatmış: hiç işleme, mevcut işaretlerine de dokunma.
                continue
            after_days = int(
                clinic_service.get_setting(db, clinic_id, "lapsed_after_days")
            )
            facts = _visits_by_phone(db, clinic_id, today)
            customers = db.scalars(
                select(Customer).where(Customer.clinic_id == clinic_id)
            ).all()

            for customer in customers:
                lapsed, days = _is_lapsed(
                    facts.get(customer.phone), today, after_days
                )
                if lapsed and customer.lapsed_alerted_at is None:
                    notifications_service.create(
                        db, clinic_id, notifications_service.LAPSED,
                        msg.notify_lapsed(customer.name or customer.phone, days),
                        ref=customer.phone,
                    )
                    customer.lapsed_alerted_at = now or datetime.now()
                    created += 1
                elif not lapsed and customer.lapsed_alerted_at is not None:
                    # Tek kural iki yönde: kayıp olmaktan çıkan kişinin işareti
                    # silinir, böylece ileride yeniden kaybolursa yine uyarılır.
                    customer.lapsed_alerted_at = None
            db.commit()

    if created:
        logger.info("Lapsed alerts created: %s", created)
    return created
```

- [ ] **Step 3: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app && .venv/bin/python -c "import app.jobs.lapsed; print('import ok')"
```

- [ ] **Step 4: Testleri yaz**

`tests/test_lapsed.py`:

```python
"""Lapsed customer alert: who gets one, who does not, and how often."""
from datetime import date, datetime, timedelta

from sqlalchemy import select

from app.core.database import SessionLocal
from app.customers.models import Customer
from app.jobs.lapsed import run_lapsed_check

NOW = datetime(2026, 8, 13, 10, 0)
TODAY = NOW.date()


def _book(client, clinic, auth, *, phone, days_ago=None, days_ahead=None,
          name="Ayşe Yılmaz", status_cancel=False):
    """Bir randevu yaz. days_ago geçmiş ziyaret, days_ahead yaklaşan randevu."""
    when = TODAY - timedelta(days=days_ago) if days_ago else TODAY + timedelta(days=days_ahead)
    slots = client.get("/api/settings", headers=auth(clinic)).json()["slot_times"]
    res = client.post(
        "/api/appointments",
        json={
            "phone": phone, "customer_name": name, "service_name": "Kontrol",
            "appt_date": when.isoformat(), "appt_time": slots[0],
            "staff_id": None, "notify": False,
        },
        headers=auth(clinic),
    )
    assert res.status_code == 201, res.text
    appt = res.json()["appointment"]
    if status_cancel:
        client.post(f"/api/appointments/{appt['id']}/cancel", headers=auth(clinic))
    return appt


def _ensure_customer(clinic_id: int, phone: str, name: str = "Ayşe Yılmaz"):
    """CRM listesi randevudan da üretiliyor ama iş customers tablosunu tarıyor."""
    with SessionLocal() as db:
        row = db.scalar(
            select(Customer).where(
                Customer.clinic_id == clinic_id, Customer.phone == phone
            )
        )
        if row is None:
            db.add(Customer(clinic_id=clinic_id, phone=phone, name=name))
            db.commit()


def _notes(client, clinic, auth):
    return [
        n for n in client.get("/api/notifications", headers=auth(clinic)).json()
        if n["kind"] == "lapsed"
    ]


def test_a_customer_who_stopped_coming_is_flagged(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110001", days_ago=200)
    _ensure_customer(clinic_a["clinic_id"], "905321110001")

    assert run_lapsed_check(NOW) == 1
    notes = _notes(client, clinic_a, auth)
    assert len(notes) == 1
    assert "200 gün önce" in notes[0]["message"]
    assert notes[0]["ref"] == "905321110001", "bildirim profile bağlanmalı"


def test_someone_with_a_booking_ahead_is_not_flagged(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110002", days_ago=200)
    _book(client, clinic_a, auth, phone="905321110002", days_ahead=5)
    _ensure_customer(clinic_a["clinic_id"], "905321110002")

    assert run_lapsed_check(NOW) == 0
    assert _notes(client, clinic_a, auth) == []


def test_someone_who_never_came_is_not_flagged(client, clinic_a, auth):
    """Hiç gelmemiş kişi bir aday; CRM'in işi."""
    _ensure_customer(clinic_a["clinic_id"], "905321110003", "Hiç Gelmemiş")

    assert run_lapsed_check(NOW) == 0
    assert _notes(client, clinic_a, auth) == []


def test_a_cancelled_visit_does_not_count(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110004", days_ago=200,
          status_cancel=True)
    _ensure_customer(clinic_a["clinic_id"], "905321110004")

    assert run_lapsed_check(NOW) == 0


def test_a_recent_visit_is_below_the_threshold(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110005", days_ago=30)
    _ensure_customer(clinic_a["clinic_id"], "905321110005")

    assert run_lapsed_check(NOW) == 0


def test_the_second_run_does_not_alert_again(client, clinic_a, auth):
    """5 dakikada bir koşuyor; önlem olmasa aynı isim sonsuz kez düşerdi."""
    _book(client, clinic_a, auth, phone="905321110006", days_ago=200)
    _ensure_customer(clinic_a["clinic_id"], "905321110006")

    assert run_lapsed_check(NOW) == 1
    assert run_lapsed_check(NOW) == 0
    assert len(_notes(client, clinic_a, auth)) == 1


def test_booking_again_clears_the_marker_and_allows_a_later_alert(
    client, clinic_a, auth
):
    phone = "905321110007"
    _book(client, clinic_a, auth, phone=phone, days_ago=200)
    _ensure_customer(clinic_a["clinic_id"], phone)
    assert run_lapsed_check(NOW) == 1

    # Danışan randevu aldı: artık kayıp değil, işaret temizlenmeli.
    _book(client, clinic_a, auth, phone=phone, days_ahead=3)
    assert run_lapsed_check(NOW) == 0
    with SessionLocal() as db:
        row = db.scalar(select(Customer).where(Customer.phone == phone))
        assert row.lapsed_alerted_at is None

    # Aylar sonra yine sessizleşirse yeniden uyarılır.
    later = NOW + timedelta(days=400)
    assert run_lapsed_check(later) == 1


def test_the_setting_switches_it_off(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110008", days_ago=200)
    _ensure_customer(clinic_a["clinic_id"], "905321110008")
    client.put("/api/settings", json={"ai_lapsed_alert": False},
               headers=auth(clinic_a))

    assert run_lapsed_check(NOW) == 0
    assert _notes(client, clinic_a, auth) == []


def test_the_threshold_is_configurable(client, clinic_a, auth):
    _book(client, clinic_a, auth, phone="905321110009", days_ago=45)
    _ensure_customer(clinic_a["clinic_id"], "905321110009")

    assert run_lapsed_check(NOW) == 0, "varsayılan 120 gün"
    client.put("/api/settings", json={"lapsed_after_days": 30},
               headers=auth(clinic_a))
    assert run_lapsed_check(NOW) == 1


def test_one_clinics_alert_does_not_reach_another(client, clinic_a, clinic_b, auth):
    _book(client, clinic_a, auth, phone="905321110010", days_ago=200)
    _ensure_customer(clinic_a["clinic_id"], "905321110010")

    run_lapsed_check(NOW)
    assert _notes(client, clinic_b, auth) == []
```

- [ ] **Step 5: Testleri çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest tests/test_lapsed.py -p no:cacheprovider 2>&1 | grep -iE "passed|failed|FAILED|assert" | tail -8
```

Beklenen: 10 test PASSED.

Randevu oluşturmak `customers` satırı yaratıyorsa `_ensure_customer` gereksiz
hâle gelir ama zararsızdır; yine de **kontrol et** ve gereksizse sil.

- [ ] **Step 6: Testin gerçekten koruduğunu kanıtla**

Bir test, kırılmayı yakalamıyorsa süs eşyasıdır. İşareti geçici olarak
basmayı bırak ve tekrar-uyarı testinin düştüğünü gör:

```bash
cd ~/Desktop/kisisel/w-lush
cp app/jobs/lapsed.py /tmp/lapsed-backup.py
python3 - <<'PY'
import pathlib
p = pathlib.Path("app/jobs/lapsed.py")
t = p.read_text()
t = t.replace("                    customer.lapsed_alerted_at = now or datetime.now()\n", "")
p.write_text(t)
print("işaret basma devre dışı")
PY
.venv/bin/pytest tests/test_lapsed.py::test_the_second_run_does_not_alert_again -p no:cacheprovider 2>&1 | grep -iE "passed|failed" | tail -2
```

Beklenen: **FAILED**. Geçerse koruma sahtedir — dur ve bildir.

Geri al:

```bash
cd ~/Desktop/kisisel/w-lush && cp /tmp/lapsed-backup.py app/jobs/lapsed.py && rm /tmp/lapsed-backup.py
.venv/bin/pytest tests/test_lapsed.py -p no:cacheprovider 2>&1 | grep -iE "passed|failed"
```

- [ ] **Step 7: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests
git add app/jobs/lapsed.py app/content/messages.py tests/test_lapsed.py
git commit -m "$(cat <<'EOF'
Alert the operator about customers who stopped coming

One rule runs in both directions: a lapsed customer with no marker gets an
alert, and a marked customer who is no longer lapsed has the marker cleared.
That single rule handles the reset too — booking again makes someone
"not lapsed", so the marker goes and a later disappearance alerts afresh.

Nothing is sent to the customer. Reaching out after months of silence needs
an approved template, so the decision stays with a human.
EOF
)"
```

---

### Task 3: Zamanlayıcıya bağla ve backend PR'ı

**Files:**
- Modify: `app/jobs/scheduler.py`

- [ ] **Step 1: İşi döngüye ekle**

`app/jobs/scheduler.py`:

```python
from app.jobs.lapsed import run_lapsed_check
from app.jobs.reminders import run_reminders
```

`main()` içindeki döngüyü şununla değiştir:

```python
    while True:
        try:
            asyncio.run(run_reminders())
        except Exception:
            logger.exception("Reminder cycle failed")
        try:
            # Ayrı try: kayıp taraması düşerse hatırlatmalar durmamalı, ve
            # tersi de geçerli.
            run_lapsed_check()
        except Exception:
            logger.exception("Lapsed check failed")
        time.sleep(INTERVAL_SECONDS)
```

Docstring'i de güncelle: artık yalnızca hatırlatma koşmuyor.

- [ ] **Step 2: Kapılar ve tüm takım**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests && .venv/bin/python -c "import app.jobs.scheduler; print('import ok')"
.venv/bin/pytest -p no:cacheprovider 2>&1 | grep -iE "passed|failed"
```

Beklenen: `import ok` ve tüm testler geçer (110 civarı).

- [ ] **Step 3: Commit, PR, merge**

```bash
cd ~/Desktop/kisisel/w-lush
git add app/jobs/scheduler.py
git commit -m "$(cat <<'EOF'
Run the lapsed check on the scheduler

Each job gets its own try block: a failing lapsed scan must not stop
reminders from going out, and the reverse.
EOF
)"
git push -u origin feature/kayip-danisan
gh pr create --base main --head feature/kayip-danisan \
  --title "Alert the operator about customers who stopped coming" \
  --body "$(cat <<'EOF'
Sistem ekranındaki `ai_lapsed_alert` ayarı saklanıyordu ama hiçbir şey
okumuyordu; panel onu "Yakında" diye işaretliyordu. Bu, o ayarın arkasını
dolduruyor.

## Kim kayıp sayılır
Üç şart birlikte: en az bir geçmiş ziyaret (iptal edilmemiş), son ziyaretten
`lapsed_after_days` gün geçmiş, ve yaklaşan randevu yok. Hiç gelmemiş biri
kayıp sayılmaz — o bir aday, CRM'in işi.

## Tekrar nasıl önleniyor
`customers.lapsed_alerted_at` işareti. **Tek kural iki yönde çalışıyor:**
kayıp olup işareti boş olan uyarı alır; işareti dolu ama artık kayıp olmayanın
işareti silinir. İkinci kural sıfırlamayı tek başına hallediyor — danışan
randevu aldığı anda "kayıp" olmaktan çıkıyor, işaret gidiyor, ileride yine
sessizleşirse yeniden uyarılıyor. Ayrı bir "geri geldi mi" kontrolü yok.

## Müşteriye hiçbir şey gitmiyor
Aylarca sessiz kalmış birine ulaşmak onaylı şablon gerektirir; 24 saat dışında
serbest metin göndermek numaranın kapanmasına yol açar. Karar operatörde.

## Bildirimin hedefi
`notifications.ref` sütunu eklendi; bu bildirimde danışanın telefonunu
taşıyor, panel de doğrudan profile gidebiliyor. Mevcut türler değişmedi,
`ref`'leri boş.

## Doğrulama
10 yeni test: eşiği geçen uyarı alır, yaklaşan randevusu olan almaz, hiç
gelmemiş almaz, iptal ziyaret sayılmaz, eşik altındaki almaz, **ikinci turda
tekrar üretilmez**, randevu alınca işaret temizlenir ve sonra yeniden uyarılır,
ayar kapalıyken hiçbir şey olmaz, eşik ayarlanabilir, başka kliniğe sızmaz.

Testin süs olmadığı sabotajla doğrulandı: işaret basma devre dışı bırakıldı,
tekrar-uyarı testi düştü; geri alındı, hepsi yeşil.
EOF
)"
```

CI yeşil olunca:

```bash
gh pr merge --squash --delete-branch
git checkout main && git pull && .venv/bin/alembic upgrade head
```

---

### Task 4: Panel

**Files:**
- Modify: `src/api/notifications.ts`, `src/components/NotificationBell.tsx`, `src/components/sistem/AiSection.tsx`

**Interfaces:**
- Consumes: `NotificationOut.ref`, `lapsed` türü, `lapsed_after_days` ayarı.

- [ ] **Step 1: Dalı aç ve tipi genişlet**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/kayip-danisan-bildirimi
```

`src/api/notifications.ts` içindeki bildirim arayüzüne:

```ts
  /** Bildirimin işaret ettiği kayıt (danışan telefonu). Boş olabilir. */
  ref: string | null;
```

`NotificationKind` birleşimi varsa `'lapsed'` ekle.

- [ ] **Step 2: Etiketi ve hedefi bağla**

`src/components/NotificationBell.tsx` içindeki `KIND_LABELS`'a:

```ts
  lapsed: 'Kayıp danışan',
```

`openItem` sonundaki yönlendirmeyi değiştir:

```ts
    setOpen(false);
    // Hedefi olan bildirim oraya gider; olmayan eskisi gibi takvime düşer.
    navigate(note.ref ? `/danisan/${encodeURIComponent(note.ref)}` : '/randevu');
```

- [ ] **Step 3: Eşiği Sistem'e ekle**

`src/components/sistem/AiSection.tsx` içindeki `FLAGS` dizisinde
`ai_lapsed_alert` satırının `live` değerini `true` yap — artık gerçekten
çalışıyor.

Aynı dosyaya eşik alanı ekle: `flags` yanına bir sayı durumu tut,
`getSettings()` içinde `lapsed_after_days`'i oku, `updateSettings` içinde
gönder, ve ilgili satırın altında göster:

```tsx
          {f.key === 'ai_lapsed_alert' && flags[f.key] && (
            <label style={{ fontSize: 11, color: 'var(--ink-60)', display: 'block', marginTop: 8 }}>
              Kaç gün sonra
              <input
                type="number"
                min={7}
                value={lapsedDays}
                onChange={(e) => setLapsedDays(Number(e.target.value))}
                style={{
                  width: 90, marginLeft: 8, border: '1px solid var(--line-strong)',
                  borderRadius: 8, padding: '6px 8px', font: 'inherit', fontSize: 13,
                  background: 'var(--cream)',
                }}
              />
            </label>
          )}
```

Alan yalnızca anahtar açıkken görünür: kapalıyken eşiği sormanın anlamı yok.

- [ ] **Step 4: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm test 2>&1 | grep Tests && npm run build > /dev/null && echo "kapılar 0"
```

- [ ] **Step 5: Uçtan uca doğrula**

Backend'i yeniden başlat, sonra gerçek bir uyarı üret ve panelin göreceğini
kontrol et:

```bash
pkill -f "uvicorn app.main"; sleep 2
(cd ~/Desktop/kisisel/w-lush && .venv/bin/uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &); sleep 6
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main  # noqa: F401
from app.jobs.lapsed import run_lapsed_check
print("üretilen uyarı:", run_lapsed_check())
PY
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:8000"
def call(path, body=None, method="GET", token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    with urllib.request.urlopen(r) as resp:
        raw = resp.read().decode()
        return json.loads(raw) if raw else None
tok = call("/api/auth/login", {"email":"smoke2@example.com","password":"Test12345!"}, "POST")["token"]["access_token"]
notes = [n for n in call("/api/notifications", token=tok) if n["kind"] == "lapsed"]
print(f"{len(notes)} kayıp danışan bildirimi:")
for n in notes[:5]:
    print(f"  {n['message']}  → /danisan/{n['ref']}")
PY
```

Tohum veride kimse eşiği geçmiyorsa uyarı çıkmayabilir; o durumda eşiği
geçici olarak düşür (`lapsed_after_days: 5`), tekrar koş, gördükten sonra
120'ye geri al. **Bıraktığın veriyi geri al.**

- [ ] **Step 6: Commit ve PR**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add -A
git commit -m "$(cat <<'EOF'
Show lapsed-customer alerts and let the clinic set the threshold

Notifications now navigate by their ref: the lapsed alert opens the customer
profile, everything else keeps going to the calendar.

The threshold field only appears while the switch is on — asking how many
days when the feature is off answers a question nobody asked.
EOF
)"
git push -u origin feature/kayip-danisan-bildirimi
gh pr create --base main --head feature/kayip-danisan-bildirimi \
  --title "Show lapsed-customer alerts in the panel" \
  --body "$(cat <<'EOF'
Backend tarafı: selamet/w-lush#<NUMARA> (merge edildi).

- Zil listesinde yeni tür: **"Kayıp danışan"**.
- Bildirim artık `ref` alanına göre yönleniyor: kayıp uyarısı danışan
  profilini açıyor, diğer türler eskisi gibi takvime gidiyor.
- Sistem'deki AI bölümünde `ai_lapsed_alert` **"Yakında" rozetini kaybetti** —
  artık gerçekten çalışıyor — ve yanına gün eşiği alanı geldi. Alan yalnızca
  anahtar açıkken görünüyor.

## Doğrulama
- `typecheck`, `test`, `build` — 0.
- İş elle koşturulup üretilen bildirimin metni ve `ref` hedefi API'den
  okundu.
- **Tarayıcıda açılmadı** — Chrome eklentisi bağlı değil.
EOF
)"
```

`<NUMARA>` yerine Task 3'te açılan PR'ın numarasını yaz.

---

## Bu planın kapsamadıkları

- Diğer üç AI ayarı (`ai_draft_replies`, `ai_upsell`, `ai_auto_reminder`).
- Kayıp danışana otomatik mesaj gönderme.
- Mevcut bildirim türlerinin `ref` ile bağlanması — alan hazır, doldurmak
  ayrı iş.
