import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import Loading from '../components/Loading';
import SettlementPlanTable from '../components/SettlementPlanTable';
import { today } from '../utils';

export default function AddSettlementPage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({
    payer_member_id: '',
    receiver_member_id: '',
    amount: '',
    settlement_date: today(),
    note: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch(`/groups/${groupId}/members`),
      apiFetch(`/groups/${groupId}/settlement-plan`)
    ])
      .then(([memberData, planData]) => {
        if (!active) return;
        setMembers(memberData.members);
        setPayments(planData.payments);
        const payer = memberData.members.find((member) => member.member_id === group.current_member.id) || memberData.members[0];
        const receiver = memberData.members.find((member) => member.member_id !== payer?.member_id);
        setForm((current) => ({
          ...current,
          payer_member_id: String(payer?.member_id || ''),
          receiver_member_id: String(receiver?.member_id || '')
        }));
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId, group.current_member.id]);

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function useSuggestedPayment(payment) {
    setForm({
      ...form,
      payer_member_id: String(payment.payer_member_id),
      receiver_member_id: String(payment.receiver_member_id),
      amount: Number(payment.amount).toFixed(2),
      note: 'Payment from generated settlement plan'
    });
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (form.payer_member_id === form.receiver_member_id) {
      setError('Payer and receiver must be different members.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await apiFetch(`/groups/${groupId}/settlements`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          payer_member_id: Number(form.payer_member_id),
          receiver_member_id: Number(form.receiver_member_id),
          amount: Number(form.amount)
        })
      });
      navigate(`/groups/${groupId}/settlements`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading text="Preparing settlement form..." />;

  return (
    <div className="narrow-page-wide">
      <Link to={`/groups/${groupId}/settlements`} className="text-decoration-none">← Back to settlements</Link>
      <form className="card shadow-sm border-0 mt-3 mb-4" onSubmit={handleSubmit}>
        <div className="card-body p-4">
          <h2 className="h4">Record settlement payment</h2>
          <p className="text-secondary">Record a payment that already happened. This immediately changes the calculated balances.</p>
          <AlertMessage message={error} onClose={() => setError('')} />
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="payer_member_id">Payer</label>
              <select id="payer_member_id" name="payer_member_id" className="form-select" value={form.payer_member_id} onChange={updateField} required>{members.map((member) => <option value={member.member_id} key={member.member_id}>{member.first_name} {member.last_name}</option>)}</select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="receiver_member_id">Receiver</label>
              <select id="receiver_member_id" name="receiver_member_id" className="form-select" value={form.receiver_member_id} onChange={updateField} required>{members.map((member) => <option value={member.member_id} key={member.member_id}>{member.first_name} {member.last_name}</option>)}</select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="settlement-amount">Amount ({group.currency})</label>
              <input id="settlement-amount" name="amount" type="number" min="0.01" step="0.01" className="form-control" value={form.amount} onChange={updateField} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="settlement_date">Payment date</label>
              <input id="settlement_date" name="settlement_date" type="date" className="form-control" value={form.settlement_date} onChange={updateField} required />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="note">Note</label>
              <input id="note" name="note" className="form-control" maxLength="255" value={form.note} onChange={updateField} placeholder="Optional payment note" />
            </div>
            <div className="col-12"><button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Recording...' : 'Record settlement'}</button></div>
          </div>
        </div>
      </form>

      <section className="card shadow-sm border-0">
        <div className="card-header bg-white"><h3 className="h5 mb-0">Current suggested payments</h3></div>
        <div className="card-body p-0"><SettlementPlanTable payments={payments} currency={group.currency} onUsePayment={useSuggestedPayment} /></div>
      </section>
    </div>
  );
}

