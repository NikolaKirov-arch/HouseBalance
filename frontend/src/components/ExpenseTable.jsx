import { formatDate, formatMoney } from '../utils';

export default function ExpenseTable({ expenses, currency, onDelete }) {
  if (!expenses || expenses.length === 0) {
    return <p className="text-secondary mb-0">No expenses have been recorded yet.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Payer</th>
            <th>Category</th>
            <th>Split</th>
            <th>Participants</th>
            <th className="text-end">Amount</th>
            {onDelete ? <th aria-label="Actions" /> : null}
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>{formatDate(expense.expense_date)}</td>
              <td>{expense.description || <span className="text-secondary">No description</span>}</td>
              <td>{expense.payer_name}</td>
              <td>{expense.category_name || 'Uncategorized'}</td>
              <td><span className="badge text-bg-light border text-capitalize">{expense.split_type}</span></td>
              <td>
                {expense.splits?.length ? expense.splits.map((split) => (
                  <div className="small" key={split.id || split.member_id}>
                    {split.member_name}: {formatMoney(split.owed_amount, currency)}
                    {split.percentage !== null && split.percentage !== undefined
                      ? ` (${Number(split.percentage).toFixed(2)}%)`
                      : ''}
                  </div>
                )) : <span className="text-secondary">-</span>}
              </td>
              <td className="text-end fw-semibold">{formatMoney(expense.amount, currency)}</td>
              {onDelete ? (
                <td className="text-end">
                  {expense.can_delete ? (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => onDelete(expense)}
                    >
                      Delete
                    </button>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

