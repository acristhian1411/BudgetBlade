import * as SQLite from 'expo-sqlite';

/** @type {Promise<SQLite.SQLiteDatabase> | null} */
let _dbPromise = null;

/** Returns the singleton db instance. Stores the Promise itself to prevent concurrent opens. */
export const getDb = () => {
  if (!_dbPromise) {
    _dbPromise = SQLite.openDatabaseAsync('budget.db');
  }
  return _dbPromise;
};