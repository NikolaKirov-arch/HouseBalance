function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

async function calculateBalances(database, groupId) {
  const [members] = await database.execute(
    `SELECT gm.id AS member_id, gm.role, ua.id AS user_id,
            ua.first_name, ua.last_name, ua.email
     FROM group_member gm
     JOIN user_account ua ON ua.id = gm.user_id
     WHERE gm.group_id = ? AND gm.member_status = 'active'
     ORDER BY ua.first_name, ua.last_name`,
    [groupId]
  );

  const [expensePayments] = await database.execute(
    `SELECT payer_member_id AS member_id, SUM(amount) AS total_paid
     FROM expense
     WHERE group_id = ?
     GROUP BY payer_member_id`,
    [groupId]
  );

  const [expenseDebts] = await database.execute(
    `SELECT es.member_id, SUM(es.owed_amount) AS total_owed
     FROM expense_split es
     JOIN expense e ON e.id = es.expense_id
     WHERE e.group_id = ?
     GROUP BY es.member_id`,
    [groupId]
  );

  const [settlementsPaid] = await database.execute(
    `SELECT payer_member_id AS member_id, SUM(amount) AS settlements_paid
     FROM settlement
     WHERE group_id = ?
     GROUP BY payer_member_id`,
    [groupId]
  );

  const [settlementsReceived] = await database.execute(
    `SELECT receiver_member_id AS member_id, SUM(amount) AS settlements_received
     FROM settlement
     WHERE group_id = ?
     GROUP BY receiver_member_id`,
    [groupId]
  );

  const paidByMember = new Map(expensePayments.map((row) => [row.member_id, Number(row.total_paid)]));
  const owedByMember = new Map(expenseDebts.map((row) => [row.member_id, Number(row.total_owed)]));
  const sentByMember = new Map(settlementsPaid.map((row) => [row.member_id, Number(row.settlements_paid)]));
  const receivedByMember = new Map(
    settlementsReceived.map((row) => [row.member_id, Number(row.settlements_received)])
  );

  return members.map((member) => {
    const totalPaid = roundMoney(paidByMember.get(member.member_id) || 0);
    const totalOwed = roundMoney(owedByMember.get(member.member_id) || 0);
    const totalSettlementsPaid = roundMoney(sentByMember.get(member.member_id) || 0);
    const totalSettlementsReceived = roundMoney(receivedByMember.get(member.member_id) || 0);
    const netBalance = roundMoney(
      totalPaid - totalOwed + totalSettlementsPaid - totalSettlementsReceived
    );

    return {
      ...member,
      full_name: `${member.first_name} ${member.last_name}`,
      total_paid: totalPaid,
      total_owed: totalOwed,
      settlements_paid: totalSettlementsPaid,
      settlements_received: totalSettlementsReceived,
      net_balance: netBalance
    };
  });
}

function createSettlementPlan(balances) {
  const debtors = balances
    .filter((member) => member.net_balance < -0.005)
    .map((member) => ({ ...member, remaining: Math.abs(Math.round(member.net_balance * 100)) }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((member) => member.net_balance > 0.005)
    .map((member) => ({ ...member, remaining: Math.round(member.net_balance * 100) }))
    .sort((a, b) => b.remaining - a.remaining);

  const payments = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const paymentCents = Math.min(debtor.remaining, creditor.remaining);

    if (paymentCents > 0) {
      payments.push({
        payer_member_id: debtor.member_id,
        payer_name: debtor.full_name,
        receiver_member_id: creditor.member_id,
        receiver_name: creditor.full_name,
        amount: paymentCents / 100
      });
    }

    debtor.remaining -= paymentCents;
    creditor.remaining -= paymentCents;

    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return payments;
}

module.exports = { calculateBalances, createSettlementPlan, roundMoney };

