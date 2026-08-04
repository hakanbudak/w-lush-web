# Mesajlar / handoff ekranı — tasarım

**Tarih:** 2026-08-04
**Kapsam:** iki repo — `selamet/w-lush` (bir yeni uç) ve `hakanbudak/w-lush-web` (yeni sayfa).

## Problem

Bot, müşteriyi operatöre devrediyor: "Diğer" akışında ya da onaylanmış randevu
sonrası soru/erteleme mesajlarında oturum `SILENT` durumuna geçiyor ve bot
susuyor. Mesaj `messages` tablosuna yazılıyor, operatöre bildirim düşüyor —
**ama panelde müşteriye cevap yazılacak hiçbir yer yok.** Akışın kopuk halkası bu.

Backend'de üç uç zaten hazır ve kullanılmıyor: `GET /api/conversations/{phone}`,
`POST /api/conversations/{phone}/reply`, `POST /api/conversations/{phone}/release`.

## Boşluk: konuşmalar listelenemiyor

Mevcut uçların hepsi telefon numarasını **bildiğini varsayıyor**. Kimin yazdığını,
kimin cevap beklediğini, kimin handoff'ta olduğunu döndüren bir uç yok.

Bugünkü tek keşif yolu `/api/requests`, ama üç eksiği var: yalnız "Diğer"
akışından doğan talepleri kapsar; `status` alanı hiçbir yerde değişmediği için
her talep sonsuza dek `new` kalır; ve bir müşterinin **şu an** handoff'ta olup
olmadığını söylemez — yani "Bota geri ver" butonunun gerekli olup olmadığı
bilinemez.

**Karar: backend'e tek bir listeleme ucu eklenir.** Şema değişmez, migration
gerekmez.

## Backend — `selamet/w-lush`

### Yeni uç: `GET /api/conversations`

Klinik kapsamlı, `get_current_user` korumalı, mevcut uçlarla aynı kalıp.

`ConversationOut` alanları:

| alan | kaynak |
|---|---|
| `phone` | `messages.phone` (gruplama anahtarı) |
| `customer_name` | `customers` tablosu; kayıt yoksa `""` |
| `last_message` | telefonun en son mesajının `body`'si |
| `last_direction` | o mesajın yönü — `"in"` (müşteri) / `"out"` (operatör) |
| `last_at` | o mesajın `created_at`'i |
| `waiting` | `last_direction == "in"` — türetilir, saklanmaz |
| `handoff` | `conversation_sessions` içinde `key = f"{clinic_id}:{phone}"` satırının `state`'i `SILENT` ise `true` |

**Sıralama:** önce `waiting` olanlar, sonra `last_at` azalan. **Limit:** 100
(`thread()` ve `list_for()` ile aynı).

**Yerleşim:** yeni dosya açılmaz — `app/conversations/service.py`'ye
`summaries(db, clinic_id, limit=100)`, `schemas.py`'ye `ConversationOut`,
`router.py`'ye ucun kendisi eklenir. Uç, `/{phone}` yolundan **önce**
tanımlanmalı; aksi halde FastAPI `/api/conversations`'ı `phone=""` olarak
eşleştirmeye çalışır.

### Dokunulmayanlar

`Request.status` olduğu gibi bırakılır, `PATCH /api/requests/{id}` eklenmez:
konuşmanın durumu son mesajın yönünden türetiliyor, saklanan ikinci bir gerçek
yaratılmıyor.

### Kalite kapıları (repo CLAUDE.md)

`ruff check app` temiz; `python -c "from app.main import app"` geçer;
`alembic revision --autogenerate` **boş** migration üretir (şema değişmediği
kanıtı); `feature/conversations-list` → PR; commit'te atıf trailer'ı **yok**.

## Frontend — `w-lush-web`

### Yeni dosyalar

- **`src/api/conversations.ts`** — `Conversation` ve `Message` tipleri +
  `listConversations()`, `getThread(phone)`, `sendReply(phone, message)`,
  `releaseToBot(phone)`. Tek sorumluluk: HTTP.
- **`src/pages/Mesajlar.tsx`** — sayfa; içinde `ConversationList` (sol) ve
  `Thread` (sağ) bileşenleri.
- **`src/utils/time.ts`** — `relativeTime()` şu an `NotificationBell.tsx`'in
  içinde gömülü. İkinci tüketici çıktığı için ortak modüle taşınır; kopya
  çıkarılmaz.

### Değişen dosyalar

