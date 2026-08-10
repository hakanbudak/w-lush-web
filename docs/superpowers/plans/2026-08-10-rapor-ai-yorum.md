# Rapor — Gelir-Gider AI Yorumu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operatör bir dönem seçsin; ekran o dönemin gerçek gelir-gider tablosunu ve bir dil modelinin bu tabloya yazdığı Türkçe yorumu göstersin.

**Architecture:** Yeni `app/reports/` modülü. Veri toplama (`service.py`) ile model çağrısı (`llm.py`) **ayrı dosyalarda** — biri veritabanına, diğeri ağa bağlı ve ikisi ayrı doğrulanmalı. Prompt kendi dosyasında. Üretilen rapor, dayandığı sayılarla (`facts`) birlikte yeni bir `reports` tablosuna yazılır. Frontend'de tek API katmanı ve yeniden yazılmış `Rapor.tsx`.

**Tech Stack:** Backend FastAPI + SQLAlchemy 2.0 + Alembic + **`anthropic` (yeni bağımlılık)**. Frontend React 18 + TypeScript + Vite. Yeni npm bağımlılığı YOK.

**Spec:** `w-lush-web/docs/superpowers/specs/2026-08-10-rapor-ai-yorum-design.md`

## Global Constraints

| Repo | Yol | Branch |
|---|---|---|
| Backend | `~/Desktop/kisisel/w-lush` | `feature/ai-reports` (main üstünde) |
| Frontend | `~/Desktop/kisisel/w-lush-web` | `feature/rapor-ai` (branch `docs/rapor-spec` üstünde) |

- **Yeni pip bağımlılığı `anthropic` ekleniyor** — projede ilk kez. Sürüm **tahmin edilmez**: kurulur, `pip show` ile okunur, tam sürüm `requirements.txt`'e sabitlenir. Yeni **npm** bağımlılığı yok.
- **Şema değişiyor:** bir tablo. Migration elle yazılır, `upgrade`/`downgrade` ikisi de çalışır.
- Yeni model `app/core/registry.py`'ye eklenir; yoksa Alembic tabloyu görmez.
- **Modele yalnızca toplamlar gider.** Danışan adı, telefon, tekil ödeme/gider kaydı, not alanları asla gönderilmez.
- **`stop_reason` her zaman `content` okunmadan önce kontrol edilir** — ret durumunda `content` boş gelir.
- Model sabitleri: `claude-opus-5`, `effort: "low"`, `max_tokens: 2000`, `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`, bu yüzden `client.beta.messages.create`). Düşünme parametresi **verilmez** — Opus 5'te varsayılan olarak açık.
- Kod/tip/fonksiyon adları İngilizce; kullanıcıya görünen TR metinler `app/content/messages.py`'de, nokta ile bitmeden. **İstisna: prompt** `app/reports/prompt.py` içinde durur (kullanıcıya görünen metin değil, çıktıyı belirleyen işlevsel yapı).
- Frontend HTTP çağrıları yalnız `src/api/*.ts` içinden.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK**.
- Backend kapıları: `ruff check app` temiz, `python -c "from app.main import app"` geçer, `alembic upgrade head` çalışır, sonrasında `autogenerate` boş üretir.
- Frontend kapıları: `npm run typecheck` ve `npm run build` exit 0.
- Hiçbir task push/merge/PR yapmaz — hepsi Task 7'de.

## Test durumu ve API anahtarı

Test koşucusu yok; doğrulama derleyici/linter + migration turu + canlı uç ile yapılır.

**Doğrulama iki tabakalı, çünkü ağ çağrısı her ortamda yapılamaz:**

- **Anahtarsız (her adımda koşulur):** `facts` üretimi elle hesaplanana karşı doğrulanır, anahtar yokken uç **503** döner (ağa çıkmadan), boş dönem 422, liste/detay/silme/401 yolları.
- **Anahtarlı (yalnız `ANTHROPIC_API_KEY` varsa):** tek gerçek çağrı; Task 4 Step 8. Anahtar yoksa **bu adım atlanır ve kapanış PR'ında açıkça belirtilir** — uydurma "çalışıyor" denmez.

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

---

### Task 1: Backend — bağımlılık, ayar, tablo ve migration

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/ai-reports`

**Files:**
- Create: `app/reports/__init__.py` (boş), `app/reports/models.py`
- Create: `alembic/versions/d9f2b6c40a17_add_reports_table.py`
- Modify: `requirements.txt`, `app/core/config.py`, `app/core/registry.py`, `.env.example`

**Interfaces:**
- Produces: `Report` ORM modeli; `settings.anthropic_api_key: str`

- [ ] **Step 1: Branch'i aç ve paketi oluştur**

```bash
cd ~/Desktop/kisisel/w-lush && git checkout main && git pull && git checkout -b feature/ai-reports
mkdir -p app/reports && touch app/reports/__init__.py
```

- [ ] **Step 2: `anthropic` SDK'sını kur ve tam sürümü sabitle**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/pip install anthropic && .venv/bin/pip show anthropic | grep -i "^version:"
```

Çıktıdaki sürümü `requirements.txt` sonuna **birebir** yaz (örnek biçim; gerçek sürümü komutun çıktısından al):

```
anthropic==<pip show çıktısındaki sürüm>
```

Sürümü tahmin etme — yazdıktan sonra `grep anthropic requirements.txt` ile kurulu sürümün aynısı olduğunu doğrula.

- [ ] **Step 3: Ayara anahtarı ekle**

`app/core/config.py` içinde `whatsapp_api_version: str = "v21.0"` satırının **altına** ekle:

```python

    # Anthropic — AI rapor yorumu (boşsa rapor ucu 503 döner)
    anthropic_api_key: str = ""
```

