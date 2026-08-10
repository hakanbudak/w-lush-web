// Sistem ekranının bölümleri arasında paylaşılan tek parça.
// Field ve SettingRow bilerek burada değil: onları yalnız kabuk kullanıyor.

export function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: on ? 'var(--forest)' : 'var(--cream-3)',
        position: 'relative',
        transition: 'background .15s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: 'var(--paper)',
          transition: 'left .15s',
          boxShadow: '0 1px 3px rgba(42,53,48,0.25)',
        }}
      />
    </button>
  );
}
