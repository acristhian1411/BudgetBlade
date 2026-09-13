import { getDb } from '../index';
import { newUuid, nowIso, enqueueEntityWrite } from './sync-queue.repo';

/**
 * Create a plan and bulk-insert installments if total_installments is provided.
 * @returns {Promise<number>} Plan ID
 */
export const createPlanWithInstallments = async (planData) => {
  const {
    categoryId,
    entityId,
    tillId,
    title,
    baseAmount,
    totalInstallments,
    startDate,
    type,
  } = planData;

  const normalizedType = type === 'ingreso' ? 'ingreso' : 'egreso';

  const db = await getDb();

  const planUuid = newUuid();
  const planResult = await db.runAsync(
    `INSERT INTO scheduled_plans
     (category_id, entity_id, till_id, title, base_amount, total_installments, start_date, type, uuid, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      categoryId,
      entityId,
      tillId,
      title,
      baseAmount || null,
      totalInstallments || null,
      startDate,
      normalizedType,
      planUuid,
      nowIso(),
    ]
  );

  const planId = planResult.lastInsertRowId;
  const occurrenceUuids = [];

  // If total_installments is set, generate occurrences
  if (totalInstallments && totalInstallments > 0) {
    const startDateObj = new Date(startDate);
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDateObj);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const occUuid = newUuid();
      occurrenceUuids.push(occUuid);
      await db.runAsync(
        `INSERT INTO scheduled_occurrences
         (plan_id, installment_number, due_date, type, amount, remaining_amount, status, uuid, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [planId, i, dueDateStr, normalizedType, baseAmount || null, baseAmount || null, 'pending', occUuid, nowIso()]
      );
    }
  }

  await enqueueEntityWrite({ entityType: 'scheduled_plans', entityId: planUuid, operation: 'create' });
  for (const occUuid of occurrenceUuids) {
    await enqueueEntityWrite({ entityType: 'scheduled_occurrences', entityId: occUuid, operation: 'create' });
  }

  return planId;
};

/**
 * Generate rolling occurrences for plans with total_installments = null.
 * Creates one occurrence for the current month if none exists.
 */
