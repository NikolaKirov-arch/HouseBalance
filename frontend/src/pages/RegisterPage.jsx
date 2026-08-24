import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/groups" replace />;

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/auth/register', {
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
          <h1 className="h3 mb-2">Create your account</h1>
          <p className="text-secondary mb-4">Start tracking shared household costs clearly.</p>
          <AlertMessage message={error} />

          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="form-label" htmlFor="first_name">First name</label>
                <input id="first_name" name="first_name" className="form-control" value={form.first_name} onChange={updateField} required />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="last_name">Last name</label>
                <input id="last_name" name="last_name" className="form-control" value={form.last_name} onChange={updateField} required />
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="form-control" value={form.email} onChange={updateField} autoComplete="email" required />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" minLength="6" className="form-control" value={form.password} onChange={updateField} autoComplete="new-password" required />
              <div className="form-text">Use at least 6 characters.</div>
            </div>
            <button className="btn btn-primary w-100" type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <p className="text-center text-secondary mt-4 mb-0">
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

