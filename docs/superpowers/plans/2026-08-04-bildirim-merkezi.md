# Bildirim Merkezi Implementation Plan

**Durum: TAMAMLANDI** — frontend PR [#2](https://github.com/hakanbudak/w-lush-web/pull/2) merge edildi (2026-08-04). Tüm adımlar işaretli; bu dosya artık kayıt amaçlıdır.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TopBar'daki dekoratif zil ikonunu, `/api/notifications` uçlarını kullanan canlı bir bildirim merkezine dönüştürmek.

**Architecture:** İki yeni dosya (`src/api/notifications.ts` HTTP katmanı, `src/components/NotificationBell.tsx` kendi state'ini yöneten bileşen) ve `TopBar.tsx`'te sahte zil bloğunun bu bileşenle değiştirilmesi. Ucuz okunmamış-sayacı 60 sn'de bir (sekme görünürken) çekilir; pahalı liste yalnız panel açılınca çekilir.

**Tech Stack:** React 18 + TypeScript, react-router-dom v6, Vite. Yeni bağımlılık YOK. Stil, dosya içi `style` nesneleriyle ve `src/styles/design-system.css` değişkenleriyle yapılır (kodun geri kalanıyla aynı).

**Spec:** `docs/superpowers/specs/2026-08-04-bildirim-merkezi-design.md`

## Global Constraints

- **Backend'e dokunulmaz.** `selamet/w-lush` reposu bu planın kapsamı dışında. `ref_id` eklenmez.
- **Yeni npm bağımlılığı eklenmez.**
- Kullanıcıya görünen tüm metinler **Türkçe**; kod, tip ve fonksiyon adları **İngilizce** (mevcut kod böyle).
- Renkler ve çizgiler doğrudan hex ile değil, mevcut CSS değişkenleriyle: `--paper`, `--cream`, `--line`, `--line-strong`, `--ink`, `--ink-40`, `--ink-60`, `--champagne-2`, `--forest`.
- HTTP çağrıları **yalnız** `src/api/notifications.ts` içinden yapılır; bileşen `request()`'i doğrudan çağırmaz.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK** (`Co-authored-by` / Claude izi yasak — bu kural proje genelinde geçerli).
- Her task sonunda `npm run typecheck` ve `npm run build` **exit 0** olmalı.
- Branch: `feature/notification-center` (zaten oluşturuldu, spec commit'i üstünde).

## Test durumu — önemli

Bu repoda **test koşucusu yok** (vitest/jest kurulu değil) ve bu planda kurulmuyor — spec'in kapsamı frontend özelliği, test altyapısı kurmak ayrı bir karar. Bu yüzden aşağıdaki adımlar TDD döngüsü yerine **derleyici + canlı backend doğrulaması** kullanır. Her doğrulama adımı gerçek bir komut ve beklenen çıktı içerir; "gözden geçir" gibi kanıtsız adım yoktur.

**Ön koşul — canlı backend:** Task 1'den itibaren lokal backend ayakta olmalı.

```bash
cd /Users/hakanbudak/Desktop/w-lush && .venv/bin/python -m uvicorn app.main:app --port 8000
```

Ayrı terminalde frontend:

```bash
cd /Users/hakanbudak/Desktop/w-lush-web && npm run dev
```

Doğrulamalarda kullanılan test hesabı: `smoke2@example.com` / `Test12345!` (yoksa Task 1 Adım 2'deki script onu oluşturur).

---

### Task 1: API katmanı

**Files:**
- Create: `src/api/notifications.ts`
- Test: yok (koşucu yok) — doğrulama `npm run typecheck` + canlı uç kontrolü

**Interfaces:**
- Consumes: `request<T>(path, options?)` — `src/api/client.ts`
- Produces:
  - `type NotificationKind = 'booking' | 'reschedule' | 'cancellation' | 'request'`
  - `interface AppNotification { id: number; kind: string; message: string; read: boolean; created_at: string }`
  - `listNotifications(): Promise<AppNotification[]>`
  - `unreadCount(): Promise<number>`
  - `markRead(id: number): Promise<AppNotification>`
  - `markAllRead(): Promise<number>`

`AppNotification` adı bilerek `Notification` değil: `Notification` tarayıcının global DOM tipi, aynı adı kullanmak gölgeleme yaratır.

- [x] **Step 1: `src/api/notifications.ts` dosyasını oluştur**

```ts
// Operatör bildirimleri — backend: app/notifications/ (klinik kapsamlı, auth'lu).
import { request } from './client';

/** Backend'in ürettiği türler (app/notifications/service.py). */
export type NotificationKind = 'booking' | 'reschedule' | 'cancellation' | 'request';

/**
 * Tek bir bildirim. `kind` bilerek `string`: backend ileride yeni bir tür
 * eklerse arayüz çökmemeli, bilinmeyen tür varsayılan etikete düşer.
 */
export interface AppNotification {
  id: number;
  kind: string;
  message: string;
  read: boolean;
  created_at: string; // ISO
}

/** Yeniden eskiye sıralı, backend'de 100 ile sınırlı. */
export const listNotifications = () =>
  request<AppNotification[]>('/api/notifications');

export async function unreadCount(): Promise<number> {
  const res = await request<{ unread: number }>('/api/notifications/unread-count');
  return res.unread;
}

export const markRead = (id: number) =>
  request<AppNotification>(`/api/notifications/${id}/read`, { method: 'POST' });

export async function markAllRead(): Promise<number> {
  const res = await request<{ updated: number }>('/api/notifications/read-all', {
    method: 'POST',
  });
  return res.updated;
}
```

- [x] **Step 2: Backend sözleşmesinin bu tiplerle uyuştuğunu canlı doğrula**

Bu script test verisi de üretir; sonraki task'lar buna dayanır.

Run:

```bash
cd /Users/hakanbudak/Desktop/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:5173"

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:200] if hasattr(e, "read") else str(e))

cred = {"email": "smoke2@example.com", "password": "Test12345!"}
s, b = req("/api/auth/login", "POST", cred)
if s != 200:
    req("/api/auth/signup", "POST", {**cred, "clinic_name": "Smoke2"})
    s, b = req("/api/auth/login", "POST", cred)
tok = json.loads(b)["token"]["access_token"]

s, b = req("/api/notifications", token=tok)
print("GET /api/notifications ->", s)
items = json.loads(b)
if items:
    keys = set(items[0])
    print("alanlar:", sorted(keys))
    assert keys == {"id", "kind", "message", "read", "created_at"}, "ŞEMA UYUŞMUYOR"
s, b = req("/api/notifications/unread-count", token=tok)
print("unread-count ->", s, b.strip())
assert s == 200 and "unread" in json.loads(b)
print("SÖZLEŞME OK")
PY
```

Expected: `GET /api/notifications -> 200`, `unread-count -> 200 {"unread":N}`, son satır `SÖZLEŞME OK`. Kayıt yoksa `alanlar:` satırı basılmaz — bu normaldir, Task 3'te veri üretilecek.

- [x] **Step 3: Derlemeyi doğrula**

Run: `npm run typecheck`
Expected: çıktı yok, exit 0. (`echo $?` ile teyit et.)

- [x] **Step 4: Commit**

```bash
git add src/api/notifications.ts
git commit -m "Add notifications API client

Wraps the four existing /api/notifications endpoints. AppNotification is
named to avoid shadowing the DOM's global Notification type, and kind stays
a plain string so an unknown backend kind cannot break the UI."
```

---

### Task 2: Canlı zil ve rozet (sahte noktanın kaldırılması)

Bu task'ın sonunda TopBar'daki zil **gerçek** okunmamış sayısını gösterir. Panel henüz yok — zile tıklamak bir şey yapmaz.

**Files:**
- Create: `src/components/NotificationBell.tsx`
- Modify: `src/components/TopBar.tsx` (sahte zil bloğu → `<NotificationBell />`)

**Interfaces:**
- Consumes: `unreadCount()` — Task 1; `Icon.bell` — `src/components/icons.tsx`
- Produces: `export default function NotificationBell(): JSX.Element` (prop almaz)

- [x] **Step 1: `src/components/NotificationBell.tsx` dosyasını oluştur**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { unreadCount } from '../api/notifications';
import { Icon } from './icons';

/** Sekme görünürken sayaç bu aralıkla tazelenir (ms). */
const POLL_MS = 60_000;

/** Zil + okunmamış rozeti. Sayaç ucuz olduğu için sık, liste (Task 3) seyrek çekilir. */
export default function NotificationBell() {
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  // Hata yutulur: sayaç son bilinen değerde kalır, sıfırlanmaz.
  const refreshCount = useCallback(() => {
    unreadCount()
      .then(setUnread)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCount();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshCount();
    };
    window.addEventListener('focus', refreshCount);
    document.addEventListener('visibilitychange', onVisible);

    // Arka plandaki sekme istek atmaz.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshCount();
    }, POLL_MS);

    return () => {
      window.removeEventListener('focus', refreshCount);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refreshCount]);

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={unread > 0 ? `Bildirimler (${unread} okunmamış)` : 'Bildirimler'}
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-60)',
          position: 'relative',
          cursor: 'pointer',
          border: 'none',
          background: 'transparent',
          padding: 0,
          font: 'inherit',
        }}
      >
        {Icon.bell}
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              background: 'var(--champagne-2)',
              border: '2px solid var(--paper)',
              color: 'var(--ink)',
              fontSize: 10,
              fontWeight: 600,
              lineHeight: '16px',
              textAlign: 'center',
              boxSizing: 'content-box',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
