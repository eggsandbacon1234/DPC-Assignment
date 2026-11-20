import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function validate({ username, email, password, confirm }) {
  const errors = {};
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) errors.username = '3–20 characters: letters, numbers or _';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 6) errors.password = 'At least 6 characters';
  if (confirm !== password) errors.confirm = 'Passwords do not match';
  return errors;
}

export default function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const errors = validate(form);
  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  // Only flag a field on blur if something was typed; empty fields are flagged on submit.
  // (Showing an error on an empty blur shifts the layout and can swallow the submit click.)
  const blur = (k) => () => form[k] && setTouched((t) => ({ ...t, [k]: true }));
  const showErr = (k) => touched[k] && errors[k];

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ username: true, email: true, password: true, confirm: true });
    setError('');
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      await register({ username: form.username, email: form.email, password: form.password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create an account</h1>
        <p className="muted">Share your photos and comment on others'.</p>

        <label className={`field ${showErr('username') ? 'has-error' : ''}`}>
          <span>Username</span>
          <input value={form.username} onChange={update('username')} onBlur={blur('username')} autoComplete="username" autoFocus />
          {showErr('username') && <small>{errors.username}</small>}
        </label>

        <label className={`field ${showErr('email') ? 'has-error' : ''}`}>
          <span>Email</span>
          <input type="email" value={form.email} onChange={update('email')} onBlur={blur('email')} autoComplete="email" />
          {showErr('email') && <small>{errors.email}</small>}
        </label>

        <label className={`field ${showErr('password') ? 'has-error' : ''}`}>
          <span>Password</span>
          <input type="password" value={form.password} onChange={update('password')} onBlur={blur('password')} autoComplete="new-password" />
          {showErr('password') && <small>{errors.password}</small>}
        </label>

        <label className={`field ${showErr('confirm') ? 'has-error' : ''}`}>
          <span>Confirm password</span>
          <input type="password" value={form.confirm} onChange={update('confirm')} onBlur={blur('confirm')} autoComplete="new-password" />
          {showErr('confirm') && <small>{errors.confirm}</small>}
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
