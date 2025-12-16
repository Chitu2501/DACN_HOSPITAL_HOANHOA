require('dotenv').config();

const USE_MSNODESQLV8 = String(process.env.USE_MSNODESQLV8 || '').toLowerCase() === 'true';
const sql = USE_MSNODESQLV8 ? require('mssql/msnodesqlv8') : require('mssql');

const baseConfig = USE_MSNODESQLV8
  ? {
      server: process.env.SQL_SERVER || 'SWEETHER',
      database: process.env.SQL_DATABASE || 'HOSPITAL_DACN',
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 1433,
      driver: 'msnodesqlv8',
      options: {
        trustedConnection: true,
        trustServerCertificate: true,
      },
      connectionTimeout: process.env.SQL_CONN_TIMEOUT ? Number(process.env.SQL_CONN_TIMEOUT) : 15000,
      requestTimeout: process.env.SQL_REQ_TIMEOUT ? Number(process.env.SQL_REQ_TIMEOUT) : 30000,
    }
  : {
      server: process.env.SQL_SERVER || 'SWEETHER',
      user: process.env.SQL_USER || 'sa',
      password: process.env.SQL_PASSWORD || '',
      database: process.env.SQL_DATABASE || 'HOSPITAL_DACN',
      port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      pool: {
        max: process.env.SQL_POOL_MAX ? Number(process.env.SQL_POOL_MAX) : 10,
        min: process.env.SQL_POOL_MIN ? Number(process.env.SQL_POOL_MIN) : 1,
        idleTimeoutMillis: process.env.SQL_POOL_IDLE ? Number(process.env.SQL_POOL_IDLE) : 30000,
      },
      connectionTimeout: process.env.SQL_CONN_TIMEOUT ? Number(process.env.SQL_CONN_TIMEOUT) : 15000,
      requestTimeout: process.env.SQL_REQ_TIMEOUT ? Number(process.env.SQL_REQ_TIMEOUT) : 30000,
    };

const globalAny = globalThis;
if (!globalAny.__mssqlPoolPromise) {
  globalAny.__mssqlPoolPromise = new sql.ConnectionPool(baseConfig)
    .connect()
    .then((pool) => {
      console.log(
        `✓ Connected to SQL Server: ${baseConfig.server}:${baseConfig.port} DB: ${baseConfig.database} driver: ${
          USE_MSNODESQLV8 ? 'msnodesqlv8' : 'tedious'
        }`
      );
      return pool;
    })
    .catch((err) => {
      console.error('[SQL Connection Error]', {
        server: baseConfig.server,
        port: baseConfig.port,
        database: baseConfig.database,
        driver: USE_MSNODESQLV8 ? 'msnodesqlv8' : 'tedious',
      });
      console.error('Message:', err.message);
      throw err;
    });
}

const poolPromise = globalAny.__mssqlPoolPromise;
module.exports = { sql, poolPromise };

