# Test Altyapısı — Uygulama Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bu oturumda elle doğrulanan kritik davranışları kalıcı testlere çevirmek ve CI'da koşturmak.

**Architecture:** Backend'de `pytest` + FastAPI `TestClient`; test veritabanı geçici bir dosya ve **`DATABASE_URL` ortam değişkeni `app` import edilmeden önce** ayarlanıyor (aşağıda nedeni). Frontend'de `vitest`, yalnızca saf fonksiyonlar için. İkisi de mevcut CI'ya bağlanıyor.

**Tech Stack:** pytest, FastAPI TestClient (httpx zaten bağımlılık), vitest.

## Global Constraints

- İki repo: backend `~/Desktop/kisisel/w-lush`, frontend `~/Desktop/kisisel/w-lush-web`.
- **Backend commit mesajlarında Claude atfı yasak** — `.githooks/commit-msg` yerelde, CI'daki `commit-lint` işi uzakta reddeder. Frontend'de trailer serbest.
- Testler **geliştirme veritabanına dokunmaz**. `w_lush.db` testten sonra bit bit aynı kalmalı; bu, planın kendi doğrulama adımı.
- Testler ağa çıkmaz. WhatsApp ve Anthropic çağrıları ya kimlik bilgisi yokluğundan başarısız olur ya da monkeypatch ile değiştirilir.
- Yeni test bağımlılıkları `requirements-dev.txt`'e; `requirements.txt` üretim listesi olarak kalır.
- Test adları ve mesajları İngilizce (koddaki yorum diliyle tutarlı); kullanıcıya görünen metinler yine Türkçe.

## Neden `DATABASE_URL` ortam değişkeni, `dependency_overrides` değil

Alışılmış yöntem `app.dependency_overrides[get_db]`'dir. **Burada yetmez:**
`app/whatsapp/flow.py` bot akışında `with SessionLocal() as db:` diyerek
oturumu doğrudan açıyor, `get_db`'den geçmiyor. Yalnızca bağımlılığı
değiştirirsek bot akışını sınayan her test geliştirme veritabanına yazar.

`DATABASE_URL`'i `app` import edilmeden ayarlamak ikisini birden çözer:
`app/core/database.py` modül seviyesinde `create_engine(settings.database_url)`
çağırıyor, yani import anında hangi veritabanına bağlanacağı belirleniyor.
`pytest` `conftest.py`'yi test modüllerinden önce import ettiği için oraya
konan `os.environ` ataması zamanında yetişir.

`.env` dosyasında `DATABASE_URL` tanımlı; pydantic-settings'te **ortam
değişkeni `.env`'i ezer**, o yüzden bu yöntem çalışır.

## Dosya yapısı

**Backend (dal: `feature/pytest-altyapisi`)**

| Dosya | Sorumluluk |
|---|---|
| `requirements-dev.txt` (yeni) | pytest ve eklentileri |
| `pyproject.toml` | `[tool.pytest.ini_options]` — testpaths, ruff ayarları zaten burada |
| `tests/conftest.py` (yeni) | Test veritabanı, TestClient, klinik/token fixture'ları |
| `tests/test_auth.py` (yeni) | Giriş, koruma, yönetici yetkisi, hız sınırı |
| `tests/test_tenant_isolation.py` (yeni) | Klinikler birbirinin verisine ulaşamaz |
| `tests/test_appointments.py` (yeni) | Kapasite kuralı, slot doğrulaması, atama çakışması |
| `tests/test_conversations.py` (yeni) | Konuşma sahipliği |
| `tests/test_schema.py` (yeni) | Migration ile modellerin uyuşması |
| `.github/workflows/ci.yml` | `test` işi |

**Frontend (dal: `feature/vitest-altyapisi`)**

| Dosya | Sorumluluk |
|---|---|
| `package.json` | `vitest` devDependency + `test` script |
| `src/utils/dashboard.test.ts` (yeni) | Doluluk, eğilim eşiği, günlük gruplama, tarih aralıkları |
| `src/utils/calendar.test.ts` (yeni) | `gridRows`, hafta başı, ISO gün |
| `.github/workflows/ci.yml` (yeni) | typecheck + build + test |

---

### Task 1: pytest iskeleti

**Files:**
- Create: `requirements-dev.txt`, `tests/conftest.py`, `tests/test_smoke.py`
- Modify: `pyproject.toml`

**Interfaces:**
- Consumes: yok.
- Produces: `client` (TestClient), `clinic_a` / `clinic_b` (`dict` — `{"token": str, "clinic_id": int, "email": str}`), `auth(token)` (header sözlüğü üreten yardımcı) fixture'ları.

- [ ] **Step 1: Dalı aç**

```bash
cd ~/Desktop/kisisel/w-lush
git checkout main && git pull
git checkout -b feature/pytest-altyapisi
```

- [ ] **Step 2: Geliştirme veritabanının parmak izini al**

Planın sonunda "testler dev veritabanına dokunmadı" iddiasını kanıtlamak için:

```bash
cd ~/Desktop/kisisel/w-lush && shasum -a 256 w_lush.db | tee /tmp/devdb-before.txt
```

- [ ] **Step 3: Test bağımlılıkları**

`requirements-dev.txt`:

```
# Test-only dependencies. Production installs requirements.txt alone.
pytest==8.3.4
```

Kurulum:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pip install -r requirements-dev.txt 2>&1 | tail -3
.venv/bin/pytest --version
```

Beklenen: `pytest 8.3.4`.

- [ ] **Step 4: pytest yapılandırması**

`pyproject.toml` sonuna ekle:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-q"
```

- [ ] **Step 5: `tests/conftest.py`'yi yaz**

