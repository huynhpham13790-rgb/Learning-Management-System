import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Loader, useFetch } from '../components/ui.jsx';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user } = useAuth();
  const state = useFetch(() => api.get('/stats/leaderboard'));
  return (
    <>
      <h1>🏆 Bảng xếp hạng</h1>
      <p className="muted">Điểm = 10 × bài học hoàn thành + điểm cao nhất mỗi bài trắc nghiệm + điểm bài tập.</p>
      <Loader state={state}>
        {(rows) => (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Học viên</th>
                  <th>Bài học</th>
                  <th>Trắc nghiệm</th>
                  <th>Bài tập</th>
                  <th>Tổng điểm</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={r.id === user.id ? 'highlight' : ''}>
                    <td>{MEDALS[i] || i + 1}</td>
                    <td>{r.name}</td>
                    <td>{r.lessons}</td>
                    <td>{Math.round(Number(r.quiz_points) * 10) / 10}</td>
                    <td>{Math.round(Number(r.assignment_points) * 10) / 10}</td>
                    <td>
                      <b>{r.points}</b>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
    </>
  );
}
