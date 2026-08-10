# Sistem Ekranını Bölme (Design Spec)

**Tarih:** 2026-08-10
**Repo:** Frontend `hakanbudak/w-lush-web` (backend'e dokunulmaz)

## Amaç

`src/pages/Sistem.tsx` 1170 satıra ulaştı ve dört CRUD bölümü artı ayar formunu tek dosyada taşıyor. Bölümleri kendi dosyalarına çıkarmak, ayrıca yol boyunca ortaya çıkan iki yerleştirme hatasını düzeltmek.

## Neden şimdi

Dosya her yeni katalog bölümüyle büyüdü (hizmet → paket → gider kategorisi → personel). Personel bölümü eklenirken iki sorun ortaya çıktı ve ikisi de dosyanın yapısından kaynaklanıyor:

1. **Gerçek personel yönetimi yanlış sekmede.** Ekranda zaten "Personel" adında bir sekme var ve o sekme sahte bir `STAFF` dizisini gösteriyor. Gerçek `PersonelSection` ise "Hizmetler & paketler" sekmesinin altına konuldu. Kullanıcı "Personel"e tıkladığında uydurma isimler görüyor.
2. **Bölümler birbirini render ediyor.** `HizmetSection`, kendi gövdesinde `PaketSection`, `PersonelSection` ve `GiderKategoriSection`'ı çağırıyor. Bu yüzden bir bölümü başka sekmeye taşımak, ilgisiz bir bölümü düzenlemeyi gerektiriyor.

İkisi de "hangi bölüm nerede görünür" kararının bölümlerin içine sızmasının sonucu. Bölme işi bu kararı tek bir yere — kabuğa — geri veriyor.

## Yapı

Bölümler `src/components/sistem/` altına çıkar. Bu, `src/components/finance/` ile kurulmuş deseni izler: sayfa parçaları `components/` altında, rota dosyası `pages/` altında kalır. **Rota değişmez**, `App.tsx`'e dokunulmaz.

| Dosya | Sorumluluk |
|---|---|
| `components/sistem/ui.tsx` | `Toggle` — iki bölüm ve kabuk tarafından kullanılan tek gerçek paylaşılan parça |
| `components/sistem/HizmetSection.tsx` | Hizmet CRUD (`/api/services`) |
| `components/sistem/PaketSection.tsx` | Paket CRUD (`/api/packages`) |
| `components/sistem/PersonelSection.tsx` | Personel CRUD (`/api/staff`) |
| `components/sistem/GiderKategoriSection.tsx` | Gider kategorisi CRUD (`/api/expense-categories`) |
| `components/sistem/RandevuAyarlari.tsx` | Çalışma günü / slot ayarları (`/api/settings`) |
| `pages/Sistem.tsx` | Sekme çubuğu ve sekme gövdeleri |

**`Field` ve `SettingRow` kabukta kalır.** Yalnız kabuk kullanıyor; tek tüketicisi olan bir bileşeni paylaşılan dosyaya taşımak, paylaşım varmış izlenimi yaratır. `Toggle` taşınır çünkü gerçekten üç yerden kullanılıyor.

Her bölüm kendi verisini kendi çeker (bugünkü davranış korunur). Bölümler arasında prop veya state paylaşımı yok; tek bağımlılıkları `ui.tsx` ve kendi API modülleri.

## Davranış değişiklikleri

Bu iş saf yapısal değil — iki düzeltme içeriyor:

1. **`PersonelSection` "Personel" sekmesine taşınır**, sahte `STAFF` dizisi silinir.
2. **Bölümler birbirini render etmeyi bırakır.** Hangi sekmede hangi bölümlerin görüneceğine kabuk karar verir:

| Sekme | İçerik |
|---|---|
| Klinik | (değişmedi) |
| Personel | `PersonelSection` |
| Hizmetler & paketler | `HizmetSection`, `PaketSection`, `GiderKategoriSection` |
| WhatsApp | (değişmedi — `TEMPLATES` sahte verisi yerinde kalıyor) |
| AI | (değişmedi) |

Gider kategorisi "Hizmetler & paketler" altında kalır: mevcut sekmelerin içinde ona en yakın olan orası ve yalnız bunun için yeni sekme açmak erken.

## Kapsam dışı

- **`TEMPLATES` (WhatsApp mesaj şablonları).** Sahte, ama karşılığı olan özellik — şablon mesaj yönetimi — ayrı bir iş. Silmek o sekmeyi boşaltır, kazanç yok.
- **Backend.** Hiçbir uç, şema veya migration değişmiyor.
- **Görsel tasarım.** Bölümlerin markup'ı olduğu gibi taşınır; stil, metin ve düzen değişmez.

## Doğrulama ve sınırı

Test koşucusu yok, dolayısıyla **"davranış değişmedi" garantisi verilemez.** Eldeki kontroller:

- `npm run typecheck` ve `npm run build` exit 0
- Her bölümün arkasındaki API akışlarının canlı çalıştığı: hizmet oluştur/güncelle/sil, paket oluştur/sil, personel oluştur/pasife al/sil, gider kategorisi oluştur/sil, ayar kaydetme
- `pages/Sistem.tsx` satır sayısının belirgin düştüğü ve hiçbir dosyanın ~200 satırı aşmadığı
- Sahte `STAFF` dizisinin dosyalarda hiç geçmediği (`grep`)

Görsel karşılaştırma yapılamıyor (Chrome eklentisi bağlı değil). Bu, bir refactor için zayıf bir ağdır ve bilerek kabul edilmektedir; taşınan markup elle değiştirilmediği sürece risk sınırlıdır.

## Başarı ölçütü

`Sistem` ekranı bugünküyle aynı çalışır; "Personel" sekmesi artık gerçek personeli gösterir; her bölüm kendi dosyasındadır ve bir bölümü başka sekmeye taşımak yalnız kabuğu düzenlemeyi gerektirir.
