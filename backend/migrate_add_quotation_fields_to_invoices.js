const db = require('./db');

async function migrate() {
  try {
    console.log('🔄 Adding quotation fields to invoices...');
    
    // Add quotation_id
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN quotation_id INT NULL');
      console.log('✅ Added quotation_id column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ quotation_id column already exists'); else throw e;
    }

    // Add items
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN items JSON NULL');
      console.log('✅ Added items column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ items column already exists'); else throw e;
    }

    // Add tax_rate
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 0.00');
      console.log('✅ Added tax_rate column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ tax_rate column already exists'); else throw e;
    }

    // Add discount
    try {
      await db.query('ALTER TABLE invoices ADD COLUMN discount DECIMAL(10,2) DEFAULT 0.00');
      console.log('✅ Added discount column');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✓ discount column already exists'); else throw e;
    }

    // Add Foreign Key constraint for quotation_id
    try {
      await db.query('ALTER TABLE invoices ADD FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL');
      console.log('✅ Added foreign key for quotation_id');
    } catch (e) {
      console.log('✓ Foreign key constraint might already exist or could not be added:', e.message);
    }

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
