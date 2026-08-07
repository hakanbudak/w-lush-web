# Gelir / Ödemeler (Design Spec)

**Tarih:** 2026-08-07
**Repolar:** Backend `selamet/w-lush`, Frontend `hakanbudak/w-lush-web`

## Amaç

Gelir Raporu ekranı gerçek para verisiyle çalışsın. Bugün `GelirRaporu.tsx` dosya içine gömülü `CATEGORIES` ve `STAFF` dizileriyle çalışıyor; backend'de para diye bir kavram hiç yok.

## Kapsam ve ayrıştırma

"Gelir / Gider / Rapor" tek iş değil, üç ayrı alt sistem. Bu spec yalnız **geliri** kapsar.

| Alt proje | Durum |
|---|---|
| **Gelir (bu spec)** | Ödeme kaydı + gelir raporu |
| Giderler | Sonra — kendi tablosu ve ekranı, bağımsız |
| Rapor | Sonra — aslında AI rapor üretimi (`Rapor.tsx` şablon ve prompt'lardan oluşuyor), gelir+gider verisi olmadan anlamsız |

**Kapsam dışı bırakılanlar ve gerekçeleri:**

- **Personel performansı.** Ekran bugün personel tablosu gösteriyor ama backend'de çalışan modeli yok. Personel gerçek bir kavram (kim hangi seansı yaptı, hedef, prim) ve kendi alt projesini hak ediyor.
- **Şube filtresi.** Çok-şubelilik demek; bugün `clinic_id` tek şube gibi çalışıyor.
- **İade / negatif tutar.** Ayrı bir akış (iade mi, düzeltme mi, kısmi mi). Tutar pozitif olmak zorunda; yanlış kayıt silinip yeniden girilir.
- **Taksit / vade.** İhtiyaç olduğu bilinmiyor.
- **Ödemelerin Danışan Profili'nde gösterilmesi.** Doğal devam, ama bu spec'i büyütür; gelir ekranı bittikten sonra küçük bir ek iş.

## Veri modeli

Tek yeni tablo. **Bu projenin ilk gerçek şema değişikliği** — öncekilerin hepsi şemaya dokunmadan yapılmıştı, dolayısıyla ilk Alembic migration'ı da bu iş getiriyor.

`app/payments/models.py`:

| Alan | Tip | Not |
|---|---|---|
| `id` | PK | |
| `clinic_id` | FK `clinics.id`, index | çok kiracılı izolasyon |
| `paid_at` | Date, index | paranın alındığı gün |
| `amount` | Integer | TRY, tam sayı |
| `method` | String(20) | `cash` \| `card` \| `transfer` \| `other` |
| `phone` | String(32), index, NULL | danışan bağı; proje kuralı gereği anahtar telefon |
| `customer_name` | String(120), default `""` | kayıt anındaki ad (anlık kopya) |
| `appointment_id` | FK `appointments.id`, NULL | varsa hangi randevuya ait |
| `service_name` | String(120), default `""` | hizmet adı, metin |
| `note` | Text, default `""` | |
| `created_at` | DateTime, default `now()` | |

**Kararlar:**

1. **Tutar tam sayı TRY.** Mevcut kural (`Service.price`, `Package.price` hepsi `Integer`). Kuruş tutulmaz.
2. **`paid_at` tarih, saat değil.** Rapor gün/ay/yıl kırılımı yapıyor; saat hiçbir soruya cevap vermiyor ve saat dilimi sorunu getiriyor.
3. **`phone` ve `appointment_id` boş olabilir.** Randevusuz satış (ürün, peşin paket, avans) gerçek bir durum; danışan bağı olmayan ödeme yine gelire sayılır.
4. **Anlık kopyalar (`customer_name`, `service_name`).** Randevudaki desenle aynı: hizmet silinse veya fiyat değişse geçmiş kayıt bozulmaz. Hizmet bağı FK değil metindir — katalog dışı satışa da yer açar.
5. **Randevu iptal edilse ödeme durur.** Para gerçekten alındı; iptal onu geri almaz. Cascade yok.

## Backend sözleşmesi

Yeni modül `app/payments/` (`models.py`, `schemas.py`, `service.py`, `router.py`), prefix `/api/payments`, `main.py`'ye `include_router` ile eklenir. Desen `app/customers/router.py` ile aynı: `Depends(get_db)` + `Depends(get_current_user)`, klinik kapsamı **daima** `current.clinic_id`'den gelir, asla istekten.

Modül ayrı duruyor çünkü `app/clinic/router.py` zaten 200+ satır ve "klinik ayarları" ile "para" farklı sorumluluklar. Gider işi geldiğinde o da kendi modülüne gelir; şimdi ortak bir `finance` soyutlaması uydurmak erken olur.

### `POST /api/payments` → 201

Gövde: `paid_at`, `amount`, `method` zorunlu; `phone`, `appointment_id`, `service_name`, `note` opsiyonel.

`appointment_id` verilirse `customer_name`, `service_name` ve `phone` o randevudan **otomatik doldurulur**; istekte açıkça gelmişse istek kazanır.

Doğrulamalar (422, TR metinler `app/content/messages.py` içinde):

| Durum | Sonuç |
|---|---|
| `amount` ≤ 0 | 422 |
| `method` listede değil | 422 |
| `paid_at` gelecekte | 422 |
| `appointment_id` başka kliniğe ait / yok | 404 |

`phone` verilmişse `customers` tablosunda karşılığı olması **gerekmez** ve kayıt oluşturulmaz: ödeme, danışan kaydı olmayan bir numaraya da yazılabilir (tek seferlik satış). Doğrulama yalnızca uzunluk sınırıdır.

### `GET /api/payments?start=&end=`

`paid_at` yeniden eskiye, üst sınır 200. Tarihler opsiyonel; verilmezse son 200 kayıt.

### `DELETE /api/payments/{id}` → 204

Düzeltme yolu budur. **`PATCH` yok** — bir muhasebe satırını yerinde düzenlemek neyin ne zaman değiştiğini kaybettirir. Başka kliniğin kaydı → 404.

### `GET /api/payments/summary?start=&end=`

Ekranın tamamı tek çağrıda:

```jsonc
{
  "total": 618840,
  "count": 42,
  "by_service": [{ "service_name": "Lazer Epilasyon", "amount": 198400, "count": 12 }],
  "by_method":  [{ "method": "card", "amount": 412300, "count": 28 }],
  "by_month":   [{ "month": "2026-08", "amount": 218400 }]
}
```

Toplamlar SQL `GROUP BY` ile hesaplanır; satırlar Python'a taşınıp orada toplanmaz.

**İş bölümü:** tarih aralığını **istemci** seçer, toplamı **sunucu** hesaplar. "Bu ay / Çeyrek / Yıl" düğmeleri frontend'de somut `start`/`end` tarihlerine çevrilir; backend yalnızca aralık bilir. Böylece backend'de dönem sözlüğü tutulmaz ama toplama mantığı tek yerde kalır.

## Frontend

### API katmanı

Tek dosya `src/api/payments.ts`: `listPayments(start?, end?)`, `getSummary(start?, end?)`, `createPayment(input)`, `deletePayment(id)`. HTTP çağrısı başka hiçbir yerde yapılmaz (mevcut proje kuralı). `method` gevşek `string` değil birleşim tipi olarak yazılır.

### Ekran (`/gelir`)

`GelirRaporu.tsx` baştan yazılır; `CATEGORIES`, `STAFF` dizileri ve şube/hizmet filtre düğmeleri silinir. Yukarıdan aşağı:

1. **Dönem seçici** — mevcut "Bu ay / Çeyrek / Yıl" düğmeleri kalır, artık somut `start`/`end` üretir.
2. **KPI satırı** — Toplam gelir · Ödeme sayısı · Ortalama ödeme (`total / count`, sıfır bölmesine karşı korumalı).
3. **Hizmet kırılımı** — `by_service`, tutara göre azalan; yüzdeler `amount / total` ile hesaplanır. Boş hizmet adı → "Belirtilmemiş".
4. **Ödeme yöntemi dağılımı** — `by_method`; etiketler Nakit, Kart, Havale, Diğer.
5. **Aylık seyir** — `by_month`, basit bar. "Bu ay" seçiliyken tek bar olur; sorun değil.
6. **Son ödemeler + giriş** — tablo (tarih, danışan, hizmet, yöntem, tutar, sil) ve "Gelir ekle" düğmesi. Form mevcut `Modal` kabuğunu (`src/components/modals.tsx:17`) kullanır: tarih (bugün varsayılan), tutar, yöntem, opsiyonel danışan telefonu, hizmet adı, not.

Silme satır içi onayla yapılır (`window.confirm` değil — mevcut kodda tarayıcı diyaloğu kullanılmıyor).

### Bileşen düzeltmesi

`KpiCard` (`src/components/ui.tsx:136`) `delta` ve `deltaTone`'u **zorunlu** istiyor, yani her kart bir değişim rozeti çizmek zorunda. Önceki döneme kıyas verimiz yok ve uydurma yüzde yazmak seçenek değil. Bu yüzden `delta?` ve `deltaTone?` **opsiyonele çevrilir**; verilmezse rozet çizilmez. Bileşeni kullanan diğer ekranlar değer geçmeye devam ettiği için etkilenmez.

## Hata durumları

| Durum | Davranış |
|---|---|
| 401 | Mevcut `client.ts` login'e yönlendirir — dokunulmaz |
| 5xx / ağ | Tek satır TR mesaj + "Tekrar dene" |
| 422 (form) | Alan altında, 422 gövdesindeki TR metin doğrudan gösterilir |
| Boş dönem | "Bu dönemde kayıtlı ödeme yok." |
| `total == 0` | Yüzde hesaplanmaz, kırılım boş durum gösterir |

## Doğrulama

Test koşucusu iki repoda da yok; bu spec onu kurmuyor. Doğrulama derleyici + migration turu + canlı uç ile yapılır. **İlk şema değişikliğimiz olduğu için migration ayrı bir kalem:**

- `alembic upgrade head` temiz çalışır; `alembic downgrade -1` tabloyu geri alır; tekrar `upgrade head` sorunsuz — migration çift yönlü.
- Migration yazıldıktan sonra `alembic revision --autogenerate` **boş** üretir (model ile şema uyuşuyor).
- `ruff check app` temiz, `python -c "from app.main import app"` geçer.
- Canlı uçlar: geçerli ödeme 201; `amount=0`, `amount<0`, bilinmeyen `method`, gelecek tarih → 422 + TR mesaj; başka kliniğin randevusu → 404; `appointment_id` verildiğinde ad/hizmet/telefon otomatik dolar; özet toplamı elle hesaplananla birebir eşleşir; silme sonrası özet düşer; yetkisiz istek 401.
- Frontend `npm run typecheck` ve `npm run build` exit 0.

## Başarı ölçütü

Operatör bir ödeme girer; `/gelir` ekranında toplam, hizmet kırılımı ve yöntem dağılımı anında o kaydı yansıtır. Ekranda uydurma tek bir rakam kalmaz.
