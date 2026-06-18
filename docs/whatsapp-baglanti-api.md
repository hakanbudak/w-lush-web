# WhatsApp Bağlama — API Sözleşmesi (Model A: manuel / yönetici atamalı)

Bu doküman, frontend'in (`w-lush-web`) WhatsApp bağlantı kartının beklediği
backend uçlarını tanımlar. Frontend bu sözleşmeye göre **şimdiden yazıldı**;
uçlar gelene kadar kart "bağlı değil" durumunda zarifçe çalışır.

## Bağlam

- Tek Meta uygulaması + tek webhook tüm klinikler için yeterli.
- Gelen mesaj `phone_number_id` ile kliniğe yönlendiriliyor (mevcut:
  `flow._resolve_clinic_id`). Eksik olan tek şey: bir kliniğe numara **atamak**
  ve durumu frontend'e **göstermek**.
- Numaralar **platformun WABA'sı** altında durur → **tek access token** tüm
  numaralar için gönderim yapar. Klinik başına token gerekmez (bu Model A).

## Veri modeli (öneri)

`Clinic` üzerinde (mevcut `whatsapp_phone_number_id` korunur):

| alan | tip | açıklama |
|---|---|---|
| `whatsapp_phone_number_id` | str \| null | Meta numara kimliği (atanınca dolar) |
| `whatsapp_number` | str \| null | görünen no, ör. `+90 5xx xxx xx xx` |
| `whatsapp_status` | enum | `none` \| `requested` \| `connected` (türetilebilir de) |
| `whatsapp_requested_at` | datetime \| null | talep zamanı |
| `whatsapp_connected_at` | datetime \| null | atama/bağlanma zamanı |

`User` üzerinde:

| alan | tip | açıklama |
|---|---|---|
| `is_admin` | bool (default false) | yönetici (platform sahibi) uçları için |

> Not: `status` ayrı tutulmak yerine türetilebilir:
> `connected` if `phone_number_id` else (`requested` if `requested_at` else `none`).

---

## Klinik uçları (giriş yapan kullanıcı, token ile, kendi kliniğine scope'lu)

### `GET /api/whatsapp/connection`
Kliniğin bağlantı durumunu döner.

**200**
```json
{
  "status": "none",
  "phone_number_id": null,
  "display_number": null,
  "requested_at": null,
  "connected_at": null
}
```
Bağlıyken:
```json
{
  "status": "connected",
  "phone_number_id": "123456789012345",
  "display_number": "+90 555 123 45 67",
  "requested_at": "2026-06-16T19:00:00Z",
  "connected_at": "2026-06-17T08:30:00Z"
}
```

### `POST /api/whatsapp/request`
Klinik "Bağlantı talebi oluştur"a basınca çağrılır. Durumu `requested` yapar
(idempotent: zaten requested/connected ise mevcut durumu döner).

İstek gövdesi (opsiyonel):
```json
{ "desired_number": "+90 5xx ...", "note": "serbest metin" }
```
**200** → güncel connection nesnesi (status `requested`).

> İsterseniz burada yöneticiye bildirim (e-posta/log) tetiklenebilir.

---

## Yönetici uçları (`is_admin` gerekli; değilse **403**)

### `GET /api/admin/clinics`
Tüm klinikleri bağlantı durumuyla listeler (yönetici hangi kliniğe numara
atayacağını görsün).

**200**
```json
[
  {
    "id": 1, "name": "w-lush Bostanlı", "slug": "w-lush-bostanli",
    "whatsapp": {
      "status": "requested", "phone_number_id": null,
      "display_number": null, "requested_at": "2026-06-16T19:00:00Z",
      "connected_at": null
    }
  }
]
```

### `PUT /api/admin/clinics/{clinic_id}/whatsapp`
Bir kliniğe numara atar → `status=connected`. Atandığı an mevcut routing
devreye girer ve bot o klinik için çalışır.

İstek:
```json
{ "phone_number_id": "123456789012345", "display_number": "+90 555 123 45 67" }
```
**200** → connection nesnesi (status `connected`).

Hatalar:
- `403` — yönetici değil
- `404` — klinik yok
- `409` — `phone_number_id` başka bir klinikte zaten kullanımda (benzersiz olmalı)

> Bağlantıyı kaldırma gerekirse: `DELETE /api/admin/clinics/{clinic_id}/whatsapp`
> → `phone_number_id=null`, `status=none` (opsiyonel, ileride).

---

## Frontend tarafı (hazır)

- `src/api/whatsapp.ts` — `getConnection()`, `requestConnection()`
  (GET 404'lerse `none`'a düşer; uçlar gelince otomatik çalışır)
- `src/components/WhatsAppConnect.tsx` — durum kartı:
  `none` → "talep oluştur" · `requested` → "kuruluyor" · `connected` → "✓ bağlı"
- `Sistem → WhatsApp` bölümünde + `Ana ekran` kurulum kartından
  `/sistem?sec=whatsapp` ile erişilir.

## Doğrulama akışı (uç uca)

1. Klinik signup → `status=none`.
2. Klinik "talep oluştur" → `POST /request` → `status=requested`.
3. Yönetici `PUT /admin/.../whatsapp` ile `phone_number_id` atar → `connected`.
4. Müşteri o numaraya yazar → webhook → `_resolve_clinic_id` eşler → bot yanıtlar.
