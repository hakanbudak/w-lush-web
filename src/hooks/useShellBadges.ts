import { useEffect, useState } from 'react';
import { listConversations } from '../api/conversations';
import { listCustomers } from '../api/customers';

/**
 * Kenar menüdeki iki rozet. İkisi de gerçek veriden gelir; sayı 0 ise rozet
 * çizilmez — tasarımdaki 3 ve 2 örnek veriydi ve arkasında sayı olmayan bir
 * rozet, rozet olmamasından kötüdür.
 *
 * CRM: henüz kimsenin dönmediği adaylar ("yeni" aşaması).
 * Mesajlar: son sözü müşterinin söylediği konuşmalar.
 */
export function useShellBadges(): { crm: number; mesajlar: number } {
  const [crm, setCrm] = useState(0);
  const [mesajlar, setMesajlar] = useState(0);

  useEffect(() => {
    listCustomers()
      .then((rows) => setCrm(rows.filter((c) => c.stage === 'new').length))
      .catch(() => setCrm(0));
    listConversations()
      .then((rows) => setMesajlar(rows.filter((c) => c.waiting).length))
      .catch(() => setMesajlar(0));
  }, []);

  return { crm, mesajlar };
}
