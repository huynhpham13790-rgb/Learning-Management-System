import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { fmtDate } from '../components/ui.jsx';

export default function LearningPath() {
  const { user } = useAuth();
  const [goal, setGoal] = useState(user.goals || '');
  const [path, setPath] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/ai/learning-path/latest').then(setPath).catch(() => {});
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      setPath({ ...(await api.post('/ai/learning-path', { goal })), created_at: new Date().toISOString() });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const plan = path?.plan;
  return (
    <>
      <h1>🧭 Gợi ý lộ trình học bằng AI</h1>
      <form className="card" onSubmit={generate}>
        <label>
          Mục tiêu học tập của bạn
          <input
            required
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="VD: Trở thành lập trình viên Frontend React trong 3 tháng"
          />
        </label>
        {error && <div className="alert error">{error}</div>}
        <button className="btn primary" disabled={busy}>
          {busy ? 'AI đang phân tích…' : 'Tạo lộ trình'}
        </button>
      </form>

      {plan && (
        <section className="card">
          <div className="row-between">
            <h2>{plan.summary}</h2>
            <small className="muted">
              {plan.provider} · {fmtDate(path.created_at)}
            </small>
          </div>
          <ol className="timeline">
            {(plan.steps || []).map((s) => (
              <li key={s.order}>
                <div className="timeline-dot">{s.order}</div>
                <div>
                  <b>{s.courseId ? <Link to={`/courses/${s.courseId}`}>{s.title}</Link> : s.title}</b>
                  <span className="badge light">{s.weeks} tuần</span>
                  <p className="muted">{s.reason}</p>
                </div>
              </li>
            ))}
          </ol>
          {plan.tips?.length > 0 && (
            <>
              <h3>Lời khuyên</h3>
              <ul>
                {plan.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </>
  );
}
