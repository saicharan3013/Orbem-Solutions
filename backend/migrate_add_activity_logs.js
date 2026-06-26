const db = require('./db');

async function migrate() {
  try {
    console.log('🔄 Creating activity_logs table...');
    
    const query = `
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INT,
        description VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at),
        INDEX idx_entity (entity_type, entity_id)
      )
    `;

    await db.query(query);
    console.log('✅ activity_logs table created successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