`.env.example` sonuna ekle:

```
# Anthropic API anahtarı — AI rapor yorumu için. Boşsa /rapor ekranı
# "yapılandırılmamış" der ve üretim düğmesi kapalı gelir.
ANTHROPIC_API_KEY=
```

- [ ] **Step 4: `app/reports/models.py` dosyasını oluştur**

```python
"""Generated reports: the model's comment plus the numbers it was given."""
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

KIND_INCOME_EXPENSE = "income_expense"


class Report(Base):
    """One generated report.

    `facts` holds the exact JSON handed to the model. Text and the numbers it
    rests on belong together — an archived AI comment nobody can trace back to
    its inputs is not worth keeping, and it is also the audit trail proving
    what left the building.
    """

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    clinic_id: Mapped[int] = mapped_column(ForeignKey("clinics.id"), index=True)
    kind: Mapped[str] = mapped_column(String(40), default=KIND_INCOME_EXPENSE)
    period_start: Mapped[date] = mapped_column(Date)
    period_end: Mapped[date] = mapped_column(Date)
    body: Mapped[str] = mapped_column(Text, default="")
    facts: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(String(40), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
```

- [ ] **Step 5: Modeli `app/core/registry.py`'ye ekle**

`from app.payments import models as payment_models  # noqa: F401` satırının **altına** ekle:

```python
from app.reports import models as report_models  # noqa: F401
```

- [ ] **Step 6: Migration dosyasını elle yaz**

`alembic/versions/d9f2b6c40a17_add_reports_table.py`:

```python
"""add reports table

Revision ID: d9f2b6c40a17
Revises: c3d5e7a1b204
Create Date: 2026-08-10

"""
import sqlalchemy as sa
from alembic import op

revision = "d9f2b6c40a17"
down_revision = "c3d5e7a1b204"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clinic_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("facts", sa.Text(), nullable=False),
        sa.Column("model", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["clinic_id"], ["clinics.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_clinic_id", "reports", ["clinic_id"])


def downgrade() -> None:
    op.drop_index("ix_reports_clinic_id", table_name="reports")
    op.drop_table("reports")
```

`down_revision` mevcut head'dir; `.venv/bin/alembic heads` çıktısı `c3d5e7a1b204 (head)` olmalı. Farklıysa dosyadaki değeri ona çevir.

