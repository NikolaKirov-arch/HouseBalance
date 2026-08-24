import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import BalanceTable from '../components/BalanceTable';
import Loading from '../components/Loading';

export default function BalancesPage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/groups/${groupId}/balances`)
      .then((data) => { if (active) setBalances(data.balances); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  if (loading) return <Loading text="Calculating current balances..." />;

  return (
    <>
      <div className="mb-3"><h2 className="h4 mb-1">Explainable balances</h2><p className="text-secondary mb-0">These values are calculated now. They are not stored as permanent member balances.</p></div>
      <AlertMessage message={error} />
      <div className="alert alert-primary">
        <strong>Formula:</strong> expenses paid − expense shares owed + settlements paid − settlements received.
        A positive result means the member is owed money; a negative result means the member owes money.
      </div>
      <div className="card shadow-sm border-0"><div className="card-body p-0"><BalanceTable balances={balances} currency={group.currency} /></div></div>
    </>
  );
}

