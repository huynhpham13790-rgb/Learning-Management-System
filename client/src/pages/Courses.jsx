import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { LEVELS, Loader, ProgressBar, useFetch } from '../components/ui.jsx';

export default function Courses() {
  const [filters, setFilters] = useState({ q: '', category: '', level: '' });
  const [q, setQ] = useState('');
  const categories = useFetch(() => api.get('/courses/categories'));
  const state = useFetch(() => api.get(`/courses?${new URLSearchParams(filters)}`), [filters]);

  return (
    <>
      <h1>Khóa học</h1>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters({ ...filters, q });
        }}
      >
        <input placeholder="Tìm khóa học…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">Tất cả chủ đề</option>
          {(categories.data || []).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={filters.level} onChange={(e) => setFilters({ ...filters, level: e.target.value })}>
          <option value="">Mọi cấp độ</option>
          {Object.entries(LEVELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button className="btn">Tìm</button>
      </form>
      <Loader state={state}>
        {(courses) =>
          courses.length === 0 ? (
            <p className="muted">Không tìm thấy khóa học phù hợp.</p>
          ) : (
            <div className="grid cards">
              {courses.map((c) => (
                <Link key={c.id} to={`/courses/${c.id}`} className="card course-card">
                  <div className="course-cover">{c.title[0]}</div>
                  <div className="tags">
                    <span className="badge">{c.category}</span>
                    <span className="badge light">{LEVELS[c.level]}</span>
                    {!c.published && <span className="badge warn">Nháp</span>}
                  </div>
                  <h3>{c.title}</h3>
                  <p className="muted small clamp">{c.description}</p>
                  <div className="row-between small muted">
                    <span>{c.lesson_count} bài học</span>
                    <span>{c.student_count} học viên</span>
                  </div>
                  {c.enrolled && <ProgressBar value={c.progress} />}
                </Link>
              ))}
            </div>
          )
        }
      </Loader>
    </>
  );
}
