# Personel Modeli (Design Spec)

**Tarih:** 2026-08-10
**Repolar:** Backend `selamet/w-lush`, Frontend `hakanbudak/w-lush-web`

## Amaç

Klinik personelini tanımlanabilir hale getirmek ve randevuları bir personele bağlamak.

## Nereden çıktı — ayrıştırma

Asıl hedef randevu takvimini gerçek veriye bağlamaktı. Ekran okunduğunda takvimin, `appointments` tablosunun sahip olmadığı sekiz alan üzerine kurulu olduğu görüldü:

| Ekranın kullandığı | Gerçekte var mı |
|---|---|
| `staff` (üç sütun) | ❌ Çalışan modeli yok |
| `end` (blok yüksekliği) | ❌ Randevuda bitiş saati yok — yalnız `appt_time` |
| `cat` (blok rengi) | ❌ Hizmet kategorisi yok |
| `channel` (WhatsApp/Web/Manuel) | ❌ Kaynak alanı yok |
| `price` | ❌ Randevuda tutar yok |
| `status: tamam/devam/risk` | ⚠️ Gerçek durumlar `pending`/`confirmed`/`cancelled` |
| `risk` ("İptal riski %62") | ❌ Kurgu |
| `AI_SLOT` ("%92 uyum") | ❌ Kurgu |

Personel bunların ilki ve diğerlerinin ön koşulu: takvimin sütun ekseni. Bu yüzden iş ikiye ayrıldı — **önce personel modeli (bu spec), sonra takvim ızgarası**. Takvimi personel gelmeden yapmak, kısa süre sonra yeniden yazmak olurdu.

Ayrıca personel modeli, daha önce "veri işi" diye sıraya alınan **personel performans raporunu** da mümkün kılar (o rapor yine ayrı iş).

## Kararlar

**Personel bir kullanıcı hesabı değil, bir kayıttır.** Lazer teknikeri veya cilt uzmanının panele girmesi gerekmiyor; kliniği sahibi yönetiyor. Böylece şifre, davet akışı, rol/yetki sistemi — bütün kimlik işi kapsam dışında kalıyor. İleride bir personelin hesabı olması istenirse `staff.user_id` ile bağlanır; bugün o alan yok.

**Atamayı operatör yapar.** WhatsApp botu randevuyu alır ve kimin yapacağını sormaz; randevu personelsiz gelir, operatör panelden atar. Bot durum makinesine (`app/whatsapp/flow.py`) **hiç dokunulmaz**. Reddedilen iki alternatif: hizmete varsayılan personel (varsayılan sık sık yanlış olur ve kimse düzeltmezse takvim yalan söyler) ve botun müşteriye sorması (akışı uzatır, müşteri çoğu zaman personeli tanımıyor).

## Veri modeli

Alembic head'i `d9f2b6c40a17` (reports). Bir yeni tablo ve bir yeni kolon, tek migration.

### `staff`

| Alan | Tip | Not |
|---|---|---|
| `id` | PK | |
| `clinic_id` | FK `clinics.id`, index | |
| `name` | String(120) | |
| `role` | String(80), default `""` | "Cilt uzmanı", "Lazer teknikeri" |
| `active` | Boolean, default `true` | pasif olan atama seçicisinde görünmez |
| `sort_order` | Integer, default 0 | |
| — | UNIQUE(`clinic_id`, `name`) | aynı klinikte iki "Ebru B." takvimi okunmaz yapar |

### `appointments` (mevcut tablo)

| Alan | Tip | Not |
|---|---|---|
| `staff_id` | FK `staff.id`, index, **NULL** | atanmamış randevu normaldir |

**Kararlar:**

1. **`staff_id` boş olabilir ve bu hata değil, akışın doğal hâli.** Bot randevuyu personelsiz alır. Atanmamış randevular arayüzde saklanmaz, aksine görünür kalır.
2. **Silme yerine pasife alma.** Üzerinde randevu olan personel silinemez (409); `active=false` yapılır. Gider kategorilerindeki desenin aynısı — geçmiş randevu kimin yaptığını unutmamalı.
3. **Klinik başına benzersiz ad.**

**Bilerek dışarıda:**

- **Çalışma saatleri / vardiya.** Takvim "kim müsait" sorusunu sorduğunda gerekecek; bugün kliniğin `settings`'indeki `open_days` / `slot_times` var ve personel bazlı saat ancak takvimle birlikte anlam kazanır.
- **Renk alanı.** Takvim sütunları renk isteyecek, ama `Avatar` bileşenindeki gibi sıradan türetmek kolon eklemekten iyi; kullanıcının renk seçmek istediğini bilmiyoruz.
- **Personel performans raporu.** Bu iş veriyi mümkün kılıyor, raporun kendisi ayrı.
- **Personel girişleri, roller, yetkiler.**

## Backend sözleşmesi

Yeni modül `app/staff/` (`models.py`, `schemas.py`, `service.py`, `router.py`), prefix `/api/staff`. Klinik kapsamı daima `current.clinic_id`'den.

| Uç | Davranış |
|---|---|
| `GET /api/staff` | Hepsi (aktif + pasif), `sort_order, id` sırasında. Ayrı filtre yok: `Sistem` hepsini gösterir, atama seçicisi pasifleri kendi eler |
| `POST /api/staff` | 201. Boş ad → 422 (`ERR_STAFF_NAME_EMPTY`); yinelenen ad → 409 (`ERR_STAFF_NAME_TAKEN`) |
| `PUT /api/staff/{id}` | `name`, `role`, `active`, `sort_order`. Yinelenen ad → 409; başka kliniğin kaydı → 404 (`ERR_STAFF_NOT_FOUND`) |
| `DELETE /api/staff/{id}` | Üzerinde randevu varsa **409** (`ERR_STAFF_IN_USE`). Boşsa 204 |

