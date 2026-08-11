import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSetTopBarActions } from '../components/shell/TopBarActions';
import { useWhatsAppStatus } from '../hooks/useWhatsAppStatus';
import {
  getThread,
  listConversations,
  releaseToBot,
  sendReply,
  takeOver,
  type ChatMessage,
  type Conversation,
} from '../api/conversations';
import { Icon } from '../components/icons';
import { clockTime, relativeTime } from '../utils/time';

/** Liste ve açık thread bu aralıkla tazelenir (sekme görünürken). */
const POLL_MS = 60_000;

const displayName = (c: Conversation): string => c.customer_name || c.phone;

/**
 * Tasarımın "handoff"u bizimkinin TERSİ: orada true = asistan yürütüyor,
 * bizde true = bot susturulmuş, operatör devralmış. Ekranda "asistan modu"
 * dediğimiz durum bu yüzden `!handoff`.
 */
const assistantRunning = (c: { handoff: boolean }): boolean => !c.handoff;

export default function Mesajlar() {
  const [items, setItems] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  // Seçili konuşmanın kendisi (yalnızca telefonu değil) tutulur: liste
  // yenilendiğinde (100 satır sınırı veya geçici hata) bu satır artık
  // dönmese bile Thread unmount olup taslak kaybolmasın.
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [query, setQuery] = useState('');
  const [params] = useSearchParams();
  // Takvimdeki "Mesaj gönder" buraya yönlendiriyor; parametredeki konuşmayı aç.
  const wantedPhone = params.get('phone');
  // Aynı anda yalnızca en son isteğin sonucu items'ı güncelleyebilir.
  const requestIdRef = useRef(0);

  const loadList = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setListError(null);
    listConversations()
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setItems(data);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setListError('Konuşmalar yüklenemedi.');
      });
  }, []);

  useEffect(() => {
    loadList();
    const tick = () => {
      if (document.visibilityState === 'visible') loadList();
    };
    const timer = window.setInterval(tick, POLL_MS);
    window.addEventListener('focus', loadList);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', loadList);
    };
  }, [loadList]);

  // Taze liste geldiğinde seçili konuşmanın güncel kopyasını tercih et;
  // listede artık yoksa (100 satır sınırı, geçici hata) elde tutulanı koru.
  useEffect(() => {
    if (!items || !selectedConversation) return;
    const fresh = items.find((c) => c.phone === selectedConversation.phone);
    if (fresh && fresh !== selectedConversation) setSelectedConversation(fresh);
  }, [items, selectedConversation]);

  // URL'den gelen telefon, liste geldiğinde bir kez seçilir.
  useEffect(() => {
    if (!wantedPhone || !items) return;
    const found = items.find((c) => c.phone === wantedPhone);
    if (found) setSelectedConversation((cur) => cur ?? found);
  }, [wantedPhone, items]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    if (!q || !items) return items;
    return items.filter(
      (c) =>
        c.customer_name.toLocaleLowerCase('tr-TR').includes(q) || c.phone.includes(q),
    );
  }, [items, query]);

  const wa = useWhatsAppStatus();
  useSetTopBarActions(
    <span
      style={{
        display: 'flex', alignItems: 'center', gap: 7, fontSize: 12,
        padding: '5px 12px', borderRadius: 999,
        background: wa.connected ? 'var(--wa-chip)' : 'var(--neutral-soft)',
        color: wa.connected ? 'var(--wa-chip-ink)' : 'var(--ink-60)',
      }}
    >
      <span
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: wa.connected ? 'var(--wa-green)' : 'var(--ink-40)',
        }}
      />
      WhatsApp · {wa.label}
    </span>,
    [wa.connected, wa.label],
  );

  const current = selectedConversation;

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div
        style={{
          width: 312,
          flexShrink: 0,
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--wa-green)', display: 'flex' }}>{Icon.whatsapp}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Konuşmalar</span>
          </div>
          <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={loadList}>
            Yenile
          </button>
        </div>

        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Konuşmalarda ara"
            aria-label="Konuşmalarda ara"
            style={{
              width: '100%', height: 34, padding: '0 10px',
              border: '1px solid var(--line-strong)', borderRadius: 8,
              background: 'var(--cream)', font: 'inherit', fontSize: 12.5,
              color: 'var(--ink)', outline: 'none',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto' }}>
          {listError && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-60)' }}>
              {listError}{' '}
              <button
                type="button"
                onClick={loadList}
                style={{
                  border: 'none', background: 'transparent', padding: 0,
                  fontFamily: 'inherit', fontSize: 12, color: 'var(--forest)',
                  cursor: 'pointer', textDecoration: 'underline',
                }}
              >
                Tekrar dene
              </button>
            </div>
          )}
          {!listError && items === null && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
          )}
          {!listError && visible?.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.5 }}>
              Henüz konuşma yok — WhatsApp’tan mesaj geldiğinde burada görünür.
            </div>
          )}
          {visible?.map((c) => (
            <button
              key={c.phone}
              type="button"
              onClick={() => setSelectedConversation(c)}
              aria-label={c.waiting ? `${displayName(c)}, cevap bekliyor` : displayName(c)}
              aria-current={c.phone === selectedConversation?.phone}
              style={{
                display: 'flex', gap: 8, width: '100%', textAlign: 'left',
                padding: '10px 14px', border: 'none',
                borderBottom: '1px solid var(--line)',
                borderLeft:
                  c.phone === selectedConversation?.phone
                    ? '3px solid var(--forest)'
                    : '3px solid transparent',
                background:
                  c.phone === selectedConversation?.phone ? 'var(--cream)' : 'transparent',
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {/* ✦ = asistan bu konuşmayı yürütüyor (bizim handoff'un tersi). */}
              <span
                style={{
                  width: 12, marginTop: 2, flexShrink: 0, fontSize: 11,
                  color: assistantRunning(c) ? 'var(--ai)' : 'transparent',
                }}
              >
                ✦
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {displayName(c)}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {c.waiting && (
                      <span
                        style={{
                          fontSize: 9, fontWeight: 600, padding: '1px 6px',
                          borderRadius: 999, background: 'var(--warn-soft)',
                          color: 'var(--warn)',
                        }}
                      >
                        Bekliyor
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: 'var(--ink-40)', whiteSpace: 'nowrap' }}>
                      {relativeTime(c.last_at)}
                    </span>
                  </span>
                </span>
                <span
                  style={{
                    display: 'block', fontSize: 12, color: 'var(--ink-60)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {c.last_direction === 'out' ? 'Siz: ' : ''}
                  {c.last_message}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {current ? (
        <Thread key={current.phone} conversation={current} onChanged={loadList} />
      ) : (
        <div
          style={{
            flex: 1, background: 'var(--paper)', border: '1px solid var(--line)',
            borderRadius: 12, display: 'grid', placeItems: 'center',
            fontSize: 13, color: 'var(--ink-40)',
          }}
        >
          Soldan bir konuşma seç.
        </div>
      )}
    </div>
  );
}

function Thread({
  conversation,
  onChanged,
}: {
  conversation: Conversation;
  onChanged: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  // "Bota geri ver" hatası composer'ın hata slotundan ayrı tutulur; başlıktaki
  // düğmenin hemen altında gösterilir ki hata, onu tetikleyen düğmeye yakın kalsın.
  const [headerError, setHeaderError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef<number | null>(null);
  // Yalnız en son isteğin sonucu messages'ı güncelleyebilir; hızlı "Yenile"
  // tıklamaları veya yavaş ağda eski bir yanıt yeniyi ezmesin.
  const requestIdRef = useRef(0);
  const { phone } = conversation;

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setError(null);
    getThread(phone)
      .then((data) => {
        if (requestIdRef.current !== requestId) return;
        setMessages(data);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setError('Mesajlar yüklenemedi.');
      });
  }, [phone]);

  useEffect(() => {
    load();
    const tick = () => {
      if (document.visibilityState === 'visible') load();
    };
    const timer = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (messages === null) return;
    const prevCount = prevCountRef.current;
    // Sadece konuşma büyüdüyse (veya ilk yüklemede) en alta kaydır;
    // içerik değişmeyen bir arka plan poll'u kullanıcıyı geçmişten koparmasın.
    if (prevCount === null || messages.length > prevCount) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  function submit() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    sendReply(phone, text)
      .then((sent) => {
        // Poll beklemeden göster; taslak yalnız başarıda temizlenir.
        setMessages((prev) => [...(prev ?? []), sent]);
        setDraft('');
        onChanged();
      })
      .catch(() => setSendError('Mesaj gönderilemedi. Metniniz kutuda duruyor.'))
      .finally(() => setSending(false));
  }

  function take() {
    setSwitching(true);
    setHeaderError(null);
    takeOver(phone)
      .then(() => onChanged())
      .catch(() => setHeaderError('Devralınamadı.'))
      .finally(() => setSwitching(false));
  }

  function release() {
    setHeaderError(null);
    releaseToBot(phone)
      .then(() => {
        load();
        onChanged();
      })
      .catch(() => setHeaderError('Bota geri verilemedi.'));
  }

  return (
    <div
      style={{
        flex: 1, minWidth: 0, background: 'var(--paper)',
        border: '1px solid var(--line)', borderRadius: 12,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '14px 20px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{displayName(conversation)}</div>
          {/* Kasıtlı olarak maskelenmemiş: operatör müşteriyi telefonla arayabilmek
              için numarayı burada birebir okuyabilmeli (bkz. RandevuTakvimi'ndeki maskPhone). */}
          <div className="wl-mono" style={{ fontSize: 11, color: 'var(--ink-40)' }}>
            {conversation.phone}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ borderRadius: 8 }}
              onClick={() => navigate(`/danisan/${encodeURIComponent(conversation.phone)}`)}
            >
              Profili aç
            </button>
            <button
              className="wl-btn wl-btn-ghost wl-btn-sm"
              style={{ borderRadius: 8 }}
              onClick={() => navigate('/randevu')}
            >
              Randevu ver
            </button>
            <button className="wl-btn wl-btn-ghost wl-btn-sm" style={{ borderRadius: 8 }} onClick={load}>
              Yenile
            </button>
          </div>
          {headerError && (
            <div style={{ fontSize: 11, color: 'var(--bad)' }}>{headerError}</div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: 'var(--cream-2)' }}>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--ink-60)' }}>
            {error}{' '}
            <button
              type="button"
              onClick={load}
              style={{
                border: 'none', background: 'transparent', padding: 0,
                fontFamily: 'inherit', fontSize: 12, color: 'var(--forest)',
                cursor: 'pointer', textDecoration: 'underline',
              }}
            >
              Tekrar dene
            </button>
          </div>
        )}
        {!error && messages === null && (
          <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Yükleniyor…</div>
        )}
        {messages?.map((m) => (
          <div
            key={m.id}
            style={{
              display: 'flex',
              justifyContent: m.direction === 'out' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <div style={{ maxWidth: '70%' }}>
              {m.source === 'bot' && (
                <div
                  className="wl-label"
                  style={{ color: 'var(--ai)', fontSize: 9, marginBottom: 3, textAlign: 'right' }}
                >
                  ✦ Asistan
                </div>
              )}
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius:
                    m.direction === 'out' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: m.direction === 'out' ? 'var(--forest-3)' : 'var(--paper)',
                  fontSize: 13,
                  color: 'var(--ink)',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {m.body}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--ink-40)',
                  marginTop: 2,
                  textAlign: m.direction === 'out' ? 'right' : 'left',
                }}
              >
                {clockTime(m.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Tasarımın iki modu: asistan yürütüyorken yalnızca "Devral", operatör
          devraldıysa yazma alanı. Bizim handoff alanı tasarımın tersi. */}
      {assistantRunning(conversation) ? (
        <div
          style={{
            borderTop: '1px solid var(--line)', padding: '14px 16px',
            background: 'var(--ai-band)', display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--ai-dark)' }}>
            ✦ Asistan bu konuşmayı yürütüyor
          </span>
          {headerError && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{headerError}</span>}
          <button
            type="button"
            className="wl-btn wl-btn-sm"
            style={{ borderRadius: 8, height: 32 }}
            onClick={take}
            disabled={switching}
          >
            {switching ? '…' : 'Devral'}
          </button>
        </div>
      ) : (
      <div style={{ borderTop: '1px solid var(--line)', padding: 12 }}>
        {sendError && (
          <div style={{ fontSize: 12, color: 'var(--bad)', marginBottom: 8 }}>{sendError}</div>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            aria-label="Cevap metni"
            placeholder="Cevabınızı yazın…"
            rows={2}
            style={{
              flex: 1, resize: 'vertical', minHeight: 44, padding: '10px 12px',
              border: '1px solid var(--line-strong)', borderRadius: 8,
              background: 'var(--cream)', fontFamily: 'inherit', fontSize: 13,
              color: 'var(--ink)', outline: 'none',
            }}
          />
          <button
            className="wl-btn wl-btn-sm"
            style={{ background: 'var(--forest)', color: 'var(--cream)', borderRadius: 8, height: 36 }}
            onClick={submit}
            disabled={sending || !draft.trim()}
          >
            {sending ? '…' : 'Gönder'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          {headerError && <span style={{ fontSize: 11, color: 'var(--bad)' }}>{headerError}</span>}
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="wl-btn wl-btn-ghost wl-btn-sm"
            style={{ borderRadius: 8, fontSize: 12, color: 'var(--ai)' }}
            onClick={release}
            disabled={switching}
          >
            ✦ Asistana ver
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
