const pool = require('../config/db');

async function requireGroupMember(req, res, next) {
  try {
    const groupId = Number(req.params.groupId);

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return res.status(400).json({ error: 'A valid group id is required.' });
    }

    const [memberships] = await pool.execute(
      `SELECT gm.id, gm.user_id, gm.group_id, gm.role, gm.joined_at,
              hg.name AS group_name, hg.currency, hg.created_at AS group_created_at
       FROM group_member gm
       JOIN household_group hg ON hg.id = gm.group_id
       WHERE gm.group_id = ?
         AND gm.user_id = ?
         AND gm.member_status = 'active'`,
      [groupId, req.user.id]
    );

    if (memberships.length === 0) {
      return res.status(403).json({ error: 'You are not an active member of this group.' });
    }

    req.member = memberships[0];
    return next();
  } catch (error) {
    return next(error);
  }
}

function requireGroupAdmin(req, res, next) {
  if (!req.member || req.member.role !== 'admin') {
    return res.status(403).json({ error: 'Only a group administrator can perform this action.' });
  }

  return next();
}

module.exports = { requireGroupMember, requireGroupAdmin };