```

`boxRef` şimdilik kullanılmıyor gibi görünse de Task 3'teki dışarı-tıklama dinleyicisi ona bağlanacak; `noUnusedLocals` açık olduğu için `ref={boxRef}` ataması derlemeyi geçirir.

- [x] **Step 2: `TopBar.tsx`'te sahte zil bloğunu değiştir**

`src/components/TopBar.tsx` içinde, `Yeni randevu` butonundan sonraki ayırıcı `div`'in ardından gelen **zil `div`'inin tamamını** (`{Icon.bell}` ve koşulsuz noktayı içeren `<div style={{ width: 36, height: 36, ... }}>…</div>`) sil, yerine şunu koy:

```tsx
        <NotificationBell />
```

Dosyanın başına import ekle:

```tsx
import NotificationBell from './NotificationBell';
```

`Icon` importu kalır (arama ikonu ve WhatsApp ikonu hâlâ kullanılıyor).

- [x] **Step 3: Derlemeyi doğrula**

Run: `npm run typecheck && npm run build`
Expected: ikisi de exit 0, build `✓ built in …` ile biter.

- [x] **Step 4: Canlı doğrula — rozet gerçek sayıyı gösteriyor**

Önce backend'e üç bildirim düş:

```bash
cd /Users/hakanbudak/Desktop/w-lush && .venv/bin/python - <<'PY'
import app.main  # tüm modelleri kaydeder; yoksa SQLAlchemy NoReferencedTableError verir
from app.core.database import SessionLocal
from app.notifications import service
with SessionLocal() as db:
    service.create(db, 1, service.BOOKING, "Ayşe Yılmaz · Hydrafacial · 12 Ağustos 14:00 randevu aldı")
    service.create(db, 1, service.REQUEST, "Mehmet Kaya (+90 532 111 22 33): fiyat listesi sordu")
    service.create(db, 1, service.CANCELLATION, "Zeynep Ak · Lazer · 9 Ağustos 11:00 randevusunu iptal etti")
    print("okunmamış:", service.unread_count(db, 1))
