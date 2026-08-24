import { formatDate, formatMoney } from '../utils';

export default function SettlementTable({ settlements, currency }) {
  if (!settlements || settlements.length === 0) {
    return <p className="text-secondary mb-0">No settlement payments have been recorded yet.</p>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Payer</th>
            <th>Receiver</th>
            <th>Note</th>
            <th className="text-end">Amount</th>
          </tr>
        </thead>
        <tbody>
          {settlements.map((settlement) => (
            <tr key={settlement.id}>
              <td>{formatDate(settlement.settlement_date)}</td>
              <td>{settlement.payer_name}</td>
              <td>{settlement.receiver_name}</td>
              <td>{settlement.note || <span className="text-secondary">-</span>}</td>
              <td className="text-end fw-semibold">{formatMoney(settlement.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

