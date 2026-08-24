import { useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import BalanceTable from '../components/BalanceTable';
import ExpenseTable from '../components/ExpenseTable';
import Loading from '../components/Loading';
import SettlementTable from '../components/SettlementTable';
import { formatMoney } from '../utils';

export default function GroupDashboardPage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiFetch(`/groups/${groupId}/dashboard`)
      .then((data) => { if (active) setDashboard(data); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId]);

  if (loading) return <Loading text="Calculating dashboard..." />;
  if (error) return <AlertMessage message={error} />;

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-lg-3"><div className="summary-card"><span>Total expenses</span><strong>{formatMoney(dashboard.summary.total_expenses, group.currency)}</strong></div></div>
        <div className="col-sm-6 col-lg-3"><div className="summary-card"><span>Expense records</span><strong>{dashboard.summary.expense_count}</strong></div></div>
        <div className="col-sm-6 col-lg-3"><div className="summary-card"><span>Active members</span><strong>{dashboard.summary.member_count}</strong></div></div>
        <div className="col-sm-6 col-lg-3"><div className="summary-card"><span>Settlements</span><strong>{dashboard.summary.settlement_count}</strong></div></div>
      </div>

      <section className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h2 className="h5 mb-0">Current member balances</h2>
          <Link to={`/groups/${groupId}/balances`}>Full explanation</Link>
        </div>
        <div className="card-body p-0"><BalanceTable balances={dashboard.balances} currency={group.currency} /></div>
      </section>

      <div className="row g-4">
        <section className="col-xl-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white d-flex justify-content-between"><h2 className="h5 mb-0">Recent expenses</h2><Link to={`/groups/${groupId}/expenses`}>View all</Link></div>
            <div className="card-body p-0"><ExpenseTable expenses={dashboard.recent_expenses} currency={group.currency} /></div>
          </div>
        </section>
        <section className="col-xl-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white d-flex justify-content-between"><h2 className="h5 mb-0">Recent settlements</h2><Link to={`/groups/${groupId}/settlements`}>View all</Link></div>
            <div className="card-body p-0"><SettlementTable settlements={dashboard.recent_settlements} currency={group.currency} /></div>
          </div>
        </section>
      </div>
    </>
  );
}

