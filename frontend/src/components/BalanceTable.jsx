import { formatMoney } from '../utils';

export default function BalanceTable({ balances, currency }) {
  if (!balances || balances.length === 0) {
    return <p className="text-secondary mb-0">No active members are available.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Member</th>
            <th className="text-end">Paid expenses</th>
            <th className="text-end">Owed share</th>
            <th className="text-end">Payments sent</th>
            <th className="text-end">Payments received</th>
            <th className="text-end">Net balance</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          {balances.map((balance) => {
            const positive = Number(balance.net_balance) > 0.005;
            const negative = Number(balance.net_balance) < -0.005;
            return (
              <tr key={balance.member_id}>
                <td>
                  <strong>{balance.full_name}</strong>
                  <div className="small text-secondary">{balance.email}</div>
                </td>
                <td className="text-end">{formatMoney(balance.total_paid, currency)}</td>
                <td className="text-end">{formatMoney(balance.total_owed, currency)}</td>
                <td className="text-end">{formatMoney(balance.settlements_paid, currency)}</td>
                <td className="text-end">{formatMoney(balance.settlements_received, currency)}</td>
                <td className={`text-end fw-bold ${positive ? 'text-success' : negative ? 'text-danger' : ''}`}>
                  {positive ? '+' : ''}{formatMoney(balance.net_balance, currency)}
                </td>
                <td>
                  {positive ? (
                    <span className="badge text-bg-success">is owed money</span>
                  ) : negative ? (
                    <span className="badge text-bg-danger">owes money</span>
                  ) : (
                    <span className="badge text-bg-secondary">settled</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

