# Randevu Takvimi Izgarası (Design Spec)

**Tarih:** 2026-08-11
**Repolar:** Backend `selamet/w-lush` (küçük bir uç değişikliği), Frontend `hakanbudak/w-lush-web`

## Amaç

`/randevu` ekranındaki takvim ızgarası gerçek randevuları göstersin. Bugün ızgara sabit kodlanmış `APPTS` dizisini çiziyor; ekranın altındaki liste gerçek, üstündeki takvim uydurma.

## Bulgu: bu bir slot ızgarası, zaman tuvali değil

Kliniğin ayarlarında `slot_times` = `10:00–17:00` (saat başı) ve `open_days` = Pzt–Cmt. WhatsApp botu randevuları **yalnız bu slotlara** yazıyor. Yani her randevu tam bir slota oturuyor.

Bu, tasarımın en önemli kararını belirliyor: takvim serbest yerleşimli bir zaman tuvali değil, **satırları slotlar olan bir tablo**. Sahte ekrandaki 09:00–20:00 aralığı, `PX_PER_MIN` piksel hesabı ve değişken yükseklikli bloklar veriye uymuyordu.

Bunun yan etkisi: **randevu süresi sorunu ortadan kalkıyor.** `appointments` tablosunda bitiş saati yok ve `services` tablosunda süre yok; ızgara slot tabanlı olduğu için buna ihtiyaç da yok. Bir randevu bir slottur.

## Veri boşlukları ve ne yapıldığı

Sahte ızgaranın kullandığı sekiz alandan yalnız biri (personel) gerçek hale geldi; kalanlar ekrandan kaldırılıyor.

| Sahte alan | Karar |
|---|---|
| `staff` (sütunlar) | ✅ Gerçek — `staff` tablosu ve `appointments.staff_id` mevcut |
| `end` / blok yüksekliği | Kaldırılıyor — slot ızgarasında gereksiz |
| `cat` (blok rengi) | Kaldırılıyor; renk **personelden** türetilir |
| `channel` (WhatsApp/Web/Manuel) | Kaldırılıyor — kaynak alanı yok, bugün hepsi bottan geliyor |
| `price` | Kaldırılıyor — randevuda tutar yok |
| `status: tamam/devam/risk` | Gerçek durumlara indirgeniyor: `pending`, `confirmed`, `cancelled` |
| `risk` ("İptal riski %62") | Kaldırılıyor — kurgu |
| `AI_SLOT` ("%92 uyum") | Kaldırılıyor — kurgu |

**Blok rengi personelden türetilir**, veritabanına renk kolonu eklenmeden — `Avatar` bileşenindeki gibi sıradan bir palet ataması.

## Backend

**Şema değişmiyor, migration yok.** Tek değişiklik:

`GET /api/appointments` **isteğe bağlı `start` ve `end` tarih parametreleri** alır. Bugün kliniğin tüm randevularını `created_at` sırasıyla döndürüyor; takvim bir gün veya hafta gösterdiği için aralık süzgeci gerekiyor. Ödeme ve gider uçlarındaki desenin aynısı.

- Parametreler verilmezse **bugünkü davranış korunur** (tüm randevular) — ekranın altındaki mevcut liste bundan etkilenmez.
- Verilirse `appt_date` aralığa göre süzülür, sıralama `appt_date, appt_time` olur.

Yanıt şeması değişmiyor; `staff_id` ve `staff_name` zaten var.

## Izgara

| | Gün görünümü | Hafta görünümü |
|---|---|---|
| Satırlar | `slot_times` | `slot_times` |
| Sütunlar | **Atanmamış** + aktif personel | Kliniğin `open_days` günleri |
| Hücre | O slot + o personelin randevuları | O slot + o günün randevuları |

İki görünüm **tek veri çekimini ve tek hücre bileşenini** paylaşır; yalnız eksen eşlemesi (randevu → sütun) değişir. İki ayrı ızgara mantığı yazmak, bakması zor bir ekran doğururdu.

**Blok içeriği:** danışan adı (yoksa maskeli telefon) + hizmet adı.

**Durum gösterimi:**

| Durum | Görünüm |
|---|---|
| `confirmed` | Normal blok, personel rengi |
| `pending` | Normal blok, kesikli kenarlık |
| `cancelled` | **Soluk, üstü çizili, kırmızı** — slotun boşaldığını gösterir |

İptal edilenler bilerek ızgarada kalıyor: "burası doluydu, boşaldı" bilgisi operatör için değerli.