- [ ] **Step 7: Migration'ı çift yönlü çalıştır**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && \
.venv/bin/alembic upgrade head && \
.venv/bin/python -c "
import sqlite3; c = sqlite3.connect('w_lush.db')
cols = [r[1] for r in c.execute('PRAGMA table_info(reports)')]
print('kolonlar:', cols); assert 'facts' in cols and 'body' in cols" && \
.venv/bin/alembic downgrade -1 && \
.venv/bin/python -c "
import sqlite3; c = sqlite3.connect('w_lush.db')
n = c.execute(\"SELECT count(*) FROM sqlite_master WHERE name='reports'\").fetchone()[0]
print('downgrade sonrası tablo:', n); assert n == 0" && \
.venv/bin/alembic upgrade head && echo "MIGRATION ÇİFT YÖNLÜ OK"
```

Expected: kolon listesi basılır, downgrade sonrası `0`, son satır `MIGRATION ÇİFT YÖNLÜ OK`.

- [ ] **Step 8: Şema uyumu ve lint kapıları**

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

- [ ] **Step 9: Commit**

```bash
git add app/reports/__init__.py app/reports/models.py app/core/config.py app/core/registry.py requirements.txt .env.example alembic/versions/d9f2b6c40a17_add_reports_table.py
git commit -m "Add the reports table and the Anthropic SDK dependency

This is the project's first outside model dependency; writing the Messages
API by hand would mean reimplementing the SDK's error types, retries and
timeouts. Reports store the facts they were generated from, so an archived
comment can always be traced back to its numbers."
```

---

### Task 2: Backend — `facts` üretimi ve rapor kayıtları (ağ yok)

Bu task'ın sonunda rapor verisi hesaplanabilir ve saklanabilir. **Hiçbir ağ çağrısı yok** — bu yüzden API anahtarı olmadan tam olarak doğrulanabilir.

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/ai-reports`

**Files:**
- Create: `app/reports/service.py`, `app/reports/schemas.py`

**Interfaces:**
- Consumes: `payments.service.summary()`, `expenses.service.summary()` (yeniden kullanılır, kopyalanmaz); `Report` (Task 1)
- Produces:
  - `service.build_facts(db, clinic_id, start, end) -> dict`
  - `service.has_data(facts: dict) -> bool`
  - `service.create(db, clinic_id, start, end, body, facts, model) -> Report`
  - `service.listing(db, clinic_id, limit=50) -> list[Report]`
  - `service.get(db, clinic_id, report_id) -> Report | None`
  - `service.remove(db, report) -> None`
  - Şemalar: `ReportIn`, `ReportOut`, `ReportDetailOut`

- [ ] **Step 1: `app/reports/service.py` dosyasını oluştur**

```python
"""Report data gathering and persistence. No network calls live here."""
import json
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.expenses import service as expenses
from app.payments import service as payments
from app.reports.models import KIND_INCOME_EXPENSE, Report


def build_facts(db: Session, clinic_id: int, start: date, end: date) -> dict:
    """The exact structure handed to the model.

    Totals only. No customer name, phone, note, or individual row ever goes
    into this dict — service and category names are catalogue data and cannot
    be traced to a person.
    """
    income = payments.summary(db, clinic_id, start, end)
    expense = expenses.summary(db, clinic_id, start, end)
    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "income": {
            "total": income["total"],
            "count": income["count"],
            "by_service": [
                {"name": row["service_name"] or "Belirtilmemiş", "amount": row["amount"]}
                for row in income["by_service"]
            ],
        },
        "expense": {
            "total": expense["total"],
            "count": expense["count"],
            "by_category": [
                {"name": row["name"], "amount": row["amount"]}
                for row in expense["by_category"]
            ],
        },
        "profit": income["total"] - expense["total"],
    }


def has_data(facts: dict) -> bool:
    """A period with only expenses is still worth commenting on — and often
    the most worth commenting on. Only a period with neither is empty.
    """
    return facts["income"]["count"] > 0 or facts["expense"]["count"] > 0


def create(
    db: Session,
    clinic_id: int,
    start: date,
    end: date,
    body: str,
    facts: dict,
    model: str,
) -> Report:
    report = Report(
        clinic_id=clinic_id,
        kind=KIND_INCOME_EXPENSE,
        period_start=start,
        period_end=end,
        body=body,
        facts=json.dumps(facts, ensure_ascii=False),
        model=model,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def listing(db: Session, clinic_id: int, limit: int = 50) -> list[Report]:
    stmt = (
        select(Report)
        .where(Report.clinic_id == clinic_id)
        .order_by(Report.created_at.desc(), Report.id.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())


def get(db: Session, clinic_id: int, report_id: int) -> Report | None:
    report = db.get(Report, report_id)
    if report is None or report.clinic_id != clinic_id:
        return None
    return report


def remove(db: Session, report: Report) -> None:
    db.delete(report)
    db.commit()
```

- [ ] **Step 2: `app/reports/schemas.py` dosyasını oluştur**

```python
"""Request/response shapes for reports."""
import json
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, field_validator


class ReportIn(BaseModel):
    start: date
    end: date


class ReportOut(BaseModel):
    """One line in the report list. Body and facts are left out on purpose —
    the list stays light."""

    model_config = ConfigDict(from_attributes=True)
    id: int
    kind: str
    period_start: date
    period_end: date
    model: str
    created_at: datetime


class ReportDetailOut(ReportOut):
    body: str
    # Stored as JSON text; handed to the client as a real object.
    facts: dict

    @field_validator("facts", mode="before")
    @classmethod
    def _parse_facts(cls, value):
        return json.loads(value) if isinstance(value, str) else value
```

`ReportOut` alanı `model` pydantic'in korumalı `model_` ön ekiyle çakışmaz (`model` tek başına serbesttir); `model_config` zaten tanımlı olduğu için uyarı çıkmaz.

- [ ] **Step 3: Lint ve import kapıları**

Run: `cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"`
Expected: `All checks passed!` ve `import ok`.

- [ ] **Step 4: `facts` üretimini elle hesaplanana karşı doğrula**

Bu adım ağ kullanmaz; bilinen veriyle beklenen JSON'u karşılaştırır. Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
import app.main  # tüm modelleri kaydeder
import json
from datetime import date, timedelta
from app.core.database import SessionLocal
from app.reports import service

today = date.today()
start = today.replace(day=1)
with SessionLocal() as db:
    facts = service.build_facts(db, 1, start, today)
    print(json.dumps(facts, ensure_ascii=False, indent=2)[:600])

    # Yapı sözleşmesi
    assert set(facts) == {"period", "income", "expense", "profit"}
    assert set(facts["income"]) == {"total", "count", "by_service"}
    assert set(facts["expense"]) == {"total", "count", "by_category"}
    assert facts["profit"] == facts["income"]["total"] - facts["expense"]["total"]

    # Gizlilik sınırı: hiçbir yerde telefon/isim alanı olmamalı
    blob = json.dumps(facts, ensure_ascii=False)
    for forbidden in ("phone", "customer", "note", "description"):
        assert forbidden not in blob, f"SIZINTI: {forbidden}"

    # Boş dönem tespiti
    old = service.build_facts(db, 1, date(2000, 1, 1), date(2000, 1, 31))
    assert service.has_data(old) is False, old
    print("has_data(boş dönem):", service.has_data(old))
print("FACTS OK")
PY
```

Expected: JSON basılır, sızıntı kontrolü geçer, `has_data(boş dönem): False`, son satır `FACTS OK`.

- [ ] **Step 5: Commit**

```bash
git add app/reports/service.py app/reports/schemas.py
git commit -m "Add report fact gathering and persistence

Data gathering is kept apart from the model call so it can be verified with
no API key and no network. The facts dict is totals only — the privacy
boundary is a single readable function rather than a rule in a document."
```

---

### Task 3: Backend — prompt ve tek Claude çağrısı

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/ai-reports`

**Files:**
- Create: `app/reports/prompt.py`, `app/reports/llm.py`

**Interfaces:**
- Consumes: `settings.anthropic_api_key` (Task 1)
- Produces:
  - `llm.MODEL: str` (`"claude-opus-5"`)
  - `llm.generate_comment(facts: dict) -> str`
  - `llm.ReportUnavailable` (anahtar yok), `llm.ReportFailed` (yukarı akış hatası veya ret)

- [ ] **Step 1: `app/reports/prompt.py` dosyasını oluştur**

```python
"""The system prompt for the income/expense report.

Lives in its own file rather than app/content/messages.py: this is not text
shown to a user, it is the thing that determines the output. Keeping it alone
means a change to it shows up alone in a diff.
"""

SYSTEM_PROMPT = """Sen bir güzellik kliniğinin yönetim panelinde çalışan finans analistisin. \
Sana bir dönemin gelir ve gider toplamları veriliyor; kliniği işleten kişiye bu tabloyu \
Türkçe yorumluyorsun.

Okuyucu muhasebeci değil, kliniği işleten kişi. Rakamları tekrar etmek yerine ne anlama \
geldiklerini söyle: kâr durumu, en ağır kalemler, dikkat çeken oran veya dengesizlikler, \
varsa bir sonraki döneme dair somut bir öneri.

Yalnızca verilen sayılara dayan. Veride olmayan bir eğilim, kıyas veya sektör ortalaması \
üretme — önceki dönemin verisi verilmediyse "geçen aya göre" türü bir cümle kurma. Bir şey \
belirsizse belirsiz olduğunu söyle.

Üç ila beş kısa paragraf yaz. Başlık, madde işareti veya tablo kullanma. Tutarları ₺ ve \
binlik ayırıcıyla yaz."""
```

- [ ] **Step 2: `app/reports/llm.py` dosyasını oluştur**

```python
"""The single Claude call. The only module here that touches the network."""
import json
import logging

import anthropic

from app.core.config import get_settings
from app.reports.prompt import SYSTEM_PROMPT

logger = logging.getLogger(__name__)

MODEL = "claude-opus-5"
# The output is deliberately three to five short paragraphs.
MAX_TOKENS = 2000


class ReportUnavailable(RuntimeError):
    """No API key configured — the feature is off, not broken."""


class ReportFailed(RuntimeError):
    """Upstream error or a model refusal. The caller cannot tell them apart;
    the log can."""


def generate_comment(facts: dict) -> str:
    """Turn the facts dict into a few Turkish paragraphs."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise ReportUnavailable

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            # A short interpretation task: low effort is strong here and cuts
            # both cost and latency. Thinking is left at its default (on).
            output_config={"effort": "low"},
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=[
                {
                    "role": "user",
                    "content": json.dumps(facts, ensure_ascii=False),
                }
            ],
        )
    except anthropic.APIError as exc:
        logger.warning("report generation failed: %s", exc)
        raise ReportFailed from exc

    # stop_reason before content: a refusal returns HTTP 200 with an empty
    # content list, so indexing it first would raise the wrong error.
    if response.stop_reason == "refusal":
        category = getattr(response.stop_details, "category", None)
        logger.warning("report refused by the model (category=%s)", category)
        raise ReportFailed

    usage = response.usage
    logger.info(
        "report usage: input=%s output=%s model=%s",
        usage.input_tokens,
        usage.output_tokens,
        response.model,
    )

    text = "".join(
        block.text for block in response.content if block.type == "text"
    ).strip()
    if not text:
        logger.warning("report came back empty (stop_reason=%s)", response.stop_reason)
        raise ReportFailed
    return text
```

- [ ] **Step 3: Lint ve import kapıları**

Run: `cd ~/Desktop/kisisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.reports import llm; print('llm import ok', llm.MODEL)"`
Expected: `All checks passed!` ve `llm import ok claude-opus-5`.

- [ ] **Step 4: Anahtarsız yolun ağa çıkmadığını doğrula**

Run:

```bash
cd ~/Desktop/kisisel/w-lush && .venv/bin/python - <<'PY'
from app.core.config import get_settings
from app.reports import llm

get_settings.cache_clear()
settings = get_settings()
if settings.anthropic_api_key:
    print("ATLANDI: ortamda anahtar var, anahtarsız yol burada test edilemez")
else:
    try:
        llm.generate_comment({"period": {"start": "2026-08-01", "end": "2026-08-31"}})
    except llm.ReportUnavailable:
        print("anahtarsız -> ReportUnavailable")
    else:
        raise AssertionError("anahtar yokken hata beklenmişti")
print("LLM KAPISI OK")
PY
```

Expected: `anahtarsız -> ReportUnavailable` (veya anahtar varsa atlandı satırı), son satır `LLM KAPISI OK`.

- [ ] **Step 5: Commit**

```bash
git add app/reports/prompt.py app/reports/llm.py
git commit -m "Add the report prompt and the Claude call

stop_reason is checked before content because a refusal returns 200 with an
empty content list. Refusals and upstream errors surface the same way to the
caller but are distinguishable in the log — otherwise a real refusal would be
indistinguishable from a network blip forever."
```

---

### Task 4: Backend — uçlar

**Repo:** `~/Desktop/kisisel/w-lush`, branch `feature/ai-reports`

**Files:**
- Create: `app/reports/router.py`
- Modify: `app/content/messages.py`, `app/main.py`

**Interfaces:**
- Consumes: Task 2'nin servis fonksiyonları, Task 3'ün `llm.generate_comment` / `MODEL` / hata sınıfları
- Produces: `POST /api/reports/income-expense`, `GET /api/reports`, `GET /api/reports/{id}`, `DELETE /api/reports/{id}`

- [ ] **Step 1: TR metinlerini `app/content/messages.py`'ye ekle**

`ERR_EXPENSE_FUTURE_DATE = "Gider tarihi gelecekte olamaz"` satırının altına ekle:

```python
ERR_AI_NOT_CONFIGURED = "AI raporu yapılandırılmamış"
ERR_REPORT_NO_DATA = "Bu dönemde rapor üretecek veri yok"
ERR_REPORT_FAILED = "Rapor üretilemedi, tekrar deneyin"
ERR_REPORT_NOT_FOUND = "Rapor bulunamadı"
```

- [ ] **Step 2: `app/reports/router.py` dosyasını oluştur**

```python
"""Report endpoints for the operator panel (clinic-scoped, auth-protected)."""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.models import User
from app.content import messages as msg
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.ratelimit import limiter
from app.reports import llm, service
from app.reports.schemas import ReportDetailOut, ReportIn, ReportOut

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.post("/income-expense", response_model=ReportDetailOut, status_code=201)
# Every call costs money, so this endpoint is rate limited far harder than the
# rest of the API. slowapi keys on client IP, not clinic — see the plan note.
@limiter.limit("10/hour")
def generate_income_expense(
    request: Request,
    payload: ReportIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    facts = service.build_facts(db, current.clinic_id, payload.start, payload.end)
    if not service.has_data(facts):
        raise HTTPException(422, msg.ERR_REPORT_NO_DATA)

    try:
        body = llm.generate_comment(facts)
    except llm.ReportUnavailable:
        raise HTTPException(503, msg.ERR_AI_NOT_CONFIGURED) from None
    except llm.ReportFailed:
        raise HTTPException(502, msg.ERR_REPORT_FAILED) from None

    return service.create(
        db, current.clinic_id, payload.start, payload.end, body, facts, llm.MODEL
    )


@router.get("", response_model=list[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Newest first, most recent 50. Body and facts are not included."""
    return service.listing(db, current.clinic_id)


@router.get("/{report_id}", response_model=ReportDetailOut)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    report = service.get(db, current.clinic_id, report_id)
    if report is None:
        raise HTTPException(404, msg.ERR_REPORT_NOT_FOUND)
    return report


@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    report = service.get(db, current.clinic_id, report_id)
    if report is None:
        raise HTTPException(404, msg.ERR_REPORT_NOT_FOUND)
    service.remove(db, report)
```

**Hız sınırı hakkında not:** spec "klinik başına saatte 10" diyor; `slowapi`'nin `key_func`'ı istemci IP'sine bakıyor (`app/core/ratelimit.py`). Klinik başına saymak, JWT'yi çözen özel bir `key_func` yazmayı gerektirirdi — bu iş için fazla makine. **IP başına saatte 10** ile gidiliyor; farkı bilerek kabul ediyoruz ve PR'da yazıyoruz.

- [ ] **Step 3: Router'ı `app/main.py`'ye bağla**

Import bloğuna (alfabetik sıra: `app.payments.router`'dan sonra) ekle:

```python
from app.reports.router import router as reports_router
```

`app.include_router(expenses_router)` satırının altına ekle:

```python
app.include_router(reports_router)
```

- [ ] **Step 4: Lint, import ve şema kapıları**

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

- [ ] **Step 5: Sunucuyu yeniden başlat**

```bash
lsof -nP -iTCP:8000 -sTCP:LISTEN -t | xargs -r kill; sleep 1
cd ~/Desktop/kisisel/w-lush && (.venv/bin/python -m uvicorn app.main:app --port 8000 > /tmp/wlush-api.log 2>&1 &); sleep 3
```

- [ ] **Step 6: Anahtarsız yolları canlı doğrula**

Bu adım **anahtar olmadan** koşar ve asıl kapsamdır. Run:

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
        return getattr(e, "code", "ERR"), (e.read().decode()[:400] if hasattr(e, "read") else str(e))

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
today = date.today().isoformat()
month_start = date.today().replace(day=1).isoformat()

# Boş dönem -> 422 (modele hiç gidilmez)
st, body = req("/api/reports/income-expense","POST",{"start":"2000-01-01","end":"2000-01-31"},tok)
print("boş dönem ->", st, json.loads(body)["detail"])
assert st == 422

# Veri olan dönem: anahtar yoksa 503, varsa 201
st, body = req("/api/reports/income-expense","POST",{"start":month_start,"end":today},tok)
print("üretim ->", st, (json.loads(body).get("detail") or "rapor üretildi"))
assert st in (201, 503), body

print("liste ->", req("/api/reports", token=tok)[0])
print("olmayan rapor ->", req("/api/reports/999999", token=tok)[0])
print("olmayanı sil ->", req("/api/reports/999999","DELETE",token=tok)[0])
print("yetkisiz ->", req("/api/reports")[0])
print("UÇLAR OK")
PY
```

Expected: `boş dönem -> 422 Bu dönemde rapor üretecek veri yok`; üretim `503` (anahtar yoksa) veya `201`; liste `200`; olmayan rapor `404`; olmayanı sil `404`; yetkisiz `401`; son satır `UÇLAR OK`.

- [ ] **Step 7: Commit**

```bash
git add app/reports/router.py app/content/messages.py app/main.py
git commit -m "Add report endpoints

Generation is rate limited to ten an hour because each call spends money.
A period with no data is rejected before the model is called at all, so an
empty month cannot cost anything."
```

- [ ] **Step 8: Anahtarlı uçtan uca doğrulama — YALNIZ `ANTHROPIC_API_KEY` varsa**

Anahtar yoksa **bu adımı atla** ve Task 7'de PR açıklamasına "gerçek çağrı doğrulanmadı" yaz. Uydurma bir "çalışıyor" ifadesi kullanma.

Anahtar `.env`'e eklendikten sonra sunucuyu yeniden başlat (Step 5) ve Run:

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
    with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
today = date.today().isoformat()
month_start = date.today().replace(day=1).isoformat()

s, b = req("/api/reports/income-expense","POST",{"start":month_start,"end":today},tok)
print("üretim ->", s)
assert s == 201, b
d = json.loads(b)
print("model:", d["model"])
print("--- yorum ---")
print(d["body"][:600])
assert d["model"] == "claude-opus-5"
assert len(d["body"]) > 80, "yorum şüpheli derecede kısa"
# Tutarlılık makineyle değil gözle kontrol edilir (aşağıya bak): metindeki
# tutarların biçimi modele bırakıldığı için dize eşleştirmesi güvenilmez.
print("facts toplamı:", d["facts"]["income"]["total"], "gider:", d["facts"]["expense"]["total"], "kâr:", d["facts"]["profit"])
print("GERÇEK ÇAĞRI OK — sunucu logunda 'report usage:' satırındaki token sayılarını da oku")
PY
```

Expected: `üretim -> 201`, model `claude-opus-5`, Türkçe birkaç paragraf. Ayrıca `/tmp/wlush-api.log` içindeki `report usage: input=… output=…` satırından rapor başına gerçek maliyeti hesapla ($5/MTok girdi, $25/MTok çıktı) ve PR'a yaz.

Metnin `facts` ile tutarlı olduğunu **gözle** doğrula: yorumda geçen tutarlar `facts`'teki toplamlarla aynı olmalı, veride olmayan bir kıyas ("geçen aya göre") geçmemeli.

---

### Task 5: Frontend — rapor API katmanı

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/rapor-ai`

**Files:**
- Create: `src/api/reports.ts`

**Interfaces:**
- Consumes: `request<T>()` (`src/api/client.ts`), `toUtcIso()` (`src/utils/time.ts`)
- Produces: `ReportSummary`, `ReportDetail`, `ReportFacts`; `listReports()`, `getReport(id)`, `generateIncomeExpenseReport(start, end)`, `deleteReport(id)`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush-web && git checkout docs/rapor-spec && git checkout -b feature/rapor-ai
```

- [ ] **Step 2: `src/api/reports.ts` dosyasını oluştur**

```ts
// AI raporları — backend: app/reports/ (klinik kapsamlı, auth'lu).
import { toUtcIso } from '../utils/time';
import { request } from './client';

/** Modele gönderilen ve raporla birlikte saklanan sayılar. */
export interface ReportFacts {
  period: { start: string; end: string };
  income: {
    total: number;
    count: number;
    by_service: { name: string; amount: number }[];
  };
  expense: {
    total: number;
    count: number;
    by_category: { name: string; amount: number }[];
  };
  profit: number;
}

/** Listedeki bir satır — gövde ve facts dahil değil. */
export interface ReportSummary {
  id: number;
  kind: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;
  model: string;
  created_at: string; // ISO
}

export interface ReportDetail extends ReportSummary {
  body: string;
  facts: ReportFacts;
}

// period_* takvim günü; yalnız created_at zaman damgası normalize edilir.
const normalize = <T extends { created_at: string }>(r: T): T => ({
  ...r,
  created_at: toUtcIso(r.created_at),
});

export const listReports = () =>
  request<ReportSummary[]>('/api/reports').then((rows) => rows.map(normalize));

export const getReport = (id: number) =>
  request<ReportDetail>(`/api/reports/${id}`).then(normalize);

export const generateIncomeExpenseReport = (start: string, end: string) =>
  request<ReportDetail>('/api/reports/income-expense', {
    method: 'POST',
    body: JSON.stringify({ start, end }),
  }).then(normalize);

export const deleteReport = (id: number) =>
  request<void>(`/api/reports/${id}`, { method: 'DELETE' });
```

- [ ] **Step 3: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 4: Sözleşmeyi canlı doğrula**

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
    try:
        with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:300] if hasattr(e, "read") else str(e))

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]
s, b = req("/api/reports", token=tok)
print("liste ->", s)
assert s == 200, b
rows = json.loads(b)
if rows:
    assert {"id","kind","period_start","period_end","model","created_at"} == set(rows[0]), rows[0]
    d = json.loads(req(f"/api/reports/{rows[0]['id']}", token=tok)[1])
    assert {"body","facts"} <= set(d), d.keys()
    assert set(d["facts"]) == {"period","income","expense","profit"}
    print("detay alanları OK")
