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
  it('creates the full schema and advances user_version to 6', async () => {
    await initDB();

    expect(await getUserVersion()).toBe(6);

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
    ]) {
      expect(tables).toContain(expected);
    }
  });

  it('is idempotent (safe to run on every startup)', async () => {
    await initDB();
    await initDB();
    await initDB();

    expect(await getUserVersion()).toBe(6);
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
});
