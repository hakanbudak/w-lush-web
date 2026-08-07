import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './icons';

/* ── helpers ─────────────────────────── */
export function initials(name: string): string {
  return (
    name
      .replace(/[+0-9]/g, '')
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '••'
  );
}

const AVATAR_BG = ['var(--forest)', 'var(--sage)', 'var(--champagne)', 'var(--lavender)'];

export function Avatar({
  name,
  i = 0,
  size = 28,
}: {
  name: string;
  i?: number;
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: AVATAR_BG[i % AVATAR_BG.length],
        color: 'var(--cream)',
        display: 'grid',
        placeItems: 'center',
        fontSize: size <= 28 ? 10 : 12,
        fontWeight: 500,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}

/* ── chip ─────────────────────────── */
type Tone =
  | 'forest'
  | 'champagne'
  | 'cream'
  | 'wa'
  | 'warn'
  | 'good'
  | 'bad'
  | 'sage'
  | 'lavender'
  | 'blush'
  | 'ai';

export function Chip({
  tone = 'cream',
  children,
  small,
  style,
}: {
  tone?: Tone;
  children: ReactNode;
  small?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`wl-chip wl-chip-${tone}`}
      style={small ? { height: 18, fontSize: 10, padding: '0 6px', ...style } : style}
    >
      {children}
    </span>
  );
}

/* ── card shell ─────────────────────────── */
export function Card({
  title,
  subtitle,
  right,
  children,
  bodyStyle,
  style,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  bodyStyle?: CSSProperties;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        overflow: 'hidden',
        ...style,
      }}
    >
      {(title || right) && (
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--line)',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 11, color: 'var(--ink-40)', marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {right && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{right}</div>}
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
    </div>
  );
}

/* ── KPI card (referans birebir) ─────────────────────────── */
export function KpiCard({
  label,
  value,
  delta,
  deltaTone,
  sparkline,
  accent,
}: {
  label: string;
  value: string;
  // Opsiyonel: önceki döneme kıyas verisi olmayan ekranlar rozet çizmez.
  delta?: string;
  deltaTone?: 'good' | 'bad' | 'warn';
  sparkline?: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: 'var(--paper)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: accent }} />
        <div style={{ fontSize: 12, color: 'var(--ink-60)', fontWeight: 500 }}>{label}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{value}</div>
        {delta && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color:
                deltaTone === 'good'
                  ? 'var(--sage-2)'
                  : deltaTone === 'warn'
                  ? 'var(--champagne-2)'
                  : 'var(--bad)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {deltaTone === 'good' && Icon.trend}
            {deltaTone === 'bad' && Icon.trendDown}
            {delta}
          </div>
        )}
      </div>
      {sparkline && (
        <svg
          viewBox="0 0 200 32"
          preserveAspectRatio="none"
          style={{ width: '100%', height: 32, marginTop: 12, display: 'block' }}
        >
          <path d={sparkline} fill="none" stroke={accent} strokeWidth="1.4" />
        </svg>
      )}
    </div>
  );
}

/* ── AI insight box (gradient) ─────────────────────────── */
export function AiBox({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background:
          'linear-gradient(110deg, var(--paper) 0%, var(--paper) 55%, var(--lavender-soft) 100%)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        ...style,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: 'var(--lavender-soft)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--lavender-2)',
          flexShrink: 0,
        }}
      >
        {Icon.sparkle}
      </div>
      {children}
    </div>
  );
}
