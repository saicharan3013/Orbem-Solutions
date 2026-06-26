const db = require('./db');

async function migrate() {
  try {
    console.log('🔄 Adding GST, city, county to customers...');
    await db.query(`
      ALTER TABLE customers
      ADD COLUMN gst_number VARCHAR(32) NULL,
      ADD COLUMN city VARCHAR(100) NULL,
      ADD COLUMN county VARCHAR(100) NULL
    `);
    console.log('✅ Customer fields added successfully');
    process.exit(0);
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('✅ Customer fields already exist, skipping');
      process.exit(0);
    }
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
