import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  listAppointments,
  listRequests,
  type Appointment,
  type ClinicRequest,
} from '../api/clinic';
import FirstTimeDashboard from '../components/anaekran/FirstTimeDashboard';
import RichDashboard from '../components/anaekran/RichDashboard';

/* ── Veri-farkında sarmalayıcı: boş klinik → ilk-deneyim ──── */
export default function AnaEkran() {
  const { user } = useAuth();
  const [appts, setAppts] = useState<Appointment[] | null>(null);
  const [reqs, setReqs] = useState<ClinicRequest[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listAppointments(), listRequests()])
      .then(([a, r]) => {
        setAppts(a);
        setReqs(r);
      })
      .catch(() => {
        setAppts([]);
        setReqs([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>
        Yükleniyor…
      </div>
    );
  }

  const hasData = (appts?.length ?? 0) > 0 || (reqs?.length ?? 0) > 0;
  if (!hasData) {
    return <FirstTimeDashboard clinicName={user?.clinic.name ?? 'klinik'} />;
  }
  return <RichDashboard />;
}
