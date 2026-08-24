const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireGroupMember } = require('../middleware/group');
const addAuditLog = require('../utils/audit');

const router = express.Router();
const DEFAULT_CATEGORIES = ['Rent', 'Utilities', 'Groceries', 'Internet', 'Cleaning', 'Other'];

router.use(auth);

router.post('/', async (req, res, next) => {
  const name = String(req.body.name || '').trim();
  const currency = String(req.body.currency || 'EUR').trim().toUpperCase();

  if (!name) {
    return res.status(400).json({ error: 'Group name is required.' });
  }
  if (name.length > 150) {
    return res.status(400).json({ error: 'Group name may contain at most 150 characters.' });
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return res.status(400).json({ error: 'Currency must be a three-letter code such as EUR.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [groupResult] = await connection.execute(
      'INSERT INTO household_group (name, currency) VALUES (?, ?)',
      [name, currency]
    );
    const groupId = groupResult.insertId;

    const [memberResult] = await connection.execute(
      `INSERT INTO group_member (user_id, group_id, role)
       VALUES (?, ?, 'admin')`,
      [req.user.id, groupId]
    );

    for (const categoryName of DEFAULT_CATEGORIES) {
      await connection.execute(
        `INSERT INTO expense_category (group_id, name, is_default, is_active)
         VALUES (?, ?, TRUE, TRUE)`,
        [groupId, categoryName]
      );
    }

    await addAuditLog(connection, {
      groupId,
      actorMemberId: memberResult.insertId,
      actionType: 'group_created',
      entityType: 'household_group',
      entityId: groupId,
      description: `Created household group ${name}`
    });

    await connection.commit();
    return res.status(201).json({
      message: 'Household group created successfully.',
      group: {
        id: groupId,
        name,
        currency,
        current_member: { id: memberResult.insertId, role: 'admin' }
      }
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

router.get('/', async (req, res, next) => {
  try {
    const [groups] = await pool.execute(
      `SELECT hg.id, hg.name, hg.currency, hg.created_at,
              gm.id AS member_id, gm.role,
              (SELECT COUNT(*)
               FROM group_member all_members
               WHERE all_members.group_id = hg.id
                 AND all_members.member_status = 'active') AS member_count,
              (SELECT COALESCE(SUM(e.amount), 0)
               FROM expense e
               WHERE e.group_id = hg.id) AS total_expenses
       FROM household_group hg
       JOIN group_member gm ON gm.group_id = hg.id
       WHERE gm.user_id = ? AND gm.member_status = 'active'
       ORDER BY hg.created_at DESC`,
      [req.user.id]
    );

    return res.json({ groups });
  } catch (error) {
    return next(error);
  }
});

router.get('/:groupId', requireGroupMember, async (req, res, next) => {
  try {
    const [groups] = await pool.execute(
      `SELECT id, name, currency, created_at
       FROM household_group
       WHERE id = ?`,
      [req.member.group_id]
    );

    return res.json({
      group: {
        ...groups[0],
        current_member: {
          id: req.member.id,
          user_id: req.member.user_id,
          role: req.member.role,
          joined_at: req.member.joined_at
        }
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:groupId/members', requireGroupMember, async (req, res, next) => {
  try {
    const [members] = await pool.execute(
      `SELECT gm.id AS member_id, gm.role, gm.joined_at, gm.member_status,
              ua.id AS user_id, ua.first_name, ua.last_name, ua.email
       FROM group_member gm
       JOIN user_account ua ON ua.id = gm.user_id
       WHERE gm.group_id = ? AND gm.member_status = 'active'
       ORDER BY CASE WHEN gm.role = 'admin' THEN 0 ELSE 1 END,
                ua.first_name, ua.last_name`,
      [req.member.group_id]
    );

    return res.json({ members });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

