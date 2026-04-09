import { getDb } from './index';

/** Creates all tables if they don't already exist. Call once at app startup. */
export const initDB = async () => {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS tills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      account_number TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      till_id INTEGER,
      amount REAL,
      type TEXT,
      description TEXT,
      transfer_id TEXT,
      transaction_date TEXT
    );
  `);
};