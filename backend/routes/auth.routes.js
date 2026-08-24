const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/register', async (req, res, next) => {
  try {
    const firstName = String(req.body.first_name || '').trim();
    const lastName = String(req.body.last_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required.' });
    }
    if (!validEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (firstName.length > 100 || lastName.length > 100 || email.length > 255) {
      return res.status(400).json({ error: 'One or more account fields are too long.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must contain at least 6 characters.' });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM user_account WHERE email = ?',
      [email]
    );
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO user_account (first_name, last_name, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [firstName, lastName, email, passwordHash]
    );

    const user = { id: result.insertId, first_name: firstName, last_name: lastName, email };
    return res.status(201).json({
      message: 'Account created successfully.',
      token: createToken(result.insertId),
      user
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, email, password_hash, status
       FROM user_account
       WHERE email = ?`,
      [email]
    );

    if (users.length === 0 || !(await bcrypt.compare(password, users[0].password_hash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    if (users[0].status !== 'active') {
      return res.status(403).json({ error: 'This user account is disabled.' });
    }

    const { password_hash: passwordHash, status, ...user } = users[0];
    return res.json({
      message: 'Login successful.',
      token: createToken(user.id),
      user
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', auth, (req, res) => {
  return res.json({ user: req.user });
});

module.exports = router;