- `src/App.tsx` — `/mesajlar` route'u (korumalı alanda).
- `src/config/nav.ts` — menüye "Mesajlar", ikon `whatsapp` (ikon setinde sohbet
  ikonu yok; WhatsApp bu akışın zaten simgesi).
- `src/pages/RandevuTakvimi.tsx` — `WhatsAppTalepleri` kartı ve artık
  kullanılmayan `listRequests` importu kaldırılır. Aynı bilgiyi daha eksik
  gösteriyor; tek doğru yer Mesajlar sayfası olur.
- `src/components/NotificationBell.tsx` — `relativeTime` yerel tanımı silinir,
  `utils/time`'dan import edilir. Davranış değişmez.

> `Sidebar.tsx`'teki CRM rozeti de `listRequests()` çağırıyor; **o kalır**,
> talepler kartıyla ilgisi yok.

### Düzen

**Sol (320 px sabit, kaydırmalı):** her satırda isim (yoksa telefon), son
mesajın tek satıra kırpılmış hali, göreli zaman. `waiting` olanlarda
`--champagne-2` nokta ve hafif `--cream` dolgu.

**Sağ (kalan genişlik):** üstte müşteri adı/telefonu ve **yalnız `handoff`
true iken** "Bota geri ver" butonu. Ortada mesaj balonları: `in` solda
`--cream`, `out` sağda `--forest-3`; her balonun altında saat. Altta çok
satırlı cevap kutusu + "Gönder".

### Veri akışı

Liste, sekme görünürken **60 saniyede bir** tazelenir. Thread aynı aralıkla,
**yalnız bir konuşma seçiliyken** tazelenir; seçim yokken istek gitmez. Ayrıca
her ikisinin başında **"Yenile"** butonu vardır. 60 saniye canlı yazışma için
uzun olabilir — elle tazeleme bunu telafi eder, seçim bilinçlidir.

Cevap gönderildiğinde poll beklenmez: uçtan dönen `Message` thread'e hemen
eklenir ve liste yeniden çekilir (satırın "cevaplandı"ya geçmesi için).
"Bota geri ver" başarılı olunca liste ve thread yeniden çekilir.

Dikkat — davranışsal yan etki: backend'de `operator_reply` oturumu `SILENT`'a
zorluyor. Yani **cevap yazmak müşteriyi handoff'a alır**; henüz handoff'ta
olmayan birine yazılırsa liste tazelendiğinde `handoff` true'ya döner ve
"Bota geri ver" butonu belirir. Bu mevcut backend davranışı, bu turda
değiştirilmiyor.

### Gönderme kuralları

Boş ya da yalnız boşluktan oluşan mesaj gönderilmez (backend zaten 422 döner).
Gönderim sırasında buton kilitlenir. **Hata olursa yazılan metin kutuda kalır** —
operatörün yazdığı kaybolmaz — ve kutunun altında hata satırı gösterilir.

### Durumlar

- Liste boş: "Henüz konuşma yok — WhatsApp'tan mesaj geldiğinde burada görünür."
- Konuşma seçilmemiş: "Soldan bir konuşma seç."
- Yükleniyor: "Yükleniyor…"
- Hata: satır içi mesaj + "Tekrar dene".

## Hata durumları

- Ağ/5xx: ilgili panelde hata metni; liste hatası thread'i, thread hatası
  listeyi etkilemez.
- 401: `client.ts` global olarak yakalayıp oturumu kapatıyor; sayfa ayrıca
  ele almaz.
- `reply` 422 (boş mesaj): istemci zaten engelliyor; yine de dönerse hata
  satırı gösterilir ve metin korunur.

## Doğrulama

Frontend'de test koşucusu yok; kanıt derleme + canlı kontrol:

1. Backend: `ruff check app`, import kontrolü, boş autogenerate migration.
2. Frontend: `npm run typecheck` ve `npm run build` → exit 0.
3. Headless tarayıcı: liste geliyor; satıra tıklayınca thread açılıyor; cevap
   gönderilince balon anında görünüyor ve satır "cevaplandı"ya geçiyor;
   `handoff` false olan konuşmada "Bota geri ver" **görünmüyor**; release
   sonrası buton kayboluyor; boş liste ve hata durumları çıkıyor.

## Kapsam dışı

- Gerçek zamanlı itme (WebSocket/SSE)
- Mesaj arama, sayfalama, dosya/görsel gönderme
- Şablon mesajlar ve 24 saat penceresi uyarısı (Meta kuralı — ayrı iş)
- `Request.status` triyajı ve `PATCH /api/requests/{id}`
- Okundu bilgisi (kim ne zaman gördü)
