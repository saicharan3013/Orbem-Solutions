const schedule = require('node-schedule');
const db = require('../db');
const sendDueEmailReminder = require('./sendDueEmailReminder');
const sendDueEmailNotification = require('./sendDueEmailNotification');
const sendOverdueEmailNotification = require('./sendOverdueEmailNotification');

/**
 * Schedule daily email reminders for invoice due dates
 * - Sends 1-day advance reminder (due_date = tomorrow)
 * - Sends due date notification (due_date = today)
 * - Sends overdue notification (past due date)
 */
function scheduleDueEmailReminders() {
  // Run at 9 AM every day
  const job = schedule.scheduleJob('0 9 * * *', async () => {
    console.log('⏰ Running scheduled due date email job at', new Date().toISOString());
    
    try {
      await sendTomorrowReminders();
      await sendTodayNotifications();
      await sendOverdueEmails();
    } catch (error) {
      console.error('❌ Error in scheduled due email job:', error);
    }
  });

  console.log('📧 Due date email reminder job scheduled (daily at 9 AM)');
  return job;
}

/**
 * Send 1-day advance reminders for invoices due tomorrow
 */
async function sendTomorrowReminders() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find invoices due tomorrow that haven't had reminder sent
    const [invoices] = await db.query(`
      SELECT
        i.*,
        c.name AS customer_name,
        c.email AS customer_email,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE DATE(i.due_date) = ?
        AND i.status IN ('sent', 'overdue')
        AND i.reminder_email_sent IS NULL
      GROUP BY i.id
    `, [tomorrowStr]);

    console.log(`📧 Found ${invoices.length} invoices due tomorrow`);

    for (const invoice of invoices) {
      try {
        if (!invoice.customer_email) {
          console.warn(`⚠️  No email for invoice ${invoice.invoice_number}`);
          continue;
        }

        // Send reminder email
        await sendDueEmailReminder(invoice.customer_email, invoice);

        // Mark as sent
        await db.query(
          'UPDATE invoices SET reminder_email_sent = NOW() WHERE id = ?',
          [invoice.id]
        );

        console.log(`✅ Sent 1-day reminder for invoice ${invoice.invoice_number}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder for ${invoice.invoice_number}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error sending tomorrow reminders:', error);
  }
}

/**
 * Send due date notifications for invoices due today
 */
async function sendTodayNotifications() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find invoices due today that haven't had notification sent
    const [invoices] = await db.query(`
      SELECT
        i.*,
        c.name AS customer_name,
        c.email AS customer_email,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE DATE(i.due_date) = ?
        AND i.status IN ('sent', 'overdue')
        AND i.due_date_email_sent IS NULL
      GROUP BY i.id
    `, [today]);

    console.log(`📧 Found ${invoices.length} invoices due today`);

    for (const invoice of invoices) {
      try {
        if (!invoice.customer_email) {
          console.warn(`⚠️  No email for invoice ${invoice.invoice_number}`);
          continue;
        }

        // Send due date notification email
        await sendDueEmailNotification(invoice.customer_email, invoice);

        // Mark as sent
        await db.query(
          'UPDATE invoices SET due_date_email_sent = NOW() WHERE id = ?',
          [invoice.id]
        );

        console.log(`✅ Sent due date notification for invoice ${invoice.invoice_number}`);
      } catch (error) {
        console.error(`❌ Failed to send notification for ${invoice.invoice_number}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error sending today notifications:', error);
  }
}

/**
 * Send overdue notifications for invoices past their due date
 */
async function sendOverdueEmails() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find invoices past due date that haven't had overdue email sent
    const [invoices] = await db.query(`
      SELECT
        i.*,
        c.name AS customer_name,
        c.email AS customer_email,
        COALESCE(SUM(p.amount), 0) as paid_amount,
        (i.amount - COALESCE(SUM(p.amount), 0)) as remaining_amount
      FROM invoices i
      LEFT JOIN customers c ON i.customer_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE DATE(i.due_date) < ?
        AND i.status IN ('sent', 'overdue')
        AND i.overdue_email_sent IS NULL
      GROUP BY i.id
    `, [today]);

    console.log(`📧 Found ${invoices.length} overdue invoices`);

    for (const invoice of invoices) {
      try {
        if (!invoice.customer_email) {
          console.warn(`⚠️  No email for invoice ${invoice.invoice_number}`);
          continue;
        }

        // Send overdue notification email
        await sendOverdueEmailNotification(invoice.customer_email, invoice);

        // Mark as sent
        await db.query(
          'UPDATE invoices SET overdue_email_sent = NOW() WHERE id = ?',
          [invoice.id]
        );

        console.log(`✅ Sent overdue notification for invoice ${invoice.invoice_number}`);
      } catch (error) {
        console.error(`❌ Failed to send overdue email for ${invoice.invoice_number}:`, error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error sending overdue notifications:', error);
  }
}

module.exports = scheduleDueEmailReminders;
