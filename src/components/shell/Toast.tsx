import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';

const Ctx = createContext<(text: string) => void>(() => {});

/** Bildirim süresi — tasarımdan. */
const LIFETIME = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((next: string) => {
    window.clearTimeout(timer.current);
    setText(next);
    timer.current = window.setTimeout(() => setText(null), LIFETIME);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Ctx.Provider value={show}>
      {children}
      {text && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 28,
            transform: 'translateX(-50%)',
            zIndex: 90,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            background: 'var(--navy)',
            color: 'var(--navy-ink)',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 12.5,
            boxShadow: '0 18px 40px -12px rgba(23,35,61,0.45)',
            animation: 'wl-fade .25s ease both',
          }}
        >
          <span style={{ color: 'var(--accent-soft)', fontWeight: 700 }}>✓</span>
          {text}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useToast(): (text: string) => void {
  return useContext(Ctx);
}
