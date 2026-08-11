# Ana Ekranı Gerçek Veriye Bağlama — Tasarım

**Tarih:** 2026-08-11
**Durum:** Onaylandı
**Repolar:** `hakanbudak/w-lush-web` (frontend) ve `selamet/w-lush` (backend —
tek alan).

## Amaç

`AnaEkran.tsx` iki dashboard içeriyor. Sarmalayıcı gerçek veriye bakıp karar
veriyor: klinikte hiç randevu/talep yoksa `FirstTimeDashboard` (büyük ölçüde
gerçek, dokunulmayacak), varsa `RichDashboard`.

`RichDashboard` **tamamen uydurma**. Tek gerçek randevusu olan bir klinik
"₺48.420 günlük gelir, %87 doluluk, 247 danışan, AI ay sonu tahmini ₺1.18M"
görüyor. Panelin en görünür ekranı, sistemin en büyük yalanı.

Bu iş `RichDashboard`'ı gerçek veriye bağlar.

## Kapsam dışı

- `FirstTimeDashboard`. Zaten `getConnection` ve `listServices` ile gerçek
  veriye bakıyor.
- Yeni backend ucu. Gereken her uç mevcut: `payments/summary`, `payments`,
  `appointments` (aralıklı), `settings`, `staff`, `customers`,
  `conversations`. Tek istisna aşağıdaki tek alan.
- `components/modals.tsx` içindeki `CONTACTS` / `SERVICES` / `STAFF` /
  `TEMPLATES` dizileri. Bu ekran onları kullanmayı bırakıyor ama diziler
  başka yerlerde de duruyor; temizliği ayrı iş.

---

## Bölüm 0 — Tek backend değişikliği

"Bu ay yeni danışan" kartı, kişinin ne zaman ilk göründüğünü bilmeyi
gerektirir. `CustomerOut` böyle bir alan taşımıyor.

**`customers.created_at` işe yaramaz.** `overview()` listesi o tablodan
üretilmiyor: mesajı veya randevusu olan her telefondan üretiliyor ve
`customers` yalnızca isim aramak için kullanılıyor. Fonksiyonun docstring'i
bunu söylüyor — bir randevu, hiç `customers` satırına yazılmamış bir telefon
için var olabilir. O sütun satırların çoğunda boş kalırdı.

Bunun yerine `CustomerOut`'a `first_seen: datetime` eklenir: **ilk mesaj ile
ilk randevudan hangisi önceyse.** Mesaj tarafı `_message_facts`'teki mevcut
group-by sorgusuna bir `min()` olarak biner, yani ek sorgu yok; randevu
tarafı zaten Python'da katlanan döngüde hesaplanır.

Migration yok, yeni uç yok, mevcut alanlar değişmiyor. CRM ekranı etkilenmez.

---

## Bölüm 1 — KPI satırı

Dört kart. Etiketler dönemi açıkça söyler, çünkü aynı satırda iki zaman
ölçeği var.

| Kart | Hesap | Kıyas rozeti |
|---|---|---|
| Bugün gelir | `getSummary(bugün, bugün).total` | dünkü tutarla fark |
| Bugün doluluk | bugünkü aktif randevu ÷ (slot sayısı × aktif personel) | "7/16" ham sayı |
| Bu ay gelir | `getSummary(ay başı, bugün).total` | geçen ayın aynı gününe kadarki tutarla fark |
| Bu ay yeni danışan | `listCustomers` içinde `first_seen` bu aya düşenler (bkz. Bölüm 0) | rozet yok |

Doluluk paydası: `settings.slot_times.length × aktif personel sayısı`. Aktif
personel yoksa çarpan 1'dir — personel öncesi davranış korunur. Payda 0
olamaz; slot tanımlı değilse kart "—" gösterir.

Aktif randevu = `status != "cancelled"`.

