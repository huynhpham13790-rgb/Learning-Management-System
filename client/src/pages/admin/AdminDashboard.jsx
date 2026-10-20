import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { Loader, PlagiarismBadge, STATUS, Stat, fmtDate, useFetch } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const state = useFetch(() => api.get('/stats/admin'));
  return (
    <>
      <h1>📊 Thống kê hệ thống</h1>
      <Loader state={state}>
        {({ counts, topCourses, scoreDist, recent }) => {
          const buckets = Array.from({ length: 11 }, (_, i) => Number(scoreDist.find((s) => Number(s.bucket) === i)?.total || 0));
          const max = Math.max(1, ...buckets);
          return (
            <>
              <div className="grid stats">
                <Stat label="Sinh viên" value={counts.students} hint={`${counts.teachers} giảng viên`} />
                <Stat label="Khóa học" value={counts.courses} hint={`${counts.lessons} bài học`} />
                <Stat label="Lượt ghi danh" value={counts.enrollments} />
                <Stat label="Bài nộp chờ duyệt" value={counts.pending_grading} hint={`${counts.submissions} bài nộp`} />
                <Stat label="Nghi vấn đạo văn" value={counts.plagiarism_flags} />
              </div>
              <div className="grid two">
                <section className="card">
                  <h2>Khóa học nhiều học viên nhất</h2>
                  <ul className="list">
                    {topCourses.map((c) => (
                      <li key={c.id} className="row-between">
                        <span>{c.title}</span>
                        <b>{c.students}</b>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="card">
                  <h2>Phổ điểm bài tập (thang 10)</h2>
                  <div className="bars">
                    {buckets.map((v, i) => (
                      <div key={i} className="bar-col" title={`${v} bài`}>
                        <div className="bar" style={{ height: `${(v / max) * 100}%` }} />
                        <small>{i}</small>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <section className="card table-wrap">
                <h2>Bài nộp gần đây</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Sinh viên</th>
                      <th>Bài tập</th>
                      <th>Thời gian</th>
                      <th>Trạng thái</th>
                      <th>Trùng lặp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id}>
                        <td>{r.student_name}</td>
                        <td>
                          <Link to={`/admin/assignments/${r.assignment_id}`}>{r.assignment_title}</Link>
                        </td>
                        <td>{fmtDate(r.submitted_at)}</td>
                        <td>{STATUS[r.status]}</td>
                        <td>
                          <PlagiarismBadge score={r.plagiarism_score} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          );
        }}
      </Loader>
    </>
  );
}
