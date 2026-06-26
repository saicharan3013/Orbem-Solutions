/**
 * Migration: Add email reminder tracking columns to invoices table
 * Run: node migrate_add_reminder_columns.js
 */
const db = require('./db');

async function migrate() {
  try {
    console.log('🔄 Running migration: Add reminder email tracking columns...');

    // Check if columns exist
    const [columns] = await db.query(
      "SHOW COLUMNS FROM invoices LIKE 'reminder_email_sent'"
    );

    if (columns.length === 0) {
      console.log('📝 Adding reminder_email_sent column...');
      await db.query(
        'ALTER TABLE invoices ADD COLUMN reminder_email_sent TIMESTAMP NULL'
      );
      console.log('✅ reminder_email_sent column added');
    } else {
      console.log('✓ reminder_email_sent column already exists');
    }

    const [columns2] = await db.query(
      "SHOW COLUMNS FROM invoices LIKE 'due_date_email_sent'"
    );

    if (columns2.length === 0) {
      console.log('📝 Adding due_date_email_sent column...');
      await db.query(
        'ALTER TABLE invoices ADD COLUMN due_date_email_sent TIMESTAMP NULL'
      );
      console.log('✅ due_date_email_sent column added');
    } else {
      console.log('✓ due_date_email_sent column already exists');
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
