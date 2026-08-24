import { Link } from 'react-router-dom';
import { formatMoney } from '../utils';

export default function GroupCard({ group }) {
  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h2 className="h5 card-title mb-0">{group.name}</h2>
          <span className={`badge ${group.role === 'admin' ? 'text-bg-primary' : 'text-bg-secondary'}`}>
            {group.role}
          </span>
        </div>
        <p className="text-secondary mb-1">{group.member_count} active member(s)</p>
        <p className="mb-3">
          <strong>{formatMoney(group.total_expenses, group.currency)}</strong> recorded expenses
        </p>
        <Link className="btn btn-primary" to={`/groups/${group.id}`}>Open dashboard</Link>
      </div>
    </div>
  );
}