"Üzerinde randevu var" = o personele işaret eden **herhangi bir** randevu satırı; iptal edilmiş randevular da sayılır. Geçmişte kimin yapacağı belliyken iptal edilmiş bir randevu da o bilgiyi taşır ve silinince kaybolur.

`ERR_APPOINTMENT_NOT_FOUND` zaten `app/content/messages.py`'de tanımlı (`"Randevu bulunamadı"`) — yeniden tanımlanmaz, mevcut sabit kullanılır.

### Atama ucu — başka modülde

| Uç | Nerede | Neden |
|---|---|---|
| `PUT /api/appointments/{id}/staff` | `app/clinic/router.py`, `confirm`/`cancel` uçlarının yanında | **Uç, değiştirdiği kaynağın yanında yaşar.** Bu uç bir randevuyu değiştiriyor, personeli değil. `clinic` modülü `staff`'ı import eder; ters yön kurulmaz |

Gövde: `{"staff_id": 3}` veya `{"staff_id": null}` (atamayı kaldır).

| Durum | Kod |
|---|---|
| Randevu başka kliniğe ait / yok | 404 `ERR_APPOINTMENT_NOT_FOUND` |
| Personel başka kliniğe ait / yok | 404 `ERR_STAFF_NOT_FOUND` |
| **Pasif personele atama** | 422 `ERR_STAFF_INACTIVE` — seçicide görünmeyene yazılamaz |

### Mevcut şemanın genişlemesi

`AppointmentOut`'a `staff_id: int | None` ve `staff_name: str` eklenir. `staff_name` SQL'de join'lenir; istemci ikinci istek atmaz (gider listesindeki desenin aynısı). Atanmamışsa `""`.

## Frontend

### API katmanı

Tek dosya `src/api/staff.ts`: `listStaff()`, `createStaff(input)`, `updateStaff(id, input)`, `deleteStaff(id)`. Atama çağrısı `src/api/clinic.ts`'e eklenir (`assignAppointmentStaff(id, staffId)`) — uç orada yaşadığı için istemci katmanı da orada.

### Sistem > Personel

`Sistem.tsx`'e `PersonelSection`: `HizmetSection` / `GiderKategoriSection` deseninin kardeşi — liste, satır içi ad ve rol düzenleme, Aktif/Pasif anahtarı, sil (`window.confirm`, o ekranın kendi üslubu). 409 gelirse backend'in mesajı gösterilir ve satır kalır.

### Randevu listesinde atama

`RandevuTakvimi.tsx`'teki **gerçek** randevu listesinde (bugün onayla/iptal eden liste) her satıra bir `<select>`: "Atanmamış" + aktif personeller. Seçim değişince `assignAppointmentStaff` çağrılır, satır yerinde güncellenir. Hata olursa seçim **eski değerine döner** — sessizce yanlış göstermez.

### Kabul edilen geçici durum

Bu iş bittiğinde `/randevu` ekranındaki **takvim ızgarası hâlâ sahte olacak.** Bu spec onu değiştirmiyor; ızgara bir sonraki işin konusu ve personel modeli tam da onun ön koşuluydu. Ekran bir süre karışık kalıyor: üstte sahte ızgara, altta gerçek liste. Alternatif, ızgarayı yerine bir şey koymadan silmekti — bilerek tercih edilmedi.

## Hata durumları

| Durum | Davranış |
|---|---|
| 401 | Mevcut `client.ts` login'e yönlendirir |
| 409 (personel silme) | Backend'in TR mesajı gösterilir, satır durur |
| 409 (yinelenen ad) | Bölüm içinde gösterilir |
| 422 (pasif personele atama) | Seçim eski değerine döner, mesaj gösterilir |
| 5xx / ağ | Tek satır TR mesaj + "Tekrar dene" |
| Personel listesi boş | Atama seçicisinde yalnız "Atanmamış"; `Sistem`'de "Henüz personel yok — 'Personel ekle' ile başlayın." |

## Doğrulama

Test koşucusu yok; doğrulama derleyici + migration turu + canlı uç ile.

- `alembic upgrade head` → `downgrade -1` (tablo **ve** kolon birlikte geri alınır) → `upgrade head`; sonrasında `autogenerate` boş üretir
- `ruff check app` temiz, `python -c "from app.main import app"` geçer
- Personel CRUD: boş ad 422, yinelenen ad 409, pasife alma 200, kullanılmayanı silme 204, kullanımdakini silme 409
- Atama: geçerli atama 200 ve yanıtta `staff_name` dolu; `staff_id: null` atamayı kaldırır; başka kliniğin personeli 404; pasif personele atama 422
- `GET /api/appointments` yanıtının `staff_id` ve `staff_name` taşıdığı
- Yetkisiz istek 401
- Frontend `npm run typecheck` ve `npm run build` exit 0

## Başarı ölçütü

Operatör `Sistem`'den personelini tanımlar; `/randevu` ekranındaki gerçek randevu listesinden her randevuyu bir personele atar; atama kalıcıdır ve randevu yanıtında personel adıyla birlikte döner. Takvim ızgarasının gerçek veriye bağlanması için gereken eksen böylece hazır olur.
