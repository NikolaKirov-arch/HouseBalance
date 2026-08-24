import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import Loading from '../components/Loading';
import { formatDate } from '../utils';

export default function AuditLogPage() {
  const { groupId } = useParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/groups/${groupId}/audit-log`)
      .then((data) => { if (active) setEntries(data.entries); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  if (loading) return <Loading text="Loading audit history..." />;

  return (
    <>
      <div className="mb-3"><h2 className="h4 mb-1">Audit log</h2><p className="text-secondary mb-0">Important actions remain visible for verification and accountability.</p></div>
      <AlertMessage message={error} />
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {entries.length === 0 ? <p className="text-secondary p-4 mb-0">No audit actions have been recorded.</p> : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th>Date</th><th>Actor</th><th>Action</th><th>Entity</th><th>Description</th></tr></thead>
                <tbody>{entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.created_at)}</td>
                    <td>{entry.actor_name}</td>
                    <td><span className="badge text-bg-light border">{entry.action_type.replaceAll('_', ' ')}</span></td>
                    <td>{entry.entity_type} #{entry.entity_id}</td>
                    <td>{entry.description || '-'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

