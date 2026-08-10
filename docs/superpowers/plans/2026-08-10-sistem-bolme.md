# Sistem Ekranını Bölme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `src/pages/Sistem.tsx`'in dört CRUD bölümü ve ayar formu kendi dosyalarına çıksın; gerçek personel yönetimi kendi sekmesine taşınsın.

**Architecture:** Bölümler `src/components/sistem/` altına taşınır (`components/finance/` deseninin aynısı). Rota ve `App.tsx` değişmez. Kod **birebir taşınır**, yeniden yazılmaz; her dosya yalnız kendi import bloğunu kazanır. Kabuk, hangi sekmede hangi bölümün göründüğüne karar veren tek yer olur.

**Tech Stack:** React 18 + TypeScript + Vite. Backend'e dokunulmaz. Yeni bağımlılık YOK.

**Spec:** `docs/superpowers/specs/2026-08-10-sistem-bolme-design.md`

## Global Constraints

- **Repo:** yalnız `hakanbudak/w-lush-web`, branch `feature/sistem-bolme` (branch `docs/sistem-split-spec` üstünde). Backend reposuna **dokunulmaz**.
- **Kod birebir taşınır.** Bölüm gövdeleri kopyalanır; JSX, stil, metin, mantık **değiştirilmez**. Tek eklenen şey her dosyanın kendi `import` bloğu ve `export default`.
- **Yeni bağımlılık yok** (npm).
- Kullanıcıya görünen metinler Türkçe kalır, aynen taşınır.
- Commit mesajları İngilizce, emir kipi, **atıf trailer'ı YOK**.
- Kapılar: `npm run typecheck` ve `npm run build` **exit 0** — her task sonunda.
- Hiçbir task push/merge/PR yapmaz — Task 6'da.

## Bölüm sınırları (kaynak dosyadaki mevcut satırlar)

| Bölüm | Satır aralığı | Yanındaki tip tanımı |
|---|---|---|
| `PersonelSection` | 118–293 | `type StaffRow` (118) |
| `GiderKategoriSection` | 294–455 | `type CatRow` (294) |
| `HizmetSection` | 456–624 | `type Row` (456) |
| `PaketSection` | 625–815 | `type PkgRow` (625) |
| `RandevuAyarlari` | 816–1010 | `const GUN` (816) |
| Kabuk (`Sistem`) | 1011–sonu | — |

Tip tanımı ve `const GUN`, ilgili bölümle **birlikte** taşınır — başka kimse kullanmıyor.

Her bölümün ihtiyaç duyduğu şeyler (kaynaktan çıkarıldı):

