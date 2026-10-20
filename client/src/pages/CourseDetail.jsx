import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LEVELS, Loader, ProgressBar, STATUS, fmtDate, useFetch } from '../components/ui.jsx';

export default function CourseDetail() {
  const { id } = useParams();
  const { isStaff } = useAuth();
  const state = useFetch(() => api.get(`/courses/${id}`), [id]);

  const toggleEnroll = async (enrolled) => {
    if (enrolled) {
      if (!window.confirm('Hủy ghi danh khóa học này?')) return;
      await api.del(`/courses/${id}/enroll`);
    } else {
      await api.post(`/courses/${id}/enroll`);
    }
    state.reload();
  };

  return (
    <Loader state={state}>
      {(c) => {
        const canView = c.enrolled || isStaff;
        return (
          <>
            <section className="card hero">
              <div className="tags">
                <span className="badge">{c.category}</span>
                <span className="badge light">{LEVELS[c.level]}</span>
              </div>
              <h1>{c.title}</h1>
              <p>{c.description}</p>
              <p className="muted small">Giảng viên: {c.teacher_name || '—'}</p>
              {c.enrolled ? (
                <>
                  <ProgressBar value={c.progress} />
                  <div className="row-between">
                    <small>Đã hoàn thành {c.progress}%</small>
                    <button className="btn ghost small" onClick={() => toggleEnroll(true)}>
                      Hủy ghi danh
                    </button>
                  </div>
                </>
              ) : (
                <button className="btn primary" onClick={() => toggleEnroll(false)}>
                  Ghi danh khóa học
                </button>
              )}
            </section>

            <div className="grid two">
              <section className="card">
                <h2>Bài học ({c.lessons.length})</h2>
                <ol className="lesson-list">
                  {c.lessons.map((l) => (
                    <li key={l.id} className={l.completed ? 'done' : ''}>
                      <span className="check">{l.completed ? '✔' : l.position}</span>
                      {canView ? <Link to={`/lessons/${l.id}`}>{l.title}</Link> : <span>{l.title}</span>}
                      <small className="muted">{l.duration_min} phút</small>
                    </li>
                  ))}
                </ol>
                {!canView && <p className="muted small">Ghi danh để xem nội dung bài học.</p>}
              </section>
              <div>
                <section className="card">
                  <h2>Bài tập</h2>
                  {c.assignments.length === 0 && <p className="muted">Chưa có bài tập.</p>}
                  <ul className="list">
                    {c.assignments.map((a) => (
                      <li key={a.id}>
                        {canView ? <Link to={`/assignments/${a.id}`}>{a.title}</Link> : a.title}
                        <small className="muted">
                          Hạn: {fmtDate(a.due_date)} · {a.submission_status ? STATUS[a.submission_status] : 'Chưa nộp'}
                          {a.score != null && ` · ${a.score}/${a.max_score}`}
                        </small>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="card">
                  <h2>Bài kiểm tra trắc nghiệm</h2>
                  {c.quizzes.length === 0 && <p className="muted">Chưa có bài kiểm tra.</p>}
                  <ul className="list">
                    {c.quizzes.map((q) => (
                      <li key={q.id}>
                        {canView ? <Link to={`/quizzes/${q.id}`}>{q.title}</Link> : q.title}
                        <small className="muted">
                          {q.question_count} câu · cao nhất: {q.best_score ?? 'chưa làm'}
                        </small>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </>
        );
      }}
    </Loader>
  );
}
