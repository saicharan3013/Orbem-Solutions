const bcrypt = require('bcryptjs');
const db = require('../db');

async function reset() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node reset_password.js <email> <newPassword>');
    process.exit(1);
  }
  const [email, newPassword] = args;
  try {
    const hash = await bcrypt.hash(newPassword, 10);
    const [res] = await db.query('UPDATE users SET password=? WHERE email=?', [hash, email]);
    if (res.affectedRows > 0) {
      console.log('Password reset successful for', email);
      process.exit(0);
    } else {
      console.error('No user found with email', email);
      process.exit(1);
    }
  } catch (e) {
    console.error('Error resetting password:', e.message || e);
    process.exit(1);
  }
}

reset();
