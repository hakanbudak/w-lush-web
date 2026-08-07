# Giderler (Design Spec)

**Tarih:** 2026-08-07
**Repolar:** Backend `selamet/w-lush`, Frontend `hakanbudak/w-lush-web`

## Amaç

Giderler ekranı gerçek gider kayıtlarıyla çalışsın. Bugün `Giderler.tsx` dosya içine gömülü `CATEGORIES`, `MONTHS` ve `RECENT` dizileriyle çalışıyor; backend'de gider diye bir kavram yok.

Bu, "Gelir / Gider / Rapor" ayrıştırmasının **ikinci** parçası. Birincisi (Gelir) 2026-08-07'de merge edildi; üçüncüsü (Rapor — AI rapor üretimi) sonraya kaldı.

## Veri modeli

İki yeni tablo, tek migration. Alembic head'i `b7c1a4e92f10` (payments).

### `expense_categories`

| Alan | Tip | Not |
|---|---|---|
| `id` | PK | |
| `clinic_id` | FK `clinics.id`, index | |
| `name` | String(80) | |
| `active` | Boolean, default `true` | pasif olan formda görünmez |
| `sort_order` | Integer, default 0 | |
| — | UNIQUE(`clinic_id`, `name`) | aynı klinikte iki "Kira" olmasın |

### `expenses`

| Alan | Tip | Not |
|---|---|---|
| `id` | PK | |
| `clinic_id` | FK `clinics.id`, index | |
| `category_id` | FK `expense_categories.id`, index, **NOT NULL** | |
| `spent_at` | Date, index | harcamanın yapıldığı gün |
| `amount` | Integer | TRY, tam sayı |
| `description` | String(200), default `""` | |
| `method` | String(20) | `cash` \| `card` \| `transfer` \| `other` |
| `note` | Text, default `""` | |
| `created_at` | DateTime, default `now()` | |

**Kararlar:**

1. **Kategori bir katalog tablosudur, sabit liste veya serbest metin değil.** Klinik kendi kategorisini tanımlayabilir. Bedeli kabul edildi: ekstra tablo, CRUD uçları ve bir yönetim arayüzü.
2. **`category_id` zorunlu.** Kategorisiz gider, kırılımda delik bırakır ve katalog seçmenin anlamını yok eder.
3. **`amount` tam sayı TRY, `spent_at` saatsiz** — gelirle birebir aynı kurallar, iki tablonun raporları toplanabilsin diye.
4. **`method` ödemelerdeki sabit listeyle aynı.** `app/payments/models.py:METHODS` import edilir, kopyalanmaz.
5. **Silme yerine pasife alma.** Kullanımdaki kategori silinemez (409); `active=false` yapılır, formdan kalkar, geçmiş kırılımda kalır. `Service.active` deseninin aynısı. Kategori yeniden adlandırılırsa geçmiş de yeni adı gösterir — katalog seçmenin doğal sonucu, kabul edilmiştir.

**Varsayılan kategoriler.** Boş katalogla ilk gider girilemez, o yüzden altı varsayılan iki yoldan da gelir:

1. **Mevcut klinikler** — migration, `upgrade()` içinde her `clinics` satırı için altı kategoriyi yazar.
2. **Yeni klinikler** — `app/clinic/service.py:38`'deki `seed_clinic()` (kayıt sırasında çağrılan, idempotent fonksiyon) `app/expenses/service.py`'nin dışa verdiği `seed_categories(db, clinic_id)` çağrısını yapar. Kategori verisini gider modülü sahiplenir; `clinic` modülü yalnız çağırır — böylece `clinic/service.py` gider modelini import etmez.

Varsayılanlar: Personel & maaş, Kira & aidat, Ürün & sarf, Pazarlama, Cihaz & bakım, Vergi & SGK. Metinler `app/content/messages.py` içinde `DEMO_EXPENSE_CATEGORIES` olarak durur (`DEMO_SERVICES` deseni).

## Kapsam dışı

