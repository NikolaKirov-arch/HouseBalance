const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireGroupMember } = require('../middleware/group');

const router = express.Router();

router.get('/:groupId/audit-log', auth, requireGroupMember, async (req, res, next) => {
  try {
    const [entries] = await pool.execute(
      `SELECT al.id, al.action_type, al.entity_type, al.entity_id,
              al.description, al.created_at,
              CONCAT(ua.first_name, ' ', ua.last_name) AS actor_name
       FROM audit_log al
       JOIN group_member gm ON gm.id = al.actor_member_id
       JOIN user_account ua ON ua.id = gm.user_id
       WHERE al.group_id = ?
       ORDER BY al.created_at DESC, al.id DESC`,
      [req.member.group_id]
    );

    return res.json({ entries });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
