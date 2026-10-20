import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import { LEVELS, Loader, Modal, useFetch } from '../../components/ui.jsx';

const EMPTY_COURSE = { title: '', description: '', category: '', level: 'beginner', published: 1 };
const EMPTY_LESSON = { title: '', content: '', video_url: '', duration_min: 10 };

function LessonManager({ course, onClose }) {
  const state = useFetch(() => api.get(`/courses/${course.id}`), [course.id]);
  const [editing, setEditing] = useState(null);

  const edit = async (l) => setEditing(await api.get(`/lessons/${l.id}`));
  const save = async (e) => {
    e.preventDefault();
    if (editing.id) await api.put(`/lessons/${editing.id}`, editing);
    else await api.post(`/courses/${course.id}/lessons`, editing);
    setEditing(null);
    state.reload();
  };
  const remove = async (l) => {
    if (!window.confirm(`Xóa bài "${l.title}"?`)) return;
    await api.del(`/lessons/${l.id}`);
    state.reload();
  };
  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.value });

  return (
    <Modal title={`Bài học — ${course.title}`} onClose={onClose}>
      {editing ? (
        <form onSubmit={save}>
          <label>Tiêu đề<input required value={editing.title} onChange={set('title')} /></label>
          <label>Nội dung<textarea rows={8} value={editing.content || ''} onChange={set('content')} /></label>
          <label>Link video YouTube<input value={editing.video_url || ''} onChange={set('video_url')} /></label>
          <div className="grid two">
            <label>Thứ tự<input type="number" value={editing.position ?? ''} onChange={set('position')} /></label>
            <label>Thời lượng (phút)<input type="number" value={editing.duration_min} onChange={set('duration_min')} /></label>
          </div>
          <div className="row-between">
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>Quay lại</button>
            <button className="btn primary">Lưu bài học</button>
          </div>
        </form>
      ) : (
        <Loader state={state}>
          {(c) => (
            <>
              <ol className="lesson-list">
                {c.lessons.map((l) => (
                  <li key={l.id}>
                    <span className="check">{l.position}</span>
                    <span>{l.title}</span>
                    <span className="actions">
                      <button className="btn small" onClick={() => edit(l)}>Sửa</button>
                      <button className="btn small danger" onClick={() => remove(l)}>Xóa</button>
                    </span>
                  </li>
                ))}
              </ol>
              <button className="btn primary" onClick={() => setEditing(EMPTY_LESSON)}>+ Thêm bài học</button>
            </>
          )}
        </Loader>
      )}
    </Modal>
  );
}

export default function AdminCourses() {
  const state = useFetch(() => api.get('/courses'));
  const [editing, setEditing] = useState(null);
  const [lessonsOf, setLessonsOf] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    if (editing.id) await api.put(`/courses/${editing.id}`, editing);
    else await api.post('/courses', editing);
    setEditing(null);
    state.reload();
  };
  const remove = async (c) => {
    if (!window.confirm(`Xóa khóa học "${c.title}" cùng toàn bộ bài học, bài tập?`)) return;
    await api.del(`/courses/${c.id}`);
    state.reload();
  };
  const set = (k) => (e) =>
    setEditing({ ...editing, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value });

  return (
    <>
      <div className="row-between">
        <h1>📚 Khóa học & bài giảng</h1>
        <button className="btn primary" onClick={() => setEditing(EMPTY_COURSE)}>+ Tạo khóa học</button>
      </div>
      <Loader state={state}>
        {(courses) => (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Khóa học</th>
                  <th>Chủ đề</th>
                  <th>Cấp độ</th>
                  <th>Bài học</th>
                  <th>Học viên</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td><Link to={`/courses/${c.id}`}>{c.title}</Link></td>
                    <td>{c.category}</td>
                    <td>{LEVELS[c.level]}</td>
                    <td>{c.lesson_count}</td>
                    <td>{c.student_count}</td>
                    <td>{c.published ? <span className="badge ok">Công khai</span> : <span className="badge warn">Nháp</span>}</td>
                    <td className="actions">
                      <button className="btn small" onClick={() => setLessonsOf(c)}>Bài học</button>
                      <button className="btn small" onClick={() => api.download(`/stats/admin/export/${c.id}`, `bang-diem-${c.id}.csv`)}>CSV</button>
                      <button className="btn small" onClick={() => setEditing(c)}>Sửa</button>
                      <button className="btn small danger" onClick={() => remove(c)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
      {editing && (
        <Modal title={editing.id ? 'Sửa khóa học' : 'Tạo khóa học'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <label>Tên khóa học<input required value={editing.title} onChange={set('title')} /></label>
            <label>Mô tả<textarea rows={4} value={editing.description || ''} onChange={set('description')} /></label>
            <div className="grid two">
              <label>Chủ đề<input value={editing.category || ''} onChange={set('category')} /></label>
              <label>
                Cấp độ
                <select value={editing.level} onChange={set('level')}>
                  {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
            </div>
            <label className="option">
              <input type="checkbox" checked={!!editing.published} onChange={set('published')} /> Công khai cho sinh viên
            </label>
            <button className="btn primary">Lưu</button>
          </form>
        </Modal>
      )}
      {lessonsOf && <LessonManager course={lessonsOf} onClose={() => { setLessonsOf(null); state.reload(); }} />}
    </>
  );
}
