import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import AlertMessage from '../components/AlertMessage';
import Loading from '../components/Loading';
import { formatMoney, today } from '../utils';

export default function AddExpensePage() {
  const { groupId } = useParams();
  const { group } = useOutletContext();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [participantValues, setParticipantValues] = useState({});
  const [form, setForm] = useState({
    payer_member_id: '',
    category_id: '',
    amount: '',
    description: '',
    expense_date: today(),
    split_type: 'equal'
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch(`/groups/${groupId}/members`),
      apiFetch(`/groups/${groupId}/categories`)
    ])
      .then(([memberData, categoryData]) => {
        if (!active) return;
        setMembers(memberData.members);
        setCategories(categoryData.categories.filter((category) => category.is_active));
        const initialValues = {};
        memberData.members.forEach((member) => {
          initialValues[member.member_id] = { selected: true, value: '' };
        });
        setParticipantValues(initialValues);
        setForm((current) => ({
          ...current,
          payer_member_id: String(group.current_member.id),
          category_id: String(categoryData.categories.find((category) => category.is_active)?.id || '')
        }));
      })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [groupId, group.current_member.id]);

  const selectedMembers = members.filter(
    (member) => participantValues[member.member_id]?.selected
  );

  const exactTotal = selectedMembers.reduce(
    (sum, member) => sum + Number(participantValues[member.member_id]?.value || 0),
    0
  );
  const percentageTotal = selectedMembers.reduce(
    (sum, member) => sum + Number(participantValues[member.member_id]?.value || 0),
    0
  );
  const amountCents = Math.round(Number(form.amount || 0) * 100);
  const previewByMember = {};
  if (amountCents > 0 && selectedMembers.length > 0) {
    if (form.split_type === 'equal') {
      const base = Math.floor(amountCents / selectedMembers.length);
      const remainder = amountCents % selectedMembers.length;
      selectedMembers.forEach((member, index) => {
        previewByMember[member.member_id] =
          (base + (index < remainder ? 1 : 0)) / 100;
      });
    } else if (form.split_type === 'exact') {
      selectedMembers.forEach((member) => {
        previewByMember[member.member_id] =
          Number(participantValues[member.member_id]?.value || 0);
      });
    } else {
      let allocatedCents = 0;
      let percentageSoFar = 0;

      selectedMembers.forEach((member) => {
        const percentage = Number(participantValues[member.member_id]?.value || 0);
        percentageSoFar += Math.round(percentage * 100);
        const targetCents = Math.round((amountCents * percentageSoFar) / 10000);
        previewByMember[member.member_id] = (targetCents - allocatedCents) / 100;
        allocatedCents = targetCents;
      });
    }
  }

  function updateForm(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  function toggleParticipant(memberId) {
    const current = participantValues[memberId] || { selected: false, value: '' };
    setParticipantValues({
      ...participantValues,
      [memberId]: { ...current, selected: !current.selected }
    });
  }

  function updateParticipant(memberId, value) {
    setParticipantValues({
      ...participantValues,
      [memberId]: { ...participantValues[memberId], value }
    });
  }

  function setAllParticipants(selected) {
    const updatedValues = {};
    members.forEach((member) => {
      updatedValues[member.member_id] = {
        ...participantValues[member.member_id],
        selected
      };
    });
    setParticipantValues(updatedValues);
  }

  function validate() {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return 'Expense amount must be greater than zero.';
    }
    if (Math.abs(Number(form.amount) * 100 - amountCents) > 0.000001) {
      return 'Expense amount may have at most two decimal places.';
    }
    if (selectedMembers.length === 0) return 'Select at least one participant.';

    if (form.split_type === 'exact') {
      const exactValues = selectedMembers.map((member) => {
        const value = Number(participantValues[member.member_id]?.value);
        return { value, cents: Math.round(value * 100) };
      });
      if (exactValues.some(({ value }) => !Number.isFinite(value) || value < 0)) {
        return 'Enter a non-negative exact amount for every selected participant.';
      }
      if (exactValues.some(({ value, cents }) => Math.abs(value * 100 - cents) > 0.000001)) {
        return 'Exact split amounts may have at most two decimal places.';
      }
      if (exactValues.reduce((sum, item) => sum + item.cents, 0) !== amountCents) {
        return 'The exact split amounts must equal the expense amount.';
      }
    }

    if (form.split_type === 'percentage') {
      const percentageValues = selectedMembers.map((member) => {
        const value = Number(participantValues[member.member_id]?.value);
        return { value, units: Math.round(value * 100) };
      });
      if (percentageValues.some(({ value }) => !Number.isFinite(value) || value <= 0 || value > 100)) {
        return 'Enter a percentage greater than 0 for every selected participant.';
      }
      if (percentageValues.some(({ value, units }) => Math.abs(value * 100 - units) > 0.000001)) {
        return 'Percentage values may have at most two decimal places.';
      }
      if (percentageValues.reduce((sum, item) => sum + item.units, 0) !== 10000) {
        return 'The percentage split values must equal 100%.';
      }
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const splits = selectedMembers.map((member) => ({
      member_id: member.member_id,
      owed_amount: previewByMember[member.member_id],
      percentage: form.split_type === 'percentage'
        ? Number(participantValues[member.member_id].value)
        : null
    }));

    setSubmitting(true);
    setError('');
    try {
      await apiFetch(`/groups/${groupId}/expenses`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          payer_member_id: Number(form.payer_member_id),
          category_id: form.category_id ? Number(form.category_id) : null,
          amount: Number(form.amount),
          splits
        })
      });
      navigate(`/groups/${groupId}/expenses`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading text="Preparing expense form..." />;

  return (
    <div className="narrow-page-wide">
      <Link to={`/groups/${groupId}/expenses`} className="text-decoration-none">← Back to expenses</Link>
      <form className="card shadow-sm border-0 mt-3" onSubmit={handleSubmit}>
        <div className="card-body p-4">
          <h2 className="h4">Add expense</h2>
          <p className="text-secondary">The backend will validate the split again before saving anything.</p>
          <AlertMessage message={error} onClose={() => setError('')} />

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="payer_member_id">Payer</label>
              <select id="payer_member_id" name="payer_member_id" className="form-select" value={form.payer_member_id} onChange={updateForm} required>
                {members.map((member) => <option value={member.member_id} key={member.member_id}>{member.first_name} {member.last_name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="category_id">Category</label>
              <select id="category_id" name="category_id" className="form-select" value={form.category_id} onChange={updateForm}>
                <option value="">Uncategorized</option>
                {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="amount">Total amount ({group.currency})</label>
              <input id="amount" name="amount" type="number" min="0.01" step="0.01" className="form-control" value={form.amount} onChange={updateForm} required />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="expense_date">Expense date</label>
              <input id="expense_date" name="expense_date" type="date" className="form-control" value={form.expense_date} onChange={updateForm} required />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="description">Description</label>
              <textarea id="description" name="description" className="form-control" rows="2" maxLength="255" value={form.description} onChange={updateForm} placeholder="What was purchased?" />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="split_type">Split type</label>
              <select id="split_type" name="split_type" className="form-select" value={form.split_type} onChange={updateForm}>
                <option value="equal">Equal split</option>
                <option value="exact">Exact amounts</option>
                <option value="percentage">Percentages</option>
              </select>
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h3 className="h5 mb-0">Participants</h3>
            <div className="btn-group btn-group-sm"><button type="button" className="btn btn-outline-secondary" onClick={() => setAllParticipants(true)}>Select all</button><button type="button" className="btn btn-outline-secondary" onClick={() => setAllParticipants(false)}>Clear</button></div>
          </div>

          <div className="table-responsive border rounded mb-3">
            <table className="table align-middle mb-0">
              <thead className="table-light"><tr><th>Select</th><th>Member</th><th>{form.split_type === 'exact' ? `Exact amount (${group.currency})` : form.split_type === 'percentage' ? 'Percentage' : 'Rule'}</th><th className="text-end">Calculated owed amount</th></tr></thead>
              <tbody>
                {members.map((member) => {
                  const selected = Boolean(participantValues[member.member_id]?.selected);
                  return (
                    <tr key={member.member_id} className={selected ? '' : 'table-secondary'}>
                      <td><input className="form-check-input" type="checkbox" checked={selected} onChange={() => toggleParticipant(member.member_id)} aria-label={`Include ${member.first_name} ${member.last_name}`} /></td>
                      <td>{member.first_name} {member.last_name}</td>
                      <td>
                        {selected && form.split_type !== 'equal' ? (
                          <div className="input-group input-group-sm split-input">
                            <input type="number" min={form.split_type === 'percentage' ? '0.01' : '0'} max={form.split_type === 'percentage' ? '100' : undefined} step="0.01" className="form-control" value={participantValues[member.member_id]?.value || ''} onChange={(event) => updateParticipant(member.member_id, event.target.value)} required />
                            {form.split_type === 'percentage' ? <span className="input-group-text">%</span> : null}
                          </div>
                        ) : selected ? <span className="text-secondary">Calculated equally</span> : '-'}
                      </td>
                      <td className="text-end fw-semibold">{selected ? formatMoney(previewByMember[member.member_id] || 0, group.currency) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {form.split_type === 'exact' ? (
            <div className={`alert ${Math.round(exactTotal * 100) === amountCents ? 'alert-success' : 'alert-warning'}`}>Exact split total: <strong>{formatMoney(exactTotal, group.currency)}</strong> / {formatMoney(amountCents / 100, group.currency)}</div>
          ) : null}
          {form.split_type === 'percentage' ? (
            <div className={`alert ${Math.round(percentageTotal * 100) === 10000 ? 'alert-success' : 'alert-warning'}`}>Percentage total: <strong>{percentageTotal.toFixed(2)}%</strong> / 100.00%</div>
          ) : null}

          <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Saving expense...' : 'Save expense'}</button>
        </div>
      </form>
    </div>
  );
}
