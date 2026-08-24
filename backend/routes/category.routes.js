const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { requireGroupMember, requireGroupAdmin } = require('../middleware/group');
const addAuditLog = require('../utils/audit');

const router = express.Router();

router.get('/:groupId/categories', auth, requireGroupMember, async (req, res, next) => {
  try {
    const [categories] = await pool.execute(
      `SELECT id, group_id, name, is_default, is_active
       FROM expense_category
       WHERE group_id = ?
       ORDER BY is_active DESC, is_default DESC, name`,
      [req.member.group_id]
    );

    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/:groupId/categories',
  auth,
  requireGroupMember,
  requireGroupAdmin,
  async (req, res, next) => {
    const name = String(req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Category name may contain at most 100 characters.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO expense_category (group_id, name, is_default, is_active)
         VALUES (?, ?, FALSE, TRUE)`,
        [req.member.group_id, name]
      );

      await addAuditLog(connection, {
        groupId: req.member.group_id,
        actorMemberId: req.member.id,
        actionType: 'category_created',
        entityType: 'expense_category',
        entityId: result.insertId,
        description: `Created category ${name}`
      });

      await connection.commit();
      return res.status(201).json({
        message: 'Category created successfully.',
        category: { id: result.insertId, name, is_default: 0, is_active: 1 }
      });
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'A category with this name already exists in the group.' });
      }
      return next(error);
    } finally {
      connection.release();
    }
  }
);

router.patch(
  '/:groupId/categories/:categoryId/deactivate',
  auth,
  requireGroupMember,
  requireGroupAdmin,
  async (req, res, next) => {
    const categoryId = Number(req.params.categoryId);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ error: 'A valid category id is required.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [categories] = await connection.execute(
        `SELECT id, name, is_active
         FROM expense_category
         WHERE id = ? AND group_id = ?
         FOR UPDATE`,
        [categoryId, req.member.group_id]
      );

      if (categories.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Category was not found in this group.' });
      }
      if (!categories[0].is_active) {
        await connection.rollback();
        return res.status(400).json({ error: 'Category is already inactive.' });
      }

      await connection.execute('UPDATE expense_category SET is_active = FALSE WHERE id = ?', [categoryId]);
      await addAuditLog(connection, {
        groupId: req.member.group_id,
        actorMemberId: req.member.id,
        actionType: 'category_deactivated',
        entityType: 'expense_category',
        entityId: categoryId,
        description: `Deactivated category ${categories[0].name}`
      });

      await connection.commit();
      return res.json({ message: 'Category deactivated successfully.' });
    } catch (error) {
      await connection.rollback();
      return next(error);
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
