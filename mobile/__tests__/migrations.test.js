import { initDB } from '../db/migrations';
import { getDb } from '../db/index';

const getUserVersion = async () => {
  const db = await getDb();
  const row = await db.getFirstAsync('PRAGMA user_version');
  return row.user_version;
};

const getTables = async () => {
  const db = await getDb();
  const rows = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  );
  return rows.map((r) => r.name);
};

const getColumns = async (table) => {
  const db = await getDb();
  const rows = await db.getAllAsync(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
};

describe('db/migrations — initDB', () => {
  it('creates the full schema and advances user_version to 7', async () => {
    await initDB();

    expect(await getUserVersion()).toBe(7);

    const tables = await getTables();
    for (const expected of [
      'users',
      'tills',
      'transactions',
      'categories',
      'entities',
      'scheduled_plans',
      'scheduled_occurrences',
      'scheduled_payments_mapping',
      'credit_cards',
      'credit_card_payment_items',
      'sync_queue',
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it('is idempotent (safe to run on every startup)', async () => {
    await initDB();
    await initDB();
    await initDB();

    expect(await getUserVersion()).toBe(7);
  });

  it('seeds the 22 default categories (17 expense + 5 income)', async () => {
    await initDB();
    const db = await getDb();

    const total = await db.getFirstAsync('SELECT COUNT(*) AS c FROM categories');
    expect(total.c).toBe(22);

    const expense = await db.getFirstAsync(
      "SELECT COUNT(*) AS c FROM categories WHERE type = 'expense'"
    );
    const income = await db.getFirstAsync(
      "SELECT COUNT(*) AS c FROM categories WHERE type = 'income'"
    );
    expect(expense.c).toBe(17);
    expect(income.c).toBe(5);
  });

  it('applies v4 columns to transactions (credit card support)', async () => {
    await initDB();
    const columns = await getColumns('transactions');

    for (const expected of [
      'payment_method',
      'credit_card_id',
      'affects_balance',
      'parent_transaction_id',
    ]) {
      expect(columns).toContain(expected);
    }
  });

  it('applies v3 partial-payment support to scheduled_occurrences', async () => {
    await initDB();
    const columns = await getColumns('scheduled_occurrences');

    expect(columns).toContain('remaining_amount');
  });

  it('applies v5/v6 type column to scheduled_plans', async () => {
    await initDB();
    const columns = await getColumns('scheduled_plans');

    expect(columns).toContain('type');
  });

  it('applies v7 sync columns (uuid/updated_at/deleted_at) to the 9 sync tables', async () => {
    await initDB();

    const syncTables = [
      'tills',
      'categories',
      'entities',
      'credit_cards',
      'transactions',
      'scheduled_plans',
      'scheduled_occurrences',
      'credit_card_payment_items',
      'scheduled_payments_mapping',
    ];

    for (const table of syncTables) {
      const columns = await getColumns(table);
      for (const expected of ['uuid', 'updated_at', 'deleted_at']) {
        expect(columns).toContain(expected);
      }
    }

    // users is never synced.
    const userColumns = await getColumns('users');
    expect(userColumns).not.toContain('uuid');
  });

  it('backfills uuid and updated_at on seeded categories', async () => {
    await initDB();
    const db = await getDb();

    const rows = await db.getAllAsync(
      'SELECT uuid, updated_at FROM categories WHERE uuid IS NOT NULL AND updated_at IS NOT NULL'
    );
    expect(rows).toHaveLength(22);
  });

  it('creates the sync_queue table with the expected columns', async () => {
    await initDB();
    const columns = await getColumns('sync_queue');

    for (const expected of [
      'id',
      'entity_type',
      'entity_id',
      'operation',
      'payload',
      'status',
      'attempts',
      'created_at',
    ]) {
      expect(columns).toContain(expected);
    }
  });
});
