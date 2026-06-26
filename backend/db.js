const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  connectTimeout: 10000,

  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'isrgrootx1.pem'))
  }
}).promise();

pool.getConnection()
  .then((connection) => {
    console.log('✅ Connected to TiDB Cloud!');
    connection.release();
  })
  .catch((err) => {
    console.error('❌ TiDB Connection Error:', err);
  });

module.exports = pool;