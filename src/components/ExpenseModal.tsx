import { useState, type CSSProperties } from 'react';
import {
  createExpense,
  type ExpenseCategory,
  type PaymentMethod,
} from '../api/expenses';
import { Modal } from './modals';
import { isoDate } from '../utils/calendar';
import DatePicker from './ui/DatePicker';
import Select from './ui/Select';

const METHODS: [PaymentMethod, string][] = [
  ['transfer', 'Havale'],
  ['card', 'Kart'],
  ['cash', 'Nakit'],
  ['other', 'Diğer'],
];

const field: CSSProperties = {
  width: '100%', border: '1px solid var(--line)', borderRadius: 8,
  padding: '8px 10px', font: 'inherit', fontSize: 12,
  background: 'var(--cream)', marginTop: 4,
};

const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-60)', display: 'block' };

export default function ExpenseModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const active = categories.filter((c) => c.active);
  const [categoryId, setCategoryId] = useState<number | ''>(active[0]?.id ?? '');
  const [spentAt, setSpentAt] = useState(isoDate(new Date()));
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('transfer');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = () => {
    const value = Number(amount);
    if (categoryId === '') {
      setError('Kategori seçin.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Tutar sıfırdan büyük olmalı.');
      return;
    }
    setSaving(true);
    setError(null);
    createExpense({
      category_id: categoryId,
      spent_at: spentAt,
      amount: Math.round(value),
      method,
      description: description.trim(),
      note: note.trim(),
    })
      .then(() => {
        onSaved();
        onClose();
      })
      .catch((e: Error) => {
        // 422/409 gövdesindeki TR metni göster; ayıklanamazsa genel mesaj.
        const detail = e.message.split('detail":"')[1]?.split('"')[0];
        setError(detail || 'Gider kaydedilemedi.');
        setSaving(false);
      });
  };

  return (
    <Modal title="Gider ekle" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
        {active.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.5 }}>
            Aktif gider kategorisi yok. Önce <strong>Sistem &gt; Gider kategorileri</strong>{' '}
            bölümünden kategori tanımlayın.
          </div>
        ) : (
          <>
            <label style={labelStyle}>
              Kategori
              <Select
                value={String(categoryId)}
                onChange={(v) => setCategoryId(Number(v))}
                options={active.map((c) => ({ value: String(c.id), label: c.name }))}
                style={field}
              />
            </label>
            <label style={labelStyle}>
              Tarih
              <DatePicker
                value={spentAt}
                onChange={setSpentAt}
                // Gider de gelecek tarihi kabul etmiyor (ERR_EXPENSE_FUTURE_DATE).
                max={isoDate(new Date())}
                style={field}
              />
            </label>
            <label style={labelStyle}>
              Tutar (₺)
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="18600"
                style={field}
              />
            </label>
            <label style={labelStyle}>
              Ödeme yöntemi
              <Select
                value={method}
                onChange={(v) => setMethod(v as PaymentMethod)}
                options={METHODS.map(([k, lbl]) => ({ value: k, label: lbl }))}
                style={field}
              />
            </label>
            <label style={labelStyle}>
              Açıklama
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mayıs kira ödemesi"
                style={field}
              />
            </label>
            <label style={labelStyle}>
              Not
              <input value={note} onChange={(e) => setNote(e.target.value)} style={field} />
            </label>
          </>
        )}

        {error && <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="wl-btn wl-btn-ghost wl-btn-sm" onClick={onClose}>
            Vazgeç
          </button>
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            // Tasarımda gider formunun birincil düğmesi lacivert.
            style={{ background: 'var(--navy)', color: 'var(--navy-ink)' }}
            onClick={submit}
            disabled={saving || active.length === 0}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
