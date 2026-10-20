import { useState } from 'react';
import { api } from '../../api/client.js';
import { Loader, Modal, ROLES, fmtDate, useFetch } from '../../components/ui.jsx';

const EMPTY = { name: '', email: '', password: '', role: 'student', is_active: 1 };

export default function AdminUsers() {
  const [filter, setFilter] = useState({ q: '', role: '' });
  const state = useFetch(() => api.get(`/users?${new URLSearchParams(filter)}`), [filter]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing.id) await api.put(`/users/${editing.id}`, editing);
      else await api.post('/users', editing);
      setEditing(null);
      state.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Xóa người dùng ${u.name}?`)) return;
    try {
      await api.del(`/users/${u.id}`);
      state.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  const set = (k) => (e) => setEditing({ ...editing, [k]: e.target.type === 'checkbox' ? (e.target.checked ? 1 : 0) : e.target.value });

  return (
    <>
      <div className="row-between">
        <h1>👥 Người dùng</h1>
        <button className="btn primary" onClick={() => { setError(''); setEditing(EMPTY); }}>
          + Thêm người dùng
        </button>
      </div>
      <div className="toolbar">
        <input placeholder="Tìm theo tên/email…" onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
        <select value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value })}>
          <option value="">Mọi vai trò</option>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>
      <Loader state={state}>
        {(users) => (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{ROLES[u.role]}</td>
                    <td>{u.is_active ? <span className="badge ok">Hoạt động</span> : <span className="badge danger">Đã khóa</span>}</td>
                    <td>{fmtDate(u.created_at, false)}</td>
                    <td className="actions">
                      <button className="btn small" onClick={() => { setError(''); setEditing({ ...u, password: '' }); }}>Sửa</button>
                      <button className="btn small danger" onClick={() => remove(u)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loader>
      {editing && (
        <Modal title={editing.id ? 'Sửa người dùng' : 'Thêm người dùng'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            {error && <div className="alert error">{error}</div>}
            <label>Họ tên<input required value={editing.name} onChange={set('name')} /></label>
            <label>Email<input type="email" required value={editing.email} onChange={set('email')} /></label>
            <label>
              Mật khẩu {editing.id && <small className="muted">(để trống nếu không đổi)</small>}
              <input type="password" minLength={6} required={!editing.id} value={editing.password} onChange={set('password')} />
            </label>
            <label>
              Vai trò
              <select value={editing.role} onChange={set('role')}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            {editing.id && (
              <label className="option">
                <input type="checkbox" checked={!!editing.is_active} onChange={set('is_active')} /> Đang hoạt động
              </label>
            )}
            <button className="btn primary">Lưu</button>
          </form>
        </Modal>
      )}
    </>
  );
}
