import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { AiFeedback, Loader, PlagiarismBadge, STATUS, fmtDate, fmtScore, useFetch } from '../components/ui.jsx';

export default function AssignmentDetail() {
  const { id } = useParams();
  const state = useFetch(() => api.get(`/assignments/${id}`), [id]);
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (state.data?.submission) setContent(state.data.submission.content);
  }, [state.data]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const submission = await api.post(`/assignments/${id}/submit`, { content });
      state.setData((a) => ({ ...a, submission }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Loader state={state}>
      {(a) => {
        const s = a.submission;
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const locked = s?.status === 'graded' || (a.due_date && new Date(a.due_date.replace(' ', 'T')) < new Date());
        return (
          <>
            <p className="small">
              <Link to={`/courses/${a.course_id}`}>← {a.course_title}</Link>
            </p>
            <section className="card">
              <h1>{a.title}</h1>
              <p className="muted small">
                Hạn nộp: {fmtDate(a.due_date)} · Thang điểm: {a.max_score}
              </p>
              <p>{a.description}</p>
              {a.rubric && (
                <div className="rubric">
                  <b>Tiêu chí chấm:</b> {a.rubric}
                </div>
              )}
            </section>

            {s && (
              <section className="card">
                <h2>Kết quả</h2>
                <p>
                  Trạng thái: <span className="badge">{STATUS[s.status]}</span> · Nộp lúc {fmtDate(s.submitted_at)} · Độ trùng lặp:{' '}
                  <PlagiarismBadge score={s.plagiarism_score} />
                </p>
                {s.status === 'graded' && (
                  <div className="alert ok">
                    Điểm chính thức: <b>{fmtScore(s.score)}</b>/{a.max_score}
                    {s.teacher_feedback && <p>Nhận xét của giảng viên: {s.teacher_feedback}</p>}
                  </div>
                )}
                <AiFeedback feedback={s.ai_feedback} score={s.ai_score} max={a.max_score} />
              </section>
            )}

            <form className="card" onSubmit={submit}>
              <h2>{s ? 'Bài làm của bạn' : 'Nộp bài'}</h2>
              {error && <div className="alert error">{error}</div>}
              <textarea
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập bài làm…"
                disabled={locked}
                required
              />
              <div className="row-between">
                <small className="muted">{words} từ</small>
                {!locked && (
                  <button className="btn primary" disabled={busy}>
                    {busy ? 'AI đang chấm…' : s ? 'Nộp lại' : 'Nộp bài'}
                  </button>
                )}
              </div>
            </form>
          </>
        );
      }}
    </Loader>
  );
}
