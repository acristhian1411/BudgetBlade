import { getDb } from '../index';
import { newUuid, nowIso, enqueueEntityWrite } from './sync-queue.repo';

/**
 * Get all entities.
 * @returns {Promise<Array>}
 */
export const getAllEntities = async () => {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM entities WHERE deleted_at IS NULL ORDER BY name');
};

/**
 * Get a single entity by ID.
 * @param {number} id
 * @returns {Promise<Object | null>}
 */
export const getEntityById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM entities WHERE id = ? AND deleted_at IS NULL', [id]);
};

/**
 * Create a new entity.
 * @returns {Promise<number>} Entity ID
 */
export const createEntity = async (name, type, contact = null) => {
  const db = await getDb();
  const uuid = newUuid();
  const result = await db.runAsync(
    'INSERT INTO entities (name, type, contact, uuid, updated_at) VALUES (?, ?, ?, ?, ?)',
    [name, type, contact || null, uuid, nowIso()]
  );
  await enqueueEntityWrite({ entityType: 'entities', entityId: uuid, operation: 'create' });
  return result.lastInsertRowId;
};

/**
 * Update an entity.
 * @param {number} id
 */
export const updateEntity = async (id, name, type, contact = null) => {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT uuid FROM entities WHERE id = ?', [id]);
  await db.runAsync(
    'UPDATE entities SET name = ?, type = ?, contact = ?, updated_at = ? WHERE id = ?',
    [name, type, contact || null, nowIso(), id]
  );
  if (row?.uuid) {
    await enqueueEntityWrite({ entityType: 'entities', entityId: row.uuid, operation: 'update' });
  }
};

/**
 * Soft-delete an entity.
 * NOTE: Does not cascade-delete plans/occurrences. Caller should handle.
 * @param {number} id
 */
export const deleteEntity = async (id) => {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT uuid FROM entities WHERE id = ?', [id]);
  const now = nowIso();
  await db.runAsync('UPDATE entities SET deleted_at = ?, updated_at = ? WHERE id = ?', [now, now, id]);
  if (row?.uuid) {
    await enqueueEntityWrite({ entityType: 'entities', entityId: row.uuid, operation: 'delete' });
  }
};

/**
 * Get summary of an entity's financial activity.
 * Groups pending and processed occurrences by type (income/egreso).
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
     WHERE sp.entity_id = ? AND sp.deleted_at IS NULL AND so.deleted_at IS NULL`,
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
     LEFT JOIN scheduled_occurrences so ON so.plan_id = sp.id AND so.deleted_at IS NULL
     WHERE sp.entity_id = ? AND sp.deleted_at IS NULL
     GROUP BY sp.id
     ORDER BY sp.title`,
    [entityId]
  );
};
