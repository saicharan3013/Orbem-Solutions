const db = require('../db');

async function setProfile() {
  try {
    const email = 'admin@orbem.com';
    const company = 'ORBEM SOLUTIONS PRIVATE LIMITED';
    const gst = '29ORBEM9911A1Z0';
    const phone = '+91 80 4455 6677';
    const address = 'Bengaluru, Karnataka, India';
    const website = 'www.orbemsolutions.com';

    const [res] = await db.query('UPDATE users SET company=?, gst_number=?, phone=?, address=?, website=? WHERE email=?', [company, gst, phone, address, website, email]);
    if (res.affectedRows) {
      console.log('Admin profile updated in DB for', email);
      process.exit(0);
    } else {
      console.error('No admin row updated');
      process.exit(1);
    }
  } catch (e) {
    console.error('Error updating admin profile:', e.message || e);
    process.exit(1);
  }
}

setProfile();
