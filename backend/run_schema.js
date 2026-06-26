const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  try {
    const sqlPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
      connectTimeout: 10000,
    });

    console.log('Connected to MySQL, running schema...');
    await conn.query(sql);
    console.log('Schema applied successfully.');
    await conn.end();
    process.exit(0);
  } catch (err) {
    console.error('Failed to apply schema:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
