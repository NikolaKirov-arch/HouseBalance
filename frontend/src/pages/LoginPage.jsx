import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={location.state?.from?.pathname || '/groups'} replace />;
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      login(data.token, data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="card auth-card shadow border-0">
        <div className="card-body p-4 p-md-5">
          <h1 className="h3 mb-2">Welcome back</h1>
          <p className="text-secondary mb-4">Log in to manage your household expenses.</p>
          <AlertMessage message={error} />

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={form.email}
                onChange={updateField}
                autoComplete="email"
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                value={form.password}
                onChange={updateField}
                autoComplete="current-password"
                required
              />
            </div>
            <button className="btn btn-primary w-100" type="submit" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="text-center text-secondary mt-4 mb-0">
            No account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

