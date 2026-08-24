import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import GroupCard from '../components/GroupCard';
import Loading from '../components/Loading';
import { formatDate } from '../utils';

export default function MyGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        const [groupData, invitationData] = await Promise.all([
          apiFetch('/groups'),
          apiFetch('/invitations')
        ]);
        if (active) {
          setGroups(groupData.groups);
          setInvitations(invitationData.invitations);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPage();
    return () => { active = false; };
  }, []);

  async function acceptInvitation(invitation) {
    setError('');
    try {
      const data = await apiFetch('/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ invitation_code: invitation.invitation_code })
      });
      navigate(`/groups/${data.group_id}`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) return <Loading text="Loading your groups..." />;

  return (
    <main className="container py-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="h2 mb-1">My Groups</h1>
          <p className="text-secondary mb-0">Only households where you are an active member appear here.</p>
        </div>
        <Link className="btn btn-primary" to="/groups/create">Create household group</Link>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} />

      {invitations.length > 0 ? (
        <section className="card border-primary mb-4">
          <div className="card-header bg-primary-subtle fw-semibold">Pending invitations</div>
          <div className="list-group list-group-flush">
            {invitations.map((invitation) => (
              <div className="list-group-item d-flex flex-wrap justify-content-between align-items-center gap-2" key={invitation.id}>
                <div>
                  <strong>{invitation.group_name}</strong>
                  <div className="small text-secondary">
                    Invited by {invitation.invited_by_name}; expires {formatDate(invitation.expires_at)}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" type="button" onClick={() => acceptInvitation(invitation)}>
                  Accept invitation
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {groups.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">
            <h2 className="h5">You do not belong to a household group yet.</h2>
            <p className="text-secondary">Create one or ask an administrator to invite your registered email.</p>
            <Link className="btn btn-primary" to="/groups/create">Create your first group</Link>
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {groups.map((group) => (
            <div className="col-md-6 col-lg-4" key={group.id}>
              <GroupCard group={group} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

