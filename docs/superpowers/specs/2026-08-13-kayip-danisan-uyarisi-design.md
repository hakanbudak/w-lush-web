# Kayıp Danışan Uyarısı — Tasarım

**Tarih:** 2026-08-13
**Durum:** Onaylandı
**Repolar:** `selamet/w-lush` (ağırlık burada), `hakanbudak/w-lush-web` (küçük)

## Amaç

Sistem ekranındaki dört AI ayarından biri `ai_lapsed_alert`. Ayar saklanıyor
ama **hiçbir şey okumuyor** — panel bunu "Yakında" diye işaretliyor. Bu iş o
ayarın arkasını dolduruyor.

Uzun süredir gelmeyen bir danışan sessizce kaybolur: kimse fark etmez, kimse
aramaz. Amaç operatöre bunu fark ettirmek.

## Kapsam dışı

Diğer üç AI ayarı (`ai_draft_replies`, `ai_upsell`, `ai_auto_reminder`).
İlk ikisi gerçek LLM çağrısı gerektiriyor ve `ANTHROPIC_API_KEY` sistemde
olmadığı için uçtan uca doğrulanamaz. Üçüncüsü ayrı ve çok küçük bir düzeltme:
hatırlatma işi zaten çalışıyor ama `ai_auto_reminder` ayarına bakmıyor.

Müşteriye otomatik mesaj gönderme de kapsam dışı: 24 saat kuralı nedeniyle
onaylı şablon gerekir ve yanlış kurgulanırsa numaranın kapanmasına yol açar.
Bu iş yalnızca operatörü bilgilendirir.

## Kim kayıp sayılır

Üç şart birlikte:

1. En az bir **geçmiş ziyaret** — iptal edilmemiş, tarihi geçmiş randevu.
2. Son ziyaretten **`lapsed_after_days`** gün geçmiş.
3. **Yaklaşan randevu yok** (iptal edilmemiş, tarihi bugün veya sonrası).

Hiç gelmemiş biri kayıp sayılmaz — o bir aday ve CRM'in işi. İptal edilmiş
randevu ziyaret sayılmaz.

## İş ve tekrarın önlenmesi

Yeni iş `app/jobs/lapsed.py` → `run_lapsed_check(now=None) -> int`, mevcut
zamanlayıcıya hatırlatmaların yanına eklenir (5 dakikada bir).

Tekrarı `customers.lapsed_alerted_at` (nullable datetime) önler. Her turda
**tek kural, iki yön**:

- Kayıp **ve** işaret boş → bildirim üret, işareti bas.
- İşaret dolu **ama artık kayıp değil** → işareti temizle.

İkinci kural sıfırlamayı tek başına halleder: danışan randevu aldığı anda
"yaklaşan randevusu var" olur, kayıp olmaktan çıkar, işaret silinir. Sonra
yine kaybolursa yeniden uyarılır. Ayrı bir "geri geldi mi" kontrolü gerekmez.

Klinikte `ai_lapsed_alert` kapalıysa o klinik hiç işlenmez ve mevcut
işaretlerine dokunulmaz; ayar tekrar açıldığında kaldığı yerden devam eder.

## Eşik

Yeni ayar `lapsed_after_days`, varsayılan **120**. Sistem'deki AI bölümünde,
ilgili anahtarın yanında sayı alanı olarak düzenlenir.

Sabit bir eşik gizli kalırdı ve klinikler arasında çok değişir: diş kontrolü
altı ay, lazer seansı bir ay.

## Bildirim

Yeni tür `lapsed`, zil listesinde **"Kayıp danışan"** etiketiyle.

Metin: `{isim} · son ziyareti {N} gün önce`. Gün sayısı kesin ve
doğrulanabilir; "4 aydır" yuvarlaması kulağa hoş gelir ama veriye sadık
değildir. İsim boşsa telefon yazılır.

## Bildirimin hedefi

Bildirimler bugün **türü ne olursa olsun** `/randevu`'ya gidiyor. Kayıp
danışan için doğru hedef danışanın profili.

`notifications` tablosuna nullable **`ref`** sütunu eklenir; bu bildirimde
danışanın telefonunu taşır. Zil `ref` doluysa `/danisan/{telefon}`'a, boşsa
bugünkü gibi `/randevu`'ya gider.

Mevcut türler (`booking`, `reschedule`, `cancellation`, `request`)
değişmeden çalışır — `ref`'leri boş kalır — ama ileride bağlanabilirler.

Alternatifi `/crm`'e göndermekti: şema değişmezdi ama operatörü listede
aramaya bırakırdı. Tek nullable sütun bundan ucuz.

## Doğrulama

`run_lapsed_check` `now` parametresi alır, böylece "137 gün önce" senaryosu
saat beklemeden kurulur.

Kapsanacaklar:

- Eşiği geçen danışan uyarı alır.
- Yaklaşan randevusu olan almaz.
- Hiç gelmemiş kişi almaz (yalnızca mesajı olan).
- İptal edilmiş randevu ziyaret sayılmaz.
- **İkinci turda aynı kişi için tekrar bildirim üretilmez.**
- Randevu alınınca işaret temizlenir; sonra tekrar kaybolunca yeniden uyarılır.
- `ai_lapsed_alert` kapalıyken hiçbir şey olmaz ve mevcut işaret bozulmaz.
- Bir kliniğin uyarısı diğerine sızmaz.
- Bildirim `ref` alanında telefonu taşır.

Frontend tarafında `typecheck` / `test` / `build`.
