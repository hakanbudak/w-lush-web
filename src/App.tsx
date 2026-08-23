import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import OnlineRandevu from './pages/OnlineRandevu';
import Stok from './pages/Stok';
import Layout from './components/Layout';
import AnaEkran from './pages/AnaEkran';
import CRM from './pages/CRM';
import DanisanProfili from './pages/DanisanProfili';
import GelirRaporu from './pages/GelirRaporu';
import Giderler from './pages/Giderler';
import Kurulum from './pages/Kurulum';
import Login from './pages/Login';
import Mesajlar from './pages/Mesajlar';
import RandevuTakvimi from './pages/RandevuTakvimi';
import Rapor from './pages/Rapor';
import SifremiUnuttum from './pages/SifremiUnuttum';
import SifreSifirla from './pages/SifreSifirla';
import Signup from './pages/Signup';
import Sistem from './pages/Sistem';
import Yonetici from './pages/Yonetici';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      {/* Herkese açık: oturum, kenar menü ve üst bar olmadan. */}
      <Route path="/r/:slug" element={<OnlineRandevu />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/sifremi-unuttum" element={<SifremiUnuttum />} />
      {/* Postadaki bağlantı buraya geliyor: /sifre-sifirla?token=... */}
      <Route path="/sifre-sifirla" element={<SifreSifirla />} />

      {/* Protected (auth gerekli) */}
      {/* Kurulum kabuğun dışında: sihirbaz kendi tam ekran yerleşimini kullanıyor. */}
      <Route element={<ProtectedRoute />}>
        <Route path="/kurulum" element={<Kurulum />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<AnaEkran />} />
          <Route path="/randevu" element={<RandevuTakvimi />} />
          <Route path="/mesajlar" element={<Mesajlar />} />
          <Route path="/danisan" element={<DanisanProfili />} />
          <Route path="/danisan/:phone" element={<DanisanProfili />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/gelir" element={<GelirRaporu />} />
          <Route path="/gider" element={<Giderler />} />
          <Route path="/stok" element={<Stok />} />
          <Route path="/rapor" element={<Rapor />} />
          <Route path="/sistem" element={<Sistem />} />
          <Route path="/yonetici" element={<Yonetici />} />
          <Route path="*" element={<AnaEkran />} />
        </Route>
      </Route>
    </Routes>
  );
}
