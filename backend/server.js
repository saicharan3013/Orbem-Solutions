const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const db = require('./db');
const scheduleDueEmailReminders = require('./services/scheduleDueEmailReminders');

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://orbem-solutions.vercel.app"
  ],
  credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/activity-logs', require('./routes/activityLogs'));

// Serve scripts directory (for developer-only access to generated PDFs)
const path = require('path');
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'PayFlow API running' }));

app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`✅ PayFlow server running on http://localhost:${PORT}`);
  
  // Test database connection
  try {
    const [[result]] = await db.query('SELECT 1');
    console.log('✅ Connected to TiDB Cloud database');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
  
  // Initialize scheduled email reminders for due dates
  try {
    scheduleDueEmailReminders();
    console.log('✅ Scheduled email reminders initialized');
  } catch (error) {
    console.error('❌ Failed to initialize scheduled reminders:', error.message);
  }
});
