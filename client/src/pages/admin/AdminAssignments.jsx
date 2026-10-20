import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { Loader, Modal, fmtDate, useFetch } from '../../components/ui.jsx';

const EMPTY = { course_id: '', title: '', description: '', rubric: '', max_score: 10, due_date: '' };
const toInputDate = (v) => (v ? String(v).replace(' ', 'T').slice(0, 16) : '');

export default function AdminAssignments() {
  const state = useFetch(() => api.get('/assignments'));
  const courses = useFetch(() => api.get('/courses'));
  const [editing, setEditing] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    const body = { ...editing, due_date: editing.due_date ? editing.due_date.replace('T', ' ') + ':00' : null };
    if (editing.id) await api.put(`/assignments/${editing.id}`, body);
    else await api.post('/assignments', body);
    setEditing(null);
    state.reload();
  };
  const remove = async (a) => {
    if (!window.confirm(`Xóa bài tập "${a.title}" và toàn bộ bài nộp?`)) return;
    await api.del(`/assignments/${a.id}`);
    state.reload();
  };
  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.value });

  return (
    <>
      <div className="row-between">
        <h1>📝 Bài tập & chấm điểm</h1>
        <button className="btn primary" onClick={() => setEditing(EMPTY)}>+ Tạo bài tập</button>
      </div>
      <Loader state={state}>
        {(rows) => (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bài tập</th>
                  <th>Khóa học</th>
                  <th>Hạn nộp</th>
                  <th>Bài nộp</th>
                  <th>Chờ duyệt</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td><Link to={`/admin/assignments/${a.id}`}>{a.title}</Link></td>
                    <td>{a.course_title}</td>
                    <td>{fmtDate(a.due_date)}</td>
                    <td>{a.submission_count}</td>
                    <td>{a.pending_count > 0 ? <span className="badge warn">{a.pending_count}</span> : 0}</td>
                    <td className="actions">
                      <Link className="btn small primary" to={`/admin/assignments/${a.id}`}>Chấm bài</Link>
                      <button className="btn small" onClick={() => setEditing({ ...a, due_date: toInputDate(a.due_date) })}>Sửa</button>
                      <button className="btn small danger" onClick={() => remove(a)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
      {editing && (
        <Modal title={editing.id ? 'Sửa bài tập' : 'Tạo bài tập'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            {!editing.id && (
              <label>
                Khóa học
                <select required value={editing.course_id} onChange={set('course_id')}>
                  <option value="">-- Chọn khóa học --</option>
                  {(courses.data || []).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </label>
            )}
            <label>Tiêu đề<input required value={editing.title} onChange={set('title')} /></label>
            <label>Mô tả / đề bài<textarea rows={4} value={editing.description || ''} onChange={set('description')} /></label>
            <label>
              Tiêu chí chấm (AI dựa vào đây để chấm)
              <textarea rows={3} value={editing.rubric || ''} onChange={set('rubric')} />
            </label>
            <div className="grid two">
              <label>Thang điểm<input type="number" min={1} value={editing.max_score} onChange={set('max_score')} /></label>
              <label>Hạn nộp<input type="datetime-local" value={editing.due_date} onChange={set('due_date')} /></label>
            </div>
            <button className="btn primary">Lưu</button>
          </form>
        </Modal>
      )}
    </>
  );
}
