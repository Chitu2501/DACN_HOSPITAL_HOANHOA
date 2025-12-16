import app from './app';
import { connectDB, closeDB } from './database/db';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5001; // Port khác với backend chính (5000)

// Khởi động server và kết nối SQL Server
async function startServer() {
  try {
    // Kết nối đến SQL Server
    await connectDB();

    // Khởi động Express server
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🏥 Patient Role Backend API (SQL Server)                ║
║                                                          ║
║   ✅ Server is running on port ${PORT}                      ║
║   ✅ Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   ✅ Database: SQL Server Connected                      ║
║                                                          ║
║   📝 API Documentation:                                  ║
║   - Health: GET /health                                  ║
║   - Auth: POST /api/patient/auth/login                  ║
║   - Profile: GET/PUT /api/patient/profile               ║
║   - Medical Records: GET /api/patient/medical-records    ║
║   - Appointments: GET/POST /api/patient/appointments     ║
║   - Invoices: GET /api/patient/invoices                  ║
║   - Insurance: GET/PUT /api/patient/insurance             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Lỗi khi khởi động server:', error);
    process.exit(1);
  }
}

// Xử lý tắt server gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Đang tắt server...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Đang tắt server...');
  await closeDB();
  process.exit(0);
});

// Khởi động server
startServer();