- **"+%38 anormal" / "plan dışı" etiketleri.** Önceki döneme kıyas ve eşik tanımı gerektiren bir analiz özelliği; ne kıyas verisi ne eşik var. `KpiCard`'ın uydurma yüzdesini attığımız gerekçeyle bunlar da atılıyor. Gider geçmişi biriktikten sonra kendi işini hak eder.
- **Bütçe / plan.** "Plan dışı" etiketinin gerektirdiği bütçe kavramı yok.
- **Gelir-gider karşılaştırması ve kâr.** Rapor işine ait.
- **Fatura/fiş eki.** Dosya yükleme altyapısı yok.

## Backend sözleşmesi

Tek modül `app/expenses/` (`models.py`, `schemas.py`, `service.py`, `router.py`), tek router `prefix="/api"` (bu, `app/clinic/router.py`'nin deseni), iki yol grubu. Kategori tablosu da bu modülde durur çünkü yalnızca gideri var etmek için vardır; ikisi birlikte değişir.

Klinik kapsamı **daima** `current.clinic_id`'den gelir, asla istekten.

### Kategoriler

| Uç | Davranış |
|---|---|
| `GET /api/expense-categories` | Hepsi (aktif + pasif), `sort_order, id` sırasında. `?active=` filtresi yok: `Sistem` hepsini gösterir, gider formu pasifleri kendi eler |
| `POST /api/expense-categories` | 201. Boş ad → 422; aynı klinikte yinelenen ad → 409 |
| `PUT /api/expense-categories/{id}` | `name`, `active`, `sort_order` güncellenir. Yinelenen ad → 409; başka kliniğin kaydı → 404 |
| `DELETE /api/expense-categories/{id}` | Kullanımdaysa **409** + `ERR_CATEGORY_IN_USE`. Boşsa 204 |

### Giderler

| Uç | Davranış |
|---|---|
| `GET /api/expenses?start=&end=` | `spent_at` yeniden eskiye, üst sınır 200. Yanıt `category_name` de taşır — istemci ikinci sorgu yapmasın |
| `GET /api/expenses/summary?start=&end=` | `total`, `count`, `by_category[{category_id, name, amount, count}]`, `by_method`, `by_month` |
| `POST /api/expenses` | 201. `amount<=0` → 422; geçersiz `method` → 422; gelecek `spent_at` → 422; olmayan/başka kliniğin kategorisi → 404; **pasif kategori → 422** (formda görünmeyen kategoriye yazılamaz) |
| `DELETE /api/expenses/{id}` | 204. Gelirdeki gibi `PATCH` yok — muhasebe satırı yerinde düzenlenmez |

Rota sırası: `/expenses/summary` sabit yolu `/expenses/{id}` parametreli yolundan **önce** tanımlanır.

Özet, gelirdeki `summary()` ile aynı biçimi taşır: aynı `GROUP BY` yaklaşımı, ay kovası için aynı `substr(cast(spent_at as text), 1, 7)` (dialect'ten bağımsız, hem SQLite hem PostgreSQL). İleride gelir-gider karşılaştırması yazan, iki yanıtı doğrudan yan yana koyabilir.

Tarih aralığı süzgeci `app/expenses/service.py` içinde kendi tablosu için yazılır; `payments` ile ortak bir yardımcıya çıkarılmaz. İki modülü birbirine bağlamamak için bilinçli bir tekrar — üçüncü para tablosu gelirse ortaklaştırma hak edilir.

## Frontend

### API katmanı

Tek dosya `src/api/expenses.ts`: `listExpenses(start?, end?)`, `getExpenseSummary(start?, end?)`, `createExpense(input)`, `deleteExpense(id)`, `listCategories()`, `createCategory(input)`, `updateCategory(id, input)`, `deleteCategory(id)`. HTTP çağrısı başka hiçbir yerde yapılmaz.

### Ortak bileşenler (`src/components/finance/`)

Gelir ekranı yazılırken ikinci bir kullanıcı yoktu; şimdi var. Üç saf sunum bileşeni çıkarılır — veri çekmezler, yalnız aldıklarını çizerler:

- `PeriodPicker` — dönem düğmeleri (`Period` değerleri ve `rangeFor` mevcut `src/utils/period.ts`'te)
- `BreakdownBars` — `{ label: string; amount: number }[]` alıp yüzdeli bar listesi çizer
- `MonthlyBars` — `{ month: string; amount: number }[]` alıp aylık bar çizer

`GelirRaporu.tsx` bunları kullanacak şekilde **sadeleştirilir**: yeni davranış eklenmez, yalnız tekrar kaldırılır. Bu, spec'in gelir ekranına da dokunması demektir; karşılığı üçüncü finans ekranında çizim mantığının tek yerde olmasıdır.

### Giderler ekranı (`/gider`)

`Giderler.tsx` baştan yazılır; `CATEGORIES`, `MONTHS`, `RECENT` dizileri ve anormallik etiketleri silinir. Yukarıdan aşağı: dönem seçici + "Gider ekle" · KPI satırı (Toplam gider, Kayıt sayısı, Ortalama) · kategori kırılımı (`BreakdownBars`) · ödeme yöntemi dağılımı · aylık seyir (`MonthlyBars`) · son giderler tablosu (tarih, kategori, açıklama, yöntem, tutar, satır içi kaldır).

**Gider ekleme modali** (`src/components/ExpenseModal.tsx`), `PaymentModal` deseninde: tarih (bugün varsayılan), tutar, kategori (`<select>`, yalnız `active` olanlar), açıklama, yöntem, not. Backend'in TR doğrulama metni forma yansır.

### Sistem > Gider kategorileri

`Sistem.tsx:106`'daki `HizmetSection`'ın birebir kardeşi bir bölüm: liste, satır içi ad düzenleme, aktif/pasif anahtarı, sil. Silme 409 dönerse gelen mesaj gösterilir ve satır kaybolmaz.

## Hata durumları

| Durum | Davranış |
|---|---|
| 401 | Mevcut `client.ts` login'e yönlendirir |
| 409 (kategori silme) | Backend'in TR mesajı gösterilir, satır durur |
| 409 (yinelenen ad) | Form içinde gösterilir |
| 422 (gider formu) | Alan altında, backend metni |
| 5xx / ağ | Tek satır TR mesaj + "Tekrar dene" |
| Boş dönem | "Bu dönemde kayıtlı gider yok." |
| Kategori listesi boş | Gider formunda "Önce Sistem > Gider kategorileri'nden kategori tanımlayın" |

## Doğrulama

Test koşucusu yok; doğrulama derleyici + migration turu + canlı uç ile yapılır.

- `alembic upgrade head` çalışır; **varsayılan kategorilerin mevcut kliniğe yazıldığı** doğrulanır; `alembic downgrade -1` iki tabloyu da geri alır; tekrar `upgrade`.
- Migration sonrası `alembic revision --autogenerate` **boş** üretir.
- `ruff check app` temiz, `python -c "from app.main import app"` geçer.
- Canlı uçlar: kategori CRUD; yinelenen ad → 409; kullanımdaki kategoriyi silme → 409; pasife alma → 200 ve formdan düşme; pasif kategoriye gider → 422; `amount<=0`, geçersiz `method`, gelecek tarih → 422; özet toplamı elle hesaplananla eşleşir; silme sonrası özet düşer; yetkisiz → 401.
- Frontend `npm run typecheck` ve `npm run build` exit 0.
- Gelir ekranının ortak bileşenlere geçtikten sonra **aynı sayıları** gösterdiği doğrulanır (regresyon kontrolü).

## Başarı ölçütü

Operatör `Sistem`'den kategori tanımlar, `/gider` ekranından harcama girer; toplam, kategori kırılımı ve yöntem dağılımı anında o kaydı yansıtır. Ekranda uydurma tek bir rakam kalmaz.