PY
```

Expected: `okunmamış: 3`.

Sonra tarayıcıda `http://localhost:5173` → `smoke2@example.com` / `Test12345!` ile giriş yap.
Expected: zilin üstünde **3** yazan rozet; sayfayı yenilemeden başka sekmeye geçip geri dönünce rozet korunuyor. Rozet yoksa veya hâlâ eski sahte nokta görünüyorsa Adım 2 eksik uygulanmıştır.

> Not: bu script `clinic_id=1`'e yazar. `smoke2@example.com` farklı bir kliniğe aitse rozet 0 kalır; `service.unread_count(db, <senin_clinic_id>)` ile kontrol et ve script'teki `1`'i değiştir.

- [x] **Step 5: Commit**

```bash
git add src/components/NotificationBell.tsx src/components/TopBar.tsx
git commit -m "Replace the fake bell dot with a live unread badge

The TopBar bell had an unconditional dot that was always lit. It now shows
the real unread count from /api/notifications/unread-count, refreshed on
focus, on tab visibility, and every 60s while the tab is visible."
```

---

### Task 3: Bildirim paneli

**Files:**
- Modify: `src/components/NotificationBell.tsx` (panel, liste, okundu işlemleri)

**Interfaces:**
- Consumes: `listNotifications()`, `markRead(id)`, `markAllRead()`, `AppNotification` — Task 1; `useNavigate` — `react-router-dom`
- Produces: yok (bileşen dışa açık yüzeyi değişmez)

- [x] **Step 1: Yardımcıları dosyanın en üstüne, bileşenin dışına ekle**

```tsx
const KIND_LABELS: Record<string, string> = {
  booking: 'Yeni randevu',
  reschedule: 'Erteleme',
  cancellation: 'İptal',
  request: 'Talep',
};

const kindLabel = (kind: string): string => KIND_LABELS[kind] ?? 'Bildirim';

/** "az önce" / "12 dk önce" / "3 sa önce" / "dün 14:20" / "9 Ağu 11:00" */
function relativeTime(iso: string): string {
  // Backend naive UTC üretiyor (datetime.now sunucu saatinde); Z eki yoksa
  // tarayıcı yerel saat varsayar — sunucu ve tarayıcı aynı makinede olduğu
  // sürece bu doğrudur.
  const then = new Date(iso);
  const diffMin = Math.floor((Date.now() - then.getTime()) / 60_000);

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
```