```python
"""Test fixtures.

The database is chosen by an environment variable set *before* `app` is
imported. dependency_overrides alone would not be enough: the bot flow in
app/whatsapp/flow.py opens sessions with `SessionLocal()` directly, so a test
that exercises it would otherwise write to the developer's database.
"""
import os
import tempfile
import uuid
from pathlib import Path

import pytest

_TMP_DB = Path(tempfile.gettempdir()) / f"wlush-test-{uuid.uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
# Meta and Anthropic must stay unreachable: an accidental real call would be
# slow, flaky and could message a real person.
os.environ["WHATSAPP_ACCESS_TOKEN"] = ""
os.environ["WHATSAPP_APP_SECRET"] = ""
os.environ["ANTHROPIC_API_KEY"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.core.database import Base, engine  # noqa: E402
from app.core.ratelimit import limiter  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _schema():
    """One schema for the whole run; each test gets fresh clinics instead.

    Clinics are cheap and fully isolated by clinic_id, so per-test signup is
    both faster and closer to production than dropping tables.
    """
    Base.metadata.create_all(engine)
    yield
    engine.dispose()
    _TMP_DB.unlink(missing_ok=True)


@pytest.fixture(autouse=True)
def _no_rate_limit():
    """Rate limits are a feature, not a test obstacle — one test re-enables it."""
    limiter.enabled = False
    yield
    limiter.enabled = False


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def _signup(client, name: str) -> dict:
    email = f"{uuid.uuid4().hex[:12]}@example.com"
    res = client.post(
        "/api/auth/signup",
        json={"email": email, "password": "Test12345!", "clinic_name": name},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    return {
        "token": body["token"]["access_token"],
        "clinic_id": body["user"]["clinic"]["id"],
        "email": email,
        "password": "Test12345!",
    }


@pytest.fixture
def clinic_a(client) -> dict:
    return _signup(client, "A Kliniği")


@pytest.fixture
def clinic_b(client) -> dict:
    """A second tenant. Every isolation test needs one."""
    return _signup(client, "B Kliniği")


@pytest.fixture
def auth():
    def _headers(clinic: dict) -> dict:
        return {"Authorization": f"Bearer {clinic['token']}"}
    return _headers
```

- [ ] **Step 6: `tests/test_smoke.py`'yi yaz**

```python
"""The scaffolding itself: does a fresh clinic come up seeded and isolated."""


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_signup_seeds_the_clinic(client, clinic_a, auth):
    """A new clinic is usable immediately — the panel must never open empty."""
    services = client.get("/api/services", headers=auth(clinic_a))
    assert services.status_code == 200
    assert len(services.json()) > 0, "signup should seed demo services"

    settings = client.get("/api/settings", headers=auth(clinic_a)).json()
    assert settings["slot_times"], "signup should seed working hours"
    assert settings["open_days"]


def test_two_clinics_get_different_ids(clinic_a, clinic_b):
    assert clinic_a["clinic_id"] != clinic_b["clinic_id"]


def test_endpoints_require_a_token(client):
    for path in ("/api/services", "/api/appointments", "/api/customers"):
        assert client.get(path).status_code == 401, path
```

- [ ] **Step 7: Testleri çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest tests/test_smoke.py -v 2>&1 | tail -15
```

Beklenen: 4 test PASSED.

Hata `sqlite3.OperationalError: no such table` ise `_schema` fixture'ı `app` importundan sonra çalışmıyordur — `conftest.py`'deki import sırasını kontrol et.

- [ ] **Step 8: Geliştirme veritabanının değişmediğini kanıtla**

```bash
cd ~/Desktop/kisisel/w-lush && shasum -a 256 w_lush.db | tee /tmp/devdb-after.txt
diff /tmp/devdb-before.txt /tmp/devdb-after.txt && echo "DEV VERİTABANI DOKUNULMADI" || echo "!!! TESTLER DEV VERİTABANINA YAZDI — DUR"
```

Beklenen: `DEV VERİTABANI DOKUNULMADI`. Aksi hâlde bu adımda **dur ve bildir**; `DATABASE_URL` zamanında yetişmiyor demektir.

- [ ] **Step 9: Kapılar ve commit**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests && .venv/bin/python -c "import app.main; print('import ok')"
git add requirements-dev.txt pyproject.toml tests/
git commit -m "$(cat <<'EOF'
Add pytest scaffolding

The database is chosen by an environment variable set before `app` is
imported rather than by dependency_overrides. The bot flow opens sessions
with SessionLocal() directly, so overriding get_db alone would let a test
write into the developer's database.

Clinics are created per test through the real signup endpoint: they are
cheap, fully isolated by clinic_id, and that path is itself worth exercising.
EOF
)"
```

---

### Task 2: Kimlik ve kiracı yalıtımı testleri

**Files:**
- Create: `tests/test_auth.py`, `tests/test_tenant_isolation.py`

**Interfaces:**
- Consumes: Task 1'in `client`, `clinic_a`, `clinic_b`, `auth` fixture'ları.
- Produces: yok (yaprak testler).

- [ ] **Step 1: `tests/test_auth.py`'yi yaz**

```python
"""Login, protection and the admin boundary."""
import pytest

from app.core.ratelimit import limiter


def test_login_returns_a_working_token(client, clinic_a):
    res = client.post(
        "/api/auth/login",
        json={"email": clinic_a["email"], "password": clinic_a["password"]},
    )
    assert res.status_code == 200
    token = res.json()["token"]["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["clinic"]["id"] == clinic_a["clinic_id"]


def test_wrong_password_is_rejected(client, clinic_a):
    res = client.post(
        "/api/auth/login",
        json={"email": clinic_a["email"], "password": "yanlis-parola"},
    )
    assert res.status_code == 401


def test_a_garbage_token_is_rejected(client):
    res = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-token"})
    assert res.status_code == 401


def test_a_fresh_clinic_is_not_an_admin(client, clinic_a, auth):
    """Signup must not hand out platform-wide powers."""
    assert client.get("/api/admin/clinics", headers=auth(clinic_a)).status_code == 403


@pytest.mark.parametrize("path", [
    "/api/services", "/api/packages", "/api/settings", "/api/appointments",
    "/api/requests", "/api/staff", "/api/customers", "/api/conversations",
    "/api/payments", "/api/payments/summary", "/api/expenses",
    "/api/expenses/summary", "/api/expense-categories", "/api/reports",
    "/api/notifications", "/api/notifications/unread-count",
    "/api/whatsapp/connection", "/api/auth/me",
])
def test_every_panel_endpoint_needs_a_token(client, path):
    assert client.get(path).status_code == 401, path


def test_login_is_rate_limited(client, clinic_a):
    """The one test that wants the limiter on; the fixture disables it."""
    limiter.enabled = True
    try:
        codes = [
            client.post(
                "/api/auth/login",
                json={"email": clinic_a["email"], "password": "yanlis"},
            ).status_code
            for _ in range(8)
        ]
    finally:
        limiter.enabled = False
    assert 429 in codes, f"brute force was never throttled: {codes}"
```

