import { getDb } from '../index';

/**
 * Create a plan and bulk-insert installments if total_installments is provided.
 * @param {Object} planData
 * @param {number} planData.categoryId
 * @param {number} planData.entityId
 * @param {number} planData.tillId
 * @param {string} planData.title
 * @param {number | null} planData.baseAmount - null for variable amounts (utilities)
 * @param {number | null} planData.totalInstallments - null for infinite recurring
 * @param {string} planData.startDate - ISO date (YYYY-MM-DD)
 * @param {string} planData.type - 'ingreso' or 'egreso'
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
  
  // Insert plan
  const planResult = await db.runAsync(
    `INSERT INTO scheduled_plans 
     (category_id, entity_id, till_id, title, base_amount, total_installments, start_date, type) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      categoryId,
      entityId,
      tillId,
      title,
      baseAmount || null,
      totalInstallments || null,
      startDate,
      normalizedType,
    ]
  );

  const planId = planResult.lastInsertRowId;

  // If total_installments is set, generate occurrences
  if (totalInstallments && totalInstallments > 0) {
    const startDateObj = new Date(startDate);
    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDateObj);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));
      const dueDateStr = dueDate.toISOString().split('T')[0];

      await db.runAsync(
        `INSERT INTO scheduled_occurrences 
         (plan_id, installment_number, due_date, type, amount, remaining_amount, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [planId, i, dueDateStr, normalizedType, baseAmount || null, baseAmount || null, 'pending']
      );
    }
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
     WHERE total_installments IS NULL`
  );

  const today = new Date();

  for (const plan of plans) {
    // Check if occurrence already exists for this month
    const existingMonth = await db.getFirstAsync(
      `SELECT id FROM scheduled_occurrences 
       WHERE plan_id = ? AND due_date LIKE ?`,
      [plan.id, `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}%`]
    );

    if (!existingMonth) {
      // Create occurrence for current month (due on the 1st, or start_date if it's in this month)
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

      await db.runAsync(
        `INSERT INTO scheduled_occurrences 
         (plan_id, installment_number, due_date, type, amount, remaining_amount, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [plan.id, occNum, dueDateStr, planType, plan.base_amount || null, plan.base_amount || null, 'pending']
      );
    }
  }
};

/**
 * Mark overdue: update status to 'overdue' for pending occurrences with due_date < today.
 */
export const markOverdue = async () => {
  const db = await getDb();
  const today = new Date().toISOString().split('T')[0];
  
  await db.runAsync(
    `UPDATE scheduled_occurrences 
     SET status = 'overdue' 
     WHERE status IN ('pending', 'partially_paid')
       AND due_date < ?
       AND COALESCE(remaining_amount, amount, 0) > 0`,
    [today]
  );
};

/**
 * Get all pending and overdue occurrences with plan and entity info.
 * Ordered by due_date ASC.
 * @returns {Promise<Array>}
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
     ORDER BY so.due_date ASC`
  );
};

/**
 * Get upcoming occurrences within N days.
 * @param {number} days - Default 7
 * @returns {Promise<Array>}
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
     WHERE so.status IN ('pending', 'partially_paid') AND so.due_date BETWEEN ? AND ?
     ORDER BY so.due_date ASC`,
    [today, futureDateStr]
  );
};

/**
 * Apply a payment to an occurrence and update remaining amount + status.
 * @param {number} occurrenceId
 * @param {number} transactionId
 * @param {number} amountPaid
 * @param {string} paymentDate
 */
export const applyOccurrencePayment = async (occurrenceId, transactionId, amountPaid, paymentDate) => {
  const db = await getDb();
  const paid = Number(amountPaid);

  if (!Number.isFinite(paid) || paid <= 0) {
    throw new Error('Monto de abono inválido.');
  }

  const occurrence = await db.getFirstAsync(
    `SELECT id, amount, remaining_amount, status
     FROM scheduled_occurrences
     WHERE id = ?`,
    [occurrenceId]
  );

  if (!occurrence) {
    throw new Error('Cuota no encontrada.');
  }

  const currentRemaining = Number(
    occurrence.remaining_amount ?? occurrence.amount ?? 0
  );

  if (paid > currentRemaining) {
    throw new Error('El abono no puede ser mayor al saldo pendiente.');
  }

  const nextRemainingRaw = currentRemaining - paid;
  const nextRemaining = Math.abs(nextRemainingRaw) < 0.000001 ? 0 : nextRemainingRaw;
  const nextStatus = nextRemaining === 0 ? 'processed' : 'partially_paid';

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await db.runAsync(
      `INSERT INTO scheduled_payments_mapping (occurrence_id, transaction_id, amount_paid, payment_date)
       VALUES (?, ?, ?, ?)`,
      [occurrenceId, transactionId, paid, paymentDate]
    );

    await db.runAsync(
      `UPDATE scheduled_occurrences
       SET remaining_amount = ?,
           status = ?,
           transaction_id = CASE WHEN transaction_id IS NULL THEN ? ELSE transaction_id END
       WHERE id = ?`,
      [nextRemaining, nextStatus, transactionId, occurrenceId]
    );

    await db.execAsync('COMMIT');
  } catch (error) {
    await db.execAsync('ROLLBACK');
    throw error;
  }

  return {
    remainingAmount: nextRemaining,
    status: nextStatus,
  };
};

