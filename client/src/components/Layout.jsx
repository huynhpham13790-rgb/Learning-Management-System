import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { ErrorBoundary, ROLES, fmtDate } from './ui.jsx';

const STUDENT_NAV = [
  ['/', 'Tổng quan', '🏠'],
  ['/courses', 'Khóa học', '📚'],
  ['/assignments', 'Bài tập', '📝'],
  ['/learning-path', 'Lộ trình AI', '🧭'],
  ['/tutor', 'Trợ lý AI', '🤖'],
  ['/leaderboard', 'Xếp hạng', '🏆'],
];
const ADMIN_NAV = [
  ['/admin', 'Thống kê', '📊'],
  ['/admin/courses', 'Khóa học & bài giảng', '📚'],
  ['/admin/assignments', 'Bài tập & chấm điểm', '📝'],
  ['/admin/quizzes', 'Trắc nghiệm', '❓'],
];

function NotificationBell() {
  const [data, setData] = useState({ unread: 0, items: [] });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const load = () => api.get('/notifications').then(setData).catch(() => {});

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const openItem = async (n) => {
    if (!n.is_read) await api.put(`/notifications/${n.id}/read`);
    setOpen(false);
    load();
    if (n.link) navigate(n.link);
  };

  return (
    <div className="bell">
      <button className="btn ghost" onClick={() => setOpen(!open)} aria-label="Thông báo">
        🔔 {data.unread > 0 && <span className="bell-count">{data.unread}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="dropdown-head">
            <b>Thông báo</b>
            <button className="link" onClick={() => api.put('/notifications/read-all').then(load)}>
              Đánh dấu đã đọc
            </button>
          </div>
          {data.items.length === 0 && <div className="muted pad">Không có thông báo</div>}
          {data.items.map((n) => (
            <button key={n.id} className={`notif ${n.is_read ? '' : 'unread'}`} onClick={() => openItem(n)}>
              <b>{n.title}</b>
              <span>{n.message}</span>
              <small className="muted">{fmtDate(n.created_at)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);

  const nav = (items) =>
    items.map(([to, label, icon]) => (
      <NavLink key={to} to={to} end={to === '/' || to === '/admin'} onClick={() => setMenu(false)}>
        <span>{icon}</span> {label}
      </NavLink>
    ));

  return (
    <div className="app">
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <Link to="/" className="brand">
          🎓 EduTrack <span>AI</span>
        </Link>
        <nav>
          <div className="nav-title">Học tập</div>
          {nav(STUDENT_NAV)}
          {isStaff && (
            <>
              <div className="nav-title">Quản trị</div>
              {nav(ADMIN_NAV)}
              {user.role === 'admin' && nav([['/admin/users', 'Người dùng', '👥']])}
            </>
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn ghost menu-btn" onClick={() => setMenu(!menu)} aria-label="Menu">
            ☰
          </button>
          <div className="spacer" />
          <NotificationBell />
          <Link to="/profile" className="user-chip">
            <span className="avatar">{user.name[0]}</span>
            <span>
              {user.name}
              <small>{ROLES[user.role]}</small>
            </span>
          </Link>
          <button
            className="btn ghost"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Đăng xuất
          </button>
        </header>
        <main className="content">
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
