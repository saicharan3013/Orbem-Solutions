const { fork } = require('child_process');
const path = require('path');

const scripts = [
  'run_schema.js',
  'migrate_add_activity_logs.js',
  'migrate_add_admin_profile_fields.js',
  'migrate_add_admin_staff.js',
  'migrate_add_customer_fields.js',
  'migrate_add_partial_paid.js',
  'migrate_add_quotation_airports.js',
  'migrate_add_reminder_columns.js',
  'migrate_add_quotation_fields_to_invoices.js'
];

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    console.log(`\n===========================================`);
    console.log(`Running: ${scriptName}`);
    console.log(`===========================================`);
    const child = fork(path.join(__dirname, scriptName));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script ${scriptName} exited with code ${code}`));
      }
    });
  });
}

async function runAll() {
  try {
    for (const script of scripts) {
      await runScript(script);
    }
    console.log('\n🎉 Database setup and all migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database setup/migration failed:', error.message);
    process.exit(1);
  }
}

runAll();
