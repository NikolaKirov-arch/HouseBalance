const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireGroupMember } = require('../middleware/group');
const addAuditLog = require('../utils/audit');
const { validateAndBuildSplits } = require('../utils/split');

const router = express.Router();

function validDate(date) {
  const text = String(date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

router.get('/:groupId/expenses', auth, requireGroupMember, async (req, res, next) => {
  try {
    const [expenses] = await pool.execute(
      `SELECT e.id, e.group_id, e.payer_member_id, e.category_id, e.amount,
              e.description, DATE_FORMAT(e.expense_date, '%Y-%m-%d') AS expense_date,
              e.split_type, e.created_by_member_id, e.created_at,
              CONCAT(payer.first_name, ' ', payer.last_name) AS payer_name,
              ec.name AS category_name,
              CONCAT(creator.first_name, ' ', creator.last_name) AS created_by_name
       FROM expense e
       JOIN group_member payer_member ON payer_member.id = e.payer_member_id
       JOIN user_account payer ON payer.id = payer_member.user_id
       JOIN group_member creator_member ON creator_member.id = e.created_by_member_id
       JOIN user_account creator ON creator.id = creator_member.user_id
       LEFT JOIN expense_category ec ON ec.id = e.category_id
       WHERE e.group_id = ?
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      [req.member.group_id]
    );

    const splitsByExpense = new Map();
    if (expenses.length > 0) {
      const [splits] = await pool.execute(
        `SELECT es.id, es.expense_id, es.member_id, es.owed_amount, es.percentage,
                CONCAT(ua.first_name, ' ', ua.last_name) AS member_name
         FROM expense_split es
         JOIN expense e ON e.id = es.expense_id
         JOIN group_member gm ON gm.id = es.member_id
         JOIN user_account ua ON ua.id = gm.user_id
         WHERE e.group_id = ?
         ORDER BY es.id`,
        [req.member.group_id]
      );

      for (const split of splits) {
        if (!splitsByExpense.has(split.expense_id)) {
          splitsByExpense.set(split.expense_id, []);
        }
        splitsByExpense.get(split.expense_id).push(split);
      }
    }

    const result = expenses.map((expense) => ({
      ...expense,
      can_delete:
        req.member.role === 'admin' || expense.created_by_member_id === req.member.id,
      splits: splitsByExpense.get(expense.id) || []
    }));

    return res.json({ expenses: result });
  } catch (error) {
    return next(error);
  }
});

router.post('/:groupId/expenses', auth, requireGroupMember, async (req, res, next) => {
  const payerMemberId = Number(req.body.payer_member_id);
  const categoryId = req.body.category_id ? Number(req.body.category_id) : null;
  const description = String(req.body.description || '').trim() || null;
  const expenseDate = String(req.body.expense_date || '');
  const splitType = String(req.body.split_type || '');

  if (!Number.isInteger(payerMemberId) || payerMemberId <= 0) {
    return res.status(400).json({ error: 'Select a valid payer.' });
  }
  if (categoryId !== null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    return res.status(400).json({ error: 'Select a valid category.' });
  }
  if (!validDate(expenseDate)) {
    return res.status(400).json({ error: 'Expense date must use the YYYY-MM-DD format.' });
  }

  let builtSplits;
  try {
    builtSplits = validateAndBuildSplits({
      amount: req.body.amount,
      splitType,
      splits: req.body.splits
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const participantIds = builtSplits.map((split) => split.member_id);
  const allMemberIds = [...new Set([payerMemberId, ...participantIds])];
  const placeholders = allMemberIds.map(() => '?').join(', ');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [activeMembers] = await connection.query(
      `SELECT id FROM group_member
       WHERE group_id = ? AND member_status = 'active'
         AND id IN (${placeholders})`,
      [req.member.group_id, ...allMemberIds]
    );
    if (activeMembers.length !== allMemberIds.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'Payer and all participants must be active members of this group.' });
    }

    if (categoryId !== null) {
      const [categories] = await connection.execute(
        `SELECT id FROM expense_category
         WHERE id = ? AND group_id = ? AND is_active = TRUE`,
        [categoryId, req.member.group_id]
      );
      if (categories.length === 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'The selected category is not active in this group.' });
      }
    }

    const [expenseResult] = await connection.execute(
      `INSERT INTO expense
         (group_id, payer_member_id, category_id, amount, description,
          expense_date, split_type, created_by_member_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.member.group_id,
        payerMemberId,
        categoryId,
        Number(req.body.amount),
        description,
        expenseDate,
        splitType,
        req.member.id
      ]
    );

    for (const split of builtSplits) {
      await connection.execute(
        `INSERT INTO expense_split (expense_id, member_id, owed_amount, percentage)
         VALUES (?, ?, ?, ?)`,
        [expenseResult.insertId, split.member_id, split.owed_amount, split.percentage]
      );
    }

    await addAuditLog(connection, {
      groupId: req.member.group_id,
      actorMemberId: req.member.id,
      actionType: 'expense_created',
      entityType: 'expense',
      entityId: expenseResult.insertId,
      description: `Created ${Number(req.body.amount).toFixed(2)} expense${description ? `: ${description}` : ''}`
    });

    await connection.commit();
    return res.status(201).json({
      message: 'Expense created successfully.',
      expense: {
        id: expenseResult.insertId,
        group_id: req.member.group_id,
        amount: Number(req.body.amount),
        split_type: splitType,
        splits: builtSplits
      }
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

router.delete('/:groupId/expenses/:expenseId', auth, requireGroupMember, async (req, res, next) => {
  const expenseId = Number(req.params.expenseId);
  if (!Number.isInteger(expenseId) || expenseId <= 0) {
    return res.status(400).json({ error: 'A valid expense id is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [expenses] = await connection.execute(
      `SELECT id, amount, description, created_by_member_id
       FROM expense
       WHERE id = ? AND group_id = ?
       FOR UPDATE`,
      [expenseId, req.member.group_id]
    );

    if (expenses.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Expense was not found in this group.' });
    }

    const expense = expenses[0];
    if (req.member.role !== 'admin' && expense.created_by_member_id !== req.member.id) {
      await connection.rollback();
      return res.status(403).json({ error: 'Only the expense creator or a group administrator can delete it.' });
    }

    await connection.execute('DELETE FROM expense WHERE id = ?', [expenseId]);
    await addAuditLog(connection, {
      groupId: req.member.group_id,
      actorMemberId: req.member.id,
      actionType: 'expense_deleted',
      entityType: 'expense',
      entityId: expenseId,
      description: `Deleted ${Number(expense.amount).toFixed(2)} expense${expense.description ? `: ${expense.description}` : ''}`
    });

    await connection.commit();
    return res.json({ message: 'Expense deleted successfully.' });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
