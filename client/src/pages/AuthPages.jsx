import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ErrorBox } from '../components.jsx';

function AuthForm({ mode }) {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || '/';
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      mode === 'login' ? await login(f.email, f.password) : await register(f.name, f.email, f.password);
      nav(from, { replace: true });
    } catch (err) { setError(err); } finally { setBusy(false); }
  }
  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      <ErrorBox error={error} />
      {mode === 'register' && <label>Name<input required minLength={2} value={f.name} onChange={set('name')} autoComplete="name" /></label>}
      <label>Email<input type="email" required value={f.email} onChange={set('email')} autoComplete="email" /></label>
      <label>Password<input type="password" required minLength={mode === 'register' ? 8 : 1} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>
      <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
      {mode === 'login' ? <p>No account? <Link to="/register">Sign up</Link></p> : <p>Have an account? <Link to="/login">Log in</Link></p>}
      {mode === 'login' && <p className="muted small">Demo: customer@cinema.test / Customer@12345 · staff@cinema.test / Staff@12345 · admin@cinema.test / Admin@12345</p>}
    </form>
  );
}
export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
