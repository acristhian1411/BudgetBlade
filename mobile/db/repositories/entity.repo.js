import { getDb } from '../index';

/**
 * Get all entities.
 * @returns {Promise<Array>}
 */
export const getAllEntities = async () => {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM entities ORDER BY name');
};

/**
 * Get a single entity by ID.
 * @param {number} id
 * @returns {Promise<Object | null>}
 */
export const getEntityById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM entities WHERE id = ?', [id]);
};

/**
 * Create a new entity.
 * @param {string} name
 * @param {('client' | 'provider' | 'both')} type
 * @param {string} contact - Optional contact info
 * @returns {Promise<number>} Entity ID
 */
export const createEntity = async (name, type, contact = null) => {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO entities (name, type, contact) VALUES (?, ?, ?)',
    [name, type, contact || null]
  );
  return result.lastInsertRowId;
};

/**
 * Update an entity.
 * @param {number} id
 * @param {string} name
 * @param {('client' | 'provider' | 'both')} type
 * @param {string} contact
 */
export const updateEntity = async (id, name, type, contact = null) => {
  const db = await getDb();
  await db.runAsync(
    'UPDATE entities SET name = ?, type = ?, contact = ? WHERE id = ?',
    [name, type, contact || null, id]
  );
};

/**
 * Delete an entity.
 * NOTE: Does not cascade-delete plans/occurrences. Caller should handle.
 * @param {number} id
 */
export const deleteEntity = async (id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM entities WHERE id = ?', [id]);
};

/**
 * Get summary of an entity's financial activity.
 * Groups pending and processed occurrences by type (income/egreso).
 * @param {number} entityId
 * @returns {Promise<Object>} { pendingEgreso, pendingIngreso, processedEgreso, processedIngreso }
 */
export const getEntitySummary = async (entityId) => {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT
       COALESCE(SUM(CASE 
         WHEN so.type = 'egreso' AND so.status IN ('pending', 'partially_paid', 'overdue')
         THEN COALESCE(so.remaining_amount, so.amount, 0)
         ELSE 0 
       END), 0) AS pending_egreso,
       COALESCE(SUM(CASE 
         WHEN so.type = 'ingreso' AND so.status IN ('pending', 'partially_paid', 'overdue')
         THEN COALESCE(so.remaining_amount, so.amount, 0)
         ELSE 0 
       END), 0) AS pending_ingreso,
       COALESCE(SUM(CASE 
         WHEN so.type = 'egreso' THEN (COALESCE(so.amount, 0) - COALESCE(so.remaining_amount, so.amount, 0))
         ELSE 0 
       END), 0) AS processed_egreso,
       COALESCE(SUM(CASE 
         WHEN so.type = 'ingreso' THEN (COALESCE(so.amount, 0) - COALESCE(so.remaining_amount, so.amount, 0))
         ELSE 0 
       END), 0) AS processed_ingreso
     FROM scheduled_occurrences so
     JOIN scheduled_plans sp ON sp.id = so.plan_id
     WHERE sp.entity_id = ?`,
    [entityId]
  );
  
  const row = rows[0] || {};
  return {
    pendingEgreso: row.pending_egreso ?? 0,
    pendingIngreso: row.pending_ingreso ?? 0,
    processedEgreso: row.processed_egreso ?? 0,
    processedIngreso: row.processed_ingreso ?? 0,
  };
};

/**
 * Get all plans for an entity grouped by plan ID (useful for detailed view).
 * @param {number} entityId
 * @returns {Promise<Array>} Array of { plan_id, title, pendingCount, totalAmount, installments }
 */
export const getInstallmentGroups = async (entityId) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT
       sp.id AS plan_id,
       sp.title,
       COUNT(CASE WHEN so.status IN ('pending', 'partially_paid', 'overdue') THEN 1 END) AS pending_count,
       COALESCE(SUM(CASE WHEN so.status IN ('pending', 'partially_paid', 'overdue') THEN COALESCE(so.remaining_amount, so.amount, 0) ELSE 0 END), 0) AS total_amount,
       COALESCE(SUM(CASE WHEN so.status = 'processed' THEN 1 END), 0) AS processed_count
     FROM scheduled_plans sp
     LEFT JOIN scheduled_occurrences so ON so.plan_id = sp.id
     WHERE sp.entity_id = ?
     GROUP BY sp.id
     ORDER BY sp.title`,
    [entityId]
  );
};
