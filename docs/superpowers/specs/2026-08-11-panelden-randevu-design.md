# Panelden Randevu Oluşturma — Tasarım

**Tarih:** 2026-08-11
**Durum:** Onaylandı
**Repolar:** `selamet/w-lush` (backend), `hakanbudak/w-lush-web` (frontend)

## Amaç

Randevular bugün yalnızca WhatsApp botu üzerinden oluşuyor. Telefonla arayan
veya kliniğe gelen bir danışan için operatörün elle randevu girmesi mümkün
değil. Takvim ızgarası hazır olduğuna göre, eksik olan tek şey randevunun
panelden yaratılması.

Bu iş sırasında ortaya çıkan bir çelişki de gideriliyor: ızgara personel
sütunları gösteriyor ama veritabanı kuralı klinik başına saatte tek randevuya
izin veriyordu, yani iki personel aynı saatte çalışamıyordu.

## Kapsam dışı

- Botun müşteriye "kiminle görüşmek istersiniz?" diye sorması. Bot personeli
  kendi seçer, akışa yeni adım eklenmez.
- Randevu düzenleme (tarih/saat değiştirme). Bugün de yok; ayrı bir iş.
- Slot saatleri dışında randevu girme. Aksine, bu tasarım onu engelliyor.

---

## Bölüm 1 — Kapasite kuralı

### Bugünkü durum

`appointments` tablosunda kısmi (partial) unique index:

```
uq_active_appointment_slot: (clinic_id, appt_date, appt_time)
                            WHERE status != 'cancelled'
```

Yani klinik başına bir slotta tek aktif randevu — personelden bağımsız.

### Yeni kural

Kapasite personel başına olur:

```
uq_active_appointment_slot: (clinic_id, appt_date, appt_time,
                             coalesce(staff_id, 0))
                            WHERE status != 'cancelled'
```

`coalesce(staff_id, 0)` şart: unique index'lerde NULL'lar birbirinden farklı
sayılır, dolayısıyla düz `staff_id` yazılsaydı atanmamış randevular birbiriyle
hiç çakışmaz, botun çakışma koruması tamamen kaybolurdu. `coalesce` ile
"atanmamış" tek bir sanal personel gibi davranır.

Kural gevşediği için mevcut hiçbir satır yeni index'i ihlal edemez; migration
veri taşımadan geçer.

### Botun personel seçmesi

Kapasitenin personel sayısı kadar olabilmesi için bot randevuyu yazarken
**müsait ilk aktif personeli kendisi seçer**. Müşteriye sorulmaz, akış
değişmez; kayıt sadece bir personele düşer ve operatör sonradan
değiştirebilir (`PUT /appointments/{id}/staff` zaten var).

"İlk" = `staff_service.listing` sırası, yani `(sort_order, id)` — Sistem
ekranındaki personel sırasıyla aynı. Rastgele veya yük dengeleyen bir seçim
değil; deterministik olması test edilebilirliği için tercih edildi.

Bu tercihin nedeni: kapasiteyi uygulama katmanında "o saatteki randevu sayısı
< aktif personel sayısı" diye saymak yarış koşullarına açıktır. Personel
seçilip index'e bırakılınca aynı sonuç veritabanı düzeyinde garanti edilir.

Klinikte hiç aktif personel tanımlı değilse `staff_id` boş kalır ve kapasite
1 olur — bugünkü davranış aynen korunur.

### `slots_for_day` değişikliği

Bugün: o gün dolu olan saatleri çıkarır.
Sonra: **tüm aktif personeli dolu olan** saatleri çıkarır.

Personel tanımlı değilse davranış bugünküyle aynıdır.

### Atama ucunun yeni hatası

`PUT /appointments/{id}/staff` artık çakışma üretebilir: hedef personelin o
tarih/saatte başka bir aktif randevusu varsa **409** döner. Bugün bu uç yalnızca
404 (personel yok) ve 422 (personel pasif) veriyor.

---

## Bölüm 2 — API

### `POST /api/appointments`

İstek:

```json
{
  "phone": "905551112233",
  "customer_name": "Ayşe Yılmaz",
  "service_name": "Hydrafacial",
  "appt_date": "2026-08-12",
  "appt_time": "10:00",
  "staff_id": 1,
  "notify": true
}
```

`staff_id` null olabilir (atanmamış). `notify` zorunlu değildir, varsayılanı
`true`.

Yanıt (201):

```json
{
  "appointment": { ...AppointmentOut... },
  "notified": true,
  "notify_error": null
}
```

Düz `AppointmentOut` yerine sarmalayıcı kullanılıyor, çünkü ekranın
"randevu oluştu ama mesaj gitmedi" durumunu ayırt etmesi gerekiyor.

Kurallar:

| Durum | Kod | Davranış |
|---|---|---|
| Slot dolu | 409 | Kontrol index'te; iki operatör aynı anda yazarsa biri hata alır |
| `appt_time` klinik `slot_times` içinde değil | 422 | Aksi hâlde randevu ızgarada hiç görünmez |
| Başarılı | 201 | Kayıt `confirmed` doğar — operatör oluşturduğu için onay beklemesi anlamsız |

