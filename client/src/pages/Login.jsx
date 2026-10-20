import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(form.email, form.password);
      navigate(u.role === 'student' ? '/' : '/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <h1>🎓 EduTrack AI</h1>
        <p className="muted">Hệ thống quản lý học tập tích hợp AI</p>
        {error && <div className="alert error">{error}</div>}
        <label>
          Email
          <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Mật khẩu
          <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <p className="small">
          Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        </p>
        <div className="demo small muted">
          Tài khoản mẫu (mật khẩu <code>123456</code>): admin@edutrack.vn · teacher@edutrack.vn · student@edutrack.vn
        </div>
      </form>
    </div>
  );
}
