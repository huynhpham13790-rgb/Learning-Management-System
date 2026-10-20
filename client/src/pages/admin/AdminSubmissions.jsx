import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { AiFeedback, Loader, Modal, PlagiarismBadge, STATUS, fmtDate, fmtScore, useFetch } from '../../components/ui.jsx';

export default function AdminSubmissions() {
  const { id } = useParams();
  const assignment = useFetch(() => api.get(`/assignments/${id}`), [id]);
  const state = useFetch(() => api.get(`/assignments/${id}/submissions`), [id]);
  const [open, setOpen] = useState(null);
  const [grade, setGrade] = useState({ score: '', teacher_feedback: '' });
  const [busy, setBusy] = useState('');

  const show = (s) => {
    setOpen(s);
    setGrade({ score: Number(s.score ?? s.ai_score ?? 0), teacher_feedback: s.teacher_feedback || '' });
  };
  const replace = (s) => {
    state.setData((list) => list.map((x) => (x.id === s.id ? { ...x, ...s } : x)));
    setOpen((o) => (o ? { ...o, ...s } : o));
  };

  const scan = async () => {
    setBusy('scan');
    await api.post(`/assignments/${id}/plagiarism-scan`);
    state.reload();
    setBusy('');
  };
  const aiGrade = async () => {
    setBusy('ai');
    const s = await api.post(`/assignments/submissions/${open.id}/ai-grade`);
    replace(s);
    if (s.status !== 'graded') setGrade((g) => ({ ...g, score: Number(s.ai_score) }));
    setBusy('');
  };
  const saveGrade = async (e) => {
    e.preventDefault();
    try {
      replace(await api.put(`/assignments/submissions/${open.id}/grade`, grade));
      setOpen(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const max = assignment.data?.max_score;
  const nameOf = (sid) => state.data?.find((s) => s.id === sid)?.student_name || `#${sid}`;

  return (
    <>
      <p className="small"><Link to="/admin/assignments">← Danh sách bài tập</Link></p>
      <div className="row-between">
        <h1>{assignment.data?.title || 'Bài nộp'}</h1>
        <button className="btn" onClick={scan} disabled={busy === 'scan'}>
          {busy === 'scan' ? 'Đang quét…' : '🔍 Quét đạo văn'}
        </button>
      </div>
      <Loader state={state}>
        {(subs) =>
          subs.length === 0 ? (
            <p className="muted">Chưa có bài nộp.</p>
          ) : (
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Nộp lúc</th>
                    <th>Điểm AI</th>
                    <th>Điểm chính thức</th>
                    <th>Trùng lặp</th>
                    <th>Trạng thái</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id}>
                      <td>{s.student_name}<br /><small className="muted">{s.student_email}</small></td>
                      <td>{fmtDate(s.submitted_at)}</td>
                      <td>{fmtScore(s.ai_score)}</td>
                      <td>{s.status === 'graded' ? <b>{fmtScore(s.score)}</b> : '—'}</td>
                      <td>
                        <PlagiarismBadge score={s.plagiarism_score} />
                        {s.plagiarism_source_id && Number(s.plagiarism_score) >= 20 && (
                          <small className="muted"> ↔ {nameOf(s.plagiarism_source_id)}</small>
                        )}
                      </td>
                      <td>{STATUS[s.status]}</td>
                      <td><button className="btn small primary" onClick={() => show(s)}>Xem & chấm</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </Loader>
      {open && (
        <Modal title={`Bài của ${open.student_name}`} onClose={() => setOpen(null)}>
          <div className="submission-text">{open.content}</div>
          <p>
            Độ trùng lặp: <PlagiarismBadge score={open.plagiarism_score} />
            {open.plagiarism_source_id && <> với bài của <b>{nameOf(open.plagiarism_source_id)}</b></>}
          </p>
          <AiFeedback feedback={open.ai_feedback} score={open.ai_score} max={max} />
          <button className="btn" onClick={aiGrade} disabled={busy === 'ai'}>
            {busy === 'ai' ? 'AI đang chấm…' : '🤖 Chấm lại bằng AI'}
          </button>
          <form onSubmit={saveGrade} className="grade-form">
            <label>
              Điểm chính thức (0 - {max})
              <input type="number" step="0.1" min={0} max={max} required value={grade.score} onChange={(e) => setGrade({ ...grade, score: e.target.value })} />
            </label>
            <label>
              Nhận xét của giảng viên
              <textarea rows={3} value={grade.teacher_feedback} onChange={(e) => setGrade({ ...grade, teacher_feedback: e.target.value })} />
            </label>
            <button className="btn primary">Xác nhận điểm</button>
          </form>
        </Modal>
      )}
    </>
  );
}
