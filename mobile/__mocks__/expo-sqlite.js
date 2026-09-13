/**
 * Manual mock of `expo-sqlite` backed by `better-sqlite3` (in-memory).
 *
 * Implements the subset of the expo-sqlite async API that this app's
 * repositories and migrations use:
 *   - openDatabaseAsync
 *   - execAsync
 *   - runAsync
 *   - getAllAsync
 *   - getFirstAsync
 *
 * Also exposes test-only helpers:
 *   - __resetDb()  -> drops all tables (fresh schema between tests)
 *   - __closeDb()  -> closes the underlying connection
 */
const BetterSqlite3 = require('better-sqlite3');

let db = new BetterSqlite3(':memory:');

const normalizeParams = (args) => {
  if (!args || args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
};

const api = {
  execAsync: async (source) => {
    db.exec(source);
  },

  runAsync: async (source, ...args) => {
    const result = db.prepare(source).run(...normalizeParams(args));
    return {
      lastInsertRowId: result.lastInsertRowid,
      changes: result.changes,
    };
  },

  getFirstAsync: async (source, ...args) => {
    const row = db.prepare(source).get(...normalizeParams(args));
    // expo-sqlite returns null when no row matches; better-sqlite3 returns undefined.
    return row === undefined ? null : row;
  },

  getAllAsync: async (source, ...args) => {
    return db.prepare(source).all(...normalizeParams(args));
  },

  withTransactionAsync: async (fn) => {
    db.exec('BEGIN TRANSACTION');
    try {
      const result = await fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  },
};

const openDatabaseAsync = async () => api;

const __resetDb = () => {
  db.exec('PRAGMA foreign_keys = OFF');
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all();
  for (const { name } of rows) {
    if (name.startsWith('sqlite_')) continue;
    db.exec(`DROP TABLE IF EXISTS ${name}`);
  }
  db.exec('PRAGMA foreign_keys = ON');
  // Dropping tables does not reset the schema version; reset it so migrations
  // run again from scratch on the next initDB() call.
  db.exec('PRAGMA user_version = 0');
};

const __closeDb = () => {
  db.close();
  db = new BetterSqlite3(':memory:');
};

module.exports = {
  openDatabaseAsync,
  openDatabaseSync: () => api,
  __resetDb,
  __closeDb,
};
