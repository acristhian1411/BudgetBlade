import { getDb } from '../index';
import { newUuid, nowIso, enqueueEntityWrite } from './sync-queue.repo';

/**
 * Insert a single ingreso/egreso transaction.
 * amount is always stored as a positive number; the SQL balance query
 * applies sign based on `type`.
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
  const uuid = newUuid();
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
      parent_transaction_id,
      uuid,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      uuid,
      nowIso(),
    ]
  );
  await enqueueEntityWrite({ entityType: 'transactions', entityId: uuid, operation: 'create' });
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
  const sourceUuid = newUuid();
  const destUuid = newUuid();
  const now = nowIso();

  await db.runAsync(
    'INSERT INTO transactions (till_id, amount, type, description, transfer_id, transaction_date, payment_method, affects_balance, uuid, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [fromTillId, -Math.abs(amount), 'transferencia', description ?? '', transferId, date, 'transfer', 1, sourceUuid, now]
  );
  await db.runAsync(
    'INSERT INTO transactions (till_id, amount, type, description, transfer_id, transaction_date, payment_method, affects_balance, uuid, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [toTillId, Math.abs(amount), 'transferencia', description ?? '', transferId, date, 'transfer', 1, destUuid, now]
  );

  await enqueueEntityWrite({ entityType: 'transactions', entityId: sourceUuid, operation: 'create' });
  await enqueueEntityWrite({ entityType: 'transactions', entityId: destUuid, operation: 'create' });
};

const getCategoryIdByName = async (db, categoryName) => {
  const row = await db.getFirstAsync(
    'SELECT id FROM categories WHERE type = ? AND LOWER(name) = LOWER(?) AND deleted_at IS NULL LIMIT 1',
    ['expense', categoryName]
  );
  return row?.id ?? null;
};

/**
 * Create a credit card payment with optional interest and purchase-payment mappings.
 * The capital payment can be linked to one or many purchases.
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

  const now = nowIso();
  const capitalUuid = newUuid();
  const interestUuid = normalizedInterest > 0 ? newUuid() : null;
  const paymentItemUuids = [];

  let capitalTransactionId = null;
  let interestTransactionId = null;

  await db.execAsync('BEGIN TRANSACTION');
  try {
    const capitalResult = await db.runAsync(
      `INSERT INTO transactions (
        till_id, amount, type, description, transaction_date, category_id,
        payment_method, credit_card_id, affects_balance, parent_transaction_id,
        uuid, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        capitalUuid,
        now,
      ]
    );
    capitalTransactionId = capitalResult.lastInsertRowId;

    if (interestUuid) {
      const interestResult = await db.runAsync(
        `INSERT INTO transactions (
          till_id, amount, type, description, transaction_date, category_id,
          payment_method, credit_card_id, affects_balance, parent_transaction_id,
          uuid, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          null,
          interestUuid,
          now,
        ]
      );
      interestTransactionId = interestResult.lastInsertRowId;
    }

    for (const item of paymentItems) {
      const purchaseTransactionId = Number(item?.purchaseTransactionId);
      const amountPaid = Math.abs(Number(item?.amountPaid) || 0);
      if (!purchaseTransactionId || amountPaid <= 0) continue;

      const itemUuid = newUuid();
      paymentItemUuids.push(itemUuid);
      await db.runAsync(
        `INSERT INTO credit_card_payment_items (
          credit_card_id, purchase_transaction_id, payment_transaction_id,
          amount_paid, uuid, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [creditCardId, purchaseTransactionId, capitalTransactionId, amountPaid, itemUuid, now]
      );
    }

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  await enqueueEntityWrite({ entityType: 'transactions', entityId: capitalUuid, operation: 'create' });
  if (interestUuid) {
    await enqueueEntityWrite({ entityType: 'transactions', entityId: interestUuid, operation: 'create' });
  }
  for (const itemUuid of paymentItemUuids) {
    await enqueueEntityWrite({ entityType: 'credit_card_payment_items', entityId: itemUuid, operation: 'create' });
  }

  return { capitalTransactionId, interestTransactionId };
};

/**
 * Query transactions with optional filters.
 * @param {{ tillId?: number, type?: string, dateFrom?: string, dateTo?: string }} filters
 */