**Sparkline yok.** `KpiCard`'ın `sparkline` alanı opsiyonel. Uydurma
`M0,22 L20,20 …` yolları siliniyor; "bu ay gelir" serisi zaten sayfanın
altında tam genişlikte çiziliyor, kartta tekrarı gereksiz.

Boş klinik: gelir 0 ise "₺ 0" yazılır, kıyas rozeti çizilmez.

---

## Bölüm 2 — Eğilim şeridi

Bugünkü uydurma AI şeridinin ("Lazer epilasyon −%23", "AI son taramayı 4 dk
önce yaptı · 247 danışan") yerine gerçek hesap.

**Hesap:** `getSummary` iki kez — son 30 gün ve önceki 30 gün — `by_service`
karşılaştırılır. AI değil, aritmetik.

Gösterim: en çok düşen ve en çok artan hizmet, ham tutarlarıyla birlikte:

> Lazer epilasyon son 30 günde **−%23** (₺18.400 → ₺14.200)

Ham tutarlar parantezde durur; küçük klinikte yüzde tek başına yanıltıcıdır.

**Gürültü koruması.** Önceki dönemde 1 ödemesi olan bir hizmetin 0'a düşüp
"−%100" yazması saçmalık olur. Karşılaştırmaya girmek için hizmetin önceki
dönemde **en az 3 ödemesi ve en az ₺1.000 tutarı** olmalı.

Hiçbir hizmet eşiği geçmiyorsa şerit şunu der:

> Karşılaştırma için henüz yeterli ödeme kaydı yok — Gelir ekranından ödeme
> girdikçe burası dolar.

Alt satır gerçekleşir: taranan dönem ve kayıt sayısı yazar ("son 30 gün vs
önceki 30 gün · 14 ödeme").

**Butonlar:** "Kampanya hazırla" ve "Tüm öneriler" siliniyor; ikisi de uydurma
içerikli modal açıyor. Yerine tek bağlantı: "Gelir raporunda aç" → `/gelir`.

`SUGGESTIONS` dizisi, `SuggestionsModal` ve `CampaignModal` kullanımı bu
ekrandan kalkıyor. "%92 uyum", "iptal riski %62" gibi tahmin üreten her şey
gidiyor — bunları hesaplayacak model yok.

---

## Bölüm 3 — Bugünün randevuları ve gelen kutusu

### Randevu paneli

`listAppointments(bugün, bugün)` ile gerçek satırlar: saat, danışan, hizmet,
personel, durum.

Silinenler:

- **Kanal sütunu** (wa/web/man/ai ikonları). `Appointment` modelinde kanal
  alanı yok, uydurulamaz.
- **"14:30 Boş slot · AI: Berfin Ç. %92 uyum" satırı.** Tahmin üreteci yok;
  boş slotlar zaten takvim ızgarasında görünüyor.
- **Liste/Takvim anahtarı.** "Takvim" görünümü sahte bir mini takvim. Gerçek
  ızgara bir tık ötede; "Takvimde aç" bağlantısı kalıyor.

Başlık altı satırı gerçekleşir: kliniğin slot aralığı (`slot_times` ilk–son),
bugünkü seans sayısı, boş slot sayısı.

Bugün hiç randevu yoksa: "Bugün için randevu yok."

### Gelen kutusu

`listConversations` ile gerçek konuşmalar; en yeni 5 tanesi.

**Okunmamış sayacı yok.** `Conversation` yalnızca `waiting` (son sözü müşteri
söyledi) ve `handoff` (bot susmuş) taşıyor. Yeşil sayı rozeti uydurma olduğu
için siliniyor; yerine `waiting` olanlar "Yanıt bekliyor" olarak işaretlenir —
gerçek ve operatör için daha yararlı.

`✦` işareti kalır, anlamı gerçekleşir: `handoff` değilse botun konuşmayı
sürdürdüğünü gösterir.

"Aday" rozeti siliniyor. Aşama bilgisi CRM'de var ama gelen kutusuyla
eşleştirmek ek çağrı ister; bu ekranın işi değil.

İsim boşsa telefon gösterilir (diğer ekranlardaki davranışın aynısı).

---

## Bölüm 4 — Alttaki gelir grafiği

Bu ayın **günlük** geliri: `listPayments(ay başı, bugün)` satırları
`paid_at`'e göre gruplanır. Sabit "Mayıs" başlığı gerçek ay adına, sabit SVG
yolu gerçek seriye dönüşür.

Sağdaki üç rakamdan ikisi siliniyor:

- **"AI ay sonu tahmini ₺1.18M"** — tahmin modeli yok.
- **"Hedef ₺1.10M"** — sistemde hedef kavramı hiç yok (ne modelde ne
  ayarlarda).
- **"Bugüne kadar"** kalır ve gerçekleşir.

Yerlerine dürüst kıyas: **"Geçen ay aynı güne kadar ₺X"**. Aynı veriden
hesaplanır, tahmin içermez.

Ayın hiç ödemesi yoksa grafik yerine: "Bu ay henüz ödeme kaydı yok."

Grafik `components/finance/MonthlyBars.tsx` örüntüsünü izleyen bir günlük bar
bileşeniyle çizilir; aylık bileşen ay etiketi (`monthLabel`) bastığı için
doğrudan kullanılamaz.

---

## Dosya yapısı

`AnaEkran.tsx` şu an 501 satır ve iki dashboard barındırıyor. `RichDashboard`
gerçek veriye bağlanınca veri çekme + hesap + dört panel aynı dosyada
toplanır. Sistem ve Takvim ekranlarında yaptığımız gibi bölünür:

| Dosya | Sorumluluk |
|---|---|
| `pages/AnaEkran.tsx` | Sarmalayıcı: veri var mı, hangi dashboard |
| `components/anaekran/RichDashboard.tsx` | Veri çekme + panelleri dizme |
| `components/anaekran/KpiRow.tsx` | Dört kart |
| `components/anaekran/TrendStrip.tsx` | Eğilim hesabı ve şerit |
| `components/anaekran/TodayAppointments.tsx` | Bugünün randevuları |
| `components/anaekran/InboxPanel.tsx` | Gelen kutusu |
| `components/anaekran/DailyRevenueChart.tsx` | Günlük gelir grafiği |
| `components/anaekran/FirstTimeDashboard.tsx` | Bugünkü kod, taşınır (değişmez) |
| `utils/dashboard.ts` | Saf hesaplar: doluluk, eğilim karşılaştırması, günlük gruplama |

Hesaplar `utils/dashboard.ts` içinde saf fonksiyonlar olarak durur; tarayıcı
olmadan doğrulanabilmelerinin tek yolu bu.

---

## Doğrulama

Repoda test koşucusu yok.

- Backend: `ruff check app` temiz, `import ok`, `GET /api/customers` yanıtında
  `first_seen` gelir ve mevcut alanlar korunur.
- `typecheck` ve `build` 0 ile çıkar.
- `utils/dashboard.ts` fonksiyonları node ile doğrulanır: doluluk paydası
  (personel var/yok), eğilim eşikleri (3 ödeme + ₺1.000 kuralı, eşiği geçen
  hiç hizmet yokken boş sonuç), günlük gruplama (ödemesiz günler 0).
- `grep` ile `AnaEkran` ağacında uydurma dizi kalmadığı gösterilir:
  `APPTS`, `SUGGESTIONS`, `INBOX`, `M0,22`, `1.18M`, `612.840`.
- Gerçek veriyle ekran karşılaştırması: API'den okunan bugünkü randevu sayısı
  ve bu ay geliri, elle hesaplananla karşılaştırılır.

**Doğrulanamayacak olan:** görsel yerleşim. Chrome eklentisi bağlı değilse
tarayıcı turu yapılmaz ve PR'da atlandığı yazılır.