| Bölüm | Gerekli import'lar |
|---|---|
| `PersonelSection` | `useEffect`, `useState`; `Icon`; `listStaff`, `createStaff`, `updateStaff`, `deleteStaff`, `StaffMember` |
| `GiderKategoriSection` | `useEffect`, `useState`; `Icon`; `listCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `ExpenseCategory` |
| `HizmetSection` | `useEffect`, `useState`; `Icon`; `Toggle`; `listServices`, `createService`, `updateService`, `deleteService`, `Service` |
| `PaketSection` | `useEffect`, `useState`; `Icon`; `Toggle`; `listPackages`, `createPackage`, `updatePackage`, `deletePackage`, `Package` |
| `RandevuAyarlari` | `useEffect`, `useState`; `Icon`; `getSettings`, `updateSettings`, `ClinicSettings` |
| Kabuk | `useState`; `Icon`; `Avatar`, `Chip`; `WhatsAppConnect`; `Field`, `SettingRow`, `Toggle`; beş bölüm |

**Doğrulama aracı olarak derleyici:** bir import'u unutursan `npm run typecheck` tam olarak hangisi olduğunu söyler. Her task'ta typecheck çalıştırılır, bu yüzden eksik import bir sonraki task'a taşınamaz.

## Test durumu — dürüst sınır

Test koşucusu yok. **Bu refactor için "davranış değişmedi" garantisi verilemez.** Elde olanlar:

- `npm run typecheck` + `npm run build`
- Bölümlerin arkasındaki API akışlarının canlı koşturulması (Task 5)
- `grep` ile sahte `STAFF` dizisinin kalmadığının kanıtı
- Satır sayısı ölçümü

Görsel karşılaştırma yapılamıyor (Chrome eklentisi bağlı değil). Risk, markup'a elle dokunulmadığı sürece sınırlı — bu yüzden "birebir taşı" kuralı bu planın en önemli maddesi.

**Ön koşul:** frontend ve backend ayakta.

```bash
cd ~/Desktop/kisisel/w-lush-web && npm run dev
cd ~/Desktop/kisisel/w-lush && .venv/bin/python -m uvicorn app.main:app --port 8000
```

Test hesabı: `smoke2@example.com` / `Test12345!`.

---

### Task 1: Paylaşılan `Toggle` bileşeni

En küçük parça önce çıkar; bölümler ona bağlanacak.

**Files:**
- Create: `src/components/sistem/ui.tsx`
- Modify: `src/pages/Sistem.tsx` (`Toggle` tanımını sil, import et)

**Interfaces:**
- Produces: `export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }): JSX.Element`

- [ ] **Step 1: Branch'i aç**

```bash
cd ~/Desktop/kisisel/w-lush-web && git checkout docs/sistem-split-spec && git checkout -b feature/sistem-bolme
mkdir -p src/components/sistem
```

- [ ] **Step 2: `Toggle` gövdesini yeni dosyaya taşı**

`src/pages/Sistem.tsx`'te satır 36'da başlayan `function Toggle(...)` bloğunun **tamamını kes** ve `src/components/sistem/ui.tsx` dosyasına şu kabukla yapıştır:

```tsx
// Sistem ekranının bölümleri arasında paylaşılan tek parça.
// Field ve SettingRow bilerek burada değil: onları yalnız kabuk kullanıyor.

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  // ↓ kaynaktaki gövde birebir buraya
}
```

Gövdeyi **değiştirme** — stil nesneleri, sınıf adları, her şey aynen kalsın. `Toggle` başka bir şey import etmiyor (kaynakta da etmiyordu).

- [ ] **Step 3: Kabuğa import ekle**

`src/pages/Sistem.tsx`'in import bloğunun sonuna ekle:

```tsx
import { Toggle } from '../components/sistem/ui';
```

- [ ] **Step 4: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`. Hata verirse eksik olan tam olarak adlandırılır.

- [ ] **Step 5: Commit**

```bash
git add src/components/sistem/ui.tsx src/pages/Sistem.tsx
git commit -m "Extract the shared Toggle from the Settings screen

Field and SettingRow stay in the shell: the shell is their only consumer, and
moving them would suggest a sharing that does not exist."
```

---

### Task 2: Katalog bölümleri (hizmet, paket, gider kategorisi)

Üçü birlikte çıkar: aynı desendeler ve hepsi "Hizmetler & paketler" sekmesinde kalacak.

**Files:**
- Create: `src/components/sistem/HizmetSection.tsx`, `src/components/sistem/PaketSection.tsx`, `src/components/sistem/GiderKategoriSection.tsx`
- Modify: `src/pages/Sistem.tsx`

**Interfaces:**
- Consumes: `Toggle` (Task 1)
- Produces: üç bileşenin `export default`'u

- [ ] **Step 1: `HizmetSection.tsx` dosyasını oluştur**

Kaynaktaki **456–624** aralığını (`type Row` satırından `HizmetSection` fonksiyonunun kapanışına kadar) birebir taşı. Dosyanın başına şu import bloğunu koy, fonksiyon tanımını `export default function HizmetSection()` yap:

```tsx
import { useEffect, useState } from 'react';
import {
  createService,
  deleteService,
  listServices,
  updateService,
  type Service,
} from '../../api/clinic';
import { Icon } from '../icons';
import { Toggle } from './ui';
```

