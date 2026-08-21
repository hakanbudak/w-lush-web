import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setUnauthorizedHandler } from './client';

const TOKEN_KEY = 'wl_token';

function cevap(status: number, body: unknown) {
  return Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as Response);
}

let oturumBitti: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  oturumBitti = vi.fn();
  setUnauthorizedHandler(oturumBitti);
});

afterEach(() => vi.unstubAllGlobals());

describe('401 işleme', () => {
  it('sunucunun açıklamasını gösteriyor', async () => {
    vi.stubGlobal('fetch', () => cevap(401, { detail: 'E-posta veya şifre hatalı' }));

    await expect(request('/api/auth/login', { method: 'POST' })).rejects.toThrow(
      'E-posta veya şifre hatalı',
    );
  });

  it('giriş denemesinde oturumu sonlandırmıyor', async () => {
    // Jeton yoksa sonlanacak bir oturum da yok; kullanıcıyı /login'e atmak
    // ve "oturumunuz bitti" demek yanlış sorunu aratır.
    vi.stubGlobal('fetch', () => cevap(401, { detail: 'E-posta veya şifre hatalı' }));

    await expect(request('/api/auth/login', { method: 'POST' })).rejects.toThrow();
    expect(oturumBitti).not.toHaveBeenCalled();
  });

  it('jeton varken gerçekten oturumu sonlandırıyor', async () => {
    localStorage.setItem(TOKEN_KEY, 'eski-jeton');
    vi.stubGlobal('fetch', () => cevap(401, { detail: '' }));

    await expect(request('/api/customers')).rejects.toThrow(/Oturumunuz sonlandı/);
    expect(oturumBitti).toHaveBeenCalledOnce();
  });

  it('durum kodunu taşıyor', async () => {
    vi.stubGlobal('fetch', () => cevap(401, { detail: 'Yetkisiz' }));

    const hata = await request('/api/customers').catch((e) => e);
    expect(hata).toBeInstanceOf(ApiError);
    expect((hata as ApiError).status).toBe(401);
  });
});
