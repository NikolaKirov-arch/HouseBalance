import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', currency: 'EUR' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await apiFetch('/groups', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      navigate(`/groups/${data.group.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-4 narrow-page">
      <Link className="text-decoration-none" to="/groups">← Back to My Groups</Link>
      <div className="card shadow-sm border-0 mt-3">
        <div className="card-body p-4">
          <h1 className="h3">Create household group</h1>
          <p className="text-secondary">You will become the administrator and default categories will be added automatically.</p>
          <AlertMessage message={error} />

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="group-name">Group name</label>
              <input
                id="group-name"
                className="form-control"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Example: Apartment"
                maxLength="150"
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="currency">Currency</label>
              <select id="currency" className="form-select" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}>
                <option value="EUR">EUR - Euro</option>
                <option value="USD">USD - US Dollar</option>
                <option value="MKD">MKD - Macedonian Denar</option>
              </select>
              <div className="form-text">One household group uses one currency.</div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create group'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