- [ ] **Step 2: `tests/test_tenant_isolation.py`'yi yaz**

Bu oturumda elle koştuğum saldırıların kalıcı hâli.

```python
"""One clinic must never reach another's data.

Every case here was run by hand during the API audit; this file is what keeps
them true.
"""


def _seed_appointment(client, clinic, auth, time="10:00"):
    slots = client.get("/api/settings", headers=auth(clinic)).json()["slot_times"]
    res = client.post(
        "/api/appointments",
        json={
            "phone": "905321110001", "customer_name": "A'nın Danışanı",
            "service_name": "Konsültasyon", "appt_date": "2026-09-01",
            "appt_time": time or slots[0], "staff_id": None, "notify": False,
        },
        headers=auth(clinic),
    )
    assert res.status_code == 201, res.text
    return res.json()["appointment"]


def test_lists_do_not_bleed(client, clinic_a, clinic_b, auth):
    _seed_appointment(client, clinic_a, auth)
    for path in ("/api/appointments", "/api/customers", "/api/payments",
                 "/api/expenses", "/api/staff", "/api/conversations"):
        assert client.get(path, headers=auth(clinic_b)).json() == [], path


def test_b_cannot_touch_a_s_appointment(client, clinic_a, clinic_b, auth):
    appt = _seed_appointment(client, clinic_a, auth)
    aid = appt["id"]
    hb = auth(clinic_b)
    assert client.post(f"/api/appointments/{aid}/confirm", headers=hb).status_code == 404
    assert client.post(f"/api/appointments/{aid}/cancel", headers=hb).status_code == 404
    assert client.put(
        f"/api/appointments/{aid}/staff", json={"staff_id": None}, headers=hb
    ).status_code == 404


def test_b_cannot_delete_a_s_service(client, clinic_a, clinic_b, auth):
    svc = client.get("/api/services", headers=auth(clinic_a)).json()[0]
    assert client.delete(
        f"/api/services/{svc['id']}", headers=auth(clinic_b)
    ).status_code == 404
    # And A still has it.
    still = client.get("/api/services", headers=auth(clinic_a)).json()
    assert any(s["id"] == svc["id"] for s in still)


def test_b_cannot_read_a_s_customer(client, clinic_a, clinic_b, auth):
    _seed_appointment(client, clinic_a, auth)
    customers = client.get("/api/customers", headers=auth(clinic_a)).json()
    assert customers, "the appointment should have produced a customer row"
    phone = customers[0]["phone"]
    assert client.get(
        f"/api/customers/{phone}", headers=auth(clinic_b)
    ).status_code == 404


def test_cancelling_in_a_does_not_change_b(client, clinic_a, clinic_b, auth):
    appt = _seed_appointment(client, clinic_a, auth)
    client.post(f"/api/appointments/{appt['id']}/cancel", headers=auth(clinic_a))
    assert client.get("/api/appointments", headers=auth(clinic_b)).json() == []
```

- [ ] **Step 3: Çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest tests/test_auth.py tests/test_tenant_isolation.py -v 2>&1 | tail -30
```

Beklenen: hepsi PASSED. `test_login_is_rate_limited` bazen bir sonraki testi de sınırlayabilir; ardından gelen testler 429 alırsa fixture'daki `limiter.enabled = False` geri almasının çalıştığını kontrol et.

`_seed_appointment` 201 yerine 422 dönerse: kliniğin `slot_times`'ında "10:00" yoktur — `time=None` geçip tohum listenin ilkini kullan.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests
git add tests/test_auth.py tests/test_tenant_isolation.py
git commit -m "$(cat <<'EOF'
Pin down authentication and tenant isolation

Every case here was run by hand during the API audit and then thrown away.
Isolation is the one property whose failure is silent and unrecoverable, so
it is the first thing that deserves a permanent test.
EOF
)"
```

---

### Task 3: Randevu kapasitesi testleri

**Files:**
- Create: `tests/test_appointments.py`

**Interfaces:**
- Consumes: Task 1 fixture'ları.
- Produces: yok.

- [ ] **Step 1: Dosyayı yaz**

