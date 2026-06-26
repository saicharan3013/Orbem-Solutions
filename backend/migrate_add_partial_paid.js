const db = require('./db');

(async () => {
  try {
    console.log('Updating invoice status enum to include partial_paid...');
    
    await db.query(`
      ALTER TABLE invoices 
      MODIFY COLUMN status ENUM('draft', 'sent', 'paid', 'partial_paid', 'overdue') DEFAULT 'draft'
    `);
    
    console.log('✅ Status enum updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
