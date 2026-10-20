import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader, ProgressBar, Stat, fmtDate, useFetch } from '../components/ui.jsx';

function ActivityChart({ activity }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toLocaleDateString('sv-SE');
    const found = activity.find((a) => String(a.day).slice(0, 10) === key);
    return { key, label: d.toLocaleDateString('vi-VN', { weekday: 'short' }), value: found ? Number(found.lessons) : 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <div className="bars">
      {days.map((d) => (
        <div key={d.key} className="bar-col" title={`${d.value} bài học`}>
          <div className="bar" style={{ height: `${(d.value / max) * 100}%` }} />
          <small>{d.label}</small>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const state = useFetch(() => api.get('/stats/me'));

  return (
    <>
      <h1>Xin chào, {user.name} 👋</h1>
      <Loader state={state}>
        {(d) => (
          <>
            <div className="grid stats">
              <Stat label="Khóa học đang học" value={d.courses.length} />
              <Stat label="Chuỗi ngày học" value={`${d.streak} 🔥`} />
              <Stat label="Điểm TB trắc nghiệm" value={d.quiz.avg_score} hint={`${d.quiz.attempts} lần làm`} />
              <Stat label="Điểm TB bài tập" value={d.submissions.avg_score} hint={`${d.submissions.submitted} bài đã nộp`} />
            </div>
            <div className="grid two">
              <section className="card">
                <h2>Tiến độ khóa học</h2>
                {d.courses.length === 0 && (
                  <p className="muted">
                    Bạn chưa ghi danh khóa nào. <Link to="/courses">Khám phá khóa học</Link>
                  </p>
                )}
                {d.courses.map((c) => (
                  <Link key={c.id} to={`/courses/${c.id}`} className="row-link">
                    <div className="row-between">
                      <span>{c.title}</span>
                      <small className="muted">
                        {c.completed}/{c.lesson_count} bài
                      </small>
                    </div>
                    <ProgressBar value={c.progress} />
                  </Link>
                ))}
              </section>
              <section className="card">
                <h2>Hoạt động 7 ngày</h2>
                <ActivityChart activity={d.activity} />
                <h2 style={{ marginTop: 24 }}>Bài tập sắp đến hạn</h2>
                {d.upcoming.length === 0 && <p className="muted">Không có bài tập chưa nộp 🎉</p>}
                <ul className="list">
                  {d.upcoming.map((a) => (
                    <li key={a.id}>
                      <Link to={`/assignments/${a.id}`}>{a.title}</Link>
                      <small className="muted">
                        {a.course_title} · hạn {fmtDate(a.due_date)}
                      </small>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            <section className="card cta">
              <div>
                <h2>🧭 Chưa biết học gì tiếp theo?</h2>
                <p className="muted">AI phân tích tiến độ và mục tiêu để đề xuất lộ trình phù hợp với bạn.</p>
              </div>
              <Link to="/learning-path" className="btn primary">
                Gợi ý lộ trình
              </Link>
            </section>
          </>
        )}
      </Loader>
    </>
  );
}
