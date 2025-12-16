import path from 'path';
import dotenv from 'dotenv';
import sql from 'mssql';

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Reuse the JS config/pool to avoid duplicating logic
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dbConfig = require('../../database/db-config');

export const poolPromise: Promise<sql.ConnectionPool> = dbConfig.poolPromise;
export const sqlClient: typeof sql = dbConfig.sql;

export async function connectDB(): Promise<sql.ConnectionPool> {
  return poolPromise;
}

export async function closeDB(): Promise<void> {
  try {
    const pool = await poolPromise;
    await pool.close();
  } catch (err) {
    // ignore close errors
  }
}

