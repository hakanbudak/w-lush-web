import { useEffect, useState, type CSSProperties } from 'react';
import { ApiError } from '../../api/client';
import {
  getCustomer, listCustomers, type CustomerSummary,
} from '../../api/customers';
import {
  createAppointment,
  listServices,
  type AppointmentCreated,
  type Service,
} from '../../api/clinic';
import type { StaffMember } from '../../api/staff';
import { Modal } from '../modals';
import DatePicker from '../ui/DatePicker';
import Combobox from '../ui/Combobox';
import Select from '../ui/Select';

const field: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 10px',
  font: 'inherit',
  fontSize: 12,
  background: 'var(--cream)',
  marginTop: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--ink-60)',
  display: 'block',
};

const UNASSIGNED = '';

export default function AppointmentModal({
  slots,
  staff,
  initial,
  onClose,
  onCreated,
}: {
  slots: string[];
  staff: StaffMember[];
  initial: { date: string; time: string; staffId: number | null };
  onClose: () => void;
  onCreated: (created: AppointmentCreated) => void;
}) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [known, setKnown] = useState(false);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  /**
   * Kayıtlı danışan mı yeni danışan mı.
   *
   * Tek bir serbest alan ikisini karıştırıyordu: listede olan biri elle
   * yazılınca numarası boş kalıyor, yeni biri yazılınca da listeden
   * seçilmediği belli olmuyordu. Modu açıkça sormak, hangi bilgiyi
   * doldurması gerektiğini de söylüyor.
   */
  const [yeniDanisan, setYeniDanisan] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [day, setDay] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [staffId, setStaffId] = useState<string>(
    initial.staffId === null ? UNASSIGNED : String(initial.staffId),
  );
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listServices()
      .then((rows) => setServices(rows.filter((s) => s.active)))
      .catch(() => setServices([]));
    // Eski danışanı her seferinde elle yazmak yerine listeden seçmek için.
    listCustomers()
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);

  // Ada göre de numaraya göre de aranabilsin: operatör hangisini
  // hatırlıyorsa onu yazıyor.
  const customerOptions = customers.map((c) => ({
    value: c.phone,
    label: c.name ? `${c.name} · ${c.phone}` : c.phone,
  }));

  // Telefon yazılmayı bıraktıktan sonra mevcut danışan aranır.
  useEffect(() => {
    const digits = phone.trim();
    if (digits.length < 10) {
      setKnown(false);
      return;
    }
    const t = setTimeout(() => {
      getCustomer(digits)
        .then((c) => {
          setKnown(true);
          // İsim yalnızca operatör henüz bir şey yazmadıysa doldurulur.
          setName((cur) => cur || c.name || '');
        })
        // 404 normal sonuçtur: yeni danışan. Hata gösterilmez.
        .catch(() => setKnown(false));
    }, 400);
    return () => clearTimeout(t);
  }, [phone]);

  const submit = () => {
    if (!phone.trim()) {
      // Kayıtlı modda numara seçimden gelir; boşsa seçim yapılmamıştır ve
      // "telefon zorunlu" demek operatöre ne yapacağını söylemez.
      setError(
        yeniDanisan
          ? 'Telefon zorunlu.'
          : 'Listeden bir danışan seçin ya da "Yeni danışan"a geçin.',
      );
      return;
    }
    if (!time) {
      setError('Saat seçilmeli.');
      return;
    }
    setSaving(true);
    setError(null);
    createAppointment({
      phone: phone.trim(),
      customer_name: name.trim(),
      service_name: serviceName.trim(),
      appt_date: day,
      appt_time: time,
      staff_id: staffId === UNASSIGNED ? null : Number(staffId),
      notify,
    })
      .then((created) => {
        onCreated(created);
        onClose();
      })
      .catch((e: unknown) => {
        const api = e instanceof ApiError ? e : null;
        // 409'da form açık kalır: operatör başka saat/personel seçebilsin.
        setError(api?.detail || 'Randevu oluşturulamadı.');
        setSaving(false);
      });
  };

  return (
    <Modal title="Yeni randevu" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          role="radiogroup"
          aria-label="Danışan türü"
          style={{ display: 'flex', gap: 6 }}
        >
          {([
            [false, 'Kayıtlı danışan'],
            [true, 'Yeni danışan'],
          ] as [boolean, string][]).map(([deger, etiket]) => {
            const secili = yeniDanisan === deger;
            return (
              <button
                key={etiket}
                type="button"
                role="radio"
                aria-checked={secili}
                onClick={() => {
                  // Mod değişince alanlar boşalıyor: yeni danışan formunda
                  // listeden gelmiş bir numaranın kalması, yeni kişiyi
                  // başkasının numarasına yazmak olurdu.
                  setYeniDanisan(deger);
                  setPhone('');
                  setName('');
                }}
                style={{
                  flex: 1, font: 'inherit', fontSize: 12.5, cursor: 'pointer',
                  padding: '7px 10px', borderRadius: 9,
                  background: secili ? 'var(--ink)' : 'var(--paper)',
                  color: secili ? 'var(--paper)' : 'var(--ink-60)',
                  border: '1px solid var(--line-strong)',
                  fontWeight: secili ? 600 : 400,
                }}
              >
                {etiket}
              </button>
            );
          })}
        </div>

        {yeniDanisan ? (
          <>
            <label style={labelStyle}>
              Danışan adı
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ad soyad"
                style={field}
              />
            </label>

            <label style={labelStyle}>
              Telefon
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="905321112233"
                style={field}
              />
            </label>

            {known && (
              <div style={{ fontSize: 11, color: 'var(--warn)' }}>
                Bu numara zaten kayıtlı — "Kayıtlı danışan"dan seçerseniz
                geçmişi tek kişide toplanır.
              </div>
            )}
          </>
        ) : (
          <>
            <label style={labelStyle}>
              Danışan
              <Combobox
                value={name}
                onChange={(v) => {
                  setName(v);
                  // Listeden seçilmiş numara, ad elle değiştirilince
                  // düşüyor: yanlış kişiye randevu yazılmasın.
                  setPhone('');
                }}
                onPick={(opt) => {
                  setPhone(opt.value);
                  const secilen = customers.find((c) => c.phone === opt.value);
                  setName(secilen?.name || opt.value);
                }}
                options={customerOptions}
                placeholder="Ad ya da numara yazın"
                ariaLabel="Danışan"
                style={field}
              />
            </label>

            {phone ? (
              <div style={{ fontSize: 11.5, color: 'var(--forest-2)' }}>
                Numara: <span className="wl-mono">{phone}</span>
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: 'var(--ink-45)' }}>
                Listeden seçin — numarası kendiliğinden gelir. Kayıtlı değilse
                "Yeni danışan"a geçin.
              </div>
            )}
          </>
        )}

        <label style={labelStyle}>
          Hizmet
          <Select
            value={serviceName}
            onChange={setServiceName}
            options={[
              { value: '', label: 'Seçilmedi' },
              ...services.map((s) => ({ value: s.name, label: s.name })),
            ]}
            style={field}
          />
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ ...labelStyle, flex: 1 }}>
            Tarih
            {/* Sınır yok: geçmişte kalmış bir ziyareti kaydetmek meşru bir iş. */}
            <DatePicker value={day} onChange={setDay} style={field} />
          </label>
          <label style={{ ...labelStyle, flex: 1 }}>
            Saat
            <Select
              value={time}
              onChange={setTime}
              options={[
                { value: '', label: 'Seçilmedi' },
                ...slots.map((s) => ({ value: s, label: s })),
              ]}
              style={field}
            />
          </label>
        </div>

        <label style={labelStyle}>
          Personel
          <Select
            value={staffId}
            onChange={setStaffId}
            options={[
              { value: UNASSIGNED, label: 'Atanmamış' },
              ...staff.map((s) => ({ value: String(s.id), label: s.name })),
            ]}
            style={field}
          />
        </label>

        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          Müşteriye WhatsApp'tan bilgi ver
        </label>

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor…' : 'Randevu oluştur'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
