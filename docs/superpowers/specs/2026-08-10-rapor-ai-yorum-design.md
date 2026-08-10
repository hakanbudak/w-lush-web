# Rapor — Gelir-Gider Özeti + AI Yorumu (Design Spec)

**Tarih:** 2026-08-10
**Repolar:** Backend `selamet/w-lush`, Frontend `hakanbudak/w-lush-web`

## Amaç

`/rapor` ekranı, seçilen dönemin gelir-gider tablosunu hesaplasın ve bu tabloyu bir dil modeline yorumlatarak Türkçe birkaç paragraf üretsin. Bu, projenin **ilk LLM entegrasyonu**.

## Kapsam ve ayrıştırma

`Rapor.tsx` bugün beş ayrı sistem vaat ediyor ve çoğunun altında veri yok. Ayrıştırma ve sıra:

| Parça | Durum |
|---|---|
| **Gelir-gider özeti + AI yorumu (bu spec)** | Veri var (ödemeler + giderler merge edildi) |
| Dışa aktarma (PDF/Excel) | Sonra — dosya üretme altyapısı yok |
| Zamanlanmış rapor + e-posta | Sonra — ne zamanlayıcı ne SMTP var |
| Serbest metin AI sorgusu | Sonra — sabit şablon çalışmadan riskli |
| Personel / VIP / huni / no-show şablonları | **Veri işi**, rapor işi değil: çalışan modeli yok, CRM aşama geçişleri saklanmıyor, `no-show` durumu yok, ödemede danışan bağı opsiyonel |

## Bağımlılık kararı

**Yeni pip bağımlılığı: `anthropic`** (resmi Python SDK). Şimdiye kadarki her spec "yeni bağımlılık eklenmez" diyordu; bu iş o kuralı bilerek kırıyor. Alternatif — `httpx` ile Messages API'yi elle konuşmak — SDK'nın hata tipleri, yeniden deneme ve zaman aşımı davranışını yeniden yazmak demek olurdu.

## Model ve maliyet

Bu bir **tek çağrılık** iş: özet ver, yorum al. Ajan, araç kullanımı veya döngü yok.

| Karar | Değer | Gerekçe |
|---|---|---|
| Model | `claude-opus-5` | Güncel varsayılan; $5 / $25 per MTok |
| Efor | `output_config={"effort": "low"}` | İş basit bir yorumlama. Opus 5 düşük eforda bu tür işlerde güçlü; maliyet ve gecikme belirgin düşer |
| Düşünme | Varsayılan (açık) | Opus 5'te düşünme varsayılan olarak açık. Kapatmak `<thinking>` etiketlerinin yanıta sızması riskini getiriyor; doğru kaldıraç efor düşürmek |
| `max_tokens` | 2000 | Çıktı bilerek kısa (3-5 paragraf). Genel öneri 16000; burada kısalık kasıtlı |
| Akış (streaming) | Yok | Çıktı kısa; zaman aşımı riski yok |
| `fallbacks` | Açık | Ret durumunda kod sessizce patlamasın |

Yük başına ~500 token girdi, ~600 token çıktı → rapor başına maliyet kuruşlarla ölçülür. İlk gerçek çağrıda `response.usage` loglanır; tahminle yetinilmez.

## Gizlilik sınırı

**Modele yalnızca toplamlar gider.** Danışan adı, telefon, tekil ödeme veya gider kaydı, not alanları — hiçbiri gönderilmez. Gönderilen yapı tam olarak şudur:

```jsonc
{
  "period": { "start": "2026-08-01", "end": "2026-08-31" },
  "income": { "total": 6800, "count": 3, "by_service": [{ "name": "Mezoterapi", "amount": 4100 }] },
  "expense": { "total": 64600, "count": 2, "by_category": [{ "name": "Kira & aidat", "amount": 46000 }] },
  "profit": -57800
}
```

Hizmet ve kategori adları katalog verisidir, kişiye bağlanamaz. Klinik verisi üçüncü tarafa çıkıyor; çıkanın ne olduğu tek bakışta savunulabilir olmalı.

## Veri modeli

Tek yeni tablo. Alembic head'i `c3d5e7a1b204` (expenses).

| Alan | Tip | Not |
|---|---|---|
| `id` | PK | |
| `clinic_id` | FK `clinics.id`, index | |
| `kind` | String(40) | Şimdilik tek değer: `"income_expense"` |
| `period_start` / `period_end` | Date | |
| `body` | Text | Modelin ürettiği Türkçe yorum |
| `facts` | Text | Modele gönderilen JSON, olduğu gibi |
| `model` | String(40) | `"claude-opus-5"` |
| `created_at` | DateTime | |

