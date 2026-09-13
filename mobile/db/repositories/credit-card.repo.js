import { getDb } from '../index';
import { newUuid, nowIso, enqueueEntityWrite } from './sync-queue.repo';

const pendingDebtSelect = (alias) => `COALESCE((
    SELECT SUM(CASE
      WHEN t.type = 'egreso' AND t.payment_method = 'credit_card' THEN t.amount
      ELSE 0
    END)
    FROM transactions t
    WHERE t.credit_card_id = ${alias}.id AND t.deleted_at IS NULL
  ), 0) - COALESCE((
    SELECT SUM(ccpi.amount_paid)
    FROM credit_card_payment_items ccpi
    WHERE ccpi.credit_card_id = ${alias}.id AND ccpi.deleted_at IS NULL
  ), 0)`;

export const getAllCreditCards = async (tillId = null) => {
  const db = await getDb();
  if (tillId) {
    return db.getAllAsync(
      `SELECT cc.*, tl.name AS till_name,
        ${pendingDebtSelect('cc')} AS pending_debt
       FROM credit_cards cc
       LEFT JOIN tills tl ON tl.id = cc.till_id
       WHERE cc.till_id = ? AND cc.deleted_at IS NULL
       ORDER BY cc.name`,
      [tillId]
    );
  }

  return db.getAllAsync(
    `SELECT cc.*, tl.name AS till_name,
      ${pendingDebtSelect('cc')} AS pending_debt
     FROM credit_cards cc
     LEFT JOIN tills tl ON tl.id = cc.till_id
     WHERE cc.deleted_at IS NULL
     ORDER BY tl.name, cc.name`
  );
};

export const createCreditCard = async ({ tillId, name, creditLimit = 0 }) => {
  const db = await getDb();
  const uuid = newUuid();
  const result = await db.runAsync(
    'INSERT INTO credit_cards (till_id, name, credit_limit, uuid, updated_at) VALUES (?, ?, ?, ?, ?)',
    [tillId, name.trim(), Number(creditLimit) || 0, uuid, nowIso()]
  );
  await enqueueEntityWrite({ entityType: 'credit_cards', entityId: uuid, operation: 'create' });
  return result.lastInsertRowId;
};

export const updateCreditCard = async (id, { tillId, name, creditLimit }) => {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT uuid FROM credit_cards WHERE id = ?', [id]);
  await db.runAsync(
    `UPDATE credit_cards
     SET till_id = ?, name = ?, credit_limit = ?, updated_at = ?
     WHERE id = ?`,
    [tillId, name.trim(), Number(creditLimit) || 0, nowIso(), id]
  );
  if (row?.uuid) {
    await enqueueEntityWrite({ entityType: 'credit_cards', entityId: row.uuid, operation: 'update' });
  }
};

export const deleteCreditCard = async (id) => {
  const db = await getDb();
  const card = await db.getFirstAsync('SELECT uuid FROM credit_cards WHERE id = ?', [id]);
  const now = nowIso();

  const items = await db.getAllAsync(
    'SELECT uuid FROM credit_card_payment_items WHERE credit_card_id = ? AND deleted_at IS NULL',
    [id]
  );

  await db.runAsync(
    'UPDATE credit_card_payment_items SET deleted_at = ?, updated_at = ? WHERE credit_card_id = ? AND deleted_at IS NULL',
    [now, now, id]
  );
  await db.runAsync(
    'UPDATE transactions SET credit_card_id = NULL, updated_at = ? WHERE credit_card_id = ? AND deleted_at IS NULL',
    [now, id]
  );
  await db.runAsync(
    'UPDATE credit_cards SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );

  for (const item of items) {
    if (item.uuid) {
      await enqueueEntityWrite({ entityType: 'credit_card_payment_items', entityId: item.uuid, operation: 'delete' });
    }
  }
  if (card?.uuid) {
    await enqueueEntityWrite({ entityType: 'credit_cards', entityId: card.uuid, operation: 'delete' });
  }
};

export const getCreditCardPendingPurchases = async (creditCardId) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT
       t.id,
       t.transaction_date,
       t.description,
       t.amount,
       COALESCE(p.paid, 0) AS paid,
       (t.amount - COALESCE(p.paid, 0)) AS pending_amount
     FROM transactions t
     LEFT JOIN (
       SELECT purchase_transaction_id, SUM(amount_paid) AS paid
       FROM credit_card_payment_items
       WHERE deleted_at IS NULL
       GROUP BY purchase_transaction_id
     ) p ON p.purchase_transaction_id = t.id
     WHERE t.credit_card_id = ?
       AND t.type = 'egreso'
       AND t.payment_method = 'credit_card'
       AND t.deleted_at IS NULL
       AND (t.amount - COALESCE(p.paid, 0)) > 0
     ORDER BY t.transaction_date ASC, t.id ASC`,
    [creditCardId]
  );
};

export const getCreditCardsDebtSummary = async () => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT
       cc.id,
       cc.name,
       cc.till_id,
       cc.credit_limit,
       COALESCE(SUM(CASE
         WHEN t.type = 'egreso' AND t.payment_method = 'credit_card' THEN t.amount
         ELSE 0
       END), 0) - COALESCE((
         SELECT SUM(ccpi.amount_paid)
         FROM credit_card_payment_items ccpi
         WHERE ccpi.credit_card_id = cc.id AND ccpi.deleted_at IS NULL
       ), 0) AS pending_debt
     FROM credit_cards cc
     LEFT JOIN transactions t ON t.credit_card_id = cc.id AND t.deleted_at IS NULL
     WHERE cc.deleted_at IS NULL
     GROUP BY cc.id
     ORDER BY cc.name`
  );
};
