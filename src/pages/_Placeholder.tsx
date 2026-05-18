import { Icon } from '../components/icons';

/** Henüz üretilmemiş sayfalar için tasarım sistemine uygun yer tutucu. */
export default function Placeholder({ name, note }: { name: string; note?: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        minHeight: 480,
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 420,
          padding: 40,
          borderRadius: 14,
          border: '1px dashed var(--line-strong)',
          background: 'var(--paper)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            margin: '0 auto 16px',
            background: 'var(--lavender-soft)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--lavender-2)',
          }}
        >
          {Icon.sparkle}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 13, color: 'var(--ink-60)', marginTop: 6, lineHeight: 1.5 }}>
          {note ?? 'Bu sayfa onay sırasına göre üretilecek.'}
        </div>
      </div>
    </div>
  );
}