else:
    print("henüz rapor yok — liste sözleşmesi boş dizi ile doğrulandı")
print("SÖZLEŞME OK")
PY
```

Expected: `liste -> 200`, son satır `SÖZLEŞME OK`.

- [ ] **Step 5: Commit**

```bash
git add src/api/reports.ts
git commit -m "Add reports API client

Calendar dates stay as they are; only created_at goes through toUtcIso, the
same split the payments and expenses clients use."
```

---

### Task 6: Frontend — Rapor ekranı

**Repo:** `~/Desktop/kisisel/w-lush-web`, branch `feature/rapor-ai`

**Files:**
- Modify: `src/pages/Rapor.tsx` (tam yeniden yazım)

**Interfaces:**
- Consumes: Task 5'in API'si; `PeriodPicker` (`src/components/finance/PeriodPicker.tsx`), `rangeFor`, `Period` (`src/utils/period.ts`), `KpiCard` (`src/components/ui.tsx`), `relativeTime` (`src/utils/time.ts`)
- Produces: `export default function Rapor(): JSX.Element`

- [ ] **Step 1: `src/pages/Rapor.tsx` dosyasının tamamını şununla değiştir**

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  deleteReport,
  generateIncomeExpenseReport,
  getReport,
  listReports,
  type ReportDetail,
  type ReportSummary,
} from '../api/reports';
import PeriodPicker from '../components/finance/PeriodPicker';
import { KpiCard } from '../components/ui';
import { rangeFor, type Period } from '../utils/period';
import { relativeTime } from '../utils/time';

const fmt = (n: number): string => '₺ ' + n.toLocaleString('tr-TR');

/** YYYY-MM-DD → "1 Ağu" */
const dayLabel = (isoDate: string): string =>
  new Date(`${isoDate}T00:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

