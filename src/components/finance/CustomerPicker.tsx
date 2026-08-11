import { useEffect, useState, type CSSProperties } from 'react';
import { listCustomers, type CustomerSummary } from '../../api/customers';

const field: CSSProperties = {
  width: '100%',
  border: '1px solid var(--line-strong)',
  borderRadius: 8,
  padding: '9px 10px',
  font: 'inherit',
  fontSize: 13,
  background: 'var(--cream)',
  marginTop: 4,
};

const labelStyle: CSSProperties = { fontSize: 11, color: 'var(--ink-60)', display: 'block' };

/**
 * Danışan alanı. Kayıtlı birini seçmek telefonu da doldurur — kişi bazlı
 * harcamanın hesaplanabilmesi buna bağlı. Kayıtsız ziyaretçi için serbest
 * metin bırakılıyor: onu zorla bir kayda bağlamak, bir istatistik daha iyi
 * görünsün diye veriyi bozmak olurdu.
 */
export default function CustomerPicker({
  name,
  phone,
  onChange,
}: {
  name: string;
  phone: string;
  onChange: (next: { name: string; phone: string }) => void;
}) {
  const [rows, setRows] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    listCustomers()
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <>
      <label style={labelStyle}>
        Danışan
        <input
          list="wl-customers"
          value={name}
          onChange={(e) => {
            const typed = e.target.value;
            const hit = rows.find((r) => (r.name || r.phone) === typed);
            onChange(hit ? { name: hit.name || '', phone: hit.phone } : { name: typed, phone });
          }}
          placeholder="Kayıtlı danışan seçin ya da isim yazın"
          style={field}
        />
        <datalist id="wl-customers">
          {rows.map((r) => (
            <option key={r.phone} value={r.name || r.phone} />
          ))}
        </datalist>
      </label>

      <label style={labelStyle}>
        Telefon
        <input
          value={phone}
          onChange={(e) => onChange({ name, phone: e.target.value })}
          placeholder="905321112233"
          style={field}
        />
        <span style={{ fontSize: 10, color: 'var(--ink-45)', display: 'block', marginTop: 3 }}>
          Telefon girilen ödemeler danışan profilindeki harcamaya sayılır.
        </span>
      </label>
    </>
  );
}