**`facts` neden saklanıyor:** metin ile dayandığı sayılar birlikte durmalı. Altı ay sonra "bu yorum nereden çıkmış?" sorusunun cevabı yoksa arşivlenen AI çıktısı işe yaramaz. Ayrıca modele tam olarak neyin gittiğini denetlenebilir kılar — gizlilik sınırının kanıtı.

**Raporlar neden saklanıyor:** üretim para harcıyor; çıktı deterministik değil (aynı dönem için ikinci üretim farklı metin verir, kullanıcı bunu hata sanar); ekranda zaten "son raporlar" listesi var.

**Saklanmayan:** prompt sürümü. `model` + `created_at` + prompt dosyasının git geçmişi bu izi zaten veriyor.

## Backend sözleşmesi

Yeni modül `app/reports/`: `models.py`, `schemas.py`, `service.py` (veri toplama + kayıt), `llm.py` (tek Claude çağrısı), `prompt.py`, `router.py`. **Veri toplama ile model çağrısı ayrı dosyalarda** — biri veritabanına, diğeri ağa bağlı; ikisi ayrı ayrı doğrulanabilmeli.

Klinik kapsamı daima `current.clinic_id`'den gelir.

| Uç | Davranış |
|---|---|
| `POST /api/reports/income-expense` | Gövde: `start`, `end`. `payments.summary()` ve `expenses.summary()` **yeniden kullanılır**, kopyalanmaz. Modeli çağırır, kaydı yazar, 201 döner. **Hız sınırı: klinik başına saatte 10** (mevcut `slowapi`) — her çağrı para harcıyor |
| `GET /api/reports` | Son 50, yeniden eskiye. `body` ve `facts` **dahil değil** — liste hafif kalsın |
| `GET /api/reports/{id}` | Tam rapor: `body` + `facts` |
| `DELETE /api/reports/{id}` | 204 |

### Hata durumları — ayrı ayrı

| Durum | Kod | TR mesaj (`app/content/messages.py`) |
|---|---|---|
| `ANTHROPIC_API_KEY` yok | 503 | `ERR_AI_NOT_CONFIGURED` — "AI raporu yapılandırılmamış" |
| Dönemde hiç veri yok | 422 | `ERR_REPORT_NO_DATA` — "Bu dönemde rapor üretecek veri yok" |

"Veri yok" **hem gelir hem gider sayısının sıfır** olması demektir. Yalnız biri doluysa rapor üretilir — sadece gider olan bir dönem de yorumlanmaya değer bir tablodur (ve muhtemelen en çok o).

Anahtar `app/core/config.py`'deki `Settings` sınıfına `anthropic_api_key: str = ""` olarak eklenir (mevcut `whatsapp_*` alanlarıyla aynı desen) ve `.env.example`'a yorumuyla yazılır. Kod `settings.anthropic_api_key` üzerinden okur, `os.environ`'a doğrudan bakmaz.
| Anthropic hatası / zaman aşımı | 502 | `ERR_REPORT_FAILED` — "Rapor üretilemedi, tekrar deneyin" |
| Model reddi (`stop_reason == "refusal"`) | 502 | Aynı mesaj, ama sunucu logunda `stop_details.category` ile ayrılır |
| Rapor bulunamadı | 404 | `ERR_REPORT_NOT_FOUND` — "Rapor bulunamadı" |

Son iki satır önemli: reddi ağ hatasından ayırt edemezsek, gerçekten olduğunda nedenini asla anlayamayız. `stop_reason` **`content` okunmadan önce** kontrol edilir — refüzde `content` boş gelir.

## Prompt

`app/reports/prompt.py` içinde durur — `messages.py` değil. Proje kuralı "kullanıcıya görünen TR metin `messages.py`'de" diyor, ama prompt kullanıcıya görünen bir metin değil; çıktıyı belirleyen işlevsel bir yapı. Kendi dosyasında olması diff'te tek başına gözden geçirilebilmesi demek.

Sistem prompt'u:

