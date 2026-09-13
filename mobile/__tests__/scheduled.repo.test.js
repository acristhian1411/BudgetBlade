import { initDB } from '../db/migrations';
import * as scheduledRepo from '../db/repositories/scheduled.repo';
import * as tillRepo from '../db/repositories/till.repo';
import * as categoryRepo from '../db/repositories/category.repo';
import * as entityRepo from '../db/repositories/entity.repo';
import * as txRepo from '../db/repositories/transaction.repo';
import { getPending } from '../db/repositories/sync-queue.repo';

const iso = (d) => d.toISOString().split('T')[0];
const isoToday = () => iso(new Date());
const isoDaysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
};

const getExpenseCategoryId = async () => {
  const categories = await categoryRepo.getAllCategories('expense');
  return categories[0].id;
};

let tillId;
let categoryId;

beforeEach(async () => {
  await initDB();
  tillId = await tillRepo.createTill('Banco', '123456');
  categoryId = await getExpenseCategoryId();
});

describe('scheduled.repo', () => {
  it('creates a plan and generates its installments', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId,
      entityId: null,
      tillId,
      title: 'Servicio',
      baseAmount: 100,
      totalInstallments: 3,
      startDate: '2026-01-01',
      type: 'egreso',
    });

    expect(planId).toBe(1);

    const occurrences = await scheduledRepo.getOccurrencesByPlanId(planId);
    expect(occurrences).toHaveLength(3);
    expect(occurrences.map((o) => o.installment_number)).toEqual([1, 2, 3]);
    expect(occurrences[0].status).toBe('pending');
    expect(occurrences[0].remaining_amount).toBe(100);

    // Sync-aware: plan and occurrences are stamped with uuid/updated_at and enqueued.
    for (const o of occurrences) {
      expect(o.uuid).toBeTruthy();
      expect(o.updated_at).toBeTruthy();
    }
    const plan = await scheduledRepo.getPlanById(planId);
    expect(plan.uuid).toBeTruthy();

    const pending = await getPending();
    expect(pending.filter((p) => p.entity_type === 'scheduled_plans')).toHaveLength(1);
    expect(pending.filter((p) => p.entity_type === 'scheduled_occurrences')).toHaveLength(3);
  });

  it('lists all plans with counts', async () => {
    await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 2, startDate: '2026-01-01', type: 'egreso',
    });

    const plans = await scheduledRepo.getAllPlans();
    expect(plans).toHaveLength(1);
    expect(plans[0].total_occurrences).toBe(2);
    expect(plans[0].pending_count).toBe(2);
  });

  it('marks past-due pending occurrences as overdue', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 1, startDate: isoDaysAgo(10), type: 'egreso',
    });

    await scheduledRepo.markOverdue();

    const pending = await scheduledRepo.getPendingAndOverdue();
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('overdue');
  });

  it('returns upcoming occurrences within N days', async () => {
    await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 1, startDate: isoDaysFromNow(3), type: 'egreso',
    });

    const upcoming = await scheduledRepo.getUpcomingOccurrences(7);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].title).toBe('A');
  });

  it('applies partial payments and updates remaining/status', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 1, startDate: isoDaysAgo(10), type: 'egreso',
    });
    const [occurrence] = await scheduledRepo.getOccurrencesByPlanId(planId);

    const tx1 = await txRepo.createTransaction({ tillId, amount: 40, type: 'egreso', date: isoToday() });
    const tx2 = await txRepo.createTransaction({ tillId, amount: 60, type: 'egreso', date: isoToday() });

    const first = await scheduledRepo.applyOccurrencePayment(occurrence.id, tx1, 40, isoToday());
    expect(first).toEqual({ remainingAmount: 60, status: 'partially_paid' });

    const second = await scheduledRepo.applyOccurrencePayment(occurrence.id, tx2, 60, isoToday());
    expect(second).toEqual({ remainingAmount: 0, status: 'processed' });

    const history = await scheduledRepo.getPaymentHistoryForOccurrence(occurrence.id);
    expect(history).toHaveLength(2);
  });

  it('rejects a payment greater than the remaining balance', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 1, startDate: isoDaysAgo(10), type: 'egreso',
    });
    const [occurrence] = await scheduledRepo.getOccurrencesByPlanId(planId);
    const tx = await txRepo.createTransaction({ tillId, amount: 1, type: 'egreso', date: isoToday() });

    await expect(
      scheduledRepo.applyOccurrencePayment(occurrence.id, tx, 150, isoToday())
    ).rejects.toThrow('no puede ser mayor');
  });

  it('fully processes an occurrence (backward-compatible helper)', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 80,
      totalInstallments: 1, startDate: isoDaysAgo(10), type: 'egreso',
    });
    const [occurrence] = await scheduledRepo.getOccurrencesByPlanId(planId);
    const tx = await txRepo.createTransaction({ tillId, amount: 80, type: 'egreso', date: isoToday() });

    const result = await scheduledRepo.processOccurrence(occurrence.id, tx);
    expect(result).toEqual({ remainingAmount: 0, status: 'processed' });
  });

  it('updates editable fields of an occurrence', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 1, startDate: isoDaysAgo(10), type: 'egreso',
    });
    const [occurrence] = await scheduledRepo.getOccurrencesByPlanId(planId);

    await scheduledRepo.updateOccurrence(occurrence.id, {
      dueDate: isoDaysFromNow(5),
      amount: 150,
      remainingAmount: 150,
    });

    const updated = await scheduledRepo.getOccurrenceById(occurrence.id);
    expect(updated.due_date).toBe(isoDaysFromNow(5));
    expect(updated.amount).toBe(150);
    expect(updated.remaining_amount).toBe(150);
  });

  it('deletes a plan and all its occurrences', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 2, startDate: '2026-01-01', type: 'egreso',
    });

    await scheduledRepo.deletePlan(planId);

    expect(await scheduledRepo.getAllPlans()).toHaveLength(0);
    expect(await scheduledRepo.getOccurrencesByPlanId(planId)).toHaveLength(0);
  });

  it('lists plans that have no occurrences', async () => {
    await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'Recurrente',
      baseAmount: 50, totalInstallments: null, startDate: isoDaysAgo(3), type: 'egreso',
    });

    const plans = await scheduledRepo.getPlansWithNoOccurrences(7);
    expect(plans).toHaveLength(1);
    expect(plans[0].title).toBe('Recurrente');
  });

  it('generates rolling occurrences for infinite plans once per month', async () => {
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId: null, tillId, title: 'Recurrente',
      baseAmount: 50, totalInstallments: null, startDate: isoDaysAgo(40), type: 'egreso',
    });

    await scheduledRepo.generateRollingOccurrences();
    let occurrences = await scheduledRepo.getOccurrencesByPlanId(planId);
    expect(occurrences).toHaveLength(1);

    await scheduledRepo.generateRollingOccurrences();
    occurrences = await scheduledRepo.getOccurrencesByPlanId(planId);
    expect(occurrences).toHaveLength(1);
  });

  it('links plan info (entity/category names) in lookups', async () => {
    const entityId = await entityRepo.createEntity('Proveedor', 'provider', null);

    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 1, startDate: isoDaysAgo(10), type: 'egreso',
    });

    const [occurrence] = await scheduledRepo.getOccurrencesByPlanId(planId);
    const detail = await scheduledRepo.getOccurrenceById(occurrence.id);
    expect(detail.title).toBe('A');
    expect(detail.entity_name).toBe('Proveedor');
    expect(detail.category_name).toBeTruthy();
  });

  // getPlanById previously had a latent SQL bug (misplaced COALESCE); fixed in
  // the sync-aware rewrite (Phase 3).
  it('getPlanById returns plan with entity/category names', async () => {
    const entityId = await entityRepo.createEntity('Proveedor', 'provider', null);
    const planId = await scheduledRepo.createPlanWithInstallments({
      categoryId, entityId, tillId, title: 'A', baseAmount: 100,
      totalInstallments: 1, startDate: isoDaysAgo(10), type: 'egreso',
    });

    const plan = await scheduledRepo.getPlanById(planId);
    expect(plan.entity_name).toBe('Proveedor');
    expect(plan.category_name).toBeTruthy();
  });
});
