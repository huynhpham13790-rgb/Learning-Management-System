import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';

const SUGGESTIONS = ['Giải thích async/await bằng ví dụ', 'Khác nhau giữa let và const?', 'JOIN trong MySQL là gì?'];

export default function Tutor() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    api.get('/ai/chat').then(setMessages);
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const send = async (msg) => {
    const message = (msg ?? text).trim();
    if (!message || busy) return;
    setText('');
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', content: message }]);
    setBusy(true);
    try {
      const { reply } = await api.post('/ai/chat', { message });
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    if (!window.confirm('Xóa toàn bộ lịch sử trò chuyện?')) return;
    await api.del('/ai/chat');
    setMessages([]);
  };

  return (
    <div className="chat-page">
      <div className="row-between">
        <h1>🤖 Trợ lý học tập AI</h1>
        <button className="btn ghost" onClick={clear}>
          Xóa lịch sử
        </button>
      </div>
      <div className="card chat">
        {messages.length === 0 && (
          <div className="pad">
            <p className="muted">Hỏi bất cứ điều gì về bài học. Gợi ý:</p>
            <div className="tags">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn small" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="msg assistant muted">Đang suy nghĩ…</div>}
        <div ref={endRef} />
      </div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nhập câu hỏi…" />
        <button className="btn primary" disabled={busy}>
          Gửi
        </button>
      </form>
    </div>
  );
}
