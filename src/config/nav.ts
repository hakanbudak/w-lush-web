import type { IconKey } from '../components/icons';

export interface NavItem {
  key: string;
  label: string;   // sidebar etiketi (kısa)
  title: string;    // top bar başlığı
  path: string;
  icon: IconKey;
  count?: number;
}

/** Sidebar sırası referans "Ana Ekran" dosyasıyla birebir. */
export const NAV: NavItem[] = [
  { key: 'home', label: 'Ana ekran', title: 'Ana ekran', path: '/', icon: 'home' },
  { key: 'crm', label: 'CRM', title: 'CRM · Danışan adayları', path: '/crm', icon: 'users', count: 12 },
  { key: 'danisan', label: 'Danışan', title: 'Danışan profili', path: '/danisan', icon: 'user' },
  { key: 'randevu', label: 'Randevu', title: 'Randevu takvimi', path: '/randevu', icon: 'calendar' },
  { key: 'mesajlar', label: 'Mesajlar', title: 'Mesajlar', path: '/mesajlar', icon: 'whatsapp' },
  { key: 'gelir', label: 'Gelirler', title: 'Gelir raporu', path: '/gelir', icon: 'trending' },
  { key: 'gider', label: 'Giderler', title: 'Giderler', path: '/gider', icon: 'wallet' },
  { key: 'rapor', label: 'Rapor', title: 'Rapor', path: '/rapor', icon: 'chart' },
  { key: 'sistem', label: 'Sistem', title: 'Sistem · Ayarlar', path: '/sistem', icon: 'settings' },
];
