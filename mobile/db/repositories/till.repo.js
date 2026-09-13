import { getDb } from '../index';
import { newUuid, nowIso, enqueueEntityWrite } from './sync-queue.repo';

export const getAllTills = async () => {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM tills WHERE deleted_at IS NULL ORDER BY name');
};

export const createTill = async (name, accountNumber) => {
  const db = await getDb();
  const uuid = newUuid();
  const result = await db.runAsync(
    'INSERT INTO tills (name, account_number, uuid, updated_at) VALUES (?, ?, ?, ?)',
    [name, accountNumber || null, uuid, nowIso()]
  );
  await enqueueEntityWrite({ entityType: 'tills', entityId: uuid, operation: 'create' });
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
      AND COALESCE(tx.affects_balance, 1) = 1
      AND tx.deleted_at IS NULL
    WHERE t.deleted_at IS NULL
    GROUP BY t.id
    ORDER BY t.name
  `);
};

/** Update a till's name and account_number. */
export const updateTill = async (id, name, accountNumber) => {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT uuid FROM tills WHERE id = ?', [id]);
  await db.runAsync(
    'UPDATE tills SET name = ?, account_number = ?, updated_at = ? WHERE id = ?',
    [name, accountNumber || null, nowIso(), id]
  );
  if (row?.uuid) {
    await enqueueEntityWrite({ entityType: 'tills', entityId: row.uuid, operation: 'update' });
  }
};

/** Soft-delete a till and its transactions. */
export const deleteTill = async (id) => {
  const db = await getDb();
  const till = await db.getFirstAsync('SELECT uuid FROM tills WHERE id = ?', [id]);
  const now = nowIso();

  const txRows = await db.getAllAsync(
    'SELECT uuid FROM transactions WHERE till_id = ? AND deleted_at IS NULL',
    [id]
  );
  await db.runAsync(
    'UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE till_id = ? AND deleted_at IS NULL',
    [now, now, id]
  );
  await db.runAsync(
    'UPDATE tills SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );

  for (const tx of txRows) {
    await enqueueEntityWrite({ entityType: 'transactions', entityId: tx.uuid, operation: 'delete' });
  }
  if (till?.uuid) {
    await enqueueEntityWrite({ entityType: 'tills', entityId: till.uuid, operation: 'delete' });
  }
};
