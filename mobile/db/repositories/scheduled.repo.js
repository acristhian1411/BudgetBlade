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

  const db = await getDb();
  
  // Insert plan
  const planResult = await db.runAsync(
    `INSERT INTO scheduled_plans 
     (category_id, entity_id, till_id, title, base_amount, total_installments, start_date) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [categoryId, entityId, tillId, title, baseAmount || null, totalInstallments || null, startDate]
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
         (plan_id, installment_number, due_date, type, amount, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [planId, i, dueDateStr, type, baseAmount || null, 'pending']
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
  
  // Get all infinite plans
  const plans = await db.getAllAsync(
    `SELECT id, start_date, type, base_amount FROM scheduled_plans 
     WHERE total_installments IS NULL`
  );

  const today = new Date();
  const currentMonth = today.getFullYear() * 100 + today.getMonth() + 1;
  const currentDateStr = today.toISOString().split('T')[0];

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

      await db.runAsync(
        `INSERT INTO scheduled_occurrences 
         (plan_id, installment_number, due_date, type, amount, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [plan.id, occNum, dueDateStr, plan.type, plan.base_amount || null, 'pending']
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
     WHERE status = 'pending' AND due_date < ?`,
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
     WHERE so.status IN ('pending', 'overdue')
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
       so.status,
       sp.title,
       sp.till_id,
       e.name AS entity_name,
       c.name AS category_name
     FROM scheduled_occurrences so
     JOIN scheduled_plans sp ON sp.id = so.plan_id
     LEFT JOIN entities e ON e.id = sp.entity_id
     LEFT JOIN categories c ON c.id = sp.category_id
     WHERE so.status = 'pending' AND so.due_date BETWEEN ? AND ?
     ORDER BY so.due_date ASC`,
    [today, futureDateStr]
  );
};

/**
 * Mark an occurrence as processed and link it to a transaction.
 * @param {number} occurrenceId
 * @param {number} transactionId
 */
export const processOccurrence = async (occurrenceId, transactionId) => {
  const db = await getDb();
  await db.runAsync(
    `UPDATE scheduled_occurrences 
     SET status = 'processed', transaction_id = ? 
     WHERE id = ?`,
    [transactionId, occurrenceId]
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
       COALESCE(SUM(CASE WHEN so.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_count,
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
     LEFT JOIN entities e ON e.id = sp.entity_id
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
 * Get occurrences for a specific plan.
 * @param {number} planId
 * @returns {Promise<Array>}
 */
export const getOccurrencesByPlanId = async (planId) => {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM scheduled_occurrences 
     WHERE plan_id = ? 
     ORDER BY installment_number ASC`,
    [planId]
  );
};