```python
"""Capacity, slot validation and staff assignment.

The rule under test: one active appointment per clinic/date/time/staff, with
unassigned rows folded to a single virtual person by coalesce(staff_id, 0).
"""
import pytest


@pytest.fixture
def slots(client, clinic_a, auth):
    return client.get("/api/settings", headers=auth(clinic_a)).json()["slot_times"]


def _staff(client, clinic, auth, name):
    res = client.post(
        "/api/staff",
        json={"name": name, "role": "Uzman", "active": True, "sort_order": 0},
        headers=auth(clinic),
    )
    assert res.status_code == 201, res.text
    return res.json()


def _book(client, clinic, auth, slots, *, staff_id=None, phone="905550001111",
          time=None, date="2026-09-02"):
    return client.post(
        "/api/appointments",
        json={
            "phone": phone, "customer_name": "Test", "service_name": "Konsültasyon",
            "appt_date": date, "appt_time": time or slots[0],
            "staff_id": staff_id, "notify": False,
        },
        headers=auth(clinic),
    )


def test_a_panel_booking_is_born_confirmed(client, clinic_a, auth, slots):
    """The operator typed it in; there is nothing left to approve."""
    res = _book(client, clinic_a, auth, slots)
    assert res.status_code == 201
    assert res.json()["appointment"]["status"] == "confirmed"


def test_the_same_slot_twice_is_refused(client, clinic_a, auth, slots):
    person = _staff(client, clinic_a, auth, "Ebru")
    assert _book(client, clinic_a, auth, slots, staff_id=person["id"]).status_code == 201
    second = _book(client, clinic_a, auth, slots, staff_id=person["id"],
                   phone="905550002222")
    assert second.status_code == 409


def test_two_staff_can_work_the_same_hour(client, clinic_a, auth, slots):
    """The whole point of moving capacity from the clinic to the person."""
    one = _staff(client, clinic_a, auth, "Ebru")
    two = _staff(client, clinic_a, auth, "Selin")
    assert _book(client, clinic_a, auth, slots, staff_id=one["id"]).status_code == 201
    assert _book(client, clinic_a, auth, slots, staff_id=two["id"],
                 phone="905550002222").status_code == 201


def test_unassigned_is_one_virtual_person(client, clinic_a, auth, slots):
    """coalesce(staff_id, 0): without it NULLs stop colliding and the bot
    loses its double-booking guard entirely."""
    assert _book(client, clinic_a, auth, slots).status_code == 201
    assert _book(client, clinic_a, auth, slots, phone="905550002222").status_code == 409


def test_unassigned_does_not_block_a_named_person(client, clinic_a, auth, slots):
    person = _staff(client, clinic_a, auth, "Ebru")
    assert _book(client, clinic_a, auth, slots).status_code == 201
    assert _book(client, clinic_a, auth, slots, staff_id=person["id"],
                 phone="905550002222").status_code == 201


def test_a_cancelled_slot_frees_up(client, clinic_a, auth, slots):
    first = _book(client, clinic_a, auth, slots)
    appt_id = first.json()["appointment"]["id"]
    client.post(f"/api/appointments/{appt_id}/cancel", headers=auth(clinic_a))
    assert _book(client, clinic_a, auth, slots, phone="905550002222").status_code == 201


def test_a_time_outside_working_hours_is_refused(client, clinic_a, auth, slots):
    """Stored, such a row would exist but never appear on the grid."""
    res = _book(client, clinic_a, auth, slots, time="03:17")
    assert res.status_code == 422


def test_an_unknown_staff_member_is_refused(client, clinic_a, auth, slots):
    assert _book(client, clinic_a, auth, slots, staff_id=999_999).status_code == 404


def test_an_inactive_staff_member_is_refused(client, clinic_a, auth, slots):
    person = _staff(client, clinic_a, auth, "Pasif")
    client.put(
        f"/api/staff/{person['id']}",
        json={"name": "Pasif", "role": "Uzman", "active": False, "sort_order": 0},
        headers=auth(clinic_a),
    )
    assert _book(client, clinic_a, auth, slots, staff_id=person["id"]).status_code == 422


def test_assigning_a_busy_person_is_refused(client, clinic_a, auth, slots):
    person = _staff(client, clinic_a, auth, "Ebru")
    _book(client, clinic_a, auth, slots, staff_id=person["id"])
    unassigned = _book(client, clinic_a, auth, slots, phone="905550002222")
    appt_id = unassigned.json()["appointment"]["id"]
    res = client.put(
        f"/api/appointments/{appt_id}/staff",
        json={"staff_id": person["id"]},
        headers=auth(clinic_a),
    )
    assert res.status_code == 409


def test_reassigning_to_the_same_person_is_not_a_conflict(client, clinic_a, auth, slots):
    """A row must not collide with itself."""
    person = _staff(client, clinic_a, auth, "Ebru")
    booked = _book(client, clinic_a, auth, slots, staff_id=person["id"])
    appt_id = booked.json()["appointment"]["id"]
    res = client.put(
        f"/api/appointments/{appt_id}/staff",
        json={"staff_id": person["id"]},
        headers=auth(clinic_a),
    )
    assert res.status_code == 200


def test_a_date_range_narrows_and_orders(client, clinic_a, auth, slots):
    """The calendar reads a window chronologically; the list reads everything."""
    _book(client, clinic_a, auth, slots, date="2026-09-10", time=slots[1])
    _book(client, clinic_a, auth, slots, date="2026-09-09", phone="905550002222")

    windowed = client.get(
        "/api/appointments?start=2026-09-09&end=2026-09-09", headers=auth(clinic_a)
    ).json()
    assert [a["appt_date"] for a in windowed] == ["2026-09-09"]

    week = client.get(
        "/api/appointments?start=2026-09-01&end=2026-09-30", headers=auth(clinic_a)
    ).json()
    dates = [a["appt_date"] for a in week]
    assert dates == sorted(dates), "a range must come back chronologically"
```