**Önemli:** kaynakta `HizmetSection`'ın `return`'ü içinde `<PaketSection />`, `<PersonelSection />` ve `<GiderKategoriSection />` çağrıları var (satır 617–619). Bu üç satırı **sil** — bundan sonra hangi bölümün nerede görüneceğine kabuk karar veriyor. Geriye kalan en dış `<div>` yalnız hizmet tablosunu sarar.

- [ ] **Step 2: `PaketSection.tsx` dosyasını oluştur**

Kaynaktaki **625–815** aralığını (`type PkgRow` dahil) birebir taşı, `export default function PaketSection()` yap, başına:

```tsx
import { useEffect, useState } from 'react';
import {
  createPackage,
  deletePackage,
  listPackages,
  updatePackage,
  type Package,
} from '../../api/clinic';
import { Icon } from '../icons';
import { Toggle } from './ui';
```

- [ ] **Step 3: `GiderKategoriSection.tsx` dosyasını oluştur**

Kaynaktaki **294–455** aralığını (`type CatRow` dahil) birebir taşı, `export default function GiderKategoriSection()` yap, başına:

```tsx
import { useEffect, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type ExpenseCategory,
} from '../../api/expenses';
import { Icon } from '../icons';
```

- [ ] **Step 4: Kabuktan taşınan blokları sil ve import et**

`src/pages/Sistem.tsx`'ten üç fonksiyonun ve üç tip tanımının tamamını sil. Artık kullanılmayan `../api/clinic` ve `../api/expenses` import'larını da temizle — kabuk bu API'lerin hiçbirini doğrudan kullanmıyor.

Import bloğuna ekle:

```tsx
import GiderKategoriSection from '../components/sistem/GiderKategoriSection';
import HizmetSection from '../components/sistem/HizmetSection';
import PaketSection from '../components/sistem/PaketSection';
```

Sekme gövdesini (kaynakta satır 1120, `{sec === 'hizmet' && <HizmetSection />}`) şununla değiştir:

```tsx
          {sec === 'hizmet' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <HizmetSection />
              <PaketSection />
              <GiderKategoriSection />
            </div>
          )}
```

Bu `div`, kaynakta `HizmetSection`'ın en dışında duran ve üç bölümü alt alta dizen sarmalayıcının aynısıdır — böylece görsel boşluklar değişmez.

- [ ] **Step 5: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add src/components/sistem src/pages/Sistem.tsx
git commit -m "Extract the catalogue sections from the Settings screen

