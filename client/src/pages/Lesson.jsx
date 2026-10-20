import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader, ROLES, fmtDate, useFetch } from '../components/ui.jsx';

function toEmbed(url) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function Comments({ lessonId }) {
  const { user } = useAuth();
  const state = useFetch(() => api.get(`/lessons/${lessonId}/comments`), [lessonId]);
  const [text, setText] = useState('');

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const c = await api.post(`/lessons/${lessonId}/comments`, { content: text });
    state.setData((list) => [...list, c]);
    setText('');
  };
  const remove = async (id) => {
    await api.del(`/lessons/comments/${id}`);
    state.setData((list) => list.filter((c) => c.id !== id));
  };

  return (
    <section className="card">
      <h2>💬 Thảo luận</h2>
      <Loader state={state}>
        {(list) => (
          <div className="comments">
            {list.length === 0 && <p className="muted">Chưa có bình luận. Hãy đặt câu hỏi đầu tiên!</p>}
            {list.map((c) => (
              <div key={c.id} className="comment">
                <span className="avatar">{c.user_name[0]}</span>
                <div>
                  <b>{c.user_name}</b>{' '}
                  {c.user_role !== 'student' && <span className="badge">{ROLES[c.user_role]}</span>}{' '}
                  <small className="muted">{fmtDate(c.created_at)}</small>
                  <p>{c.content}</p>
                </div>
                {(c.user_id === user.id || user.role !== 'student') && (
                  <button className="link small" onClick={() => remove(c.id)}>
                    Xóa
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Loader>
      <form className="toolbar" onSubmit={send}>
        <input placeholder="Viết bình luận…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn primary">Gửi</button>
      </form>
    </section>
  );
}

export default function Lesson() {
  const { id } = useParams();
  const state = useFetch(() => api.get(`/lessons/${id}`), [id]);

  const toggle = async (completed) => {
    if (completed) await api.del(`/lessons/${id}/complete`);
    else await api.post(`/lessons/${id}/complete`);
    state.setData((l) => ({ ...l, completed: !completed }));
  };

  return (
    <Loader state={state}>
      {(l) => (
        <>
          <p className="small">
            <Link to={`/courses/${l.course.id}`}>← {l.course.title}</Link>
          </p>
          <article className="card lesson">
            <h1>{l.title}</h1>
            {toEmbed(l.video_url) && (
              <div className="video">
                <iframe src={toEmbed(l.video_url)} title={l.title} allowFullScreen />
              </div>
            )}
            <div className="lesson-content">
              {(l.content || '').split('\n').map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="row-between">
              {l.prev ? <Link to={`/lessons/${l.prev.id}`}>← {l.prev.title}</Link> : <span />}
              <button className={`btn ${l.completed ? '' : 'primary'}`} onClick={() => toggle(l.completed)}>
                {l.completed ? '✔ Đã hoàn thành' : 'Đánh dấu hoàn thành'}
              </button>
              {l.next ? <Link to={`/lessons/${l.next.id}`}>{l.next.title} →</Link> : <span />}
            </div>
          </article>
          <Comments lessonId={l.id} />
        </>
      )}
    </Loader>
  );
}
