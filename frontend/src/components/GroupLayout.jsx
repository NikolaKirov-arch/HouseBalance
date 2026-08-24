import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from './AlertMessage';
import Loading from './Loading';

export default function GroupLayout() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadGroup() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch(`/groups/${groupId}`);
        if (active) setGroup(data.group);
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGroup();
    return () => { active = false; };
  }, [groupId]);

  if (loading) return <Loading text="Loading household group..." />;
  if (error) return <div className="container py-4"><AlertMessage message={error} /></div>;

  const base = `/groups/${groupId}`;
  const links = [
    ['Dashboard', base],
    ['Members', `${base}/members`],
    ['Expenses', `${base}/expenses`],
    ['Settlements', `${base}/settlements`],
    ['Balances', `${base}/balances`],
    ['Settlement Plan', `${base}/settlement-plan`],
    ['Audit Log', `${base}/audit-log`]
  ];

  return (
    <main className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <p className="text-uppercase small text-primary fw-bold mb-1">Household group</p>
          <h1 className="h3 mb-0">{group.name}</h1>
        </div>
        <span className="badge text-bg-light border fs-6">{group.currency}</span>
      </div>

      <nav className="group-tabs nav nav-pills flex-nowrap overflow-auto mb-4 pb-1">
        {links.map(([label, to], index) => (
          <NavLink
            key={to}
            to={to}
            end={index === 0}
            className={({ isActive }) => `nav-link text-nowrap ${isActive ? 'active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ group }} />
    </main>
  );
}

