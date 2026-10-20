import { useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../components/ui.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, bio: user.bio || '', goals: user.goals || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState(null);

  const run = async (fn, ok) => {
    try {
      await fn();
      setMsg({ type: 'ok', text: ok });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <>
      <h1>Hồ sơ cá nhân</h1>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
      <div className="grid two">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => setUser(await api.put('/auth/me', form)), 'Đã lưu hồ sơ');
          }}
        >
          <h2>Thông tin</h2>
          <p className="muted small">
            {user.email} · {ROLES[user.role]}
          </p>
          <label>
            Họ tên
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            Giới thiệu
            <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </label>
          <label>
            Mục tiêu học tập (AI dùng để gợi ý lộ trình)
            <textarea rows={2} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
          </label>
          <button className="btn primary">Lưu</button>
        </form>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await api.put('/auth/me/password', pw);
              setPw({ currentPassword: '', newPassword: '' });
            }, 'Đổi mật khẩu thành công');
          }}
        >
          <h2>Đổi mật khẩu</h2>
          <label>
            Mật khẩu hiện tại
            <input type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          </label>
          <label>
            Mật khẩu mới
            <input type="password" minLength={6} required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
          </label>
          <button className="btn">Đổi mật khẩu</button>
        </form>
      </div>
    </>
  );
}