> Sen bir güzellik kliniğinin yönetim panelinde çalışan finans analistisin. Sana bir dönemin gelir ve gider toplamları veriliyor; kliniği işleten kişiye bu tabloyu Türkçe yorumluyorsun.
>
> Okuyucu muhasebeci değil, kliniği işleten kişi. Rakamları tekrar etmek yerine ne anlama geldiklerini söyle: kâr durumu, en ağır kalemler, dikkat çeken oran veya dengesizlikler, varsa bir sonraki döneme dair somut bir öneri.
>
> Yalnızca verilen sayılara dayan. Veride olmayan bir eğilim, kıyas veya sektör ortalaması üretme — önceki dönemin verisi verilmediyse "geçen aya göre" türü bir cümle kurma. Bir şey belirsizse belirsiz olduğunu söyle.
>
> Üç ila beş kısa paragraf yaz. Başlık, madde işareti veya tablo kullanma. Tutarları ₺ ve binlik ayırıcıyla yaz.

Kullanıcı mesajı yalnızca `facts` JSON'udur.

**Prompt'ta bilerek olmayanlar:** büyük harfli "ÖNEMLİ/ASLA" vurguları, adım adım talimat, örnek çıktı. Güncel modeller sistem prompt'unu yakından izliyor; eski modellere yazılmış bu üslup bugün aşırı-tetikleme ve kalıplaşmış çıktı üretiyor. Tek gerçek yasak — uydurmama — bir kez ve gerekçesiyle söyleniyor.

## Frontend

### API katmanı

Tek dosya `src/api/reports.ts`: `generateIncomeExpenseReport(start, end)`, `listReports()`, `getReport(id)`, `deleteReport(id)`.

### Ekran (`/rapor`)

`Rapor.tsx` baştan yazılır; `TEMPLATES`, `PROMPTS`, `RECENT`, `SCHEDULED` dizileri silinir. Üç parça:

1. **Üretici kartı** — `PeriodPicker` (mevcut ortak bileşen) + "Rapor üret" düğmesi. Model çağrısı saniyeler sürer: düğme devre dışı kalır, "Rapor hazırlanıyor…" gösterilir. Projede ilk kez gerçekten yavaş olan işlem; anlık geri bildirim şart.
2. **Üretilen rapor** — üstte `facts`'ten gelen sayılar (gelir, gider, kâr), altında modelin yorumu. **Sayılar önce**, çünkü doğrulanabilir olan onlar; yorum onların üstüne biniyor.
3. **Son raporlar** — `listReports()` listesi; satıra tıklayınca rapor açılır, satır içi onayla silinir (gelir/gider ekranlarındaki desen).

Yorum metni düz metin olarak, satır sonları korunarak gösterilir (`white-space: pre-wrap`). Markdown işlenmez — prompt zaten başlık ve madde istemiyor.

### Hata durumları (ekran)

| Durum | Davranış |
|---|---|
| 503 | "AI raporu yapılandırılmamış" — üretim düğmesi devre dışı, açıklama görünür |
| 422 | Backend'in TR metni kart içinde |
| 502 | "Rapor üretilemedi, tekrar deneyin" + tekrar dene |
| 5xx / ağ | Tek satır TR mesaj + "Tekrar dene" |
| Hiç rapor yok | "Henüz rapor üretilmedi." |

## Doğrulama

İki tabakalı, çünkü ağ çağrısı her ortamda yapılamaz:

**Anahtarsız (her zaman koşulur):**
- `alembic upgrade head` → `downgrade -1` → `upgrade head`; sonrasında `autogenerate` boş üretir
- `ruff check app` temiz, `python -c "from app.main import app"` geçer
- Anahtar yokken `POST /api/reports/income-expense` → **503**, ağa çıkmadan
- `facts` üretimi ayrı doğrulanır: bilinen ödeme/gider verisiyle beklenen JSON (toplam, kâr) elle hesaplananla eşleşir
- Boş dönem → 422
- Liste / detay / silme uçları, yetkisiz istek 401
- Frontend `npm run typecheck` ve `npm run build` exit 0

**Anahtarlı (kullanıcı sağlarsa):**
- Tek gerçek çağrı; dönen metin Türkçe, `facts`'teki toplamla tutarlı, `reports` satırı yazılmış
- `response.usage` loglanır ve rapor başına gerçek maliyet görülür

`ANTHROPIC_API_KEY` yoksa uçtan uca doğrulama **yapılamaz** — kod yolları ve 503 davranışı test edilir, gerçek çağrı kullanıcıya kalır. Bu, WhatsApp token'larındaki durumun aynısı.

## Başarı ölçütü

Operatör `/rapor` ekranından bir dönem seçer, "Rapor üret" der; birkaç saniye içinde ekranda o dönemin gerçek gelir-gider tablosu ve onun üzerine yazılmış Türkçe bir yorum belirir. Rapor listede kalır, `facts`'i ile birlikte saklanır. Ekranda uydurma tek bir şablon veya rakam kalmaz.
