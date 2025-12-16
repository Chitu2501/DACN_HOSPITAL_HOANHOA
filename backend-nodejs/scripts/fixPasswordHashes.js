require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { poolPromise } = require('../database/db-config');

/**
 * Script để fix các password_hash không đúng định dạng bcrypt trong bảng USERS_AUTH.
 * 
 * Script sẽ:
 * 1. Tìm tất cả user có password_hash không bắt đầu với $2a$, $2b$, hoặc $2y$ (bcrypt format)
 * 2. Reset password về giá trị mặc định và hash lại bằng bcrypt
 * 
 * Có thể set password mặc định qua env: FIX_PASSWORD_DEFAULT=yourpassword
 * 
 * Chạy: node backend-nodejs/scripts/fixPasswordHashes.js
 */

const TABLE = process.env.SQL_TABLE_USERS || 'USERS_AUTH';
const DEFAULT_PASSWORD = process.env.FIX_PASSWORD_DEFAULT || '123456';

async function fixPasswordHashes() {
  try {
    const pool = await poolPromise;
    console.log('🔍 Đang kiểm tra các password_hash không đúng định dạng...\n');

    // Lấy tất cả users
    const result = await pool.request().query(`SELECT id, username, email, password_hash, role FROM ${TABLE}`);

    if (!result.recordset.length) {
      console.log('Không có user nào trong database.');
      process.exit(0);
    }

    const usersToFix = [];
    const validBcryptPrefixes = ['$2a$', '$2b$', '$2y$'];

    // Kiểm tra từng user
    for (const user of result.recordset) {
      const hash = user.password_hash || '';
      const isValidBcrypt = validBcryptPrefixes.some(prefix => hash.startsWith(prefix));
      
      if (!isValidBcrypt) {
        usersToFix.push(user);
        console.log(`⚠️  Tìm thấy password_hash không đúng định dạng:`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Role: ${user.role}`);
        console.log(`   - Hash hiện tại: ${hash.substring(0, 20)}...`);
        console.log('');
      }
    }

    if (usersToFix.length === 0) {
      console.log('✅ Tất cả password_hash đều đúng định dạng bcrypt!');
      process.exit(0);
    }

    console.log(`\n📝 Tìm thấy ${usersToFix.length} user cần fix.`);
    console.log(`🔐 Sẽ reset password về: ${DEFAULT_PASSWORD}`);
    console.log('⚠️  Lưu ý: Các user này sẽ cần đổi password sau khi login.\n');

    // Hash password mặc định
    const newHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    let fixed = 0;

    // Cập nhật từng user
    for (const user of usersToFix) {
      try {
        await pool
          .request()
          .input('id', user.id)
          .input('password_hash', newHash)
          .query(`UPDATE ${TABLE} SET password_hash=@password_hash WHERE id=@id`);

        console.log(`✅ Đã fix password cho: ${user.username} (${user.email})`);
        fixed++;
      } catch (err) {
        console.error(`❌ Lỗi khi fix password cho ${user.username}:`, err.message);
      }
    }

    console.log(`\n✅ Hoàn thành! Đã fix ${fixed}/${usersToFix.length} user.`);
    console.log(`\n📋 Thông tin đăng nhập mặc định:`);
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log(`   Email/Username: (dùng email hoặc username của từng user)`);
    console.log(`\n⚠️  Khuyến nghị: Yêu cầu các user đổi password sau khi login lần đầu.`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  }
}

fixPasswordHashes();
