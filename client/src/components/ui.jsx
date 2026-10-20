import { useEffect, useState } from 'react';

// Hook tải dữ liệu đơn giản: trả về { data, error, loading, reload, setData }
export function useFetch(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return {
    ...state,
    reload: () => setTick((t) => t + 1),
    setData: (data) => setState((s) => ({ ...s, data: typeof data === 'function' ? data(s.data) : data })),
  };
}

export function Loader({ state, children }) {
  if (state.loading && !state.data) return <div className="muted pad">Đang tải…</div>;
  if (state.error) return <div className="alert error">{state.error.message}</div>;
  return children(state.data);
}

export function ProgressBar({ value }) {
  return (
    <div className="progress" title={`${value}%`}>
      <div style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="card stat">
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="muted small">{hint}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn ghost" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const LEVELS = { beginner: 'Cơ bản', intermediate: 'Trung cấp', advanced: 'Nâng cao' };
export const ROLES = { admin: 'Quản trị', teacher: 'Giảng viên', student: 'Sinh viên' };
export const STATUS = { submitted: 'Đã nộp', ai_graded: 'AI đã chấm sơ bộ', graded: 'Đã chấm' };

export function fmtDate(v, withTime = true) {
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  return withTime ? d.toLocaleString('vi-VN') : d.toLocaleDateString('vi-VN');
}

export function PlagiarismBadge({ score }) {
  if (score == null) return <span className="muted">—</span>;
  const n = Number(score);
  const cls = n >= 40 ? 'danger' : n >= 20 ? 'warn' : 'ok';
  return <span className={`badge ${cls}`}>{n}%</span>;
}

// Hiển thị điểm & nhận xét AI
export function AiFeedback({ feedback, score, max }) {
  if (!feedback) return null;
  return (
    <div className="ai-box">
      <div className="ai-head">
        🤖 AI chấm sơ bộ: <b>{score}</b>/{max} <span className="muted small">({feedback.provider})</span>
      </div>
      <p>{feedback.feedback}</p>
      {feedback.strengths?.length > 0 && (
        <>
          <b>Điểm mạnh</b>
          <ul>{feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </>
      )}
      {feedback.improvements?.length > 0 && (
        <>
          <b>Cần cải thiện</b>
          <ul>{feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </>
      )}
    </div>
  );
}
