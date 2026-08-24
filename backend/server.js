const fs = require('fs');
const path = require('path');
const express = require('express');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const groupRoutes = require('./routes/group.routes');
const invitationRoutes = require('./routes/invitation.routes');
const categoryRoutes = require('./routes/category.routes');
const expenseRoutes = require('./routes/expense.routes');
const settlementRoutes = require('./routes/settlement.routes');
const balanceRoutes = require('./routes/balance.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();
const port = Number(process.env.PORT || 5000);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return res.status(503).json({ status: 'error', database: 'disconnected', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', invitationRoutes);
app.use('/api/groups', categoryRoutes);
app.use('/api/groups', expenseRoutes);
app.use('/api/groups', settlementRoutes);
app.use('/api/groups', balanceRoutes);
app.use('/api/groups', auditRoutes);
app.use('/api/groups', groupRoutes);

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use((req, res) => {
  return res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'A record with the same unique value already exists.' });
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'A referenced record does not exist.' });
  }

  return res.status(500).json({ error: 'An unexpected server error occurred.' });
});

if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing. Copy .env.example to .env and configure it.');
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`HouseBalance API is running on http://localhost:${port}`);
  });
}

module.exports = app;
