const db = require('./db');

async function migrate() {
  try {
    console.log('🔄 Adding origin_airport and destination_airport to quotations...');
    await db.query(`
      ALTER TABLE quotations
      ADD COLUMN origin_airport VARCHAR(100) NULL,
      ADD COLUMN destination_airport VARCHAR(100) NULL
    `);
    console.log('✅ Quotation airport fields added successfully');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Quotation airport fields already exist, skipping');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