- [ ] **Step 2: Çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest tests/test_appointments.py -v 2>&1 | tail -25
```

Beklenen: 12 test PASSED.

`test_a_panel_booking_is_born_confirmed` 502 verirse `notify: False` gönderilmiyordur; gövdeyi kontrol et.

- [ ] **Step 3: Testin gerçekten koruduğunu kanıtla**

Bir test, kırılmayı yakalamıyorsa süs eşyasıdır. Kapasite index'ini geçici olarak zayıflat ve testin düştüğünü gör:

```bash
cd ~/Desktop/kisisel/w-lush
cp app/clinic/models.py /tmp/models-backup.py
python3 - <<'PY'
import pathlib
p = pathlib.Path("app/clinic/models.py")
t = p.read_text()
t = t.replace('text("coalesce(staff_id, 0)"),', '"staff_id",')
p.write_text(t)
print("index geçici olarak coalesce'suz hâle getirildi")
PY
.venv/bin/pytest tests/test_appointments.py::test_unassigned_is_one_virtual_person 2>&1 | tail -5
```

Beklenen: **FAILED**. Test geçerse koruma sahtedir — dur ve bildir.

Geri al:

```bash
cd ~/Desktop/kisisel/w-lush && cp /tmp/models-backup.py app/clinic/models.py && rm /tmp/models-backup.py
.venv/bin/pytest tests/test_appointments.py -q 2>&1 | tail -3
```

Beklenen: hepsi tekrar PASSED.

- [ ] **Step 4: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests
git add tests/test_appointments.py
git commit -m "$(cat <<'EOF'
Pin down appointment capacity

The coalesce(staff_id, 0) case is the one worth guarding: weaken the index to
a plain column and test_unassigned_is_one_virtual_person fails, which is how
the test was checked to be more than decoration.
EOF
)"
```

---

### Task 4: Konuşma sahipliği testleri

**Files:**
- Create: `tests/test_conversations.py`

**Interfaces:**
- Consumes: Task 1 fixture'ları; `app.conversations.service.record`.
- Produces: yok.

- [ ] **Step 1: Dosyayı yaz**

Konuşmalar yalnızca gelen mesajla oluşur; bot akışını çağırmak yerine mesajı
doğrudan kaydediyoruz — sınanan şey uçların sahiplik davranışı, botun değil.

```python
"""Conversation endpoints must refuse numbers the clinic never talked to.

Reading was always clinic-scoped; sending was not. With real Meta credentials
a clinic could have pushed free text to strangers through its own number,
which is what gets a number banned.
"""
from app.conversations import service as conv_service
from app.core.database import SessionLocal

PHONE = "905321119999"


def _incoming(clinic_id: int, phone: str = PHONE, body: str = "Merhaba"):
    """Put a real inbound message in the thread, as the webhook would."""
    with SessionLocal() as db:
        conv_service.record(db, clinic_id, phone, "in", body)


def test_the_inbox_shows_our_own_thread(client, clinic_a, auth):
    _incoming(clinic_a["clinic_id"])
    rows = client.get("/api/conversations", headers=auth(clinic_a)).json()
    assert [r["phone"] for r in rows] == [PHONE]
    assert rows[0]["waiting"] is True, "the customer spoke last"


def test_our_own_thread_is_readable(client, clinic_a, auth):
    _incoming(clinic_a["clinic_id"])
    res = client.get(f"/api/conversations/{PHONE}", headers=auth(clinic_a))
    assert res.status_code == 200
    assert [m["body"] for m in res.json()] == ["Merhaba"]


def test_another_clinics_thread_is_not_readable(client, clinic_a, clinic_b, auth):
    _incoming(clinic_a["clinic_id"])
    assert client.get(
        f"/api/conversations/{PHONE}", headers=auth(clinic_b)
    ).status_code == 404


def test_replying_to_a_stranger_is_refused(client, clinic_a, auth):
    """No thread, no reply — this is the one that stops outbound spam."""
    res = client.post(
        "/api/conversations/905559998877/reply",
        json={"message": "merhaba"},
        headers=auth(clinic_a),
    )
    assert res.status_code == 404


def test_replying_into_another_clinics_thread_is_refused(
    client, clinic_a, clinic_b, auth
):
    _incoming(clinic_a["clinic_id"])
    res = client.post(
        f"/api/conversations/{PHONE}/reply",
        json={"message": "merhaba"},
        headers=auth(clinic_b),
    )
    assert res.status_code == 404


def test_releasing_a_stranger_is_refused(client, clinic_a, auth):
    res = client.post(
        "/api/conversations/905559998877/release", headers=auth(clinic_a)
    )
    assert res.status_code == 404


def test_releasing_our_own_thread_works(client, clinic_a, auth):
    _incoming(clinic_a["clinic_id"])
    res = client.post(f"/api/conversations/{PHONE}/release", headers=auth(clinic_a))
    assert res.status_code == 200
    assert res.json()["status"] == "released"


def test_an_empty_reply_is_refused(client, clinic_a, auth):
    """Whitespace is not a message."""
    _incoming(clinic_a["clinic_id"])
    res = client.post(
        f"/api/conversations/{PHONE}/reply",
        json={"message": "   "},
        headers=auth(clinic_a),
    )
    assert res.status_code == 422


def test_a_reply_we_own_gets_past_ownership(client, clinic_a, auth):
    """Ownership passes, so the failure that follows comes from Meta, not us.

    Credentials are empty in tests, so the send raises and the endpoint maps
    it to 502 — which is exactly the proof that ownership let it through.
    """
    _incoming(clinic_a["clinic_id"])
    res = client.post(
        f"/api/conversations/{PHONE}/reply",
        json={"message": "merhaba"},
        headers=auth(clinic_a),
    )
    assert res.status_code == 502, res.text
```

- [ ] **Step 2: Çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest tests/test_conversations.py -v 2>&1 | tail -20
```

Beklenen: 9 test PASSED.

Son test 502 yerine 200 dönerse gerçekten mesaj gitmiş demektir — **dur ve bildir**, `conftest.py`'deki `WHATSAPP_ACCESS_TOKEN=""` çalışmıyordur.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests
git add tests/test_conversations.py
git commit -m "$(cat <<'EOF'
Pin down conversation ownership

The fix that closed outbound messaging to arbitrary numbers had no test; it
was verified once by hand and by reading the code. These make it permanent.
EOF
)"
```

---

### Task 5: Şema kayması testi

**Files:**
- Create: `tests/test_schema.py`

**Interfaces:**
- Consumes: `alembic`, `app.core.database.Base`.
- Produces: yok.

Bu oturumda her migration sonrası elle "autogenerate farkı sıfır mı" diye
baktım. Kalıcı hâli bu.