/**
 * Backward-compatible helper to fully process an occurrence.
 * @param {number} occurrenceId
 * @param {number} transactionId
 */
export const processOccurrence = async (occurrenceId, transactionId) => {
  const db = await getDb();
  const occurrence = await db.getFirstAsync(
    `SELECT amount, remaining_amount FROM scheduled_occurrences WHERE id = ?`,
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
 * @param {number} occurrenceId
 * @returns {Promise<Array>}
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
     ORDER BY spm.payment_date ASC, spm.id ASC`,
    [occurrenceId]
  );
};

/**
 * Get all plans with entity and category info.
 * @returns {Promise<Array>}
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
     LEFT JOIN scheduled_occurrences so ON so.plan_id = sp.id
     GROUP BY sp.id
     ORDER BY sp.start_date DESC`
  );
};

/**
 * Get a single plan by ID with full details.
 * @param {number} id
 * @returns {Promise<Object | null>}
 */
export const getPlanById = async (id) => {
  const db = await getDb();
  return db.getFirstAsync(
    `SELECT
       sp.*,
       e.name AS entity_name,
       c.name AS category_name
     FROM scheduled_plans sp
       COALESCE(
         sp.type,
         CASE WHEN c.type = 'income' THEN 'ingreso' ELSE 'egreso' END
       ) AS type,
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE sp.id = ?`,
    [id]
  );
};

/**
 * Get a single occurrence by ID with full plan and entity info.
 * @param {number} id
 * @returns {Promise<Object | null>}
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
     WHERE so.id = ?`,
    [id]
  );
};

/**
 * Delete a plan and all its occurrences.
 * @param {number} id
 */
export const deletePlan = async (id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM scheduled_occurrences WHERE plan_id = ?', [id]);
  await db.runAsync('DELETE FROM scheduled_plans WHERE id = ?', [id]);
};

/**
 * Update editable fields of a scheduled occurrence.
 * @param {number} id
 * @param {Object} data
 * @param {string} [data.dueDate]
 * @param {string} [data.type]
 * @param {number|null} [data.amount]
 * @param {number|null} [data.remainingAmount]
 * @param {string} [data.status]
 */
export const updateOccurrence = async (id, data) => {
  const db = await getDb();
  const { dueDate, type, amount, remainingAmount, status } = data;

  await db.runAsync(
    `UPDATE scheduled_occurrences
     SET due_date        = COALESCE(?, due_date),
         type            = COALESCE(?, type),
         amount          = ?,
         remaining_amount = ?,
         status          = COALESCE(?, status)
     WHERE id = ?`,
    [
      dueDate ?? null,
      type ?? null,
      amount !== undefined ? amount : null,
      remainingAmount !== undefined ? remainingAmount : null,
      status ?? null,
      id,
    ]
  );
};

/**
 * Get occurrences for a specific plan.
 * @param {number} planId
 * @returns {Promise<Array>}
 */
export const getOccurrencesByPlanId = async (planId) => {  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM scheduled_occurrences 
     WHERE plan_id = ? 
     ORDER BY installment_number ASC`,
    [planId]
  );
};

/**
 * Get scheduled plans that have NO occurrences at all and whose start_date
 * falls within the next N days (or is already past/today).
 * Useful for showing plans on the dashboard before any occurrence is generated.
 * @param {number} days - Look-ahead window in days (default 7)
 * @returns {Promise<Array>}
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
       AND NOT EXISTS (
         SELECT 1 FROM scheduled_occurrences so WHERE so.plan_id = sp.id
       )
     ORDER BY sp.start_date ASC`,
    [today, futureDateStr]
  );
};
