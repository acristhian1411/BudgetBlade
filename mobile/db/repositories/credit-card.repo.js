import { getDb } from '../index';

export const getAllCreditCards = async (tillId = null) => {
  const db = await getDb();
  if (tillId) {
    return db.getAllAsync(
      `SELECT cc.*, tl.name AS till_name
      ,COALESCE((
         SELECT SUM(CASE
           WHEN t.type = 'egreso' AND t.payment_method = 'credit_card' THEN t.amount
           ELSE 0
         END)
         FROM transactions t
         WHERE t.credit_card_id = cc.id
       ), 0) - COALESCE((
         SELECT SUM(ccpi.amount_paid)
         FROM credit_card_payment_items ccpi
         WHERE ccpi.credit_card_id = cc.id
       ), 0) AS pending_debt
       FROM credit_cards cc
       LEFT JOIN tills tl ON tl.id = cc.till_id
       WHERE cc.till_id = ?
       ORDER BY cc.name`,
      [tillId]
    );
  }

  return db.getAllAsync(
    `SELECT cc.*, tl.name AS till_name
    ,COALESCE((
       SELECT SUM(CASE
         WHEN t.type = 'egreso' AND t.payment_method = 'credit_card' THEN t.amount
         ELSE 0
       END)
       FROM transactions t
       WHERE t.credit_card_id = cc.id
     ), 0) - COALESCE((
       SELECT SUM(ccpi.amount_paid)
       FROM credit_card_payment_items ccpi
       WHERE ccpi.credit_card_id = cc.id
     ), 0) AS pending_debt
     FROM credit_cards cc
     LEFT JOIN tills tl ON tl.id = cc.till_id
     ORDER BY tl.name, cc.name`
  );
};

export const createCreditCard = async ({ tillId, name, creditLimit = 0 }) => {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO credit_cards (till_id, name, credit_limit) VALUES (?, ?, ?)',
    [tillId, name.trim(), Number(creditLimit) || 0]
  );
  return result.lastInsertRowId;
};

export const updateCreditCard = async (id, { tillId, name, creditLimit }) => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE credit_cards
     SET till_id = ?,
         name = ?,
         credit_limit = ?
     WHERE id = ?`,
    [tillId, name.trim(), Number(creditLimit) || 0, id]
  );
};

export const deleteCreditCard = async (id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM credit_card_payment_items WHERE credit_card_id = ?', [id]);
  await db.runAsync('UPDATE transactions SET credit_card_id = NULL WHERE credit_card_id = ?', [id]);
  await db.runAsync('DELETE FROM credit_cards WHERE id = ?', [id]);
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
       GROUP BY purchase_transaction_id
     ) p ON p.purchase_transaction_id = t.id
     WHERE t.credit_card_id = ?
       AND t.type = 'egreso'
       AND t.payment_method = 'credit_card'
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
         WHERE ccpi.credit_card_id = cc.id
       ), 0) AS pending_debt
     FROM credit_cards cc
     LEFT JOIN transactions t ON t.credit_card_id = cc.id
     GROUP BY cc.id
     ORDER BY cc.name`
  );
};
