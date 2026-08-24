import { formatMoney } from '../utils';

export default function SettlementPlanTable({ payments, currency, onUsePayment }) {
  if (!payments || payments.length === 0) {
    return <div className="alert alert-success mb-0">Everyone is settled. No payments are needed.</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>Payer</th>
            <th>Receiver</th>
            <th className="text-end">Suggested amount</th>
            {onUsePayment ? <th aria-label="Actions" /> : null}
          </tr>
        </thead>
        <tbody>
          {payments.map((payment, index) => (
            <tr key={`${payment.payer_member_id}-${payment.receiver_member_id}-${index}`}>
              <td>{index + 1}</td>
              <td><strong>{payment.payer_name}</strong></td>
              <td><strong>{payment.receiver_name}</strong></td>
              <td className="text-end fw-bold text-primary">{formatMoney(payment.amount, currency)}</td>
              {onUsePayment ? (
                <td className="text-end">
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => onUsePayment(payment)}
                  >
                    Use this payment
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