const card: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  padding: 20,
};

export default function Rapor() {
  const [period, setPeriod] = useState<Period>('ay');
  const [rows, setRows] = useState<ReportSummary[] | null>(null);
  const [current, setCurrent] = useState<ReportDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Anahtar yoksa backend 503 döner; üretim düğmesi kalıcı olarak kapanır.
  const [unavailable, setUnavailable] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const loadList = useCallback(() => {
    listReports()
      .then(setRows)
      .catch(() => setError('Raporlar yüklenemedi.'));
  }, []);

  useEffect(loadList, [loadList]);

  const generate = () => {
    const { start, end } = rangeFor(period);
    setBusy(true);
    setError(null);
    generateIncomeExpenseReport(start, end)
      .then((report) => {
        setCurrent(report);
        loadList();
      })
      .catch((e: Error) => {
        if (e.message.includes('503')) setUnavailable(true);
        // 422/502 gövdesindeki TR metni göster; ayıklanamazsa genel mesaj.
        const detail = e.message.split('detail":"')[1]?.split('"')[0];
        setError(detail || 'Rapor üretilemedi.');
      })
      .finally(() => setBusy(false));
  };

  const open = (id: number) => {
    setError(null);
    getReport(id)
      .then(setCurrent)
      .catch(() => setError('Rapor açılamadı.'));
  };

  return (
    <>
      {/* üretici */}
      <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Gelir–gider raporu</div>
          <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>
            Seçilen dönemin tablosu hesaplanır ve yapay zekâ ile yorumlanır.
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <PeriodPicker value={period} onChange={setPeriod} />
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8, fontSize: 12 }}
            onClick={generate}
            disabled={busy || unavailable}
          >
            {busy ? 'Rapor hazırlanıyor…' : 'Rapor üret'}
          </button>
        </div>
      </div>

      {unavailable && (
        <div style={{ ...card, marginTop: 12, fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.5 }}>
          AI raporu yapılandırılmamış. Sunucuda <strong>ANTHROPIC_API_KEY</strong> tanımlandığında
          bu ekran çalışmaya başlar.
        </div>
      )}

      {error && !unavailable && (
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-60)' }}>
          {error}{' '}
          <button
            type="button"
            onClick={generate}
            style={{
              border: 'none', background: 'transparent', padding: 0, font: 'inherit',
              fontSize: 13, color: 'var(--forest)', cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            Tekrar dene
          </button>
        </div>
      )}

      {/* üretilen rapor: önce sayılar, sonra yorum */}
      {current && (
        <>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <KpiCard label="Gelir" value={fmt(current.facts.income.total)} accent="var(--forest)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard label="Gider" value={fmt(current.facts.expense.total)} accent="var(--bad)" />
            </div>
            <div style={{ flex: 1 }}>
              <KpiCard
                label={current.facts.profit >= 0 ? 'Kâr' : 'Zarar'}
                value={fmt(Math.abs(current.facts.profit))}
                accent={current.facts.profit >= 0 ? 'var(--sage)' : 'var(--bad)'}
              />
            </div>
          </div>

          <div style={{ ...card, marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Yorum</div>
              <div style={{ fontSize: 10, color: 'var(--ink-40)' }}>
                {dayLabel(current.period_start)} – {dayLabel(current.period_end)} · {current.model}
              </div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{current.body}</div>
          </div>
        </>
      )}

      {/* geçmiş */}
      <div style={{ ...card, marginTop: 12, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', fontSize: 14, fontWeight: 600 }}>
          Son raporlar
        </div>
        {rows?.length === 0 && (
          <div style={{ padding: 20, fontSize: 12, color: 'var(--ink-40)' }}>
            Henüz rapor üretilmedi.
          </div>
        )}
        {rows?.map((r) => (
          <div
            key={r.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
              borderBottom: '1px solid var(--line)', fontSize: 12,
            }}
          >
            <button
              type="button"
              onClick={() => open(r.id)}
              style={{
                flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'transparent',
                padding: 0, font: 'inherit', fontSize: 12, cursor: 'pointer',
              }}
            >
              Gelir–gider · {dayLabel(r.period_start)} – {dayLabel(r.period_end)}
            </button>
            <span style={{ color: 'var(--ink-40)', fontSize: 10 }}>{relativeTime(r.created_at)}</span>
            {confirmId === r.id ? (
              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    deleteReport(r.id)
                      .then(() => {
                        setConfirmId(null);
                        if (current?.id === r.id) setCurrent(null);
                        loadList();
                      })
                      .catch(() => setError('Rapor silinemedi.'));
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
                onClick={() => setConfirmId(r.id)}
                style={{
                  border: 'none', background: 'transparent', padding: 0, font: 'inherit',
                  fontSize: 11, color: 'var(--ink-40)', cursor: 'pointer',
                }}
              >
                Kaldır
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 3: Canlı doğrula**

Tarayıcıda `http://localhost:5173/rapor`:

1. Sayfa açılır; "Son raporlar" boşsa "Henüz rapor üretilmedi." görünür.
2. **Anahtar yoksa:** "Rapor üret" → düğme kapanır, "AI raporu yapılandırılmamış…" kutusu çıkar, düğme devre dışı kalır.
3. **Anahtar varsa:** "Rapor üret" → düğme "Rapor hazırlanıyor…" olur; birkaç saniye sonra üstte Gelir / Gider / Kâr kartları, altında Türkçe yorum belirir; rapor listeye düşer.
4. Listedeki bir satıra tıkla → o rapor yukarıda açılır.
5. "Kaldır" → "Sil / Vazgeç"; "Sil" satırı kaldırır, açık rapor oysa ekrandan da kalkar.
6. Veri olmayan bir dönem seç (ör. gelecek yıl yoksa "Yıl" yerine boş bir dönem) → "Bu dönemde rapor üretecek veri yok" mesajı.

Konsolda hata olmamalı.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Rapor.tsx
git commit -m "Drive the report screen from real data and a real model call

Numbers render above the commentary because the numbers are the part that can
be checked. Generation is the first genuinely slow action in the app, so the
button reports its own progress rather than leaving the page still."
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

Expected — backend: `app/reports/{__init__,models,schemas,service,llm,prompt,router}.py`, `app/core/{config,registry}.py`, `app/content/messages.py`, `app/main.py`, `requirements.txt`, `.env.example`, **tek** migration dosyası.
Frontend: `src/api/reports.ts`, `src/pages/Rapor.tsx` + doküman dosyaları.

`requirements.txt`'teki `anthropic` sürümünün kurulu sürümle aynı olduğunu doğrula:

```bash
cd ~/Desktop/kisisel/w-lush && grep anthropic requirements.txt && .venv/bin/pip show anthropic | grep -i "^version:"
```

- [ ] **Step 4: Backend PR'ı aç**

Task 4 Step 8 atlandıysa PR gövdesindeki doğrulama satırını **buna göre yaz** — gerçek çağrı yapılmadıysa yapıldı deme.

```bash
cd ~/Desktop/kisisel/w-lush && git push -u origin feature/ai-reports
gh pr create --title "Add AI-written income/expense reports" --body "$(cat <<'EOF'
Yeni `reports` tablosu ve `app/reports/` modülü. Uçlar: `POST /api/reports/income-expense`, `GET /api/reports`, `GET /api/reports/{id}`, `DELETE /api/reports/{id}`.

- **Projenin ilk LLM entegrasyonu** ve ilk dış model bağımlılığı (`anthropic`). Messages API'yi elle yazmak SDK'nın hata tiplerini ve yeniden denemesini yeniden yazmak olurdu.
- **Modele yalnızca toplamlar gider** — danışan adı, telefon, tekil kayıt yok. Gönderilen JSON `facts` olarak raporla birlikte saklanır, yani sınır denetlenebilir.
- `stop_reason` **`content` okunmadan önce** kontrol edilir; ret ile ağ hatası aynı 502'yi döner ama logda ayrılır.
- Veri olmayan dönem modele hiç gitmez (422) — boş bir ay para harcayamaz.
- Üretim IP başına saatte 10 ile sınırlı. Spec "klinik başına" diyordu; `slowapi` IP'ye anahtarlıyor ve klinik bazlı sayım JWT çözen özel bir `key_func` gerektirirdi — fark bilerek kabul edildi.
- Model: `claude-opus-5`, `effort: low`, `max_tokens: 2000`.

Spec: `w-lush-web/docs/superpowers/specs/2026-08-10-rapor-ai-yorum-design.md`
EOF
)"
```

- [ ] **Step 5: Frontend PR'ı aç**

Backend PR'ı **merge edildikten sonra**:

```bash
cd ~/Desktop/kisisel/w-lush-web && git push -u origin feature/rapor-ai
gh pr create --title "Drive the report screen from a real model call" --body "$(cat <<'EOF'
`Rapor.tsx` içindeki şablon, prompt, geçmiş ve zamanlanmış rapor dizileri kaldırıldı; ekran `/api/reports` uçlarından besleniyor.

- Dönem seç → "Rapor üret" → sayılar (Gelir / Gider / Kâr) ve altında Türkçe yorum. **Sayılar önce**, çünkü doğrulanabilir olan onlar.
- Anahtar yapılandırılmamışsa (503) düğme kapanır ve ekran bunu söyler.
- Üretim uygulamadaki ilk gerçekten yavaş işlem; düğme kendi durumunu bildirir.
- Diğer beş şablon (personel, VIP, huni, no-show, gelir vs gider dışındakiler) kaldırıldı — altlarında veri yok, o iş rapor işi değil veri işi.

**Backend önce merge edilmeli:** selamet/w-lush PR.

Spec: `docs/superpowers/specs/2026-08-10-rapor-ai-yorum-design.md`
EOF
)"
```

---

## Self-Review

**Spec kapsamı:** Bağımlılık + ayar + tablo + migration → Task 1. `facts` üretimi ve gizlilik sınırı + saklama → Task 2. Prompt + model çağrısı + ret/hata ayrımı → Task 3. Uçlar + hız sınırı + TR metinler → Task 4. API katmanı → Task 5. Ekran → Task 6. Kapılar ve yayın → Task 7. Spec'in kapsam dışı listesi (dışa aktarma, zamanlanmış e-posta, serbest metin sorgu, diğer şablonlar) hiçbir task'ta uygulanmıyor.

**Spec'ten sapma (bilinçli):** hız sınırı klinik başına değil **IP başına**. `slowapi` IP'ye anahtarlıyor; klinik bazlı sayım JWT çözen özel bir `key_func` gerektirir. Task 4'te ve PR gövdesinde yazılı.

**Placeholder taraması:** Tüm adımlar gerçek kod veya çalıştırılabilir komut içeriyor. Tek "sonra doldurulacak" değer `anthropic` sürümü — ve o bilerek tahmin edilmiyor: kurulup `pip show` ile okunuyor.

**Tip tutarlılığı:** `build_facts()` çıktısının anahtarları (`period`, `income`, `expense`, `profit`) frontend `ReportFacts` ile birebir. `income.by_service` / `expense.by_category` adlandırması iki tarafta aynı. `ReportDetailOut` (backend) ile `ReportDetail` (frontend) alanları eşleşiyor; `facts` backend'de JSON metinden nesneye çözülüp öyle dönüyor. `llm.MODEL` router'a, oradan `Report.model` alanına, oradan ekrandaki etikete aynı değer olarak akıyor.

**Bilinen kırılganlıklar:** (1) Form/ekran, TR hata metnini `client.ts`'in mesaj dizesinden ayıklıyor — gelir ve gider ekranlarıyla aynı desen; kalıcı çözüm `client.ts`'e yapılandırılmış hata nesnesi eklemek ve artık üç ekranı birden düzeltir. (2) 503 tespiti `e.message.includes('503')` ile yapılıyor; aynı yapılandırılmış-hata işi bunu da temizler.