HizmetSection no longer renders its siblings. Which sections appear on which
tab is now the shell's decision alone, so moving one no longer means editing
an unrelated section."
```

---

### Task 3: Personel bölümü ve sekme düzeltmesi

**Files:**
- Create: `src/components/sistem/PersonelSection.tsx`
- Modify: `src/pages/Sistem.tsx` (sahte `STAFF` silinir, sekme gerçek bölümü gösterir)

**Interfaces:**
- Produces: `export default function PersonelSection(): JSX.Element`

- [ ] **Step 1: `PersonelSection.tsx` dosyasını oluştur**

Kaynaktaki **118–293** aralığını (`type StaffRow` dahil) birebir taşı, `export default function PersonelSection()` yap, başına:

```tsx
import { useEffect, useState } from 'react';
import {
  createStaff,
  deleteStaff,
  listStaff,
  updateStaff,
  type StaffMember,
} from '../../api/staff';
import { Icon } from '../icons';
```

- [ ] **Step 2: Sahte `STAFF` dizisini sil**

`src/pages/Sistem.tsx`'te satır 102'de başlayan `const STAFF = [...]` bloğunun tamamını sil. Bu, ekranda uydurma personel gösteren tek kaynaktı.

- [ ] **Step 3: "Personel" sekmesini gerçek bölüme bağla**

Kaynakta `{sec === 'personel' && (` ile başlayan blok (satır 1091 civarı), içinde `STAFF.map(...)` ile sahte kartları çiziyor. Bloğun **tamamını** şununla değiştir:

```tsx
          {sec === 'personel' && <PersonelSection />}
```

Import bloğuna ekle:

```tsx
import PersonelSection from '../components/sistem/PersonelSection';
```

Ayrıca Task 2'de eklediğin `hizmet` sekmesi gövdesinden `<PersonelSection />` **yoktur** — oraya hiç eklenmedi; personel yalnız kendi sekmesinde görünür.

- [ ] **Step 4: Sahte verinin kalmadığını kanıtla**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && grep -rn "Dr. Defne A.\|const STAFF" src/ | wc -l | xargs echo "kalan sahte personel referansı:"
```

Expected: `0`.

- [ ] **Step 5: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add src/components/sistem/PersonelSection.tsx src/pages/Sistem.tsx
git commit -m "Show real staff on the Settings staff tab

The tab named Personel was rendering a hardcoded list while the real staff
management sat under the pricing tab — anyone clicking Personel saw invented
names. The mock array is gone and the tab now shows the live section."
```

---

### Task 4: Randevu ayarları bölümü

**Files:**
- Create: `src/components/sistem/RandevuAyarlari.tsx`
- Modify: `src/pages/Sistem.tsx`

**Interfaces:**
- Produces: `export default function RandevuAyarlari(): JSX.Element`

- [ ] **Step 1: `RandevuAyarlari.tsx` dosyasını oluştur**

Kaynaktaki **816–1010** aralığını (`const GUN` dahil — başka kimse kullanmıyor) birebir taşı, `export default function RandevuAyarlari()` yap, başına:

```tsx
import { useEffect, useState } from 'react';
import {
  getSettings,
  updateSettings,
  type ClinicSettings,
} from '../../api/clinic';
import { Icon } from '../icons';
```

- [ ] **Step 2: Kabuktan sil ve import et**

`src/pages/Sistem.tsx`'ten `const GUN` ve `RandevuAyarlari` fonksiyonunu sil. Import bloğuna ekle:

```tsx
import RandevuAyarlari from '../components/sistem/RandevuAyarlari';
```

Kullanım yeri (`<RandevuAyarlari />`, kaynakta satır 1086) olduğu gibi kalır.

- [ ] **Step 3: Derlemeyi doğrula**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 4: Dosya boyutlarını ölç**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && wc -l src/pages/Sistem.tsx src/components/sistem/*.tsx
```

Expected: `Sistem.tsx` ~250 satır civarı; hiçbir bölüm dosyası ~200 satırı belirgin şekilde aşmamalı. Aşan varsa nedenini not et — bu bir hata değil, ama beklentiyle karşılaştırılmalı.

- [ ] **Step 5: Commit**

```bash
git add src/components/sistem/RandevuAyarlari.tsx src/pages/Sistem.tsx
git commit -m "Extract the appointment settings section"
```

---

### Task 5: Canlı doğrulama — her bölümün API akışı

Refactor'ün bozmadığını gösterebileceğimiz tek gerçek kanıt bu. Her bölümün arkasındaki uçlar hâlâ ekranın yaptığı sırayla çalışmalı.

**Files:** yok (yalnız doğrulama)

- [ ] **Step 1: Tüm bölüm akışlarını koştur**

Run:

```bash
cd ~/Desktop/kisisel/w-lush-web && python3 - <<'PY'
import json, urllib.request
B = "http://localhost:5173"

def req(path, method="GET", body=None, token=None):
    d = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B + path, data=d, method=method)
    if body is not None: r.add_header("Content-Type", "application/json")
    if token: r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r) as resp: return resp.status, resp.read().decode()
    except Exception as e:
        return getattr(e, "code", "ERR"), (e.read().decode()[:200] if hasattr(e, "read") else str(e))

tok = json.loads(req("/api/auth/login","POST",{"email":"smoke2@example.com","password":"Test12345!"})[1])["token"]["access_token"]

# Hizmet
svc = json.loads(req("/api/services","POST",{"name":"Bölme Testi","price":100,"active":True,"sort_order":99},tok)[1])
print("hizmet oluştur/güncelle/sil:",
      req(f"/api/services/{svc['id']}","PUT",{"name":"Bölme Testi 2","price":150,"active":True,"sort_order":99},tok)[0],
      req(f"/api/services/{svc['id']}","DELETE",token=tok)[0])

# Paket
pkg = json.loads(req("/api/packages","POST",{"name":"Bölme Paketi","sessions":3,"price":300,"save_percent":0,"active":True,"sort_order":99},tok)[1])
print("paket oluştur/sil:", 201, req(f"/api/packages/{pkg['id']}","DELETE",token=tok)[0])

# Personel
st = json.loads(req("/api/staff","POST",{"name":"Bölme Personeli","role":"Test","active":True,"sort_order":99},tok)[1])
print("personel oluştur/pasife al/sil:",
      req(f"/api/staff/{st['id']}","PUT",{"name":"Bölme Personeli","role":"Test","active":False,"sort_order":99},tok)[0],
      req(f"/api/staff/{st['id']}","DELETE",token=tok)[0])

# Gider kategorisi
cat = json.loads(req("/api/expense-categories","POST",{"name":"Bölme Kategorisi","active":True,"sort_order":99},tok)[1])
print("kategori oluştur/sil:", 201, req(f"/api/expense-categories/{cat['id']}","DELETE",token=tok)[0])

# Ayarlar — okunan değer geri yazılır, klinik ayarı değişmez
s = json.loads(req("/api/settings", token=tok)[1])
print("ayar oku/geri yaz:", 200, req("/api/settings","PUT",{"open_days": s["open_days"]},tok)[0])
print("TÜM BÖLÜM AKIŞLARI OK")
PY
```

Expected: hizmet `200 204`; paket `201 204`; personel `200 204`; kategori `201 204`; ayar `200 200`; son satır `TÜM BÖLÜM AKIŞLARI OK`.

Ayar adımı bilerek okuduğunu geri yazar — doğrulama kliniğin gerçek ayarını değiştirmemeli.

- [ ] **Step 2: Tarayıcıda beş sekmeyi gez**

`http://localhost:5173/sistem` adresinde her sekmeye tıkla:

1. **Klinik** — form alanları görünüyor
2. **Personel** — **gerçek** personel tablosu (uydurma "Dr. Defne A." yok); ekleme/pasife alma çalışıyor
3. **Hizmetler & paketler** — üç tablo alt alta: hizmetler, paketler, gider kategorileri
4. **WhatsApp** — bağlantı kutusu ve şablon listesi (şablonlar hâlâ sahte, bilerek)
5. **AI** — anahtar satırları

Konsolda hata olmamalı. Chrome eklentisi bağlı değilse bu adım atlanır ve **PR'da atlandığı yazılır** — yapılmış gibi gösterilmez.

---

### Task 6: Kapanış ve PR

- [ ] **Step 1: Kapılar**

Run: `cd ~/Desktop/kisisel/w-lush-web && npm run typecheck && npm run build > /dev/null && echo "exit=$?"`
Expected: `exit=0`.

- [ ] **Step 2: Değişen dosyaları gözden geçir**

Run: `cd ~/Desktop/kisisel/w-lush-web && git diff main --stat`

Expected: `src/components/sistem/` altında altı yeni dosya, `src/pages/Sistem.tsx` belirgin şekilde küçülmüş, doküman dosyaları. **Başka hiçbir dosya değişmemeli** — özellikle `src/api/*` ve diğer sayfalar.

Backend reposunda hiçbir değişiklik olmadığını doğrula:

```bash
cd ~/Desktop/kisisel/w-lush && git status --short | wc -l | xargs echo "backend değişiklik sayısı:"
```

Expected: `0`.

- [ ] **Step 3: PR'ı aç**

Task 5 Step 2 atlandıysa PR gövdesindeki ilgili satırı buna göre yaz.

```bash
cd ~/Desktop/kisisel/w-lush-web && git push -u origin feature/sistem-bolme
gh pr create --title "Split the Settings screen into sections" --body "$(cat <<'EOF'
`Sistem.tsx` 1170 satırdan kabuğa indi; dört CRUD bölümü ve ayar formu `src/components/sistem/` altına çıktı (`components/finance/` deseninin aynısı). Rota ve `App.tsx` değişmedi.

**İki davranış düzeltmesi de dahil:**

1. **"Personel" sekmesi artık gerçek personeli gösteriyor.** O sekme sabit kodlanmış bir listeyi ("Dr. Defne A." vb.) çiziyordu; gerçek personel yönetimi ise fiyatlandırma sekmesinin altında saklıydı. Sahte dizi silindi.
2. **Bölümler birbirini render etmiyor.** `HizmetSection` kendi içinde diğer üç bölümü çağırıyordu; artık hangi sekmede ne görüneceğine yalnız kabuk karar veriyor.

`Toggle` paylaşılan dosyaya taşındı; `Field` ve `SettingRow` kabukta kaldı — tek tüketicileri kabuk, taşımak olmayan bir paylaşımı ima ederdi.

**Kapsam dışı:** `TEMPLATES` (WhatsApp mesaj şablonları) hâlâ sahte. Karşılığı olan özellik ayrı bir iş; silmek o sekmeyi boşaltırdı.

**Doğrulamanın sınırı — açıkça:** test koşucusu olmadığı için "davranış değişmedi" garantisi yok. Kod birebir taşındı (markup, stil, metin değiştirilmedi), `typecheck`/`build` geçiyor ve her bölümün arkasındaki API akışı canlı koşuldu: hizmet oluştur/güncelle/sil, paket oluştur/sil, personel oluştur/pasife al/sil, kategori oluştur/sil, ayar oku/geri yaz.

Spec: `docs/superpowers/specs/2026-08-10-sistem-bolme-design.md`
EOF
)"
```

---

## Self-Review

**Spec kapsamı:** `Toggle` çıkarımı → Task 1. Katalog bölümleri + bölümlerin birbirini render etmeyi bırakması → Task 2. Personel bölümü + sekme düzeltmesi + sahte `STAFF` silinmesi → Task 3. Ayar bölümü → Task 4. Doğrulama → Task 5. Yayın → Task 6. Spec'in kapsam dışı listesi (`TEMPLATES`, backend, görsel tasarım) hiçbir task'ta uygulanmıyor.

**Placeholder taraması:** Bölüm gövdeleri plana kopyalanmadı — bilerek: bunlar **taşınacak** kod, yeniden yazılacak değil. Onun yerine her bölüm için tam satır aralığı, tam import bloğu ve `export default` dönüşümü verildi. Bir gövdeyi plana kopyalayıp oradan yapıştırmak, birebir taşıma kuralını ihlal etme riskini artırırdı.

**Tip tutarlılığı:** Her bölümün gerektirdiği import'lar kaynak dosyadan çıkarıldı, tahmin edilmedi. `Toggle` yalnız `HizmetSection`, `PaketSection` ve kabuk tarafından kullanılıyor; `Field`/`SettingRow` yalnız kabukta. Tip tanımları (`StaffRow`, `CatRow`, `Row`, `PkgRow`) ve `const GUN` tek tüketicileriyle birlikte taşınıyor.

**Bilinen risk:** Satır aralıkları kaynak dosyanın **bugünkü** haline göre. Task'lar sırayla yürütülürse her silme sonraki aralıkları kaydırır — bu yüzden her task, aralık numarasına değil **fonksiyon adına** bakarak çalışmalı; satır numaraları yalnız yönlendirme içindir.
