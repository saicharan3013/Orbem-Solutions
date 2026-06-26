const db = require('./db');

async function migrate() {
  try {
    console.log('Starting migration: Adding admin and staff management...');

    // Add role column to users table
    try {
      await db.query(`ALTER TABLE users ADD COLUMN role ENUM('admin', 'staff') DEFAULT 'staff'`);
      console.log('✅ Added role column to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Role column already exists');
      } else {
        throw e;
      }
    }

    // Add created_by column to users table
    try {
      await db.query(`ALTER TABLE users ADD COLUMN created_by INT`);
      console.log('✅ Added created_by column to users table');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Created_by column already exists');
      } else {
        throw e;
      }
    }

    // Create staff_permissions table
    await db.query(`
      CREATE TABLE IF NOT EXISTS staff_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        staff_id INT NOT NULL,
        section VARCHAR(50) NOT NULL,
        can_view BOOLEAN DEFAULT FALSE,
        can_edit BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_staff_section (staff_id, section),
        FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created staff_permissions table');

    // Create admin_logs table for tracking admin actions
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action VARCHAR(255) NOT NULL,
        target_type VARCHAR(50),
        target_id INT,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created admin_logs table');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

migrate();
