import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Loader, STATUS, fmtDate, fmtScore, useFetch } from '../components/ui.jsx';

export default function Assignments() {
  const state = useFetch(() => api.get('/assignments/my'));
  return (
    <>
      <h1>Bài tập của tôi</h1>
      <Loader state={state}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="muted">Chưa có bài tập nào trong các khóa bạn đã ghi danh.</p>
          ) : (
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bài tập</th>
                    <th>Khóa học</th>
                    <th>Hạn nộp</th>
                    <th>Trạng thái</th>
                    <th>Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const overdue = !a.status && a.due_date && new Date(a.due_date.replace(' ', 'T')) < new Date();
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link to={`/assignments/${a.id}`}>{a.title}</Link>
                        </td>
                        <td>{a.course_title}</td>
                        <td>{fmtDate(a.due_date)}</td>
                        <td>
                          {a.status ? (
                            <span className={`badge ${a.status === 'graded' ? 'ok' : ''}`}>{STATUS[a.status]}</span>
                          ) : (
                            <span className={`badge ${overdue ? 'danger' : 'light'}`}>{overdue ? 'Quá hạn' : 'Chưa nộp'}</span>
                          )}
                        </td>
                        <td>{a.score != null ? `${fmtScore(a.score)}/${a.max_score}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </Loader>
    </>
  );
}
