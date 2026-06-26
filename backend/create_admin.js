const bcrypt = require('bcryptjs');
const db = require('./db');

/**
 * Helper script to create an admin account
 * Usage: node create_admin.js <name> <email> <password>
 * Example: node create_admin.js "Admin User" "admin@orbem.com" "SecurePassword123"
 */

async function createAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('❌ Usage: node create_admin.js <name> <email> <password>');
    console.error('Example: node create_admin.js "Admin User" "admin@orbem.com" "SecurePassword123"');
    process.exit(1);
  }

  const [name, email, password] = args;

  if (!name || !email || !password) {
    console.error('❌ All fields (name, email, password) are required');
    process.exit(1);
  }

  try {
    console.log('Creating admin account...');

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) {
      console.error('❌ Email already registered');
      process.exit(1);
    }

    // Hash password
    const hash = await bcrypt.hash(password, 10);

    // Insert admin
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
      [name, email, hash, 'admin']
    );

    console.log('✅ Admin account created successfully!');
    console.log('');
    console.log('Admin Details:');
    console.log(`  Name: ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`  ID: ${result.insertId}`);
    console.log('');
    console.log('You can now login with these credentials at the login page.');
    console.log('Make sure to select "Admin" when logging in.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
