import {
  createContext, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';

const Ctx = createContext<{
  actions: ReactNode;
  setActions: (n: ReactNode) => void;
} | null>(null);

export function TopBarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Üst barın sağ tarafı. Kabuk sayfaları bilmez; sayfa kendi düğmesini koyar. */
export function useTopBarActions(): ReactNode {
  return useContext(Ctx)?.actions ?? null;
}

/**
 * Sayfa üst bara düğme yerleştirir. `deps` değiştikçe yeniden yerleştirilir;
 * sayfa kapanınca temizlenir, aksi hâlde düğme bir sonraki sayfada asılı
 * kalırdı.
 */
export function useSetTopBarActions(node: ReactNode, deps: unknown[]): void {
  const ctx = useContext(Ctx);
  useEffect(() => {
    ctx?.setActions(node);
    return () => ctx?.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
