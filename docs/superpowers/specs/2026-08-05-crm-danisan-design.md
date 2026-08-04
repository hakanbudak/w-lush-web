# CRM ve Danışan Profili — Gerçek Veriye Bağlama (Design Spec)

**Tarih:** 2026-08-05
**Repolar:** Backend `selamet/w-lush`, Frontend `hakanbudak/w-lush-web`

## Amaç

WhatsApp'tan yazan gerçek kişi CRM panosunda ve Danışan Profili'nde görünsün. Bugün her iki ekran da dosya içine gömülü sahte dizilerle çalışıyor (`CRM.tsx` → `INITIAL_LEADS`, `DanisanProfili.tsx` → `CLIENTS`); bu diziler kaldırılır, yerlerini iki yeni uç alır.

## Kapsam kararı

Ekranların kurgusu backend'in verisinden çok daha zengin. Kural: **mevcut veriden türetilebilen her şey gerçek olur, gerisi ekrandan kaldırılır.**

Backend'de gerçekte olan:

| Tablo | Alanlar |
|---|---|
| `customers` | `id, clinic_id, phone, name, created_at` |
| `messages` | `id, clinic_id, phone, direction, body, created_at` |
| `appointments` | `id, clinic_id, phone, customer_name, service_name, appt_date, appt_time, status, created_at` |
| `services` / `packages` | katalog (fiyat dahil) |

**Kaldırılan kurgular:** sıcaklık skoru (0-100), bütçe, "sinyaller", AI cevap taslağı, e-posta, sorumlu uzman, toplam harcama, paket kullanım sayacı, ödeme geçmişi, sadakat puanı/seviyesi, operatör notları, cilt notu, no-show sayacı, sidebar'daki sahte `count: 12` rozeti.

**Bilinçli olarak kapsam dışı:** AI taslak üretimi (LLM işi, ayrı spec), operatör notları için yeni tablo, gerçek harcama takibi (randevuda tutar alanı yok; katalog fiyatından tahmin yanıltıcı olur), `stage` alanını veritabanına yazmak.

**Şema değişmez, Alembic migration eklenmez, yeni bağımlılık eklenmez.**

## Türetme kuralları

Üçü de `app/customers/service.py` içinde, veritabanına yazılmadan hesaplanır. Kural tek yerde yaşar; frontend iş mantığı taşımaz.

### Aşama (`stage`)

İlk eşleşen kazanır:

| Değer | Etiket | Koşul |
|---|---|---|
| `customer` | Müşteri | İptal olmayan, tarihi geçmiş en az bir randevu var |
| `consult` | Konsültasyon | İptal olmayan, tarihi bugün veya sonrası olan randevu var |
| `contacted` | İlk temas | Randevu yok; hem `in` hem `out` mesaj var |
| `new` | Yeni | Randevu yok; yalnızca `in` mesaj var |

Randevusu da mesajı da olmayan kayıt listede görünmez.

### Sıcaklık (`warmth`)

Son mesajın üzerinden geçen süre: `< 1 saat` → `hot`, `< 24 saat` → `warm`, `>= 24 saat` → `cold`. Hiç mesajı yoksa `null` — rozet çizilmez. Eşikler koda gömülüdür, ayar ekranına çıkmaz.

### Sayılar (profil)

`appointments_total` · `past_sessions` (iptal değil + tarihi geçmiş) · `cancelled` · `last_visit` (en son geçmiş seansın tarihi, yoksa `null`).

### Kabul edilen tavizler

1. Randevu durum modelinde **`completed` yok** (`pending → confirmed | cancelled`, bkz. `app/clinic/router.py:195`, `app/clinic/service.py:202`). Bu yüzden "geçmiş seans" = iptal değil + tarih geçmiş. Kimse durumu elle güncellemediği için gerçeğe en yakın yorum budur.
2. Kaynak (WhatsApp/web/Instagram/manuel) ayrımı verilmiyor — tek gerçek kanal WhatsApp olduğu için rozet sabitlenir.
3. `messages`, `appointments` ve `requests` tablolarında `customer_id` **yok**; hepsi `clinic_id + phone` ile bağlanıyor. Kimlik anahtarı bu yüzden **telefon numarası**. Gerçek yabancı anahtara geçmek migration ister, kapsam dışı.

## Backend sözleşmesi

Yeni modül: `app/customers/router.py` + `app/customers/schemas.py`, `main.py`'ye `include_router` ile eklenir. Desen `app/conversations/router.py` ile birebir aynı: `Depends(get_db)` + `Depends(get_current_user)`, klinik kapsamı **daima** `current.clinic_id`'den gelir, asla istekten.

### `GET /api/customers`

```jsonc
[{
  "phone": "905321112233",
  "name": "Ayşe Yılmaz",              // yoksa ""
  "stage": "new|contacted|consult|customer",
  "warmth": "hot|warm|cold|null",
  "last_message": "…",                // yoksa ""
  "last_message_at": "2026-08-05T10:12:00",  // yoksa null
  "next_appointment": { "appt_date": "2026-08-09", "appt_time": "14:30", "service_name": "Lazer" } // yoksa null
}]
```

- Kaynak küme: kliniğe ait **mesajı veya randevusu olan** her telefon (yalnız `customers` tablosu değil).
- Sıralama: son aktivite (mesaj ya da randevu oluşturma) yeniden eskiye. Üst sınır 200.

### `GET /api/customers/{phone}`

