import { useEffect, useState } from 'react';
import { getConnection } from '../api/whatsapp';

/**
 * Kenar menünün alt satırı. Durum bilinmiyorken "—" gösterilir, "Bağlı değil"
 * değil: istek düştüğü için bilmiyor olmakla bağlı olmamak aynı şey değil.
 */
export function useWhatsAppStatus(): { connected: boolean; label: string } {
  const [state, setState] = useState<{ connected: boolean; label: string }>({
    connected: false,
    label: '—',
  });

  useEffect(() => {
    getConnection()
      .then((c) =>
        setState(
          c.status === 'connected'
            ? { connected: true, label: 'Bağlı' }
            : { connected: false, label: 'Bağlı değil' },
        ),
      )
      .catch(() => setState({ connected: false, label: '—' }));
  }, []);

  return state;
}
