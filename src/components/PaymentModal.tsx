import { useEffect, useState, type CSSProperties } from 'react';
import { listServices, type Service } from '../api/clinic';
import { createPayment, type PaymentMethod } from '../api/payments';
import CustomerPicker from './finance/CustomerPicker';
import { Modal } from './modals';

const METHODS: [PaymentMethod, string][] = [
  ['cash', 'Nakit'],
  ['card', 'Kart'],
  ['transfer', 'Havale'],
  ['other', 'Diğer'],
];

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-60)', display: 'block' };

export default function PaymentModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [paidAt, setPaidAt] = useState(todayIso());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [serviceName, setServiceName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listServices()
      .then((rows) => setServices(rows.filter((s) => s.active)))
      .catch(() => setServices([]));
  }, []);

  const submit = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Tutar sıfırdan büyük olmalı.');
      return;
    }
    setSaving(true);
    setError(null);
    createPayment({
      paid_at: paidAt,
      amount: Math.round(value),
      method,
      service_name: serviceName.trim(),
      customer_name: customerName.trim(),
      phone: phone.trim() || null,
      note: note.trim(),
    })
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((e: Error) => {
        // 422 gövdesindeki TR metni doğrudan göster; ayıklanamazsa genel mesaj.
        const detail = e.message.split('detail":"')[1]?.split('"')[0];
        setError(detail || 'Ödeme kaydedilemedi.');
        setSaving(false);
      });
  };

  return (
    <Modal title="Gelir ekle" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
        <label style={labelStyle}>
          Tarih
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} style={field} />
        </label>
        <label style={labelStyle}>
          Tutar (₺)
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="4100"
            style={field}
          />
        </label>
        <label style={labelStyle}>
          Ödeme yöntemi
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            style={field}
          >
            {METHODS.map(([k, lbl]) => (
              <option key={k} value={k}>
                {lbl}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Hizmet
          <select
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            style={field}
          >
            <option value="">Seçilmedi</option>
            {services.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <CustomerPicker
          name={customerName}
          phone={phone}
          onChange={(next) => {
            setCustomerName(next.name);
            setPhone(next.phone);
          }}
        />
        <label style={labelStyle}>
          Not
          <input value={note} onChange={(e) => setNote(e.target.value)} style={field} />
        </label>

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          <button type="button" className="wl-btn wl-btn-sm" onClick={submit} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
