import { useEffect, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import Loading from '../components/Loading';
import { formatDate } from '../utils';

export default function MembersPage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const isAdmin = group.current_member.role === 'admin';
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ message: '', type: 'danger' });

  async function loadData() {
    const requests = [apiFetch(`/groups/${groupId}/members`)];
    if (isAdmin) requests.push(apiFetch(`/groups/${groupId}/invitations`));
    const [memberData, invitationData] = await Promise.all(requests);
    setMembers(memberData.members);
    setInvitations(invitationData?.invitations || []);
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    const requests = [apiFetch(`/groups/${groupId}/members`)];
    if (isAdmin) requests.push(apiFetch(`/groups/${groupId}/invitations`));

    Promise.all(requests)
      .then(([memberData, invitationData]) => {
        if (active) {
          setMembers(memberData.members);
          setInvitations(invitationData?.invitations || []);
        }
      })
      .catch((requestError) => {
        if (active) setAlert({ message: requestError.message, type: 'danger' });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId, isAdmin]);

  async function inviteMember(event) {
    event.preventDefault();
    setSubmitting(true);
    setAlert({ message: '', type: 'danger' });
    try {
      await apiFetch(`/groups/${groupId}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ email, expires_in_days: 7 })
      });
      setEmail('');
      setAlert({ message: 'Invitation created. The user can accept it from My Groups.', type: 'success' });
      await loadData();
    } catch (requestError) {
      setAlert({ message: requestError.message, type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading text="Loading group members..." />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div><h2 className="h4 mb-1">Members</h2><p className="text-secondary mb-0">People who can access this household group.</p></div>
      </div>
      <AlertMessage message={alert.message} type={alert.type} onClose={() => setAlert({ message: '', type: 'danger' })} />

      {isAdmin ? (
        <section className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h3 className="h5">Invite a registered user</h3>
            <p className="text-secondary small">For security and referential integrity, the invited email must already have a HouseBalance account.</p>
            <form className="row g-2" onSubmit={inviteMember}>
              <div className="col-md-8">
                <label className="visually-hidden" htmlFor="invite-email">User email</label>
                <input id="invite-email" className="form-control" type="email" placeholder="ana@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="col-md-4 d-grid">
                <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Creating invitation...' : 'Create invitation'}</button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <section className="card shadow-sm border-0 mb-4">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light"><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.member_id}>
                    <td className="fw-semibold">{member.first_name} {member.last_name}</td>
                    <td>{member.email}</td>
                    <td><span className={`badge ${member.role === 'admin' ? 'text-bg-primary' : 'text-bg-secondary'}`}>{member.role}</span></td>
                    <td>{formatDate(member.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {isAdmin && invitations.length > 0 ? (
        <section className="card shadow-sm border-0">
          <div className="card-header bg-white"><h3 className="h5 mb-0">Invitation history</h3></div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0 align-middle">
                <thead className="table-light"><tr><th>User</th><th>Status</th><th>Created</th><th>Expires</th></tr></thead>
                <tbody>{invitations.map((invitation) => (
                  <tr key={invitation.id}><td>{invitation.first_name} {invitation.last_name}<div className="small text-secondary">{invitation.email}</div></td><td><span className="badge text-bg-light border">{invitation.status}</span></td><td>{formatDate(invitation.created_at)}</td><td>{formatDate(invitation.expires_at)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

