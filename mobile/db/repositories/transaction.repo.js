import { getDb } from '../index';

/**
 * Insert a single ingreso/egreso transaction.
 * amount is always stored as a positive number; the SQL balance query
 * applies sign based on `type`.
 */
export const createTransaction = async ({ tillId, amount, type, description, date }) => {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO transactions (till_id, amount, type, description, transaction_date) VALUES (?, ?, ?, ?, ?)',
    [tillId, Math.abs(amount), type, description ?? '', date]
  );
};

/**
 * Insert a transfer as two linked rows sharing a transfer_id.
 * Source row: amount = negative (outgoing).
 * Dest row:   amount = positive (incoming).
 */
export const createTransfer = async ({ fromTillId, toTillId, amount, description, date }) => {
  const db = await getDb();
  const transferId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  await db.runAsync(
    'INSERT INTO transactions (till_id, amount, type, description, transfer_id, transaction_date) VALUES (?, ?, ?, ?, ?, ?)',
    [fromTillId, -Math.abs(amount), 'transferencia', description ?? '', transferId, date]
  );
  await db.runAsync(
    'INSERT INTO transactions (till_id, amount, type, description, transfer_id, transaction_date) VALUES (?, ?, ?, ?, ?, ?)',
    [toTillId, Math.abs(amount), 'transferencia', description ?? '', transferId, date]
  );
};

/**
 * Query transactions with optional filters.
 * @param {{ tillId?: number, type?: string, dateFrom?: string, dateTo?: string }} filters
 */
export const getTransactions = async ({ tillId, type, dateFrom, dateTo } = {}) => {
  const db = await getDb();
  const conditions = [];
  const params = [];

  if (tillId)    { conditions.push('t.till_id = ?');              params.push(tillId); }
  if (type)      { conditions.push('t.type = ?');                params.push(type); }
  if (dateFrom)  { conditions.push('t.transaction_date >= ?');   params.push(dateFrom); }
  if (dateTo)    { conditions.push('t.transaction_date <= ?');   params.push(dateTo); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.getAllAsync(
    `SELECT t.*, tl.name AS till_name
     FROM transactions t
     LEFT JOIN tills tl ON tl.id = t.till_id
     ${where}
     ORDER BY t.transaction_date DESC, t.id DESC`,
    params
  );
};

/** Returns the last n transactions across all accounts. */
export const getLastN = async (n) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT t.*, tl.name AS till_name
     FROM transactions t
     LEFT JOIN tills tl ON tl.id = t.till_id
     ORDER BY t.transaction_date DESC, t.id DESC
     LIMIT ?`,
    [n]
  );
};

/** Grand total balance across all tills. Transfers net to zero. */
export const getTotal = async () => {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT COALESCE(SUM(
       CASE
         WHEN type = 'ingreso' THEN  amount
         WHEN type = 'egreso'  THEN -amount
         ELSE amount
       END
     ), 0) AS total
     FROM transactions`
  );
  return row?.total ?? 0;
};

/**
 * Balance broken down by category:
 *  - "efectivo": tills with no account_number
 *  - "banco":    tills with an account_number
 */
export const getTotalByCategory = async () => {
  const db = await getDb();
  const rows = await db.getAllAsync(`
    SELECT
      CASE
        WHEN tl.account_number IS NOT NULL AND tl.account_number != '' THEN 'banco'
        ELSE 'efectivo'
      END AS category,
      COALESCE(SUM(
        CASE
          WHEN t.type = 'ingreso' THEN  t.amount
          WHEN t.type = 'egreso'  THEN -t.amount
          ELSE t.amount
        END
      ), 0) AS balance
    FROM tills tl
    LEFT JOIN transactions t ON t.till_id = tl.id
    GROUP BY category
  `);
  const result = { banco: 0, efectivo: 0 };
  for (const r of rows) result[r.category] = r.balance;
  return result;
};
