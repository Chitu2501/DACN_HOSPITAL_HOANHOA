/**
 * Script to run doctor profile migration
 * This script executes the SQL migration script using mssql
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../database/db-config');

async function runMigration() {
  try {
    console.log('🔄 Starting doctor profile migration...\n');
    
    const pool = await poolPromise;
    const migrationPath = path.join(__dirname, 'migrate_doctor_profile.sql');
    const sqlScript = fs.readFileSync(migrationPath, 'utf8');
    
    // Split script by GO statements
    const batches = sqlScript
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0 && !batch.startsWith('USE ') && !batch.startsWith('--'));
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      if (batch.trim()) {
        try {
          await pool.request().query(batch);
          console.log(`✅ Batch ${i + 1}/${batches.length} executed successfully`);
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message && (
            error.message.includes('already exists') ||
            error.message.includes('Column') && error.message.includes('already exists')
          )) {
            console.log(`⚠️  Batch ${i + 1}: ${error.message.split('\n')[0]}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();

