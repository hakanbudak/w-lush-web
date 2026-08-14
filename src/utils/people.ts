/**
 * Bir kişinin ekranda nasıl anılacağı.
 *
 * Aynı durum panelde üç ayrı şekilde çiziliyordu: ham `905321110004`,
 * `905321•••04` maskesi (iki dosyada birebir kopya) ve `—`. Numara isim
 * yerine geçince operatör karşısındakinin kim olduğunu anlamıyor.
 */

/** "905321112233" → "0532 111 22 33". Tanınmayan biçim olduğu gibi kalır. */
export function formatPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const local = digits.startsWith('90') ? digits.slice(2) : digits;
  if (local.length !== 10) return phone || '';
  return `0${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)} ${local.slice(8)}`;
}

/**
 * Kişinin adı, yoksa okunur telefonu.
 *
 * İsim uydurmuyoruz: bilmediğimizde "İsimsiz" diyoruz ve numarayı numara
 * gibi gösteriyoruz. Kimliği olmayan kaydı isimliymiş gibi göstermek,
 * operatörün yanlış kişiyi aramasına yol açar.
 */
export function displayName(person: { name?: string | null; phone?: string | null }): string {
  const name = (person.name || '').trim();
  if (name) return name;
  const phone = formatPhone(person.phone || '');
  return phone ? `İsimsiz · ${phone}` : 'İsimsiz';
}

/** Avatar baş harfleri. İsimsiz kayıtta harf yok, nötr bir işaret var. */
export function initials(person: { name?: string | null; phone?: string | null }): string {
  const name = (person.name || '').trim();
  if (!name) return '#';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase('tr') ?? '')
    .join('');
}
