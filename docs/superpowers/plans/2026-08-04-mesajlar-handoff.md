# Mesajlar / Handoff Ekranı Implementation Plan

**Durum: TAMAMLANDI** — backend PR [selamet/w-lush#6](https://github.com/selamet/w-lush/pull/6) ve frontend PR [#3](https://github.com/hakanbudak/w-lush-web/pull/3) merge edildi (2026-08-04). Devamında gönderim sırası düzeltmesi backend PR [#8](https://github.com/selamet/w-lush/pull/8) ile geldi. Tüm adımlar işaretli; bu dosya artık kayıt amaçlıdır.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Operatörün, botun kendisine devrettiği müşteriye panelden cevap yazabilmesi.

**Architecture:** Backend'e konuşmaları listeleyen tek bir uç eklenir (şema değişmez). Frontend'e iki panelli bir "Mesajlar" sayfası gelir: solda konuşma listesi, sağda thread + cevap kutusu. `/randevu`'daki daha eksik "WhatsApp Talepleri" kartı kaldırılır.

**Tech Stack:** Backend FastAPI + SQLAlchemy 2.0 (`selamet/w-lush`). Frontend React 18 + TypeScript + react-router-dom v6 + Vite (`hakanbudak/w-lush-web`). Yeni bağımlılık YOK.

**Spec:** `w-lush-web/docs/superpowers/specs/2026-08-04-mesajlar-handoff-design.md`

## Global Constraints

**İki repo, iki branch — karıştırma:**

| Repo | Yol | Branch |
|---|---|---|
| Backend | `~/Desktop/kişisel/w-lush` | `feature/conversations-list` |
| Frontend | `~/Desktop/kişisel/w-lush-web` | `feature/messages` |

- **Şema değişmez, Alembic migration eklenmez.** Yeni tablo/kolon yok.
- **Yeni bağımlılık eklenmez** (ne pip ne npm).
- Kod, tip ve fonksiyon adları **İngilizce**; kullanıcıya görünen metinler **Türkçe**. Backend'de kullanıcıya görünen TR metin yalnız `app/content/messages.py` içinde durur.
- Frontend renkleri mevcut CSS değişkenleriyle: `--paper`, `--cream`, `--line`, `--line-strong`, `--ink`, `--ink-40`, `--ink-60`, `--champagne-2`, `--forest`, `--forest-3`, `--wa-green`, `--bad`.
- Frontend HTTP çağrıları **yalnız** `src/api/*.ts` içinden.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK** (`Co-authored-by` / Claude izi). Backend reposunda bunu `.githooks` zorluyor, CI de reddediyor.
- Backend kapıları: `ruff check app` temiz, `python -c "from app.main import app"` geçer, `alembic revision --autogenerate` **boş** migration üretir.
- Frontend kapıları: `npm run typecheck` ve `npm run build` **exit 0**.
- Hiçbir task push/merge/PR yapmaz — bunların hepsi Task 6'da.

## Test durumu — önemli

Backend reposunda test suite **silinmiş** (`requirements-dev.txt` de yok), frontend'de test koşucusu **hiç olmadı**; bu plan ikisini de kurmuyor — bu ayrı bir karar. Doğrulama bunun yerine **derleyici/linter + canlı uç + headless tarayıcı** ile yapılır. Her doğrulama adımı gerçek bir komut ve beklenen çıktı içerir.

**Ön koşul — ikisi de ayakta olmalı:**

```bash
cd ~/Desktop/kişisel/w-lush && .venv/bin/python -m uvicorn app.main:app --port 8000
cd ~/Desktop/kişisel/w-lush-web && npm run dev
```

Test hesabı: `smoke2@example.com` / `Test12345!` (clinic_id=1, is_admin). `curl` bu ortamda bloklu — HTTP kontrolleri python heredoc ile yapılır.

**Test verisi üretimi** (konuşma olmadan hiçbir şey doğrulanamaz) — `import app.main` **ilk sırada** olmalı, yoksa SQLAlchemy `NoReferencedTableError` verir:

```bash
cd ~/Desktop/kişisel/w-lush && .venv/bin/python - <<'PY'
import app.main  # tüm modelleri kaydeder
from app.core.database import SessionLocal
from app.conversations import service as conv
from app.customers import service as cust
from app.whatsapp.models import ConversationSession

with SessionLocal() as db:
    # 1) Cevap bekleyen + handoff'ta olan müşteri
    c = cust.get_or_create(db, 1, "905321112233")
    cust.set_name(db, c, "Ayşe Yılmaz")
    conv.record(db, 1, "905321112233", conv.IN, "Merhaba, dolgu sonrası ne yapmalıyım?")
    db.merge(ConversationSession(key="1:905321112233", state="SILENT", data={}))
    # 2) Operatör cevaplamış, handoff'ta olmayan müşteri
    conv.record(db, 1, "905334445566", conv.IN, "Fiyat listesi alabilir miyim?")
    conv.record(db, 1, "905334445566", conv.OUT, "Tabii, hemen gönderiyorum.")
    db.commit()
    print("hazır:", [(m.phone, m.direction, m.body[:20]) for m in conv.thread(db, 1, "905321112233")])
PY
```

---

### Task 1: Backend — `GET /api/conversations`

**Repo:** `~/Desktop/kişisel/w-lush`, branch `feature/conversations-list`

**Files:**
- Modify: `app/conversations/service.py` (yeni `summaries()` fonksiyonu)
- Modify: `app/conversations/schemas.py` (yeni `ConversationOut`)
- Modify: `app/conversations/router.py` (yeni uç, `/{phone}`'dan önce)

**Interfaces:**
- Consumes: `Message` (`app/conversations/models.py`), `Customer` (`app/customers/models.py`), `ConversationSession` (`app/whatsapp/models.py`), `get_current_user` (`app/core/deps.py`)
- Produces: `GET /api/conversations` → `list[ConversationOut]`, alanlar: `phone: str`, `customer_name: str`, `last_message: str`, `last_direction: str`, `last_at: datetime`, `waiting: bool`, `handoff: bool`

- [x] **Step 1: `summaries()` fonksiyonunu `app/conversations/service.py` sonuna ekle**

Dosyanın en üstündeki import bloğunu şununla değiştir:

```python
"""Conversation thread persistence."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.conversations.models import Message
from app.customers.models import Customer
from app.whatsapp.models import ConversationSession

IN = "in"
OUT = "out"

# The bot goes quiet while a customer is handed off to a human operator.
HANDOFF_STATE = "SILENT"
```

Dosyanın **sonuna** ekle:

```python
def summaries(db: Session, clinic_id: int, limit: int = 100) -> list[dict]:
    """One row per phone: the latest message plus who is waiting on whom.

    `waiting` and `handoff` are derived, never stored: a conversation is
    waiting when the customer spoke last, and handed off when the bot's
    session sits in SILENT.
    """
    # Newest message per phone. max(id) rather than max(created_at): ids are
    # monotonic, so two messages sharing a timestamp cannot both win.
    latest_ids = (
        select(func.max(Message.id))
        .where(Message.clinic_id == clinic_id)
        .group_by(Message.phone)
    )
    messages = list(db.scalars(select(Message).where(Message.id.in_(latest_ids))).all())
    if not messages:
        return []

    phones = [m.phone for m in messages]

    # Two batched lookups instead of one query per row.
    names = dict(
        db.execute(
            select(Customer.phone, Customer.name).where(
                Customer.clinic_id == clinic_id, Customer.phone.in_(phones)
            )
        ).all()
    )
    keys = {f"{clinic_id}:{phone}": phone for phone in phones}
    handoff_phones = {
        keys[key]
        for key, state in db.execute(
            select(ConversationSession.key, ConversationSession.state).where(
                ConversationSession.key.in_(keys)
            )
        ).all()
        if state == HANDOFF_STATE
    }

    rows = [
        {
            "phone": m.phone,
            "customer_name": names.get(m.phone) or "",
            "last_message": m.body,
            "last_direction": m.direction,
            "last_at": m.created_at,
            "waiting": m.direction == IN,
            "handoff": m.phone in handoff_phones,
        }
        for m in messages
    ]
    # Waiting first, then newest. Python-side: the set is capped at `limit`.
    rows.sort(key=lambda r: (not r["waiting"], -r["last_at"].timestamp()))
    return rows[:limit]
```

- [x] **Step 2: `ConversationOut` şemasını `app/conversations/schemas.py` sonuna ekle**

```python
class ConversationOut(BaseModel):
    """One line in the operator's inbox."""

    phone: str
    customer_name: str
    last_message: str
    last_direction: str
    last_at: datetime
    waiting: bool
    handoff: bool
```

- [x] **Step 3: Ucu `app/conversations/router.py`'ye ekle**

Import satırını genişlet:

```python
from app.conversations.schemas import ConversationOut, MessageOut, ReplyIn
```

Ucu, **`get_thread`'den önce** (yani `router = APIRouter(...)` satırının hemen ardına) koy:

```python
@router.get("", response_model=list[ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Inbox: every phone with a thread, waiting ones first."""
    return service.summaries(db, current.clinic_id)
```

- [x] **Step 4: Lint ve import kapılarını çalıştır**

Run:

```bash
cd ~/Desktop/kişisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')"
```

Expected: `All checks passed!` ve `import ok`.

- [x] **Step 5: Şemanın değişmediğini kanıtla**

Run:

```bash
cd ~/Desktop/kişisel/w-lush && .venv/bin/alembic revision --autogenerate -m "drift check" 2>&1 | tail -2
f=$(ls -t alembic/versions/*drift_check.py | head -1); sed -n '/def upgrade/,/def downgrade/p' "$f"; rm "$f"
```

Expected: `upgrade()` gövdesinde yalnız `pass` — yani drift yok. Geçici dosya silinir.

- [x] **Step 6: Ucu canlı doğrula**

Önce yukarıdaki "Test verisi üretimi" bloğunu çalıştır, sonra:

```bash
cd ~/Desktop/kişisel/w-lush-web && python3 - <<'PY'
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
        return getattr(e, "code", "ERR"), (e.read().decode()[:200] if hasattr(e, "read") else str(e))

s, b = req("/api/auth/login", "POST", {"email": "smoke2@example.com", "password": "Test12345!"})
tok = json.loads(b)["token"]["access_token"]

print("tokensiz:", req("/api/conversations")[0])          # 401 bekleniyor
s, b = req("/api/conversations", token=tok)
print("status:", s)
rows = json.loads(b)
for r in rows:
    print(f"  {r['phone']} | {r['customer_name'] or '-':14} | waiting={r['waiting']} handoff={r['handoff']} | {r['last_message'][:30]}")
assert s == 200
assert rows and rows[0]["waiting"] is True, "bekleyen konuşma en üstte olmalı"
assert {"phone","customer_name","last_message","last_direction","last_at","waiting","handoff"} == set(rows[0])
print("UÇ OK")
PY
```

Expected: `tokensiz: 401`; `status: 200`; iki satır — `905321112233` (`waiting=True handoff=True`) **üstte**, `905334445566` (`waiting=False handoff=False`) altta; son satır `UÇ OK`.

- [x] **Step 7: Commit**

```bash
cd ~/Desktop/kişisel/w-lush
git add app/conversations/service.py app/conversations/schemas.py app/conversations/router.py
git commit -m "Add GET /api/conversations for the operator inbox

The reply and release endpoints already existed but assumed the caller
knew the phone number; nothing listed who had written in. Summaries group
messages by phone, resolve the customer name, and derive two flags the
panel needs: waiting (the customer spoke last) and handoff (the bot's
session is SILENT). No schema change."
```

---

### Task 2: Frontend — ortak zaman yardımcıları

Davranış değişmez; bu task yalnız `relativeTime`'ı ikinci tüketiciye hazırlar.

**Repo:** `~/Desktop/kişisel/w-lush-web`, branch `feature/messages`

**Files:**
- Create: `src/utils/time.ts`
- Modify: `src/api/notifications.ts` (yerel `normalizeCreatedAt` → ortak `toUtcIso`)
- Modify: `src/components/NotificationBell.tsx` (yerel `relativeTime` → import)

**Interfaces:**
- Produces: `toUtcIso(raw: string): string`, `relativeTime(iso: string): string` — ikisi de `src/utils/time.ts`'ten

- [x] **Step 1: `src/utils/time.ts` dosyasını oluştur**

```ts
// Zaman biçimlendirme — bildirimler ve mesajlar aynı kuralları paylaşır.

/**
 * Backend `created_at`'i naive UTC üretiyor (offset/`Z` yok). Eki yoksa
 * tarayıcı yerel saat varsayar ve production'da (API UTC, tarayıcı UTC+3)
 * saatler saatlerce ileri kayar. Offset yoksa `Z` ekleyip UTC'ye sabitleriz.
 */
export function toUtcIso(raw: string): string {
  return /Z$|[+-]\d{2}:\d{2}$/.test(raw) ? raw : `${raw}Z`;
}

/** "az önce" / "12 dk önce" / "3 sa önce" / "dün 14:20" / "9 Ağu 11:00" */
export function relativeTime(iso: string): string {
  // `iso` api katmanında toUtcIso ile normalize edilmiş olarak gelir. Yine de
  // saat kayması diffMin'i negatif yapabilir, Math.max ile 0'a kelepçeleriz.
  const then = new Date(iso);
  const diffMin = Math.max(0, Math.floor((Date.now() - then.getTime()) / 60_000));

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dk önce`;

  const today = new Date();
  const sameDay = then.toDateString() === today.toDateString();
  if (sameDay) return `${Math.floor(diffMin / 60)} sa önce`;

  const hhmm = then.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return `dün ${hhmm}`;

  const dm = then.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  return `${dm} ${hhmm}`;
}

/** Sadece saat — mesaj balonlarının altında kullanılır. */
export const clockTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
```

- [x] **Step 2: `src/api/notifications.ts`'i ortak yardımcıya bağla**

`normalizeCreatedAt` fonksiyonunun **tamamını ve üstündeki yorum bloğunu** sil. Import satırının altına ekle:

```ts
import { toUtcIso } from '../utils/time';
```

Ve yerine bu tek satırlık sarmalayıcıyı koy:

```ts
const normalizeCreatedAt = (note: AppNotification): AppNotification => ({
  ...note,
  created_at: toUtcIso(note.created_at),
});
```

`listNotifications` ve `markRead` içindeki `normalizeCreatedAt` kullanımları **değişmez**.

- [x] **Step 3: `src/components/NotificationBell.tsx`'teki yerel kopyayı sil**

`/** "az önce" / ... */` yorumuyla başlayan `function relativeTime(iso: string): string { … }` bloğunun tamamını sil. Dosyanın import bloğuna ekle:

```tsx
import { relativeTime } from '../utils/time';
```

Çağrı yerleri değişmez.

- [x] **Step 4: Derlemeyi doğrula**

Run: `cd ~/Desktop/kişisel/w-lush-web && npm run typecheck && npm run build`
Expected: ikisi de exit 0 (`echo $?` ile teyit et), build `✓ built in …` ile biter.

- [x] **Step 5: Bildirim panelinin bozulmadığını canlı doğrula**

Run:

```bash
cd ~/Desktop/kişisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:5173"
r = urllib.request.Request(B + "/api/auth/login", method="POST",
    data=json.dumps({"email": "smoke2@example.com", "password": "Test12345!"}).encode())
r.add_header("Content-Type", "application/json")
with urllib.request.urlopen(r) as resp: tok = json.loads(resp.read())["token"]["access_token"]
r = urllib.request.Request(B + "/api/notifications"); r.add_header("Authorization", "Bearer " + tok)
with urllib.request.urlopen(r) as resp: print("notifications:", resp.status, "adet:", len(json.loads(resp.read())))
PY
```

Expected: `notifications: 200 adet: N` (N ≥ 0). Bu task davranışı değiştirmediği için uç yanıtı Task 2 öncesiyle aynı olmalı.

- [x] **Step 6: Commit**

```bash
cd ~/Desktop/kişisel/w-lush-web
git add src/utils/time.ts src/api/notifications.ts src/components/NotificationBell.tsx
git commit -m "Extract shared time helpers into src/utils/time

relativeTime lived inside NotificationBell and the UTC normalization inside
the notifications API module. The messages screen needs both, so they move
to one module rather than being copied. No behaviour change."
```

---

### Task 3: Frontend — konuşma API katmanı

**Repo:** `~/Desktop/kişisel/w-lush-web`, branch `feature/messages`

**Files:**
- Create: `src/api/conversations.ts`

**Interfaces:**
- Consumes: `request<T>` (`src/api/client.ts`), `toUtcIso` (`src/utils/time.ts`)
- Produces:
  - `interface Conversation { phone: string; customer_name: string; last_message: string; last_direction: string; last_at: string; waiting: boolean; handoff: boolean }`
  - `interface ChatMessage { id: number; phone: string; direction: string; body: string; created_at: string }`
  - `listConversations(): Promise<Conversation[]>`
  - `getThread(phone: string): Promise<ChatMessage[]>`
  - `sendReply(phone: string, message: string): Promise<ChatMessage>`
  - `releaseToBot(phone: string): Promise<void>`

- [x] **Step 1: `src/api/conversations.ts` dosyasını oluştur**

```ts
// Operatör ↔ müşteri konuşmaları — backend: app/conversations/.
import { toUtcIso } from '../utils/time';
import { request } from './client';

/** Gelen kutusundaki bir satır. `waiting`/`handoff` backend'de türetilir. */
export interface Conversation {
  phone: string;
  customer_name: string;
  last_message: string;
  last_direction: string; // "in" (müşteri) | "out" (operatör)
  last_at: string; // ISO
  waiting: boolean; // son sözü müşteri söyledi
  handoff: boolean; // bot susmuş durumda (SILENT)
}

/** Thread'deki tek mesaj. */
export interface ChatMessage {
  id: number;
  phone: string;
  direction: string; // "in" | "out"
  body: string;
  created_at: string; // ISO
}

// Telefon yol parçası olarak gidiyor; kodlamadan geçirmek şart.
const path = (phone: string, suffix = '') =>
  `/api/conversations/${encodeURIComponent(phone)}${suffix}`;

export const listConversations = () =>
  request<Conversation[]>('/api/conversations').then((rows) =>
    rows.map((r) => ({ ...r, last_at: toUtcIso(r.last_at) })),
  );

export const getThread = (phone: string) =>
  request<ChatMessage[]>(path(phone)).then((rows) =>
    rows.map((m) => ({ ...m, created_at: toUtcIso(m.created_at) })),
  );

export const sendReply = (phone: string, message: string) =>
  request<ChatMessage>(path(phone, '/reply'), {
    method: 'POST',
    body: JSON.stringify({ message }),
  }).then((m) => ({ ...m, created_at: toUtcIso(m.created_at) }));

export const releaseToBot = (phone: string) =>
  request<{ status: string }>(path(phone, '/release'), { method: 'POST' }).then(
    () => undefined,
  );
```

- [x] **Step 2: Derlemeyi doğrula**

Run: `cd ~/Desktop/kişisel/w-lush-web && npm run typecheck`
Expected: çıktı yok, exit 0.

- [x] **Step 3: Sözleşmenin backend'le uyuştuğunu canlı doğrula**

Run:

```bash
cd ~/Desktop/kişisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:5173"
def req(p, m="GET", b=None, t=None):
    d = json.dumps(b).encode() if b is not None else None
    r = urllib.request.Request(B + p, data=d, method=m)
    if b is not None: r.add_header("Content-Type", "application/json")
    if t: r.add_header("Authorization", "Bearer " + t)
    with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()

_, b = req("/api/auth/login", "POST", {"email": "smoke2@example.com", "password": "Test12345!"})
tok = json.loads(b)["token"]["access_token"]
s, b = req("/api/conversations", t=tok); rows = json.loads(b)
print("liste:", s, "adet:", len(rows))
assert {"phone","customer_name","last_message","last_direction","last_at","waiting","handoff"} == set(rows[0])
s, b = req("/api/conversations/" + rows[0]["phone"], t=tok); thread = json.loads(b)
print("thread:", s, "mesaj:", len(thread))
assert {"id","phone","direction","body","created_at"} == set(thread[0])
print("SÖZLEŞME OK")
PY
```

Expected: `liste: 200 adet: 2`, `thread: 200 mesaj: N`, son satır `SÖZLEŞME OK`.

- [x] **Step 4: Commit**

```bash
cd ~/Desktop/kişisel/w-lush-web
git add src/api/conversations.ts
git commit -m "Add conversations API client

Wraps the inbox endpoint plus the thread, reply and release endpoints that
already existed on the backend but had no caller. Timestamps are pinned to
UTC on ingest, same as the notifications module."
```

---

### Task 4: Frontend — Mesajlar sayfası

**Repo:** `~/Desktop/kişisel/w-lush-web`, branch `feature/messages`

**Files:**
- Create: `src/pages/Mesajlar.tsx`
- Modify: `src/App.tsx` (import + `/mesajlar` route'u)
- Modify: `src/config/nav.ts` (menü öğesi)

**Interfaces:**
- Consumes: Task 3'ün tamamı (`Conversation`, `ChatMessage`, `listConversations`, `getThread`, `sendReply`, `releaseToBot`), `relativeTime`/`clockTime` (`src/utils/time.ts`), `Icon` (`src/components/icons.tsx`)
- Produces: `export default function Mesajlar(): JSX.Element`

- [x] **Step 1: `src/pages/Mesajlar.tsx` dosyasını oluştur**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getThread,
  listConversations,
  releaseToBot,
  sendReply,
  type ChatMessage,
  type Conversation,
} from '../api/conversations';
import { Icon } from '../components/icons';
import { clockTime, relativeTime } from '../utils/time';

/** Liste ve açık thread bu aralıkla tazelenir (sekme görünürken). */
const POLL_MS = 60_000;

const displayName = (c: Conversation): string => c.customer_name || c.phone;

export default function Mesajlar() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const loadList = useCallback(() => {
    setListError(null);
    listConversations()
      .then(setItems)
      .catch(() => setListError('Konuşmalar yüklenemedi.'));
  }, []);

  useEffect(() => {
    loadList();
    const tick = () => {
      if (document.visibilityState === 'visible') loadList();
    };
    const timer = window.setInterval(tick, POLL_MS);
    window.addEventListener('focus', loadList);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', loadList);
    };
  }, [loadList]);

  const current = items?.find((c) => c.phone === selected) ?? null;

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 160px)' }}>
      <div
        style={{
          width: 320,
          flexShrink: 0,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Konuşmalar</span>
          </div>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={loadList}>
            Yenile
          </button>
        </div>

        <div style={{ overflowY: 'auto' }}>
          {listError && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-60)' }}>
              {listError}{' '}
              <button
                type="button"
                onClick={loadList}
                style={{
                  border: 'none', background: 'transparent', padding: 0,
                  fontFamily: 'inherit', fontSize: 12, color: 'var(--forest)',
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Tekrar dene
              </button>
            </div>
          )}
          {!listError && items === null && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
          )}
          {!listError && items?.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
              Henüz konuşma yok — WhatsApp’tan mesaj geldiğinde burada görünür.
            </div>
          )}
          {items?.map((c) => (
            <button
              key={c.phone}
              type="button"
              onClick={() => setSelected(c.phone)}
              style={{
                display: 'flex', gap: 8, width: '100%', textAlign: 'left',
                padding: '10px 14px', border: 'none',
                borderBottom: '1px solid var(--line)',
                borderLeft:
                  c.phone === selected ? '3px solid var(--forest)' : '3px solid transparent',
                background: c.waiting ? 'var(--cream)' : 'transparent',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: 999, marginTop: 7, flexShrink: 0,
                  background: c.waiting ? 'var(--champagne-2)' : 'transparent',
                }}
              />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {displayName(c)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--ink-40)', whiteSpace: 'nowrap' }}>
                    {relativeTime(c.last_at)}
                  </span>
                </span>
                <span
                  style={{
                    display: 'block', fontSize: 12, color: 'var(--ink-60)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {c.last_direction === 'out' ? 'Siz: ' : ''}
                  {c.last_message}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {current ? (
        <Thread key={current.phone} conversation={current} onChanged={loadList} />
      ) : (
        <div
          style={{
            flex: 1, background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 12, display: 'grid', placeItems: 'center',
            fontSize: 13, color: 'var(--ink-40)',
          }}
        >
          Soldan bir konuşma seç.
        </div>
      )}
    </div>
  );
}

function Thread({
  conversation,
  onChanged,
}: {
  conversation: Conversation;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { phone } = conversation;

  const load = useCallback(() => {
    setError(null);
    getThread(phone)
      .then(setMessages)
      .catch(() => setError('Mesajlar yüklenemedi.'));
  }, [phone]);

  useEffect(() => {
    load();
    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    sendReply(phone, text)
      .then((sent) => {
        // Poll beklemeden göster; taslak yalnız başarıda temizlenir.
        setMessages((prev) => [...(prev ?? []), sent]);
        setDraft('');
        onChanged();
      })
      .catch(() => setSendError('Mesaj gönderilemedi. Metniniz kutuda duruyor.'))
      .finally(() => setSending(false));
  }

  function release() {
    releaseToBot(phone)
      .then(() => {
        load();
        onChanged();
      })
      .catch(() => setSendError('Bota geri verilemedi.'));
  }

  return (
    <div
      style={{
        flex: 1, minWidth: 0, background: 'var(--paper)',
        border: '1px solid var(--line)', borderRadius: 12,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName(conversation)}</div>
          <div className="wl-mono" style={{ fontSize: 11, color: 'var(--ink-40)' }}>
            {conversation.phone}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={load}>
            Yenile
          </button>
          {conversation.handoff && (
            <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={release}>
              Bota geri ver
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--ink-60)' }}>
            {error}{' '}
            <button
              type="button"
              onClick={load}
              style={{
                border: 'none', background: 'transparent', padding: 0,
                fontFamily: 'inherit', fontSize: 12, color: 'var(--forest)',
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Tekrar dene
            </button>
          </div>
        )}
        {!error && messages === null && (
          <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
        )}
        {messages?.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: m.direction === 'out' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <div style={{ maxWidth: '70%' }}>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: m.direction === 'out' ? 'var(--forest-3)' : 'var(--cream)',
                  fontSize: 13,
                  color: 'var(--ink)',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.body}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--ink-40)',
                  marginTop: 2,
                  textAlign: m.direction === 'out' ? 'right' : 'left',
                }}
              >
                {clockTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid var(--line)', padding: 12 }}>
        {sendError && (
          <div style={{ fontSize: 12, color: 'var(--bad)', marginBottom: 8 }}>{sendError}</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Cevabınızı yazın…"
            rows={2}
            style={{
              flex: 1, resize: 'vertical', minHeight: 44, padding: '10px 12px',
              border: '1px solid var(--line-strong)', borderRadius: 8,
              background: 'var(--cream)', fontFamily: 'inherit', fontSize: 13,
              color: 'var(--ink)', outline: 'none',
            }}
          />
          <button
            className="wl-btn wl-btn-sm"
            style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8, height: 36 }}
            onClick={submit}
            disabled={sending || !draft.trim()}
          >
            {sending ? '…' : 'Gönder'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Route'u `src/App.tsx`'e ekle**

Import bloğuna (alfabetik sırada, `Login`'den sonra) ekle:

```tsx
import Mesajlar from './pages/Mesajlar';
```

`/randevu` route'unun hemen altına ekle:

```tsx
          <Route path="/mesajlar" element={<Mesajlar />} />
```

- [x] **Step 3: Menü öğesini `src/config/nav.ts`'e ekle**

`randevu` satırının hemen **altına** ekle:

```ts
  { key: 'mesajlar', label: 'Mesajlar', title: 'Mesajlar', path: '/mesajlar', icon: 'whatsapp' },
```

- [x] **Step 4: Derlemeyi doğrula**

Run: `cd ~/Desktop/kişisel/w-lush-web && npm run typecheck && npm run build`
Expected: ikisi de exit 0.

- [x] **Step 5: Canlı doğrula — uçtan uca akış**

Tarayıcıda `http://localhost:5173` → `smoke2@example.com` / `Test12345!` ile gir, sol menüden **Mesajlar**:

1. Solda iki konuşma; **Ayşe Yılmaz üstte**, solunda nokta ve krem dolgu (cevap bekliyor).
2. Ayşe'ye tıkla → sağda thread açılır, mesaj solda krem balonda, altında saat.
3. Başlıkta telefon görünür ve **"Bota geri ver" butonu VAR** (bu konuşma handoff'ta).
4. Kutuya bir cevap yaz, **Gönder** → balon sağda yeşil olarak anında belirir, kutu temizlenir, soldaki satır "Siz: …" olur ve nokta kalkar.
5. İkinci konuşmayı (`905334445566`) seç → **"Bota geri ver" butonu YOK** (handoff'ta değil).
6. "Bota geri ver"e bas (birinci konuşmada) → buton kaybolur.
7. Boş kutuyla "Gönder" → buton pasif, istek gitmez.

Expected: yedi maddenin hepsi tarif edildiği gibi. 3. ve 5. maddeler `handoff` bayrağının gerçekten kullanıldığını kanıtlar; buton her ikisinde de görünüyorsa koşul unutulmuştur.

- [x] **Step 6: Commit**

```bash
cd ~/Desktop/kişisel/w-lush-web
git add src/pages/Mesajlar.tsx src/App.tsx src/config/nav.ts
git commit -m "Add the Mesajlar screen for two-way handoff

The bot hands a customer to a human and goes quiet, but the panel had no
way to answer them. Conversations list on the left, thread and composer on
the right. Release-to-bot only appears when the session is actually in
handoff. A failed send keeps the operator's text in the box."
```

---

### Task 5: Frontend — talepler kartını kaldır

**Repo:** `~/Desktop/kişisel/w-lush-web`, branch `feature/messages`

**Files:**
- Modify: `src/pages/RandevuTakvimi.tsx`

**Interfaces:**
- Consumes: yok (silme işi)
- Produces: yok

- [x] **Step 1: `WhatsAppTalepleri` bileşenini ve kullanımını sil**

`src/pages/RandevuTakvimi.tsx` içinde:

1. `function WhatsAppTalepleri() { … }` bileşeninin **tamamını** sil (268. satır civarında başlar, kendi `return`'ünün kapanışıyla biter).
2. Render ağacındaki `<WhatsAppTalepleri />` satırını sil (730. satır civarı).
3. Artık kullanılmayan importları sil: `listRequests` ve `type ClinicRequest` (`../api/clinic` importundan). **Aynı importtan gelen diğer isimlere dokunma.**
4. Bileşen silinince başka bir yerde kullanılmayan yardımcılar kalırsa (`reqStatus`, `maskPhone`, `fmtDateTime` gibi) onları da sil — ama **yalnız** dosyanın başka yerinde kullanılmıyorlarsa. Kontrol: `grep -n "reqStatus\|maskPhone\|fmtDateTime" src/pages/RandevuTakvimi.tsx`.

`noUnusedLocals` açık olduğu için kullanılmayan bir şey kalırsa `npm run typecheck` zaten patlar — bu senin güvenlik ağın.

- [x] **Step 2: Derlemeyi doğrula**

Run: `cd ~/Desktop/kişisel/w-lush-web && npm run typecheck && npm run build`
Expected: ikisi de exit 0. Hata alırsan mesaj hangi ismin kullanılmadığını söyler; Adım 1/4'e dön.

- [x] **Step 3: Sidebar rozetinin bozulmadığını doğrula**

Run: `cd ~/Desktop/kişisel/w-lush-web && grep -n "listRequests" src/components/Sidebar.tsx src/pages/*.tsx`
Expected: `Sidebar.tsx` hâlâ `listRequests` kullanıyor (CRM rozeti için) ve `RandevuTakvimi.tsx` artık listede **yok**. Sidebar'daki kullanım silinmemeli.

- [x] **Step 4: Canlı doğrula**

Tarayıcıda `/randevu` sayfasını aç.
Expected: sayfa normal açılıyor, altındaki "WhatsApp Talepleri" kartı **yok**, takvim ve diğer bloklar yerinde. Sol menüdeki CRM rozeti hâlâ çalışıyor.

- [x] **Step 5: Commit**

```bash
cd ~/Desktop/kişisel/w-lush-web
git add src/pages/RandevuTakvimi.tsx
git commit -m "Drop the WhatsApp requests card from the appointments page

It showed the same customers as the new Mesajlar screen but without the
thread, the reply box, or any way to tell who was still waiting. One place
for messages is better than two that disagree."
```

---

### Task 6: Kapanış — tam doğrulama ve iki PR

**Files:** yok (yalnız doğrulama ve teslim)

- [x] **Step 1: Backend kapıları**

Run:

```bash
cd ~/Desktop/kişisel/w-lush && .venv/bin/ruff check app && .venv/bin/python -c "from app.main import app; print('import ok')" && git status -s
```

Expected: `All checks passed!`, `import ok`, ve `git status -s` **boş** (geçici migration dosyası unutulmamış).

- [x] **Step 2: Frontend kapıları**

Run: `cd ~/Desktop/kişisel/w-lush-web && npm run typecheck && npm run build && echo "BUILD OK"`
Expected: son satır `BUILD OK`.

- [x] **Step 3: Değişen dosyaları gözden geçir**

Run:

```bash
cd ~/Desktop/kişisel/w-lush && git diff main --stat
cd ~/Desktop/kişisel/w-lush-web && git diff main --stat
```

Expected — backend 3 dosya: `app/conversations/{service,schemas,router}.py`. Frontend 7 dosya: `src/utils/time.ts`, `src/api/{notifications,conversations}.ts`, `src/components/NotificationBell.tsx`, `src/pages/{Mesajlar,RandevuTakvimi}.tsx`, `src/App.tsx`, `src/config/nav.ts` + iki doküman. Başka dosya değiştiyse istenmeyen değişiklik vardır.

- [x] **Step 4: Backend PR'ı aç**

```bash
cd ~/Desktop/kişisel/w-lush
git push -u origin feature/conversations-list
gh pr create --base main --title "Add GET /api/conversations for the operator inbox" --body "..."
```

PR gövdesi: ucun ne döndürdüğü, `waiting`/`handoff` alanlarının nasıl türetildiği, **şema değişmediği** (autogenerate boş), ve doğrulama çıktısı. **Claude atıfı yazma.**

- [x] **Step 5: Frontend PR'ı aç**

```bash
cd ~/Desktop/kişisel/w-lush-web
git push -u origin feature/messages
gh pr create --base main --title "Mesajlar: two-way handoff screen" --body "..."
```

PR gövdesinde backend PR'ına bağlantı ver ve **frontend'in backend PR'ı merge edilmeden çalışmayacağını** belirt (yeni uç olmadan liste 404 alır). Doğrulama kanıtlarını ve kapsam dışı bırakılanları yaz. **Claude atıfı yazma.**

---

## Self-Review

**Spec kapsamı:** yeni uç + `waiting`/`handoff` türetimi + sıralama → Task 1; `relativeTime`'ın ortak modüle taşınması → Task 2; API katmanı → Task 3; iki panelli sayfa, 60 sn polling, Yenile butonları, gönderme kuralları, durum metinleri, handoff'a bağlı buton → Task 4; talepler kartının kaldırılması ve Sidebar rozetinin korunması → Task 5; kapılar ve iki PR → Task 6. Spec'in "kapsam dışı" maddeleri hiçbir task'ta yer almıyor. Boşluk yok.

**Placeholder taraması:** temiz — her adımda çalıştırılabilir komut ya da gerçek kod var. Task 5 doğası gereği silme işi olduğu için kod bloğu yerine tam konum + `grep` kontrolü + derleyici güvenlik ağı veriyor.

**Tip tutarlılığı:** backend `ConversationOut` alanları ile frontend `Conversation` arayüzü birebir aynı (`phone, customer_name, last_message, last_direction, last_at, waiting, handoff`); `MessageOut` ile `ChatMessage` birebir aynı (`id, phone, direction, body, created_at`). `toUtcIso`/`relativeTime`/`clockTime` Task 2'de tanımlanıp Task 3 ve 4'te aynı adlarla kullanılıyor. `displayName` ve `POLL_MS` Task 4 içinde tanımlanıp yalnız orada kullanılıyor. `onChanged` prop'u `Thread`'e Task 4'te veriliyor ve `loadList`'e bağlanıyor.
