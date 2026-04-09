import { getDb } from '../index';

export const getAllTills = async () => {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM tills ORDER BY name');
};

export const createTill = async (name, accountNumber) => {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO tills (name, account_number) VALUES (?, ?)',
    [name, accountNumber || null]
  );
  return result.lastInsertRowId;
};

/**
 * Balance calculation per till:
 *  - ingreso rows:       +amount  (amount stored positive)
 *  - egreso rows:        -amount  (amount stored positive)
 *  - transferencia rows:  amount  (negative for source, positive for dest)
 */
export const getTillsWithBalances = async () => {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT
      t.*,
      COALESCE(SUM(
        CASE
          WHEN tx.type = 'ingreso'  THEN  tx.amount
          WHEN tx.type = 'egreso'   THEN -tx.amount
          ELSE tx.amount
        END
      ), 0) AS balance
    FROM tills t
    LEFT JOIN transactions tx ON tx.till_id = t.id
    GROUP BY t.id
    ORDER BY t.name
  `);
};