export const getTransactions = async ({ tillId, type, dateFrom, dateTo } = {}) => {
  const db = await getDb();
  const conditions = ['t.deleted_at IS NULL'];
  const params = [];

  if (tillId)    { conditions.push('t.till_id = ?');              params.push(tillId); }
  if (type)      { conditions.push('t.type = ?');                params.push(type); }
  if (dateFrom)  { conditions.push('t.transaction_date >= ?');   params.push(dateFrom); }
  if (dateTo)    { conditions.push('t.transaction_date <= ?');   params.push(dateTo); }

  const where = `WHERE ${conditions.join(' AND ')}`;
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
     WHERE t.deleted_at IS NULL
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
     WHERE COALESCE(affects_balance, 1) = 1 AND deleted_at IS NULL`
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
      AND COALESCE(t.affects_balance, 1) = 1
      AND t.deleted_at IS NULL
    GROUP BY category
  `);
  const result = { banco: 0, efectivo: 0 };
  for (const r of rows) result[r.category] = r.balance;
  return result;
};

/**
 * Soft-delete a transaction by id.
 * If the transaction is part of a transfer, both legs are deleted.
 */
export const deleteTransaction = async (id) => {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT transfer_id, uuid FROM transactions WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!row) return;

  const now = nowIso();

  if (row.transfer_id) {
    const legs = await db.getAllAsync(
      'SELECT uuid FROM transactions WHERE transfer_id = ? AND deleted_at IS NULL',
      [row.transfer_id]
    );
    const paymentItems = await db.getAllAsync(
      `SELECT uuid FROM credit_card_payment_items WHERE deleted_at IS NULL AND (
        purchase_transaction_id IN (SELECT id FROM transactions WHERE transfer_id = ?)
        OR payment_transaction_id IN (SELECT id FROM transactions WHERE transfer_id = ?)
      )`,
      [row.transfer_id, row.transfer_id]
    );

    await db.runAsync(
      `UPDATE credit_card_payment_items SET deleted_at = ?, updated_at = ?
       WHERE deleted_at IS NULL AND (
         purchase_transaction_id IN (SELECT id FROM transactions WHERE transfer_id = ?)
         OR payment_transaction_id IN (SELECT id FROM transactions WHERE transfer_id = ?)
       )`,
      [now, now, row.transfer_id, row.transfer_id]
    );
    await db.runAsync(
      'UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE transfer_id = ? AND deleted_at IS NULL',
      [now, now, row.transfer_id]
    );

    for (const item of paymentItems) {
      if (item.uuid) await enqueueEntityWrite({ entityType: 'credit_card_payment_items', entityId: item.uuid, operation: 'delete' });
    }
    for (const leg of legs) {
      if (leg.uuid) await enqueueEntityWrite({ entityType: 'transactions', entityId: leg.uuid, operation: 'delete' });
    }
  } else {
    const paymentItems = await db.getAllAsync(
      'SELECT uuid FROM credit_card_payment_items WHERE deleted_at IS NULL AND (purchase_transaction_id = ? OR payment_transaction_id = ?)',
      [id, id]
    );
    await db.runAsync(
      'UPDATE credit_card_payment_items SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL AND (purchase_transaction_id = ? OR payment_transaction_id = ?)',
      [now, now, id, id]
    );
    await db.runAsync(
      'UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL',
      [now, now, id]
    );

    for (const item of paymentItems) {
      if (item.uuid) await enqueueEntityWrite({ entityType: 'credit_card_payment_items', entityId: item.uuid, operation: 'delete' });
    }
    if (row.uuid) {
      await enqueueEntityWrite({ entityType: 'transactions', entityId: row.uuid, operation: 'delete' });
    }
  }
};