- [ ] **Step 1: Dosyayı yaz**

```python
"""Migrations and models must describe the same database.

Checked by hand after every migration in this project's history; this is what
keeps it true. Drift is silent: the app works locally where the developer ran
create_all, and breaks in production where only migrations ran.
"""
import tempfile
import uuid
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

from app.core.database import Base

REPO_ROOT = Path(__file__).resolve().parent.parent


def _tables_from_migrations() -> dict[str, set[str]]:
    db_path = Path(tempfile.gettempdir()) / f"wlush-migrated-{uuid.uuid4().hex}.db"
    cfg = Config(str(REPO_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(REPO_ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")
    try:
        command.upgrade(cfg, "head")
        engine = create_engine(f"sqlite:///{db_path}")
        insp = inspect(engine)
        out = {t: {c["name"] for c in insp.get_columns(t)} for t in insp.get_table_names()}
        engine.dispose()
        return out
    finally:
        db_path.unlink(missing_ok=True)


def _tables_from_models() -> dict[str, set[str]]:
    return {
        name: {c.name for c in table.columns}
        for name, table in Base.metadata.tables.items()
    }


def test_migrations_run_from_empty():
    """A fresh production database must come up on migrations alone."""
    tables = _tables_from_migrations()
    assert "appointments" in tables
    assert "alembic_version" in tables


def test_migrations_and_models_agree():
    migrated = _tables_from_migrations()
    modelled = _tables_from_models()

    migrated.pop("alembic_version", None)

    missing = set(modelled) - set(migrated)
    extra = set(migrated) - set(modelled)
    assert not missing, f"models declare tables no migration creates: {missing}"
    assert not extra, f"migrations create tables no model declares: {extra}"

    for table in modelled:
        only_model = modelled[table] - migrated[table]
        only_migration = migrated[table] - modelled[table]
        assert not only_model, f"{table}: column in model, not in migrations: {only_model}"
        assert not only_migration, (
            f"{table}: column in migrations, not in model: {only_migration}"
        )
```

- [ ] **Step 2: Çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest tests/test_schema.py -v 2>&1 | tail -20
```

Beklenen: 2 test PASSED.

Düşerse **gerçek bir bulgu** demektir: modellerle migration'lar ayrışmış. Farkı raporla, kendiliğinden "düzeltmek" için modeli değiştirme — hangi tarafın doğru olduğu bir karardır.

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/kisisel/w-lush
.venv/bin/ruff check app tests
git add tests/test_schema.py
git commit -m "$(cat <<'EOF'
Guard against migration/model drift

Verified by hand after every migration so far. Drift is silent in the worst
way: the app works locally, where create_all filled the gaps, and fails in
production, where only migrations ran.
EOF
)"
```

---

### Task 6: CI'ya test işi ve backend PR

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: `test` işini ekle**

`.github/workflows/ci.yml` içindeki `lint` işinin altına:

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: pip install -r requirements.txt -r requirements-dev.txt
      - name: Test
        run: pytest
```

- [ ] **Step 2: Tüm takımı çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest -q 2>&1 | tail -6
```

Beklenen: hepsi PASSED, hata yok.

- [ ] **Step 3: Geliştirme veritabanının hâlâ dokunulmamış olduğunu doğrula**

```bash
cd ~/Desktop/kisisel/w-lush && shasum -a 256 w_lush.db > /tmp/devdb-final.txt
diff /tmp/devdb-before.txt /tmp/devdb-final.txt && echo "DEV VERİTABANI DOKUNULMADI" || echo "!!! DUR"
```

- [ ] **Step 4: Kaç test olduğunu ve ne kadar sürdüğünü not et**

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pytest -q 2>&1 | tail -2
```

Bu sayı PR gövdesine yazılacak.

- [ ] **Step 5: PR aç ve merge et**

```bash
cd ~/Desktop/kisisel/w-lush
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
Run the tests in CI

A test suite that only runs on someone's laptop rots.
EOF
)"
git push -u origin feature/pytest-altyapisi
gh pr create --base main --head feature/pytest-altyapisi \
  --title "Test altyapısı: pytest" \
  --body "$(cat <<'EOF'
Bu oturumda elle doğrulanan davranışlar kalıcı testlere çevrildi. Bugüne kadar
her doğrulama tek seferlikti: çalıştı ve buharlaştı.

## Test veritabanı yalıtımı
Alışılmış yöntem `dependency_overrides[get_db]`'dir; **burada yetmez.**
`app/whatsapp/flow.py` bot akışında `SessionLocal()`'ı doğrudan çağırıyor,
yani bağımlılıktan geçmiyor. Onun yerine `conftest.py`, `app` import edilmeden
önce `DATABASE_URL`'i geçici bir dosyaya çeviriyor — `database.py` motoru
import anında kurduğu için bu zamanında yetişiyor ve her iki yolu birden
kapsıyor.

Kanıtı planın adımı olarak koştum: geliştirme veritabanının SHA-256'sı test
öncesi ve sonrası birebir aynı.

## Kapsam
- **Kiracı yalıtımı** — API denetiminde elle koştuğum saldırıların hepsi.
  Başarısızlığı sessiz ve geri dönüşsüz olan tek özellik bu.
- **Randevu kapasitesi** — `coalesce(staff_id, 0)` davranışı, iki personelin
  aynı saatte çalışabilmesi, iptalin slotu boşaltması, slot dışı saat 422,
  pasif/olmayan personel, atama çakışması, kendi kaydını kendine yeniden atama.
- **Konuşma sahipliği** — dışarıya mesaj göndermeyi yabancı numaralara kapatan
  düzeltmenin testi.
- **Şema kayması** — migration'larla modellerin aynı veritabanını tarif ettiği.
  Bunu şimdiye kadar her migration'dan sonra elle kontrol ediyordum.
- **Kimlik** — koruma, yönetici sınırı, giriş hız sınırı.

