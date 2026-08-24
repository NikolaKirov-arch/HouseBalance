import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import Loading from '../components/Loading';
import SettlementPlanTable from '../components/SettlementPlanTable';

export default function SettlementPlanPage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const [payments, setPayments] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/groups/${groupId}/settlement-plan`)
      .then((data) => {
        if (active) {
          setPayments(data.payments);
          setNote(data.note);
        }
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  if (loading) return <Loading text="Generating settlement plan..." />;

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
        <div><h2 className="h4 mb-1">Settlement plan</h2><p className="text-secondary mb-0">Debtors are greedily matched with creditors to settle balances using few payments.</p></div>
        <Link className="btn btn-primary" to={`/groups/${groupId}/settlements/new`}>Record a payment</Link>
      </div>
      <AlertMessage message={error} />
      <div className="alert alert-info">{note}</div>
      <div className="card shadow-sm border-0"><div className="card-body p-0"><SettlementPlanTable payments={payments} currency={group.currency} /></div></div>
    </>
  );
}

