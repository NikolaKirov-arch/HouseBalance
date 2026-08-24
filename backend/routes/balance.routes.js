const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireGroupMember } = require('../middleware/group');
const { calculateBalances, createSettlementPlan } = require('../utils/balance');

const router = express.Router();

router.get('/:groupId/balances', auth, requireGroupMember, async (req, res, next) => {
  try {
    const balances = await calculateBalances(pool, req.member.group_id);
    return res.json({
      group_id: req.member.group_id,
      calculation: 'total_paid - total_owed + settlements_paid - settlements_received',
      balances
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:groupId/settlement-plan', auth, requireGroupMember, async (req, res, next) => {
  try {
    const balances = await calculateBalances(pool, req.member.group_id);
    const payments = createSettlementPlan(balances);
    return res.json({
      group_id: req.member.group_id,
      payments,
      payment_count: payments.length,
      note: 'This is a generated suggestion. A payment affects balances only after it is recorded as a settlement.'
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:groupId/dashboard', auth, requireGroupMember, async (req, res, next) => {
  try {
    const groupId = req.member.group_id;
    const balances = await calculateBalances(pool, groupId);

    const [expenseSummary] = await pool.execute(
      `SELECT COUNT(*) AS expense_count, COALESCE(SUM(amount), 0) AS total_expenses
       FROM expense WHERE group_id = ?`,
      [groupId]
    );
    const [settlementSummary] = await pool.execute(
      `SELECT COUNT(*) AS settlement_count, COALESCE(SUM(amount), 0) AS total_settlements
       FROM settlement WHERE group_id = ?`,
      [groupId]
    );
    const [memberSummary] = await pool.execute(
      `SELECT COUNT(*) AS member_count
       FROM group_member WHERE group_id = ? AND member_status = 'active'`,
      [groupId]
    );
    const [recentExpenses] = await pool.execute(
      `SELECT e.id, e.amount, e.description,
              DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
              e.split_type, ec.name AS category_name,
              CONCAT(ua.first_name, ' ', ua.last_name) AS payer_name
       FROM expense e
       JOIN group_member gm ON gm.id = e.payer_member_id
       JOIN user_account ua ON ua.id = gm.user_id
       LEFT JOIN expense_category ec ON ec.id = e.category_id
       WHERE e.group_id = ?
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT 5`,
      [groupId]
    );
    const [recentSettlements] = await pool.execute(
      `SELECT s.id, s.amount, DATE_FORMAT(s.settlement_date, '%Y-%m-%d') AS settlement_date,
              s.note,
              CONCAT(payer.first_name, ' ', payer.last_name) AS payer_name,
              CONCAT(receiver.first_name, ' ', receiver.last_name) AS receiver_name
       FROM settlement s
       JOIN group_member payer_member ON payer_member.id = s.payer_member_id
       JOIN user_account payer ON payer.id = payer_member.user_id
       JOIN group_member receiver_member ON receiver_member.id = s.receiver_member_id
       JOIN user_account receiver ON receiver.id = receiver_member.user_id
       WHERE s.group_id = ?
       ORDER BY s.settlement_date DESC, s.created_at DESC
       LIMIT 5`,
      [groupId]
    );

    return res.json({
      group: {
        id: groupId,
        name: req.member.group_name,
        currency: req.member.currency,
        current_member: { id: req.member.id, role: req.member.role }
      },
      summary: {
        ...expenseSummary[0],
        ...settlementSummary[0],
        ...memberSummary[0]
      },
      balances,
      recent_expenses: recentExpenses,
      recent_settlements: recentSettlements
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
