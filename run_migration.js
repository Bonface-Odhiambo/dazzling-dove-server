import dotenv from 'dotenv';
dotenv.config();
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  try {
    console.log('Running testimonials migration...');

    const migrationSQL = fs.readFileSync('./database/migrate_testimonials.sql', 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 100) + '...');
        await pool.query(statement);
      }
    }

    console.log('Migration completed successfully!');

    // Verify the table was created
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'testimonials'");
    if (result.rows.length > 0) {
      console.log('✅ Testimonials table created successfully');
    } else {
      console.log('❌ Testimonials table was not created');
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
