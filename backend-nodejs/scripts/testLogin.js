require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { poolPromise } = require('../database/db-config');

/**
 * Script test login để kiểm tra password_hash và is_active của user.
 * 
 * Usage: node backend-nodejs/scripts/testLogin.js <email_or_username> <password>
 * Example: node backend-nodejs/scripts/testLogin.js admin@hospital.com admin123456
 */

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';

async function testLogin(emailOrUsername, password) {
  try {
    if (!emailOrUsername || !password) {
      console.log('Usage: node testLogin.js <email_or_username> <password>');
      process.exit(1);
    }

    const pool = await poolPromise;
    console.log(`🔍 Đang kiểm tra login cho: ${emailOrUsername}\n`);

    // Tìm user
    const userRes = await pool
      .request()
      .input('email', emailOrUsername)
      .input('username', emailOrUsername)
      .query(`SELECT TOP 1 * FROM ${TABLE} WHERE email=@email OR username=@username`);

    if (!userRes.recordset.length) {
      console.log('❌ User không tồn tại!');
      process.exit(1);
    }

    const user = userRes.recordset[0];
    console.log('📋 Thông tin user:');
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Username: ${user.username}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - is_active: ${user.is_active ? '✅ Active' : '❌ Locked'}`);
    console.log(`   - Password hash: ${user.password_hash.substring(0, 30)}...`);

    // Kiểm tra password_hash format
    const validBcryptPrefixes = ['$2a$', '$2b$', '$2y$'];
    const isValidBcrypt = validBcryptPrefixes.some(prefix => user.password_hash.startsWith(prefix));
    console.log(`   - Hash format: ${isValidBcrypt ? '✅ Valid bcrypt' : '❌ Invalid format'}`);

    if (!isValidBcrypt) {
      console.log('\n⚠️  Password hash không đúng định dạng bcrypt!');
      console.log('   Chạy: node backend-nodejs/scripts/fixPasswordHashes.js để fix');
      process.exit(1);
    }

    if (!user.is_active) {
      console.log('\n❌ Tài khoản đã bị khóa (is_active = 0)');
      process.exit(1);
    }

    // Test password
    console.log('\n🔐 Đang kiểm tra password...');
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (match) {
      console.log('✅ Password đúng! User có thể login được.');
    } else {
      console.log('❌ Password sai! User không thể login với password này.');
    }

    process.exit(match ? 0 : 1);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

const emailOrUsername = process.argv[2];
const password = process.argv[3];
testLogin(emailOrUsername, password);