Geçmiş tarihe randevu girmek serbesttir; operatörün geçmiş bir kaydı sonradan
girmesi meşru bir kullanım.

Hata metinleri, repo kuralına uygun olarak `app/content/messages.py` içine
eklenir (`ERR_APPOINTMENT_NOT_FOUND`, `ERR_STAFF_INACTIVE` ile aynı yere):

- `ERR_SLOT_TAKEN` — "Bu saat dolu."
- `ERR_SLOT_NOT_CONFIGURED` — "Bu saat kliniğin çalışma saatleri arasında değil."
- `ERR_STAFF_BUSY` — "Bu personelin o saatte başka randevusu var."

### Ortak servis fonksiyonu

`clinic_service.create_appointment` iki yeni parametre alır: `staff_id` ve
`status`. Bot ve panel aynı fonksiyonu kullanmaya devam eder, böylece çakışma
mantığı (IntegrityError → None) tek yerde kalır.

### Bildirim

Randevu commit edildikten **sonra** `flow.send_post_confirm` denenir. Gönderim
başarısız olursa istek başarısız olmaz: randevu kalır, yanıtta
`notified: false` ve `notify_error` dolu döner.

WhatsApp kimlik bilgileri henüz sisteme girilmediği için bu yolun ilk
kullanımda gerçekten çalışacağı hesaba katılmıştır.

---

## Bölüm 3 — Ekran

### Yeni dosya

`src/components/randevu/AppointmentModal.tsx` — `PaymentModal` / `ExpenseModal`
örüntüsünü izler. Form `RandevuTakvimi.tsx` içine gömülmez; sayfa şu an 284
satır ve yeniden şişmemeli.

### Açılış noktaları

1. **Izgaradaki boş hücre.** Tıklanınca form o hücreyle dolu açılır: slot
   saati, gün görünümünde personel sütunu, hafta görünümünde gün sütunu.
2. **Başlıktaki "Yeni randevu" düğmesi.** Serbest giriş; alanlar boş gelir.

`SlotGrid` isteğe bağlı bir `onEmptyClick(slot, columnKey)` alır. Verilmezse
bugünkü davranış birebir korunur ve bileşen saf (veri çekmeyen, randevu
kavramı bilmeyen) kalır.

### İptal edilmiş randevunun hücresi

Slot aslında boştur. Soluk/üstü çizili kayıt yerinde kalır, altında
"+ Randevu ekle" görünür.

### Form alanları

| Alan | Kaynak |
|---|---|
| Telefon | elle |
| İsim | elle, eşleşme varsa otomatik |
| Hizmet | `GET /api/services` (aktif olanlar) |
| Tarih | elle |
| Saat | klinik `slot_times`; o gün dolu olanlar seçilemez |
| Personel | aktif personel + "Atanmamış" |
| "Müşteriye WhatsApp'tan bilgi ver" | onay kutusu, işaretli gelir |

### Telefon eşleştirme

Operatör yazmayı bıraktıktan sonra `GET /api/customers/{phone}` çağrılır.

- 200 → isim otomatik dolar, "mevcut danışan" rozeti çıkar. Operatör ismi yine
  de değiştirebilir.
- 404 → **normal sonuç**, yeni danışan demektir. Hata gösterilmez.

### Kaydetme sonrası

- Başarılı: modal kapanır, ızgara yenilenir, yeni randevu seçili gelir.
- 409: modal açık kalır, "Bu saat dolu." yazar, saat listesi tazelenir.
- `notified: false`: modal kapanır, ızgaranın üstünde uyarı satırı çıkar —
  randevu oluşmuştur, yalnızca mesaj gitmemiştir.

---

## Doğrulama

Repoda test koşucusu yok; doğrulama bugüne kadarki yöntemle yapılır.

**Backend**
- `ruff check app` temiz, uygulama import olur, alembic autogenerate farkı
  yalnızca beklenen index değişikliğini gösterir.
- Aynı slot + aynı personel için ikinci `POST` → 409.
- Aynı slot + farklı personel → 201 (yeni kuralın asıl kazancı).
- Aynı slot, ikisi de atanmamış → 409 (`coalesce` çalışıyor).
- `slot_times` dışı saat → 422.
- Dolu personele atama → 409.
- Token'sız istek → 401.

**Frontend**
- `typecheck` ve `build` 0 ile çıkar.
- Boş hücreden açılan formun slot/sütun ön dolumu veri düzeyinde doğrulanır.
- Bilinmeyen telefonda 404'ün hata olarak gösterilmediği kontrol edilir.

**Doğrulanamayacak olan:** gerçek WhatsApp gönderimi. Meta kimlik bilgileri
yok; `notified: false` yolu test edilebilir, `true` yolu edilemez. Bu, PR'da
açıkça yazılır.