**Atanmamış sütunu en solda ve gizlenmiyor.** Personel modelinin amacı buydu; atanmamış bir randevu göz ardı edilebilir olmamalı. Personel hiç tanımlanmamışsa ızgarada yalnız bu sütun bulunur ve ekran bir satır açıklama gösterir: "Personel tanımlanmamış — Sistem > Personel bölümünden ekleyebilirsiniz."

**Hücrede birden fazla randevu** (hafta görünümünde olağan, gün görünümünde aynı personelin aynı slotta iki randevusu ancak veri hatasıyla oluşur) alt alta dizilir; ikiden fazlaysa "+N" ile kısalır.

**Tarih gezinme.** Izgara açılışta **bugünü** (gün görünümü) veya **bugünün haftasını** (hafta görünümü) gösterir. Üstte üç kontrol: `‹` önceki, `Bugün`, `›` sonraki — adım, seçili görünüme göre bir gün veya bir hafta. Seçilen aralık doğrudan `GET /api/appointments?start=&end=` çağrısına gider; görünüm veya tarih değişince veri yeniden çekilir.

Hafta görünümünde hafta **Pazartesi** başlar (kliniğin `open_days` değerleri ISO gün numaraları: 1 = Pazartesi). Kapalı günler sütun olarak çizilmez.

**Bloğa tıklayınca** ızgaranın altında bir detay kartı açılır: tarih, saat, hizmet, danışan, personel, durum — ve zaten var olan üç eylem (onayla, iptal et, personel ata). Yeni backend yeteneği gerekmiyor; bunlar ekranın alt listesindeki işlerin aynısı.

## Kapsam dışı

- **Panelden randevu oluşturma.** Bugün `Appointment(...)` yalnız `app/clinic/service.py:159`'da üretiliyor ve orayı bot çağırıyor; panelin randevu yaratacak ucu yok. Eklemek yeni bir uç, çakışma kontrolü (iptal olmayan randevular için `(klinik, tarih, saat)` benzersizlik indeksi var), bir form ve "müşteriye WhatsApp mesajı gitsin mi" kararını gerektirir. **Kendi spec'ini alacak, hemen ardından.** Bu yüzden boş ve iptal olmuş slotlar bu işte yalnız *görünür*, tıklanabilir bir "randevu ekle" akışı sunmaz.
- **Sürükle-bırak ile randevu taşıma.** Yeniden planlama ucu yok.
- **Personel çalışma saatleri.** Izgara kliniğin ortak `slot_times`'ını kullanır; personel bazlı müsaitlik ayrı bir veri işi.
- **`modals.tsx`'teki sahte `NewAppointmentModal`.** Randevu oluşturma spec'inin konusu.

## Hata durumları

| Durum | Davranış |
|---|---|
| 401 | Mevcut `client.ts` login'e yönlendirir |
| 5xx / ağ | Izgara yerine tek satır TR mesaj + "Tekrar dene" |
| Seçilen aralıkta randevu yok | Izgara boş hücrelerle çizilir (hata değil) |
| `slot_times` boş | "Çalışma saatleri tanımlanmamış — Sistem > Klinik bilgisi bölümünden ayarlayabilirsiniz." |
| Personel yok | Yalnız "Atanmamış" sütunu + yönlendirme satırı |

## Doğrulama

Test koşucusu yok; doğrulama derleyici + canlı uç + veri kontrolü ile.

- `ruff check app` temiz, `python -c "from app.main import app"` geçer, **`alembic revision --autogenerate` boş** (şema değişmediğinin kanıtı)
- `GET /api/appointments?start=&end=` yalnız aralıktaki randevuları döndürür; parametresiz çağrı eski davranışı korur
- Bilinen bir randevu kümesiyle: ızgaranın çizeceği hücre eşlemesi elle hesaplananla karşılaştırılır (hangi slot + hangi personel)
- İptal edilmiş bir randevunun aralıkta **döndüğü** doğrulanır (ızgarada gösterilecek)
- Frontend `npm run typecheck` ve `npm run build` exit 0
- Ekranda `APPTS`, `STAFF`, `AI_SLOT`, `PX_PER_MIN` adlarının kalmadığı (`grep`)

Tarayıcıda görsel doğrulama **yapılamıyor** (Chrome eklentisi bağlı değil). Bu, görsel ağırlıklı bir iş olduğu için doğrulamanın en zayıf noktası; ızgaranın hücre eşlemesi veri düzeyinde kontrol edilerek kısmen telafi edilir.

## Başarı ölçütü

`/randevu` ekranında sahte veri kalmaz. Operatör gün görünümünde kimin hangi slotta ne yaptığını, hafta görünümünde hangi günün boş olduğunu görür; iptal edilmiş randevular boşalan slotları işaret eder; atanmamış randevular kendi sütununda görünür kalır.
