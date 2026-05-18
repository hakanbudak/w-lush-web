import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AnaEkran from './pages/AnaEkran';
import RandevuTakvimi from './pages/RandevuTakvimi';
import DanisanProfili from './pages/DanisanProfili';
import CRM from './pages/CRM';
import GelirRaporu from './pages/GelirRaporu';
import Giderler from './pages/Giderler';
import Rapor from './pages/Rapor';
import Sistem from './pages/Sistem';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<AnaEkran />} />
        <Route path="/randevu" element={<RandevuTakvimi />} />
        <Route path="/danisan" element={<DanisanProfili />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/gelir" element={<GelirRaporu />} />
        <Route path="/gider" element={<Giderler />} />
        <Route path="/rapor" element={<Rapor />} />
        <Route path="/sistem" element={<Sistem />} />
        <Route path="*" element={<AnaEkran />} />
      </Route>
    </Routes>
  );
}
