import * as Crypto from 'expo-crypto';
import { getDb } from '../index';

/** Generates a fresh client-side UUID (v4). */
export const newUuid = () => Crypto.randomUUID();

/** Current timestamp in ISO 8601 (UTC, lexicographically sortable). */
export const nowIso = () => new Date().toISOString();

/**
 * Inserts a pending sync operation into the outbox (`sync_queue`).
 * `entityId` is the entity's uuid (sync identity), not its local integer id.
 */
export const enqueue = async ({ entityType, entityId, operation, payload = null }) => {
  const db = await getDb();
  const id = newUuid();
  await db.runAsync(
    `INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, status, attempts, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)`,
    [id, entityType, entityId, operation, payload, nowIso()]
  );
  return id;
};

/**
 * Convenience helper: snapshot the current row of an entity (by uuid) and
 * enqueue the given operation with that snapshot as payload. Works for
 * soft-deleted rows too (they remain in the table).
 */
export const enqueueEntityWrite = async ({ entityType, entityId, operation }) => {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT * FROM ${entityType} WHERE uuid = ?`,
    [entityId]
  );
  return enqueue({
    entityType,
    entityId,
    operation,
    payload: row ? JSON.stringify(row) : null,
  });
};

/** Returns pending operations in FIFO order (oldest first). */
export const getPending = async (limit = 100) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY rowid ASC LIMIT ?`,
    [limit]
  );
};

export const getQueueById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync('SELECT * FROM sync_queue WHERE id = ?', [id]);
};

export const markProcessed = async (id) => {
  const db = await getDb();
  await db.runAsync(`UPDATE sync_queue SET status = 'processed' WHERE id = ?`, [id]);
};

export const markFailed = async (id) => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'failed', attempts = attempts + 1 WHERE id = ?`,
    [id]
  );
};
