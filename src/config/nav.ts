import type { IconKey } from '../components/icons';

export interface NavItem {
  key: string;
  label: string;   // sidebar etiketi (kısa)
  title: string;    // top bar başlığı
  path: string;
  icon: IconKey;
  count?: number;
}

/** Kenar menüde başlık altında toplanan bölüm. Başlıksız grup ayraç görevi görüyor. */
export interface NavGroup {
  label: string | null;
  items: NavItem[];
}

/**
 * Menü dört bölüme ayrıldı: günlük iş, danışan ilişkisi, para, ayarlar.
 * Dokuz maddelik düz liste hepsini aynı ağırlıkta gösteriyordu — operatör
 * günde onlarca kez açtığı "Bugün" ile yılda bir açtığı ayarları
 * aynı yerde arıyordu.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { key: 'home', label: 'Bugün', title: 'Bugün', path: '/', icon: 'home' },
      { key: 'randevu', label: 'Takvim', title: 'Randevu takvimi', path: '/randevu', icon: 'calendar' },
    ],
  },
  {
    label: 'Danışanlar',
    items: [
      { key: 'danisan', label: 'Danışan listesi', title: 'Danışan profili', path: '/danisan', icon: 'user' },
      { key: 'mesajlar', label: 'Mesajlar', title: 'Mesajlar', path: '/mesajlar', icon: 'chat' },
      { key: 'crm', label: 'CRM · adaylar', title: 'CRM · Danışan adayları', path: '/crm', icon: 'users' },
    ],
  },
  {
    label: 'Finans',
    items: [
      { key: 'gelir', label: 'Gelir', title: 'Gelir raporu', path: '/gelir', icon: 'trending' },
      { key: 'gider', label: 'Gider', title: 'Giderler', path: '/gider', icon: 'wallet' },
      { key: 'rapor', label: 'Raporlar', title: 'Rapor', path: '/rapor', icon: 'chart' },
    ],
  },
  {
    label: null,
    items: [
      { key: 'sistem', label: 'Sistem ayarları', title: 'Sistem · Ayarlar', path: '/sistem', icon: 'settings' },
    ],
  },
];

/** Başlık eşleme ve arama gibi grup umursamayan yerler için düz liste. */
export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