## Testlerin gerçekten koruduğunun kanıtı
`coalesce` ifadesini index'ten geçici olarak çıkardım;
`test_unassigned_is_one_virtual_person` **düştü**. Sonra geri alındı ve tüm
takım yeşile döndü. Bir test, kırılmayı yakalamıyorsa süs eşyasıdır.

## CI
`pytest` işi eklendi. Yalnız birinin dizüstünde koşan takım çürür.
EOF
)"
gh pr merge --squash --delete-branch
git checkout main && git pull
```

---

### Task 7: Frontend — vitest

**Files:**
- Modify: `package.json`
- Create: `src/utils/dashboard.test.ts`, `src/utils/calendar.test.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `src/utils/dashboard.ts`, `src/utils/calendar.ts`.
- Produces: `npm test`.

- [ ] **Step 1: Dalı aç ve vitest'i kur**

```bash
cd ~/Desktop/kisisel/w-lush-web
git checkout main && git pull
git checkout -b feature/vitest-altyapisi
npm install --save-dev vitest@^2.1.8 2>&1 | tail -3
```

`package.json` scripts bölümüne ekle:

```json
    "test": "vitest run",
```

- [ ] **Step 2: `src/utils/dashboard.test.ts`'i yaz**

```ts
import { describe, expect, it } from 'vitest';
import {
  compareServices, dailyTotals, dayRange, last30, monthRange, occupancy,
  prev30, prevMonthToDate,
} from './dashboard';
import type { Payment } from '../api/payments';

const payment = (paid_at: string, amount: number): Payment =>
  ({ paid_at, amount } as Payment);

describe('occupancy', () => {
  it('multiplies slots by active staff', () => {
    expect(occupancy(7, 8, 2)).toEqual({ used: 7, capacity: 16, percent: 44 });
  });

  it('treats a clinic with no staff as capacity one per slot', () => {
    // The behaviour from before staff existed, preserved on purpose.
    expect(occupancy(3, 8, 0)).toEqual({ used: 3, capacity: 8, percent: 38 });
  });

  it('has nothing to say when no hours are configured', () => {
    expect(occupancy(3, 0, 2)).toBeNull();
  });

  it('reaches a hundred percent', () => {
    expect(occupancy(8, 8, 1)?.percent).toBe(100);
  });
});

describe('compareServices', () => {
  const previous = [
    { service_name: 'Lazer', amount: 18400, count: 8 },
    { service_name: 'Tek ödeme', amount: 400, count: 1 },
    { service_name: 'Ucuz ama sık', amount: 600, count: 5 },
    { service_name: 'Pahalı ama seyrek', amount: 9000, count: 2 },
  ];

  it('reports a real drop with both amounts', () => {
    const moves = compareServices([{ service_name: 'Lazer', amount: 14200, count: 6 }], previous);
    expect(moves).toEqual([
      { service_name: 'Lazer', from: 18400, to: 14200, percent: -23 },
    ]);
  });

  it('ignores services too small to mean anything', () => {
    // Without the threshold a single payment dropping to zero reads "-100%",
    // which is noise dressed as insight.
    const moves = compareServices([], previous);
    expect(moves.map((m) => m.service_name)).toEqual(['Lazer']);
  });

  it('returns nothing when no service clears the threshold', () => {
    expect(compareServices([], [{ service_name: 'X', amount: 500, count: 2 }])).toEqual([]);
  });

  it('puts the biggest mover first', () => {
    const moves = compareServices(
      [{ service_name: 'A', amount: 5000, count: 5 }, { service_name: 'B', amount: 1000, count: 4 }],
      [{ service_name: 'A', amount: 10000, count: 5 }, { service_name: 'B', amount: 8000, count: 4 }],
    );
    expect(moves[0].service_name).toBe('B'); // -88% beats -50%
  });
});

describe('dailyTotals', () => {
  it('fills days without payments so the shape is honest', () => {
    expect(
      dailyTotals([payment('2026-08-02', 100), payment('2026-08-02', 50)], '2026-08-01', '2026-08-03'),
    ).toEqual([
      { day: '2026-08-01', amount: 0 },
      { day: '2026-08-02', amount: 150 },
      { day: '2026-08-03', amount: 0 },
    ]);
  });

  it('covers the range even with no payments at all', () => {
    expect(dailyTotals([], '2026-08-01', '2026-08-02')).toEqual([
      { day: '2026-08-01', amount: 0 },
      { day: '2026-08-02', amount: 0 },
    ]);
  });
});

describe('date ranges', () => {
  const t = new Date(2026, 7, 11); // 11 August 2026

  it('reads today and yesterday', () => {
    expect(dayRange(0, t)).toEqual({ start: '2026-08-11', end: '2026-08-11' });
    expect(dayRange(1, t)).toEqual({ start: '2026-08-10', end: '2026-08-10' });
  });

  it('starts the month on the first', () => {
    expect(monthRange(t)).toEqual({ start: '2026-08-01', end: '2026-08-11' });
  });

  it('makes the two 30-day windows meet without overlapping', () => {
    expect(last30(t)).toEqual({ start: '2026-07-13', end: '2026-08-11' });
    expect(prev30(t)).toEqual({ start: '2026-06-13', end: '2026-07-12' });
  });

  it('clamps to the last day when the previous month is shorter', () => {
    // 31 March has no counterpart in February.
    expect(prevMonthToDate(new Date(2026, 2, 31))).toEqual({
      start: '2026-02-01', end: '2026-02-28',
    });
  });

  it('crosses the new year', () => {
    expect(prevMonthToDate(new Date(2026, 0, 15))).toEqual({
      start: '2025-12-01', end: '2025-12-15',
    });
  });
});
```

- [ ] **Step 3: `src/utils/calendar.test.ts`'i yaz**