- [x] **Step 2: Bileşen state'ini ve panel davranışını ekle**

`NotificationBell` içinde, mevcut `unread`/`boxRef` tanımlarının altına:

```tsx
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadList = useCallback(() => {
    setLoading(true);
    setError(null);
    listNotifications()
      .then(setItems)
      .catch(() => setError('Bildirimler yüklenemedi.'))
      .finally(() => setLoading(false));
  }, []);
```

Yeni importlar (dosya başındaki mevcut satırlara ekle):

```tsx
import { useNavigate } from 'react-router-dom';
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
  type AppNotification,
} from '../api/notifications';
```

Panel açılınca liste çek ve dışarı tıklamayı dinle — mevcut polling `useEffect`'inin **altına** iki yeni effect:

```tsx
  // Panel her açıldığında taze liste.
  useEffect(() => {
    if (open) loadList();
  }, [open, loadList]);

  // Dışarı tıklayınca kapan (Sidebar'daki çıkış popover'ıyla aynı desen).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);
```

Aksiyonlar (effect'lerin altına):

```tsx
  function openItem(note: AppNotification) {
    if (!note.read) {
      markRead(note.id)
        .then(() => {
          setItems((prev) =>
            prev.map((n) => (n.id === note.id ? { ...n, read: true } : n)),
          );
          setUnread((n) => Math.max(0, n - 1));
        })
        .catch(() => setError('Okundu işaretlenemedi.'));
    }
    setOpen(false);
    navigate('/randevu');
  }

  function readAll() {
    markAllRead()
      .then(() => {
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnread(0);
      })
      .catch(() => setError('İşaretlenemedi.'));
  }
```

- [x] **Step 3: Zil butonunu tıklanabilir yap ve paneli render et**

Butona `onClick` ekle:

```tsx
        onClick={() => setOpen((v) => !v)}
```

Rozet `<span>`'inden sonra, `</button>`'ın **ardına** paneli ekle:

```tsx
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 44,
            right: 0,
            width: 360,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--paper)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderBottom: '1px solid var(--line)',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>Bildirimler</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  fontFamily: 'inherit',
                  fontSize: 11,
                  color: 'var(--ink-60)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto' }}>
            {loading && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
            )}

            {error && !loading && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-60)' }}>
                {error}{' '}
                <button
                  type="button"
                  onClick={loadList}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    fontFamily: 'inherit',
                    fontSize: 12,
                    color: 'var(--forest)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Tekrar dene
                </button>
              </div>
            )}

            {!loading && !error && items.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
                Henüz bildirim yok — WhatsApp’tan randevu geldiğinde burada görünür.
              </div>
            )}

            {!loading &&
              !error &&
              items.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => openItem(note)}
                  style={{
                    display: 'flex',
                    gap: 10,
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    borderBottom: '1px solid var(--line)',
                    background: note.read ? 'transparent' : 'var(--cream)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      marginTop: 6,
                      flexShrink: 0,
                      background: note.read ? 'transparent' : 'var(--champagne-2)',
                    }}
                  />
                  <span style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 10,
                        letterSpacing: '0.04em',
                        color: 'var(--ink-40)',
                      }}
                    >
                      {kindLabel(note.kind)} · {relativeTime(note.created_at)}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--ink)',
                        lineHeight: 1.45,
                        marginTop: 2,
                      }}
                    >
                      {note.message}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
```

- [x] **Step 4: Derlemeyi doğrula**

Run: `npm run typecheck && npm run build`
Expected: ikisi de exit 0.

- [x] **Step 5: Canlı doğrula — tüm etkileşimler**

Tarayıcıda giriş yapmış haldeyken sırayla:

1. Zile tıkla → panel açılır, Task 2'de düşülen 3 bildirim yeniden-eskiye sıralı görünür, her satırda tür etiketi + göreli zaman + mesaj var.
2. Panelin dışına tıkla → panel kapanır.
3. Zile tıkla, ilk bildirime tıkla → panel kapanır, `/randevu`'ya gidilir, rozet **3 → 2** olur.
4. Zile tekrar tıkla → tıklanan satırın solundaki nokta gitmiş, dolgusu kalkmış.
5. "Tümünü okundu işaretle" → rozet **kaybolur**, panel **açık kalır**, tüm satırlar okunmuş görünüme geçer.
6. Backend'i durdur, "Tekrar dene"yi tetiklemek için paneli kapat/aç → "Bildirimler yüklenemedi." + "Tekrar dene" görünür; backend'i geri başlatıp "Tekrar dene"ye bas → liste gelir.

Expected: altı maddenin hepsi tarif edildiği gibi. 3. maddede rozet azalmıyorsa `setUnread` çağrısı eksiktir; 5. maddede panel kapanıyorsa `readAll` içine yanlışlıkla `setOpen(false)` konmuştur.

- [x] **Step 6: Boş durumu doğrula**

Yeni bir klinikle boş durumu gör:

```bash
cd /Users/hakanbudak/Desktop/w-lush-web && python3 - <<'PY'
import json, urllib.request
r = urllib.request.Request("http://localhost:5173/api/auth/signup", method="POST",
    data=json.dumps({"email": "bos@example.com", "password": "Test12345!",
                     "clinic_name": "Boş Klinik"}).encode())
r.add_header("Content-Type", "application/json")
try:
    with urllib.request.urlopen(r) as resp: print("signup", resp.status)
except Exception as e: print("signup", getattr(e, "code", e))
PY
```

Tarayıcıda çıkış yap, `bos@example.com` / `Test12345!` ile gir, zile tıkla.
Expected: rozet yok; panelde "Henüz bildirim yok — WhatsApp'tan randevu geldiğinde burada görünür."

- [x] **Step 7: Commit**

```bash
git add src/components/NotificationBell.tsx
git commit -m "Add the notification panel behind the bell

Opening the bell fetches the list; clicking an item marks it read and
navigates to /randevu, where both appointments and WhatsApp requests live.
Reads are not optimistic — local state only follows a successful response,
so a failed call leaves the badge honest."
```

---

### Task 4: Kapanış — tam doğrulama ve PR

**Files:** yok (yalnız doğrulama)

- [x] **Step 1: Temiz derleme**

Run: `npm run typecheck && npm run build && echo "BUILD OK"`
Expected: son satır `BUILD OK`.

- [x] **Step 2: Uçtan uca API duman testi**

Run:

```bash
cd /Users/hakanbudak/Desktop/w-lush-web && python3 - <<'PY'
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
for path in ["/api/notifications", "/api/notifications/unread-count"]:
    s, _ = req(path, t=tok); print(path, s); assert s == 200
s, b = req("/api/notifications/read-all", "POST", {}, tok)
print("read-all", s, b.strip()); assert s == 200
print("SMOKE OK")
PY
```

Expected: son satır `SMOKE OK`.

- [x] **Step 3: Değişen dosyaları gözden geçir**

Run: `git diff main --stat`
Expected: yalnız 5 dosya — `src/api/notifications.ts` (yeni), `src/components/NotificationBell.tsx` (yeni), `src/components/TopBar.tsx` (değişti), `docs/superpowers/specs/…` + `docs/superpowers/plans/…` (dokümanlar). Başka dosya değiştiyse istenmeyen değişiklik vardır, geri al.

- [x] **Step 4: PR aç**

```bash
git push -u origin feature/notification-center
gh pr create --base main --title "Notification center: live bell badge and panel" --body "..."
```

PR gövdesi: neyin değiştiği, doğrulama kanıtı (typecheck/build exit 0 + canlı kontrol listesi), ve kapsam dışı bırakılanlar (backend `ref_id`, gerçek zamanlı itme). **Claude atıfı yazma.**

---

## Self-Review

**Spec kapsamı:** api modülü → Task 1; zil + rozet + 60 sn polling + focus/visibility → Task 2; panel, liste, tek tek okundu, tümünü işaretle, navigasyon, yükleniyor/hata/boş durumları, göreli zaman, tür etiketleri → Task 3; derleme + canlı doğrulama → her task + Task 4. Spec'in "kapsam dışı" maddeleri hiçbir task'ta yer almıyor. Boşluk yok.

**Placeholder taraması:** temiz — her adımda çalıştırılabilir komut ya da gerçek kod var; "uygun hata yönetimi ekle" türü adım yok.

**Tip tutarlılığı:** `AppNotification` Task 1'de tanımlanıp Task 3'te aynı adla kullanılıyor; `unreadCount()` sayı, `markAllRead()` sayı döndürüyor ve çağrı yerleri buna uygun; `setUnread` Task 2'de tanımlanıp Task 3'te kullanılıyor; `boxRef` Task 2'de bağlanıp Task 3'te okunuyor; `loadList` tanımlandığı yerde ve "Tekrar dene"de aynı isimle geçiyor.
