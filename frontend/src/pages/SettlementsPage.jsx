import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import Loading from '../components/Loading';
import SettlementTable from '../components/SettlementTable';

export default function SettlementsPage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/groups/${groupId}/settlements`)
      .then((data) => { if (active) setSettlements(data.settlements); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  if (loading) return <Loading text="Loading settlements..." />;

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div><h2 className="h4 mb-1">Settlements</h2><p className="text-secondary mb-0">Recorded payments between household members.</p></div>
        <Link className="btn btn-primary" to={`/groups/${groupId}/settlements/new`}>Record settlement</Link>
      </div>
      <AlertMessage message={error} />
      <div className="card shadow-sm border-0"><div className="card-body p-0"><SettlementTable settlements={settlements} currency={group.currency} /></div></div>
    </>
  );
}