```ts
import { describe, expect, it } from 'vitest';
import { addDays, gridRows, isoDate, isoDay, startOfWeek } from './calendar';

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

describe('gridRows', () => {
  it('slots an off-hours appointment into its true position', () => {
    // Without this the appointment simply vanished from the grid.
    const { rows, off } = gridRows(SLOTS, ['10:00', '14:30', '13:00']);
    expect(rows).toEqual([
      '10:00', '11:00', '12:00', '13:00', '14:00', '14:30', '15:00', '16:00', '17:00',
    ]);
    expect([...off]).toEqual(['14:30']);
  });

  it('leaves the grid alone when every appointment is on a slot', () => {
    const { rows, off } = gridRows(SLOTS, ['10:00', '11:00']);
    expect(rows).toEqual(SLOTS);
    expect(off.size).toBe(0);
  });

  it('handles a day with no appointments', () => {
    expect(gridRows(SLOTS, []).rows).toEqual(SLOTS);
  });

  it('takes times before and after working hours', () => {
    const { rows, off } = gridRows(SLOTS, ['09:15', '18:45']);
    expect(rows[0]).toBe('09:15');
    expect(rows[rows.length - 1]).toBe('18:45');
    expect([...off].sort()).toEqual(['09:15', '18:45']);
  });

  it('does not repeat a time shared by two appointments', () => {
    const { rows } = gridRows(SLOTS, ['14:30', '14:30']);
    expect(rows.filter((r) => r === '14:30')).toHaveLength(1);
  });
});

describe('week maths', () => {
  it('starts the week on Monday', () => {
    // Sunday 9 August 2026 belongs to the week starting Monday the 3rd.
    expect(isoDate(startOfWeek(new Date(2026, 7, 9)))).toBe('2026-08-03');
  });

  it('leaves a Monday where it is', () => {
    expect(isoDate(startOfWeek(new Date(2026, 7, 10)))).toBe('2026-08-10');
  });

  it('numbers Sunday seven, matching the clinic open_days', () => {
    expect(isoDay(new Date(2026, 7, 9))).toBe(7);
    expect(isoDay(new Date(2026, 7, 10))).toBe(1);
  });

  it('crosses a month boundary when adding days', () => {
    expect(isoDate(addDays(new Date(2026, 7, 31), 1))).toBe('2026-09-01');
  });
});
```

- [ ] **Step 4: Çalıştır**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm test 2>&1 | tail -15
```

Beklenen: hepsi geçer.

- [ ] **Step 5: Kapılar**

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "kapılar 0"
```

`vitest` tipleri `tsc -b`'yi kızdırırsa `tsconfig`'in `types` dizisine
`"vitest/globals"` eklemek yerine testlerde `import { describe, expect, it } from 'vitest'`
kullanıldığını doğrula — plan zaten açık import kullanıyor, ek yapılandırma
gerekmemeli.

- [ ] **Step 6: Frontend CI'sı**

`.github/workflows/ci.yml` (yeni dosya):

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 7: Commit ve PR**

```bash
cd ~/Desktop/kisisel/w-lush-web
git add package.json package-lock.json src/utils/dashboard.test.ts src/utils/calendar.test.ts .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
Add vitest and cover the dashboard and calendar maths

These functions were put in utils precisely so they could be checked without
a browser; until now that checking happened once, by hand, and was thrown
away.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
git push -u origin feature/vitest-altyapisi
gh pr create --base main --head feature/vitest-altyapisi \
  --title "Test altyapısı: vitest" \
  --body "$(cat <<'EOF'
Backend tarafı: selamet/w-lush#<NUMARA> (merge edildi).

`utils/dashboard.ts` ve `utils/calendar.ts` zaten tarayıcısız doğrulanabilsin
diye ayrı tutulmuştu; şimdiye kadar o doğrulama bir kez, elle yapılıp atılıyordu.

## Kapsam
- **Doluluk** — personelli, personelsiz (kapasite 1), saat tanımsız (null), tam dolu.
- **Eğilim eşiği** — gerçek düşüş, üç ayrı eleme durumu, hiç geçen olmaması, en
  büyük hareketin başa gelmesi.
- **Günlük gruplama** — ödemesiz günlerin 0 ile dolması.
- **Tarih aralıkları** — bugün/dün, ay başı, iki 30 günlük pencerenin
  çakışmadan buluşması, 31 Mart → Şubat kırpması, yıl sınırı.
- **`gridRows`** — saat dışı randevunun doğru satıra girmesi (bu düzeltilmeden
  önce o randevu ızgarada hiç görünmüyordu), tekrar eden saatin tekilleşmesi,
  erken/geç saatler.
- **Hafta matematiği** — Pazartesi başlangıcı, Pazar = 7, ay sınırı.

## CI
Frontend'in hiç CI'sı yoktu. `typecheck`, `test`, `build` artık her PR'da koşuyor.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

`<NUMARA>` yerine Task 6'da açılan backend PR'ının numarasını yaz.

- [ ] **Step 8: Merge**

Kullanıcı onaylarsa:

```bash
cd ~/Desktop/kisisel/w-lush-web
gh pr merge --squash --delete-branch
git fetch origin && git reset --hard origin/main
npm ci && npm test && npm run typecheck
```

`git pull` "divergent branches" derse: bu plan dosyası `main`'de yerel kalmış
ve PR'ın squash'ı onu da içermiştir. `git diff main origin/main --stat` ile
içeriğin uzakta olduğunu **doğrula**, sonra reset at.

---

## Bu planın kapsamadıkları

- Bileşen testleri (React Testing Library). Saf fonksiyonlar en çok getiriyi
  veren yer; bileşenler ayrı bir karar.
- Uçtan uca tarayıcı testleri (Playwright).
- Bot akışının (`app/whatsapp/flow.py`) durum makinesi testleri. Değerli ama
  kendi başına bir iş: WhatsApp istemcisinin baştan sona sahtelenmesi gerekir.
- `modals.tsx` ve Sistem ekranındaki kalan uydurma diziler.
