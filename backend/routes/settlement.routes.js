const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireGroupMember } = require('../middleware/group');
const addAuditLog = require('../utils/audit');
const { toCents } = require('../utils/split');

const router = express.Router();

function validDate(date) {
  const text = String(date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return year >= 1000 && parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

router.get('/:groupId/settlements', auth, requireGroupMember, async (req, res, next) => {
  try {
    const [settlements] = await pool.execute(
      `SELECT s.id, s.group_id, s.payer_member_id, s.receiver_member_id,
              s.created_by_member_id, s.amount,
              DATE_FORMAT(s.settlement_date, '%Y-%m-%d') AS settlement_date,
              s.note, s.created_at,
              CONCAT(payer.first_name, ' ', payer.last_name) AS payer_name,
              CONCAT(receiver.first_name, ' ', receiver.last_name) AS receiver_name,
              CONCAT(creator.first_name, ' ', creator.last_name) AS created_by_name
       FROM settlement s
       JOIN group_member payer_member ON payer_member.id = s.payer_member_id
       JOIN user_account payer ON payer.id = payer_member.user_id
       JOIN group_member receiver_member ON receiver_member.id = s.receiver_member_id
       JOIN user_account receiver ON receiver.id = receiver_member.user_id
       JOIN group_member creator_member ON creator_member.id = s.created_by_member_id
       JOIN user_account creator ON creator.id = creator_member.user_id
       WHERE s.group_id = ?
       ORDER BY s.settlement_date DESC, s.created_at DESC`,
      [req.member.group_id]
    );

    return res.json({ settlements });
  } catch (error) {
    return next(error);
  }
});

router.post('/:groupId/settlements', auth, requireGroupMember, async (req, res, next) => {
  const payerMemberId = Number(req.body.payer_member_id);
  const receiverMemberId = Number(req.body.receiver_member_id);
  const settlementDate = String(req.body.settlement_date || '');
  const note = String(req.body.note || '').trim() || null;

  if (!Number.isInteger(payerMemberId) || payerMemberId <= 0 ||
      !Number.isInteger(receiverMemberId) || receiverMemberId <= 0) {
    return res.status(400).json({ error: 'Select a valid payer and receiver.' });
  }
  if (payerMemberId === receiverMemberId) {
    return res.status(400).json({ error: 'Payer and receiver must be different members.' });
  }
  if (!validDate(settlementDate)) {
    return res.status(400).json({ error: 'Settlement date must use the YYYY-MM-DD format.' });
  }
  if (note && note.length > 255) {
    return res.status(400).json({ error: 'Settlement note may contain at most 255 characters.' });
  }

  let amountCents;
  try {
    amountCents = toCents(req.body.amount, 'Settlement amount');
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  if (amountCents <= 0) {
    return res.status(400).json({ error: 'Settlement amount must be greater than zero.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [members] = await connection.query(
      `SELECT id FROM group_member
       WHERE group_id = ? AND member_status = 'active' AND id IN (?, ?)`,
      [req.member.group_id, payerMemberId, receiverMemberId]
    );
    if (members.length !== 2) {
      await connection.rollback();
      return res.status(400).json({ error: 'Payer and receiver must be active members of this group.' });
    }

    const [result] = await connection.execute(
      `INSERT INTO settlement
         (group_id, payer_member_id, receiver_member_id, created_by_member_id,
          amount, settlement_date, note)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.member.group_id,
        payerMemberId,
        receiverMemberId,
        req.member.id,
        amountCents / 100,
        settlementDate,
        note
      ]
    );

    await addAuditLog(connection, {
      groupId: req.member.group_id,
      actorMemberId: req.member.id,
      actionType: 'settlement_created',
      entityType: 'settlement',
      entityId: result.insertId,
      description: `Recorded settlement payment of ${(amountCents / 100).toFixed(2)}`
    });

    await connection.commit();
    return res.status(201).json({
      message: 'Settlement recorded successfully.',
      settlement: {
        id: result.insertId,
        payer_member_id: payerMemberId,
        receiver_member_id: receiverMemberId,
        amount: amountCents / 100,
        settlement_date: settlementDate,
        note
      }
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

module.exports = router;
