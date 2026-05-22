import { getDb } from '../index';

/**
 * Insert a single ingreso/egreso transaction.
 * amount is always stored as a positive number; the SQL balance query
 * applies sign based on `type`.
 * @param {{
 *  tillId: number,
 *  amount: number,
 *  type: string,
 *  description?: string,
 *  date: string,
 *  categoryId?: number | null,
 *  paymentMethod?: string | null,
 *  creditCardId?: number | null,
 *  affectsBalance?: number,
 *  parentTransactionId?: number | null,
 * }} params
 */
export const createTransaction = async ({
  tillId,
  amount,
  type,
  description,
  date,
  categoryId,
  paymentMethod = null,
  creditCardId = null,
  affectsBalance = 1,
  parentTransactionId = null,
}) => {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO transactions (
      till_id,
      amount,
      type,
      description,
      transaction_date,
      category_id,
      payment_method,
      credit_card_id,
      affects_balance,
      parent_transaction_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tillId,
      Math.abs(amount),
      type,
      description ?? '',
      date,
      categoryId ?? null,
      paymentMethod,
      creditCardId,
      affectsBalance,
      parentTransactionId,
    ]
  );
  return result.lastInsertRowId;
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
    'INSERT INTO transactions (till_id, amount, type, description, transfer_id, transaction_date, payment_method, affects_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [fromTillId, -Math.abs(amount), 'transferencia', description ?? '', transferId, date, 'transfer', 1]
  );
  await db.runAsync(
    'INSERT INTO transactions (till_id, amount, type, description, transfer_id, transaction_date, payment_method, affects_balance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [toTillId, Math.abs(amount), 'transferencia', description ?? '', transferId, date, 'transfer', 1]
  );
};

const getCategoryIdByName = async (db, categoryName) => {
  const row = await db.getFirstAsync(
    'SELECT id FROM categories WHERE type = ? AND LOWER(name) = LOWER(?) LIMIT 1',
    ['expense', categoryName]
  );
  return row?.id ?? null;
};

/**
 * Create a credit card payment with optional interest and purchase-payment mappings.
 * The capital payment can be linked to one or many purchases.
 * @param {{
 *  tillId: number,
 *  creditCardId: number,
 *  capitalAmount: number,
 *  interestAmount?: number,
 *  description?: string,
 *  date: string,
 *  paymentMethod?: string,
 *  paymentItems?: Array<{ purchaseTransactionId: number, amountPaid: number }>,
 * }} params
 */
export const createCreditCardPayment = async ({
  tillId,
  creditCardId,
  capitalAmount,
  interestAmount = 0,
  description,
  date,
  paymentMethod = 'cash',
  paymentItems = [],
}) => {
  const db = await getDb();
  const normalizedCapital = Math.abs(Number(capitalAmount) || 0);
  const normalizedInterest = Math.abs(Number(interestAmount) || 0);

  if (!tillId || !creditCardId || normalizedCapital <= 0) {
    throw new Error('Datos inválidos para registrar pago de tarjeta.');
  }

  const paymentCategoryId = await getCategoryIdByName(db, 'Pago de tarjetas');
  const interestCategoryId = await getCategoryIdByName(db, 'Intereses de tarjeta');

  await db.execAsync('BEGIN TRANSACTION');
  try {
    const capitalResult = await db.runAsync(
      `INSERT INTO transactions (
        till_id,
        amount,
        type,
        description,
        transaction_date,
        category_id,
        payment_method,
        credit_card_id,
        affects_balance,
        parent_transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tillId,
        normalizedCapital,
        'egreso',
        description ?? 'Pago de tarjeta',
        date,
        paymentCategoryId,
        paymentMethod,
        creditCardId,
        1,
        null,
      ]
    );

    const capitalTransactionId = capitalResult.lastInsertRowId;
    let interestTransactionId = null;

    if (normalizedInterest > 0) {
      const interestResult = await db.runAsync(
        `INSERT INTO transactions (
          till_id,
          amount,
          type,
          description,
          transaction_date,
          category_id,
          payment_method,
          credit_card_id,
          affects_balance,
          parent_transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tillId,
          normalizedInterest,
          'egreso',
          'Intereses de tarjeta',
          date,
          interestCategoryId,
          paymentMethod,
          creditCardId,
          1,
          capitalTransactionId,
        ]
      );
      interestTransactionId = interestResult.lastInsertRowId;
    }

    for (const item of paymentItems) {
      const purchaseTransactionId = Number(item?.purchaseTransactionId);
      const amountPaid = Math.abs(Number(item?.amountPaid) || 0);
      if (!purchaseTransactionId || amountPaid <= 0) continue;

      await db.runAsync(
        `INSERT INTO credit_card_payment_items (
          credit_card_id,
          purchase_transaction_id,
          payment_transaction_id,
          amount_paid
        ) VALUES (?, ?, ?, ?)`,
        [creditCardId, purchaseTransactionId, capitalTransactionId, amountPaid]
      );
    }

    await db.execAsync('COMMIT');
    return { capitalTransactionId, interestTransactionId };
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }
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
    `SELECT t.*, tl.name AS till_name, cc.name AS credit_card_name
     FROM transactions t
     LEFT JOIN tills tl ON tl.id = t.till_id
     LEFT JOIN credit_cards cc ON cc.id = t.credit_card_id
     ${where}
     ORDER BY t.transaction_date DESC, t.id DESC`,
    params
  );
};

/** Returns the last n transactions across all accounts. */
export const getLastN = async (n) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT t.*, tl.name AS till_name, cc.name AS credit_card_name
     FROM transactions t
     LEFT JOIN tills tl ON tl.id = t.till_id
     LEFT JOIN credit_cards cc ON cc.id = t.credit_card_id
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
     FROM transactions
     WHERE COALESCE(affects_balance, 1) = 1`
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
    LEFT JOIN transactions t ON t.till_id = tl.id AND COALESCE(t.affects_balance, 1) = 1
    GROUP BY category
  `);
  const result = { banco: 0, efectivo: 0 };
  for (const r of rows) result[r.category] = r.balance;
  return result;
};

/**
 * Delete a transaction by id.
 * If the transaction is part of a transfer, both legs are deleted.
 */
export const deleteTransaction = async (id) => {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT transfer_id FROM transactions WHERE id = ?', [id]);
  if (row?.transfer_id) {
    await db.runAsync(
      `DELETE FROM credit_card_payment_items
       WHERE purchase_transaction_id IN (
         SELECT id FROM transactions WHERE transfer_id = ?
       )
          OR payment_transaction_id IN (
         SELECT id FROM transactions WHERE transfer_id = ?
       )`,
      [row.transfer_id, row.transfer_id]
    );
    await db.runAsync('DELETE FROM transactions WHERE transfer_id = ?', [row.transfer_id]);
  } else {
    await db.runAsync(
      'DELETE FROM credit_card_payment_items WHERE purchase_transaction_id = ? OR payment_transaction_id = ?',
      [id, id]
    );
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }
};
