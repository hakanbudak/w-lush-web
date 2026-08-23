import AnaEkranPanosu from '../components/anaekran/AnaEkranPanosu';

/**
 * Ana ekran. Boş ve dolu klinik aynı yerleşimi paylaşıyor: eksikler
 * "Bekleyen işler" panelinde çıkıyor, sayılar sıfır görünüyor. Ayrı bir
 * ilk-deneyim ekranı, klinik veri girdikçe altındaki zemini değiştiriyordu.
 */
export default function AnaEkran() {
  return <AnaEkranPanosu />;
}
