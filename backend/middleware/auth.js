const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function auth(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication token is required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, email, status, created_at
       FROM user_account
       WHERE id = ? AND status = 'active'`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'The user account is not active.' });
    }

    req.user = users[0];
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'The authentication token is invalid or expired.' });
    }

    return next(error);
  }
}

module.exports = auth;

