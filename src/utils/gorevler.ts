/**
 * Ana ekrandaki "Bekleyen işler" listesi.
 *
 * Kurulum adımları burada operasyon işleriyle aynı listede duruyor: boş
 * klinikte de dolu klinikte de ekranın yerleşimi değişmesin diye. Kurulum
 * adımları öne alınıyor, çünkü hizmet listesi boşken bot her soruya
 * "hizmet yok" diyor — mesaj yanıtlamak o durumda ikinci sıradaki iş.
 */
export interface Gorev {
  key: string;
  title: string;
  sub: string;
  /** urgent: ürün çalışmıyor · warn: bekleyen iş · idle: bilgi */
  tone: 'urgent' | 'warn' | 'idle';
  to: string;
  cta: string;
}

export interface GorevGirdisi {
  serviceCount: number;
  hasContact: boolean;
  waConnected: boolean;
  waitingConversations: number;
  pendingAppointments: number;
  monthPaymentCount: number;
}

export function gorevler(g: GorevGirdisi): Gorev[] {
  const out: Gorev[] = [];

  if (g.serviceCount === 0) {
    out.push({
      key: 'hizmet',
      title: 'Hizmetlerin girilmemiş',
      sub: 'Bot randevuyu bu listeden alıyor, fiyatı buradan söylüyor.',
      tone: 'urgent',
      to: '/kurulum',
      cta: 'Başla',
    });
  }

  // Hizmet yokken WhatsApp'ı bağlamak zarar veriyor: bağlanır bağlanmaz
  // danışanlar yazmaya başlıyor ve bot hepsine "hizmet yok" diyor.
  if (!g.waConnected) {
    out.push({
      key: 'whatsapp',
      title: "WhatsApp bağlı değil",
      sub: g.serviceCount === 0
        ? 'Önce hizmetler: listesi boş bir bot danışanı geri çeviriyor.'
        : 'Bağlanınca danışanlar yazmaya, bot randevu almaya başlıyor.',
      tone: g.serviceCount === 0 ? 'idle' : 'urgent',
      to: '/sistem?sec=whatsapp',
      cta: g.serviceCount === 0 ? 'Sırada' : 'Bağla',
    });
  }

  if (!g.hasContact) {
    out.push({
      key: 'klinik',
      title: 'Klinik adresi ve telefonu boş',
      sub: '"Neredesiniz?" en sık gelen soru — botun yanıtlayabilmesi için gerekli.',
      tone: 'warn',
      to: '/sistem?sec=klinik',
      cta: 'Doldur',
    });
  }

  if (g.waitingConversations > 0) {
    out.push({
      key: 'mesaj',
      title: `${g.waitingConversations} mesaj yanıt bekliyor`,
      sub: 'Son sözü danışan söyledi.',
      tone: 'warn',
      to: '/mesajlar',
      cta: 'Aç',
    });
  }

  if (g.pendingAppointments > 0) {
    out.push({
      key: 'onay',
      title: `${g.pendingAppointments} randevu onay bekliyor`,
      sub: 'Onaylanmayan randevu danışana teyit mesajı göndermiyor.',
      tone: 'warn',
      to: '/randevu',
      cta: 'Takvim',
    });
  }

  // Kurulum bittiyse ve hiç tahsilat yoksa bu gerçekten eksik bir iş;
  // kurulum sürerken söylemek gereksiz gürültü.
  if (g.monthPaymentCount === 0 && g.serviceCount > 0 && g.waConnected) {
    out.push({
      key: 'odeme',
      title: 'Bu ay ödeme kaydı yok',
      sub: 'Tahsilat girilmezse gelir raporu boş kalıyor.',
      tone: 'idle',
      to: '/gelir',
      cta: 'Gelir',
    });
  }

  return out;
}
