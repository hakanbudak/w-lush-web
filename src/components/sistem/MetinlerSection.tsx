import { useEffect, useMemo, useState } from 'react';
import { listTexts, saveText, type BotText } from '../../api/texts';

/*
 * Botun danışana yazdığı metinler.
 *
 * Metinler kodda sabitti; bu, her kliniğin danışanının "W-Lush'a hoş
 * geldiniz" cevabı alması demekti. Artık klinik kendi metnini yazıyor,
 * boş bıraktığı yerde varsayılan kullanılıyor.
 */

export default function MetinlerSection() {
  const [texts, setTexts] = useState<BotText[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTexts()
      .then(setTexts)
      .catch(() => setError('Metinler yüklenemedi.'));
  }, []);

  const groups = useMemo(() => {
    const out = new Map<string, BotText[]>();
    for (const t of texts ?? []) {
      const list = out.get(t.group) ?? [];
      list.push(t);
      out.set(t.group, list);
    }
    return [...out.entries()];
  }, [texts]);

  if (error) return <div style={{ fontSize: 12, color: 'var(--bad)' }}>{error}</div>;
  if (!texts) return <div style={{ fontSize: 12, color: 'var(--ink-45)' }}>Yükleniyor…</div>;

  const update = (row: BotText) =>
    setTexts((cur) => (cur ?? []).map((x) => (x.key === row.key ? row : x)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-45)', lineHeight: 1.6 }}>
        Boş bıraktığınız metinlerde varsayılan kullanılır. Değişiklik hemen
        geçerli olur — konuşmanın ortasındaki danışan da yeni metni görür.
      </div>
      {groups.map(([group, rows]) => (
        <div key={group}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{group}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rows.map((row) => (
              <MetinSatiri key={row.key} row={row} onSaved={update} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MetinSatiri({
  row,
  onSaved,
}: {
  row: BotText;
  onSaved: (row: BotText) => void;
}) {
  const [value, setValue] = useState(row.value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = value !== row.value;
  const shown = row.value || row.default;

  const save = (next: string) => {
    setBusy(true);
    setError(null);
    saveText(row.key, next)
      .then((out) => {
        onSaved(out);
        setValue(out.value);
        setSaved(true);
        setTimeout(() => setSaved(false), 1600);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const Field = row.multiline ? 'textarea' : 'input';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-60)', flex: 1 }}>{row.label}</span>
        {row.fields.length > 0 && (
          <span className="wl-mono" style={{ fontSize: 10, color: 'var(--ink-45)' }}>
            {row.fields.map((f) => `{${f}}`).join(' ')}
          </span>
        )}
        {row.value && (
          <button
            type="button"
            onClick={() => save('')}
            disabled={busy}
            style={{
              border: 'none', background: 'transparent', font: 'inherit',
              fontSize: 10.5, color: 'var(--ink-45)', cursor: 'pointer', padding: 0,
            }}
          >
            varsayılana dön
          </button>
        )}
      </div>
      <Field
        value={value}
        placeholder={row.default}
        rows={row.multiline ? 2 : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
          setValue(e.target.value)
        }
        onBlur={() => dirty && save(value)}
        aria-label={row.label}
        style={{
          border: '1px solid var(--line-strong)', borderRadius: 8, padding: '7px 9px',
          font: 'inherit', fontSize: 12.5, background: 'var(--cream)', width: '100%',
          resize: row.multiline ? 'vertical' : undefined,
        }}
      />
      {error && <div style={{ fontSize: 11, color: 'var(--bad)' }}>{error}</div>}
      {saved && !error && (
        <div style={{ fontSize: 10.5, color: 'var(--forest)' }}>Kaydedildi.</div>
      )}
      {!row.value && !dirty && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-40)' }}>
          Varsayılan: {shown.length > 90 ? `${shown.slice(0, 90)}…` : shown}
        </div>
      )}
    </div>
  );
}
