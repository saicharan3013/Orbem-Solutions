const db = require('./db');

async function migrate() {
  try {
    console.log('Starting migration: Add admin profile fields to users...');

    try {
      await db.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(32)`);
      console.log('✅ Added phone column to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ Phone column already exists'); else throw e;
    }

    try {
      await db.query(`ALTER TABLE users ADD COLUMN company VARCHAR(200)`);
      console.log('✅ Added company column to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ Company column already exists'); else throw e;
    }

    try {
      await db.query(`ALTER TABLE users ADD COLUMN gst_number VARCHAR(64)`);
      console.log('✅ Added gst_number column to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ gst_number column already exists'); else throw e;
    }

    try {
      await db.query(`ALTER TABLE users ADD COLUMN address TEXT`);
      console.log('✅ Added address column to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ address column already exists'); else throw e;
    }

    try {
      await db.query(`ALTER TABLE users ADD COLUMN website VARCHAR(200)`);
      console.log('✅ Added website column to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') console.log('✅ website column already exists'); else throw e;
    }

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

migrate();
