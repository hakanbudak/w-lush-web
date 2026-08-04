# Bildirim merkezi — tasarım

**Tarih:** 2026-08-04
**Kapsam:** yalnızca `w-lush-web` (frontend). Backend `selamet/w-lush` değişmez.

## Problem

Backend `/api/notifications` uçlarını Faz 0'dan beri sunuyor ve WhatsApp botu dört
olayda bildirim üretiyor — ama panelde bunları gösteren hiçbir yer yok. Klinik,
WhatsApp'tan yeni randevu geldiğinde haberdar olmuyor. TopBar'daki zil ikonu
tamamen dekoratif: yanındaki nokta koşulsuz, her zaman yanıyor.

## Kapsam kararı

Bildirim kaydı yalnız `kind` + hazır TR `message` taşıyor; ilgili randevu/talep
id'si yok. Tek bir kayda odaklanan derin bağlantı için backend'e `ref_id` alanı
(migration + deploy) gerekirdi. **Karar: bu turda backend'e dokunulmuyor.**
Derin bağlantı ihtiyacı canlıda hissedilirse ayrı bir tur olarak ele alınır.

## Backend sözleşmesi (mevcut, değişmiyor)

`app/notifications/` — hepsi klinik kapsamlı ve `get_current_user` korumalı:

| Uç | Davranış |
|---|---|
| `GET /api/notifications` | Yeniden eskiye sıralı, `limit=100`. `?unread=true` filtreler. |
| `GET /api/notifications/unread-count` | `{"unread": N}` |
| `POST /api/notifications/{id}/read` | Kaydı okundu yapar, `NotificationOut` döner. Başka kliniğin kaydı → 404. |
| `POST /api/notifications/read-all` | `{"updated": N}` |

`NotificationOut`: `id, kind, message, read, created_at`.

Türler (`app/notifications/service.py`), `app/whatsapp/flow.py` tarafından üretilir:
`booking`, `reschedule`, `cancellation`, `request`.

## Mimari

Yeni iki dosya, mevcut bir dosyada değişiklik:

- **`src/api/notifications.ts`** — `src/api/whatsapp.ts` kalıbı. `AppNotification`
  tipi + `listNotifications()`, `unreadCount()`, `markRead(id)`, `markAllRead()`.
  Tek sorumluluk: HTTP. Bileşen bu modülün dışında `request()` çağırmaz.
- **`src/components/NotificationBell.tsx`** — zil butonu, rozet ve popover panel.
  Kendi state'ini kendi yönetir; dışarıdan prop almaz. Dışarı tıklayınca kapanma
  için `Sidebar.tsx`'teki çıkış popover deseni (`useRef` + `document` üzerinde
  `mousedown` dinleyici, cleanup'lı) izlenir.
- **`src/components/TopBar.tsx`** — sahte noktalı zil bloğu silinir, yerine
  `<NotificationBell />`. Başka değişiklik yok.

## Veri akışı

Sayaç ve liste ayrı tutulur — biri ucuz ve sık, diğeri pahalı ve seyrek.

**Sayaç** (`unread-count`): mount'ta bir kez; `focus` ve `visibilitychange`
olaylarında; ayrıca `document.visibilityState === 'visible'` iken 60 saniyede bir.
Sekme arka plandayken istek gitmez. Interval ve dinleyiciler unmount'ta temizlenir.

Neden polling: WhatsApp bağlantı durumunun aksine bildirim gün boyu tekrar tekrar
düşer; klinik paneli açık bırakıp çalışırken yeni randevuyu ~1 dakika içinde
görmeli.

**Liste** (`listNotifications`): yalnız panel açılınca çekilir. Backend zaten
sıralı ve 100 ile sınırlı → istemci tarafında sayfalama/sıralama yok.

**Yazma:** iyimser güncelleme yok. `markRead` / `markAllRead` başarıyla dönünce
liste ve sayaç yerel state'te güncellenir; hata olursa panelde satır içi hata
metni gösterilir ve state değişmez.

## Arayüz

**Zil:** bugünkü 36×36 kutu korunur. Okunmamış 0 ise rozet **yok** (hep-yanan
sahte nokta böylece düzelir). >0 ise sayı rozeti; 9 üstü `9+`. Rozet
`--champagne-2` zemin üzerine `--paper` (açık) metin, `--paper` kenarlık.

**Panel:** zilin altında sağa hizalı, 360 px genişlik, en fazla ~420 px yükseklik,
içi kaydırmalı. `--paper` zemin, `--line` kenarlık, 8 px köşe, yumuşak gölge.
Başlık satırı: "Bildirimler" + okunmamış varsa "Tümünü okundu işaretle" — bu bağlantı
paneli kapatmaz, satırlar yerinde okunmuş görünüme geçer.

**Satır:** tür rozeti + mesaj + göreli zaman. Okunmamışlar solda nokta ve hafif
dolgu ile ayrışır. Türlerin TR karşılıkları:

| kind | etiket |
|---|---|
| `booking` | Yeni randevu |
| `reschedule` | Erteleme |
| `cancellation` | İptal |
| `request` | Talep |

Göreli zaman: 1 dk altı "az önce", saat altı "N dk önce", bugün "N sa önce",
dün "dün HH:MM", öncesi "D MMM HH:MM" (tr-TR).

**Tıklama:** satır okundu işaretlenir, panel kapanır, `/randevu`'ya gidilir.
Dört türün de hedefi aynı — randevular ve WhatsApp talepleri o sayfada yaşıyor.
Kayda odaklanma yok (yukarıdaki kapsam kararı gereği).

**Durumlar:** yükleniyor ("Yükleniyor…"); hata (satır içi mesaj + "Tekrar dene");
boş ("Henüz bildirim yok — WhatsApp'tan randevu geldiğinde burada görünür").

## Hata durumları

- Ağ/5xx: panelde hata metni, sayaç son bilinen değerde kalır (sıfırlanmaz).
- 401: `client.ts` zaten global olarak yakalayıp oturumu kapatıyor; bileşen
  ayrıca ele almaz.
- `markRead` 404 (başka kliniğin kaydı): pratikte imkânsız, yine de hata metni
  gösterilir ve liste tazelenir.

## Doğrulama

Frontend'de test koşucusu yok; kanıt derleme + canlı kontrol:

1. `npm run typecheck` → exit 0
2. `npm run build` → exit 0
3. Lokal backend'e (`:8000`) üç türden bildirim düşürülür, sonra:
   - rozet doğru sayıyı gösteriyor
   - satıra tıklamak sayacı bir azaltıyor ve `/randevu`'ya gidiyor
   - "Tümünü okundu işaretle" rozeti kaldırıyor
   - hepsi okununca boş değil, okunmuş liste görünüyor; hiç kayıt yokken boş
     durum metni çıkıyor

## Kapsam dışı

- Backend `ref_id` / kayda odaklanan derin bağlantı
- Gerçek zamanlı itme (WebSocket/SSE)
- Bildirim tercihleri, sessize alma, e-posta/push
- Bildirim silme (backend ucu yok)