export const generateRollingOccurrences = async () => {
  const db = await getDb();

  // Get all infinite plans with category type fallback for legacy plans without type.
  const plans = await db.getAllAsync(
    `SELECT
       sp.id,
       sp.start_date,
       sp.type,
       sp.base_amount,
       c.type AS category_type
     FROM scheduled_plans sp
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE total_installments IS NULL AND sp.deleted_at IS NULL`
  );

  const today = new Date();

  for (const plan of plans) {
    // Check if occurrence already exists for this month
    const existingMonth = await db.getFirstAsync(
      `SELECT id FROM scheduled_occurrences
       WHERE plan_id = ? AND due_date LIKE ? AND deleted_at IS NULL`,
      [plan.id, `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}%`]
    );

    if (!existingMonth) {
      let dueDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const startDateObj = new Date(plan.start_date);

      if (startDateObj.getMonth() === today.getMonth() && startDateObj.getFullYear() === today.getFullYear()) {
        dueDate = startDateObj;
      }

      const dueDateStr = dueDate.toISOString().split('T')[0];
      const occNum = (today.getFullYear() - startDateObj.getFullYear()) * 12 +
                     (today.getMonth() - startDateObj.getMonth()) + 1;

      const planType =
        plan.type === 'ingreso' || plan.type === 'egreso'
          ? plan.type
          : plan.category_type === 'income'
            ? 'ingreso'
            : 'egreso';

      const occUuid = newUuid();
      await db.runAsync(
        `INSERT INTO scheduled_occurrences
         (plan_id, installment_number, due_date, type, amount, remaining_amount, status, uuid, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [plan.id, occNum, dueDateStr, planType, plan.base_amount || null, plan.base_amount || null, 'pending', occUuid, nowIso()]
      );

      await enqueueEntityWrite({ entityType: 'scheduled_occurrences', entityId: occUuid, operation: 'create' });
    }
  }
};

/**
 * Mark overdue: update status to 'overdue' for pending occurrences with due_date < today.
 * Derived state (the server recomputes it), so it is NOT enqueued for sync.
 */
export const markOverdue = async () => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];

  await db.runAsync(
    `UPDATE scheduled_occurrences
     SET status = 'overdue', updated_at = ?
     WHERE status IN ('pending', 'partially_paid')
       AND due_date < ?
       AND COALESCE(remaining_amount, amount, 0) > 0
       AND deleted_at IS NULL`,
    [nowIso(), today]
  );
};

/**
 * Get all pending and overdue occurrences with plan and entity info.
 * Ordered by due_date ASC.
 */
export const getPendingAndOverdue = async () => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT
       so.id,
       so.plan_id,
       so.installment_number,
       so.due_date,
       so.type,
       so.amount,
       COALESCE(so.remaining_amount, so.amount, 0) AS remaining_amount,
       so.status,
       so.transaction_id,
       sp.title,
       sp.category_id,
       sp.till_id,
       e.id AS entity_id,
       e.name AS entity_name,
       e.type AS entity_type,
       c.name AS category_name
     FROM scheduled_occurrences so
     JOIN scheduled_plans sp ON sp.id = so.plan_id
     LEFT JOIN entities e ON e.id = sp.entity_id
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE so.status IN ('pending', 'partially_paid', 'overdue')
       AND so.deleted_at IS NULL
       AND sp.deleted_at IS NULL
     ORDER BY so.due_date ASC`
  );
};

/**
 * Get upcoming occurrences within N days.
 * @param {number} days - Default 7
 */
export const getUpcomingOccurrences = async (days = 7) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  return db.getAllAsync(
    `SELECT
       so.id,
       so.plan_id,
       so.installment_number,
       so.due_date,
       so.type,
       so.amount,
       COALESCE(so.remaining_amount, so.amount, 0) AS remaining_amount,
       so.status,
       sp.title,
       sp.till_id,
       e.name AS entity_name,
       c.name AS category_name
     FROM scheduled_occurrences so
     JOIN scheduled_plans sp ON sp.id = so.plan_id
     LEFT JOIN entities e ON e.id = sp.entity_id
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE so.status IN ('pending', 'partially_paid')
       AND so.deleted_at IS NULL
       AND sp.deleted_at IS NULL
       AND so.due_date BETWEEN ? AND ?
     ORDER BY so.due_date ASC`,
    [today, futureDateStr]
  );
};

/**
 * Apply a payment to an occurrence and update remaining amount + status.
 */
export const applyOccurrencePayment = async (occurrenceId, transactionId, amountPaid, paymentDate) => {
  const db = await getDb();
  const paid = Number(amountPaid);

  if (!Number.isFinite(paid) || paid <= 0) {
    throw new Error('Monto de abono inválido.');
  }

  const occurrence = await db.getFirstAsync(
    `SELECT id, uuid, amount, remaining_amount, status
     FROM scheduled_occurrences
     WHERE id = ? AND deleted_at IS NULL`,
    [occurrenceId]
  );

  if (!occurrence) {
    throw new Error('Cuota no encontrada.');
  }

  const currentRemaining = Number(
    occurrence.remaining_amount ?? occurrence.amount ?? 0
  );
  const isVariableAmountOccurrence =
    occurrence.amount == null && occurrence.remaining_amount == null;

  if (!isVariableAmountOccurrence && currentRemaining > 0 && paid > currentRemaining) {
    throw new Error('El abono no puede ser mayor al saldo pendiente.');
  }
  if (!isVariableAmountOccurrence && currentRemaining <= 0) {
    throw new Error('La cuota ya no tiene saldo pendiente.');
  }

  const nextRemainingRaw = isVariableAmountOccurrence ? 0 : currentRemaining - paid;
  const nextRemaining = Math.abs(nextRemainingRaw) < 0.000001 ? 0 : nextRemainingRaw;
  const nextStatus = isVariableAmountOccurrence || nextRemaining === 0 ? 'processed' : 'partially_paid';

  const mappingUuid = newUuid();
  const now = nowIso();

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.runAsync(
      `INSERT INTO scheduled_payments_mapping (occurrence_id, transaction_id, amount_paid, payment_date, uuid, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [occurrenceId, transactionId, paid, paymentDate, mappingUuid, now]
    );

    await db.runAsync(
      `UPDATE scheduled_occurrences
       SET remaining_amount = ?,
           status = ?,
           transaction_id = CASE WHEN transaction_id IS NULL THEN ? ELSE transaction_id END,
           updated_at = ?
       WHERE id = ?`,
      [nextRemaining, nextStatus, transactionId, now, occurrenceId]
    );

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  await enqueueEntityWrite({ entityType: 'scheduled_payments_mapping', entityId: mappingUuid, operation: 'create' });
  await enqueueEntityWrite({ entityType: 'scheduled_occurrences', entityId: occurrence.uuid, operation: 'update' });

  return {
    remainingAmount: nextRemaining,
    status: nextStatus,
  };
};

/**
 * Backward-compatible helper to fully process an occurrence.
 */
export const processOccurrence = async (occurrenceId, transactionId) => {
  const db = await getDb();
  const occurrence = await db.getFirstAsync(
    `SELECT amount, remaining_amount FROM scheduled_occurrences WHERE id = ? AND deleted_at IS NULL`,
    [occurrenceId]
  );
  const remaining = Number(occurrence?.remaining_amount ?? occurrence?.amount ?? 0);
  if (remaining <= 0) {
    return { remainingAmount: 0, status: 'processed' };
  }
  const today = new Date().toISOString().split('T')[0];
  return applyOccurrencePayment(occurrenceId, transactionId, remaining, today);
};

/**
 * Get payment mapping history for a specific occurrence.
 */
export const getPaymentHistoryForOccurrence = async (occurrenceId) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT
       spm.id,
       spm.occurrence_id,
       spm.transaction_id,
       spm.amount_paid,
       spm.payment_date,
       t.description,
       t.type,
       t.till_id
     FROM scheduled_payments_mapping spm
     JOIN transactions t ON t.id = spm.transaction_id
     WHERE spm.occurrence_id = ?
       AND spm.deleted_at IS NULL
       AND t.deleted_at IS NULL
     ORDER BY spm.payment_date ASC, spm.id ASC`,
    [occurrenceId]
  );
};

/**
 * Get all plans with entity and category info.
 */
export const getAllPlans = async () => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT
       sp.id,
       sp.title,
       sp.category_id,
       sp.entity_id,
       sp.till_id,
       sp.base_amount,
       sp.total_installments,
       sp.start_date,
       e.name AS entity_name,
       c.name AS category_name,
       COUNT(so.id) AS total_occurrences,
       COALESCE(SUM(CASE WHEN so.status IN ('pending', 'partially_paid', 'overdue') THEN 1 ELSE 0 END), 0) AS pending_count,
       COALESCE(SUM(CASE WHEN so.status = 'processed' THEN 1 ELSE 0 END), 0) AS processed_count
     FROM scheduled_plans sp
     LEFT JOIN entities e ON e.id = sp.entity_id
     LEFT JOIN categories c ON c.id = sp.category_id
     LEFT JOIN scheduled_occurrences so ON so.plan_id = sp.id AND so.deleted_at IS NULL
     WHERE sp.deleted_at IS NULL
     GROUP BY sp.id
     ORDER BY sp.start_date DESC`
  );
};

/**
 * Get a single plan by ID with full details.
 */
export const getPlanById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync(
    `SELECT
       sp.*,
       e.name AS entity_name,
       c.name AS category_name
     FROM scheduled_plans sp
     LEFT JOIN entities e ON e.id = sp.entity_id
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE sp.id = ? AND sp.deleted_at IS NULL`,
    [id]
  );
};

/**
 * Get a single occurrence by ID with full plan and entity info.
 */
export const getOccurrenceById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync(
    `SELECT
       so.*,
       COALESCE(so.remaining_amount, so.amount, 0) AS remaining_amount,
       sp.title,
       sp.category_id,
       sp.till_id,
       e.id AS entity_id,
       e.name AS entity_name,
       c.name AS category_name
     FROM scheduled_occurrences so
     JOIN scheduled_plans sp ON sp.id = so.plan_id
     LEFT JOIN entities e ON e.id = sp.entity_id
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE so.id = ?
       AND so.deleted_at IS NULL
       AND sp.deleted_at IS NULL`,
    [id]
  );
};

/**
 * Soft-delete a plan and all its occurrences.
 */
export const deletePlan = async (id) => {
  const db = await getDb();
  const plan = await db.getFirstAsync('SELECT uuid FROM scheduled_plans WHERE id = ?', [id]);
  const now = nowIso();

  const occurrences = await db.getAllAsync(
    'SELECT uuid FROM scheduled_occurrences WHERE plan_id = ? AND deleted_at IS NULL',
    [id]
  );
  await db.runAsync(
    'UPDATE scheduled_occurrences SET deleted_at = ?, updated_at = ? WHERE plan_id = ? AND deleted_at IS NULL',
    [now, now, id]
  );
  await db.runAsync(
    'UPDATE scheduled_plans SET deleted_at = ?, updated_at = ? WHERE id = ?',
    [now, now, id]
  );

  for (const occ of occurrences) {
    if (occ.uuid) {
      await enqueueEntityWrite({ entityType: 'scheduled_occurrences', entityId: occ.uuid, operation: 'delete' });
    }
  }
  if (plan?.uuid) {
    await enqueueEntityWrite({ entityType: 'scheduled_plans', entityId: plan.uuid, operation: 'delete' });
  }
};

/**
 * Update editable fields of a scheduled occurrence.
 */
export const updateOccurrence = async (id, data) => {
  const db = await getDb();
  const { dueDate, type, amount, remainingAmount, status } = data;

  const row = await db.getFirstAsync('SELECT uuid FROM scheduled_occurrences WHERE id = ?', [id]);

  await db.runAsync(
    `UPDATE scheduled_occurrences
     SET due_date        = COALESCE(?, due_date),
         type            = COALESCE(?, type),
         amount          = ?,
         remaining_amount = ?,
         status          = COALESCE(?, status),
         updated_at      = ?
     WHERE id = ?`,
    [
      dueDate ?? null,
      type ?? null,
      amount !== undefined ? amount : null,
      remainingAmount !== undefined ? remainingAmount : null,
      status ?? null,
      nowIso(),
      id,
    ]
  );

  if (row?.uuid) {
    await enqueueEntityWrite({ entityType: 'scheduled_occurrences', entityId: row.uuid, operation: 'update' });
  }
};

/**
 * Get occurrences for a specific plan.
 */
export const getOccurrencesByPlanId = async (planId) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM scheduled_occurrences
     WHERE plan_id = ? AND deleted_at IS NULL
     ORDER BY installment_number ASC`,
    [planId]
  );
};

/**
 * Get scheduled plans that have NO occurrences at all and whose start_date
 * falls within the next N days (or is already past/today).
 */
export const getPlansWithNoOccurrences = async (days = 7) => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  return db.getAllAsync(
    `SELECT
       sp.id,
       sp.id AS plan_id,
       1 AS installment_number,
       sp.start_date AS due_date,
       sp.type,
       sp.base_amount AS amount,
       sp.base_amount AS remaining_amount,
       CASE WHEN sp.start_date < ? THEN 'overdue' ELSE 'pending' END AS status,
       sp.title,
       sp.till_id,
       sp.total_installments,
       e.name AS entity_name,
       c.name AS category_name,
       1 AS _is_plan_no_occurrence
     FROM scheduled_plans sp
     LEFT JOIN entities e ON e.id = sp.entity_id
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE sp.start_date <= ?
       AND sp.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM scheduled_occurrences so WHERE so.plan_id = sp.id
       )
     ORDER BY sp.start_date ASC`,
    [today, futureDateStr]
  );
};
