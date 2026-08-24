const crypto = require('crypto');
const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireGroupMember, requireGroupAdmin } = require('../middleware/group');
const addAuditLog = require('../utils/audit');

const router = express.Router();

router.get('/invitations', auth, async (req, res, next) => {
  try {
    await pool.execute(
      `UPDATE group_invitation
       SET status = 'expired'
       WHERE invited_user_id = ?
         AND status = 'pending'
         AND expires_at IS NOT NULL
         AND expires_at < NOW()`,
      [req.user.id]
    );

    const [invitations] = await pool.execute(
      `SELECT gi.id, gi.invitation_code, gi.status, gi.created_at, gi.expires_at,
              hg.id AS group_id, hg.name AS group_name, hg.currency,
              CONCAT(inviter.first_name, ' ', inviter.last_name) AS invited_by_name
       FROM group_invitation gi
       JOIN household_group hg ON hg.id = gi.group_id
       JOIN group_member inviter_member ON inviter_member.id = gi.invited_by_member_id
       JOIN user_account inviter ON inviter.id = inviter_member.user_id
       WHERE gi.invited_user_id = ? AND gi.status = 'pending'
       ORDER BY gi.created_at DESC`,
      [req.user.id]
    );

    return res.json({ invitations });
  } catch (error) {
    return next(error);
  }
});

router.post('/invitations/accept', auth, async (req, res, next) => {
  const invitationCode = String(req.body.invitation_code || '').trim();
  if (!invitationCode) {
    return res.status(400).json({ error: 'Invitation code is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [invitations] = await connection.execute(
      `SELECT id, group_id, invited_user_id, status, expires_at
       FROM group_invitation
       WHERE invitation_code = ?
       FOR UPDATE`,
      [invitationCode]
    );

    if (invitations.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invitation was not found.' });
    }

    const invitation = invitations[0];
    if (invitation.invited_user_id !== req.user.id) {
      await connection.rollback();
      return res.status(403).json({ error: 'This invitation belongs to another user.' });
    }
    if (invitation.status !== 'pending') {
      await connection.rollback();
      return res.status(400).json({ error: `This invitation is ${invitation.status}.` });
    }
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await connection.execute(
        "UPDATE group_invitation SET status = 'expired' WHERE id = ?",
        [invitation.id]
      );
      await connection.commit();
      return res.status(400).json({ error: 'This invitation has expired.' });
    }

    const [existingMemberships] = await connection.execute(
      `SELECT id, member_status
       FROM group_member
       WHERE group_id = ? AND user_id = ?
       FOR UPDATE`,
      [invitation.group_id, req.user.id]
    );

    let memberId;
    if (existingMemberships.length > 0) {
      if (existingMemberships[0].member_status === 'active') {
        await connection.rollback();
        return res.status(409).json({ error: 'You are already a member of this group.' });
      }

      memberId = existingMemberships[0].id;
      await connection.execute(
        `UPDATE group_member
         SET member_status = 'active', role = 'member', joined_at = NOW()
         WHERE id = ?`,
        [memberId]
      );
    } else {
      const [memberResult] = await connection.execute(
        `INSERT INTO group_member (user_id, group_id, role)
         VALUES (?, ?, 'member')`,
        [req.user.id, invitation.group_id]
      );
      memberId = memberResult.insertId;
    }

    await connection.execute(
      "UPDATE group_invitation SET status = 'accepted' WHERE id = ?",
      [invitation.id]
    );
    await addAuditLog(connection, {
      groupId: invitation.group_id,
      actorMemberId: memberId,
      actionType: 'member_joined',
      entityType: 'group_member',
      entityId: memberId,
      description: `${req.user.first_name} ${req.user.last_name} joined the group`
    });

    await connection.commit();
    return res.json({
      message: 'Invitation accepted successfully.',
      group_id: invitation.group_id
    });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

router.get(
  '/groups/:groupId/invitations',
  auth,
  requireGroupMember,
  requireGroupAdmin,
  async (req, res, next) => {
    try {
      await pool.execute(
        `UPDATE group_invitation
         SET status = 'expired'
         WHERE group_id = ?
           AND status = 'pending'
           AND expires_at IS NOT NULL
           AND expires_at < NOW()`,
        [req.member.group_id]
      );

      const [invitations] = await pool.execute(
        `SELECT gi.id, gi.invitation_code, gi.status, gi.created_at, gi.expires_at,
                ua.first_name, ua.last_name, ua.email
         FROM group_invitation gi
         JOIN user_account ua ON ua.id = gi.invited_user_id
         WHERE gi.group_id = ?
         ORDER BY gi.created_at DESC`,
        [req.member.group_id]
      );

      return res.json({ invitations });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  '/groups/:groupId/invitations',
  auth,
  requireGroupMember,
  requireGroupAdmin,
  async (req, res, next) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    const expiresInDays = Number(req.body.expires_in_days || 7);

    if (!email) {
      return res.status(400).json({ error: 'The invited user email is required.' });
    }
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      return res.status(400).json({ error: 'Invitation duration must be between 1 and 30 days.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [users] = await connection.execute(
        "SELECT id, first_name, last_name FROM user_account WHERE email = ? AND status = 'active'",
        [email]
      );
      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'No active registered user has this email address.' });
      }

      const invitedUser = users[0];
      const [memberships] = await connection.execute(
        `SELECT id FROM group_member
         WHERE group_id = ? AND user_id = ? AND member_status = 'active'`,
        [req.member.group_id, invitedUser.id]
      );
      if (memberships.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'This user is already a group member.' });
      }

      const [pendingInvitations] = await connection.execute(
        `SELECT id FROM group_invitation
         WHERE group_id = ? AND invited_user_id = ? AND status = 'pending'
           AND (expires_at IS NULL OR expires_at > NOW())`,
        [req.member.group_id, invitedUser.id]
      );
      if (pendingInvitations.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: 'This user already has a pending invitation.' });
      }

      const invitationCode = crypto.randomBytes(24).toString('hex');
      const [result] = await connection.execute(
        `INSERT INTO group_invitation
           (group_id, invited_user_id, invited_by_member_id, invitation_code, expires_at)
         VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))`,
        [req.member.group_id, invitedUser.id, req.member.id, invitationCode, expiresInDays]
      );

      await addAuditLog(connection, {
        groupId: req.member.group_id,
        actorMemberId: req.member.id,
        actionType: 'member_invited',
        entityType: 'group_invitation',
        entityId: result.insertId,
        description: `Invited ${invitedUser.first_name} ${invitedUser.last_name} (${email})`
      });

      await connection.commit();
      return res.status(201).json({
        message: 'Invitation created successfully.',
        invitation: {
          id: result.insertId,
          invitation_code: invitationCode,
          email,
          status: 'pending'
        }
      });
    } catch (error) {
      await connection.rollback();
      return next(error);
    } finally {
      connection.release();
    }
  }
);

module.exports = router;

