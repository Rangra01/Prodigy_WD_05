import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';

export default function Register() {
  usePageTitle('Sign up');
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const setField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const validate = () => {
    const name = form.name.trim();
    const username = form.username.trim();
    const email = form.email.trim();

    if (name.length < 2) return 'Please enter your name (at least 2 characters).';
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username))
      return 'Username must be 3–30 letters, numbers or underscores.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return 'Please enter a valid email address.';
    if (form.password.length < 6)
      return 'Password must be at least 6 characters.';
    return null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="card auth-card">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join MiniSocial — it only takes a minute.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="label" htmlFor="reg-name">
              Name
            </label>
            <input
              id="reg-name"
              className="input"
              value={form.name}
              onChange={setField('name')}
              placeholder="Ada Lovelace"
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="reg-username">
              Username
            </label>
            <input
              id="reg-username"
              className="input"
              value={form.username}
              onChange={setField('username')}
              placeholder="ada_1815"
              required
            />
            <p className="form-hint">3–30 characters: letters, numbers, underscores.</p>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              className="input"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={setField('email')}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              className="input"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={setField('password')}
              required
            />
            <p className="form-hint">At least 6 characters.</p>
          </div>

          <button type="submit" className="btn btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
