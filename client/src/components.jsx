import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';

export const Loading = ({ label = 'Loading…' }) => <p role="status" className="muted">{label}</p>;
export const ErrorBox = ({ error }) => (error ? <p role="alert" className="alert error">{error.message || String(error)}</p> : null);
export const Empty = ({ children }) => <p className="empty">{children}</p>;
export const Notice = ({ children }) => (children ? <p role="status" className="alert success">{children}</p> : null);

export function Pager({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      <button className="btn" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>← Prev</button>
      <span>Page {meta.page} of {meta.pages}</span>
      <button className="btn" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next →</button>
    </nav>
  );
}

/** Route guard. UI-only convenience: the server enforces roles on every endpoint. */
export function RequireRole({ roles, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <p className="alert error">You do not have access to this page.</p>;
  return children;
}