```jsonc
{
  "phone": "905321112233",
  "name": "Ayşe Yılmaz",
  "created_at": "2026-06-01T09:00:00",  // customers kaydı yoksa ilk mesaj/randevu tarihi
  "stage": "customer",
  "warmth": "cold",
  "stats": { "appointments_total": 6, "past_sessions": 4, "cancelled": 1, "last_visit": "2026-07-22" },
  "appointments": [{ "id": 12, "appt_date": "2026-07-22", "appt_time": "11:00", "service_name": "Mezoterapi", "status": "confirmed" }],
  "messages": [{ "id": 88, "phone": "905321112233", "direction": "in", "body": "…", "created_at": "2026-08-05T10:12:00" }]
}
```

- `messages` için mevcut `conversations.service.thread()` ve `MessageOut` şeması **yeniden kullanılır**, kopyalanmaz.
- `appointments` yeniden eskiye, son 50.
- Ne mesajı ne randevusu olan telefon → **404**, TR metin `app/content/messages.py` içinde `ERR_CUSTOMER_NOT_FOUND`.

### Performans

Liste ucu N+1 yapmaz; `conversations.service.summaries()` yaklaşımı tekrarlanır: telefon başına son mesaj tek sorguda, randevu toplamları tek `GROUP BY` sorgusunda, isimler tek `IN` sorgusunda — toplam 3 sorgu.

## Frontend

### API katmanı

Tek dosya `src/api/customers.ts`: `listCustomers()`, `getCustomer(phone)`. HTTP çağrısı başka hiçbir yerde yapılmaz (mevcut proje kuralı). Tipler backend şemasını yansıtır; `stage` ve `warmth` gevşek `string` değil, birleşim tipi olarak yazılır.

### Rotalar

`/crm` · `/danisan` · `/danisan/:phone`. Telefon URL'e `encodeURIComponent` ile girer. `/danisan` numarasız açıldığında sağ panelde "Soldan bir danışan seçin" boş durumu görünür.

### CRM (`/crm`)

Dört kolonlu pano korunur; kartlar `listCustomers()`'tan gelir ve `stage`'e göre dağılır. Kart içeriği: isim (yoksa telefon) · sıcaklık rozeti · son mesaj önizlemesi (tek satır, taşarsa kırpılır) · geçen süre · varsa yaklaşan randevu (tarih + hizmet).

Karta tıklamak `/danisan/:phone`'a götürür — panonun tek eylemi budur. **Sürükle-bırak yok** (aşama türetilmiş, yazılamaz). "Aday ekle" formu ve modali kaldırılır; elle müşteri yaratacak uç yok.

### Danışan Profili (`/danisan/:phone`)

Mevcut sol liste + sağ detay düzeni korunur (`DanisanProfili.tsx:204`), yalnız veri kaynağı değişir. Sol liste aynı `listCustomers()` verisini kullanır, arama istemci tarafında isim ve telefon üzerinde çalışır. Sağ panel `getCustomer(phone)` ile dolar ve dört bölüme iner:

1. **Kimlik** — isim, telefon, ilk kayıt tarihi
2. **Sayılar** — toplam randevu, geçmiş seans, iptal, son ziyaret
3. **Randevu geçmişi** — tarih, saat, hizmet, durum rozeti
4. **Mesaj geçmişi** — salt okunur (cevap yazma Mesajlar ekranında kalır, ikiye bölünmez)

Paketler / Ödemeler / Sadakat / AI / Notlar / Cilt sekmeleri silinir.

### Silinen kod

`CRM.tsx`: `INITIAL_LEADS`, `blankLead`, aday ekleme modali, `Lead`'in kullanılmayan alanları. `DanisanProfili.tsx`: `CLIENTS` dizisi ve artık karşılığı olmayan tipler. `src/config/nav.ts:16`: sahte `count: 12` (canlı tutmak sidebar'ın her sayfada müşteri listesi çekmesini gerektirirdi; zil rozeti zaten canlı bilgi veriyor).

## Hata durumları

| Durum | Davranış |
|---|---|
| 401 | Mevcut `client.ts` login'e yönlendirir — dokunulmaz |
| 404 (profil) | "Bu numaraya ait kayıt bulunamadı" boş durumu |
| 5xx / ağ | Tek satır TR mesaj + "Tekrar dene" düğmesi |
| `name == ""` | Telefon gösterilir — normal, hata değil |
| Boş klinik | CRM'de dört boş kolon + açıklayıcı boş durum; profilde "Henüz danışan yok" |

## Doğrulama

Her iki repoda da test koşucusu yok ve bu spec onu kurmuyor (ayrı bir karar). Doğrulama derleyici + canlı uç + tarayıcı ile yapılır:

- `ruff check app` temiz
- `python -c "from app.main import app"` geçer
- `alembic revision --autogenerate` **boş** migration üretir — şemanın değişmediğinin kanıtı
- `npm run typecheck` ve `npm run build` exit 0
- Her iki uç canlı sunucuda gerçek veriyle sorgulanır (curl bloklu; python heredoc kullanılır)
- Dört aşamayı da üretecek test verisi tohumlanır ve panonun kartları doğru kolonlara dağıttığı tarayıcıda görülür

## Başarı ölçütü

WhatsApp'tan yeni bir kişi yazdığında, sayfa yenilendiğinde CRM'in "Yeni" kolonunda görünür; kartına tıklanınca profilinde gerçek mesaj geçmişi açılır. Hiçbir ekranda uydurma veri kalmaz.
