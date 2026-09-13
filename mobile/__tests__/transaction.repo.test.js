import { initDB } from '../db/migrations';
import * as txRepo from '../db/repositories/transaction.repo';
import * as tillRepo from '../db/repositories/till.repo';
import * as creditCardRepo from '../db/repositories/credit-card.repo';
import { getPending } from '../db/repositories/sync-queue.repo';
import { getDb } from '../db/index';

beforeEach(async () => {
  await initDB();
});

describe('transaction.repo', () => {
  it('stores amount as positive, stamps uuid/updated_at and enqueues a create', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    const id = await txRepo.createTransaction({
      tillId,
      amount: -50,
      type: 'egreso',
      date: '2026-01-01',
      description: 'compra',
    });

    expect(id).toBe(1);
    const db = await getDb();
    const row = await db.getFirstAsync('SELECT * FROM transactions WHERE id = ?', [id]);
    expect(row.amount).toBe(50);
    expect(row.description).toBe('compra');
    expect(row.uuid).toBeTruthy();
    expect(row.updated_at).toBeTruthy();

    const pending = await getPending();
    const txOps = pending.filter((p) => p.entity_type === 'transactions');
    expect(txOps).toHaveLength(1);
    expect(txOps[0].operation).toBe('create');
    expect(txOps[0].entity_id).toBe(row.uuid);
  });

  it('returns transactions with till and credit card names', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    await txRepo.createTransaction({ tillId, amount: 10, type: 'egreso', date: '2026-01-01' });

    const rows = await txRepo.getTransactions();
    expect(rows).toHaveLength(1);
    expect(rows[0].till_name).toBe('Efectivo');
  });

  it('filters transactions by till, type and date range', async () => {
    const tillA = await tillRepo.createTill('A', null);
    const tillB = await tillRepo.createTill('B', null);
    await txRepo.createTransaction({ tillId: tillA, amount: 10, type: 'ingreso', date: '2026-01-01' });
    await txRepo.createTransaction({ tillId: tillA, amount: 20, type: 'egreso', date: '2026-02-01' });
    await txRepo.createTransaction({ tillId: tillB, amount: 30, type: 'ingreso', date: '2026-01-15' });

    const byTill = await txRepo.getTransactions({ tillId: tillA });
    expect(byTill).toHaveLength(2);

    const byType = await txRepo.getTransactions({ type: 'ingreso' });
    expect(byType).toHaveLength(2);

    const byRange = await txRepo.getTransactions({ dateFrom: '2026-01-01', dateTo: '2026-01-31' });
    expect(byRange).toHaveLength(2);
  });

  it('computes total balance (ingreso - egreso)', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    await txRepo.createTransaction({ tillId, amount: 100, type: 'ingreso', date: '2026-01-01' });
    await txRepo.createTransaction({ tillId, amount: 30, type: 'egreso', date: '2026-01-02' });

    expect(await txRepo.getTotal()).toBe(70);
  });

  it('creates a transfer as two linked rows that net to zero', async () => {
    const from = await tillRepo.createTill('Origen', null);
    const to = await tillRepo.createTill('Destino', null);

    await txRepo.createTransfer({ fromTillId: from, toTillId: to, amount: 100, date: '2026-01-01' });

    const rows = await txRepo.getTransactions();
    expect(rows).toHaveLength(2);

    const amounts = rows.map((r) => r.amount).sort((a, b) => a - b);
    expect(amounts).toEqual([-100, 100]);
    expect(rows[0].transfer_id).toBe(rows[1].transfer_id);

    expect(await txRepo.getTotal()).toBe(0);
  });

  it('deletes a single transaction (soft-delete)', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    const id = await txRepo.createTransaction({ tillId, amount: 10, type: 'egreso', date: '2026-01-01' });

    await txRepo.deleteTransaction(id);
    expect(await txRepo.getTransactions()).toHaveLength(0);

    const db = await getDb();
    const row = await db.getFirstAsync('SELECT deleted_at FROM transactions WHERE id = ?', [id]);
    expect(row.deleted_at).toBeTruthy();
  });

  it('deletes both legs of a transfer together', async () => {
    const from = await tillRepo.createTill('Origen', null);
    const to = await tillRepo.createTill('Destino', null);
    await txRepo.createTransfer({ fromTillId: from, toTillId: to, amount: 100, date: '2026-01-01' });

    const [first] = await txRepo.getTransactions();
    await txRepo.deleteTransaction(first.id);

    expect(await txRepo.getTransactions()).toHaveLength(0);
  });

  it('computes balance by category (banco vs efectivo)', async () => {
    const banco = await tillRepo.createTill('Banco', '123456');
    const efectivo = await tillRepo.createTill('Efectivo', null);

    await txRepo.createTransaction({ tillId: banco, amount: 200, type: 'ingreso', date: '2026-01-01' });
    await txRepo.createTransaction({ tillId: efectivo, amount: 50, type: 'ingreso', date: '2026-01-01' });

    const result = await txRepo.getTotalByCategory();
    expect(result.banco).toBe(200);
    expect(result.efectivo).toBe(50);
  });

  it('registers a credit card payment (capital + interest + payment items)', async () => {
    const tillId = await tillRepo.createTill('Banco', '123456');
    const cardId = await creditCardRepo.createCreditCard({ tillId, name: 'Visa', creditLimit: 1000 });

    const purchaseId = await txRepo.createTransaction({
      tillId,
      amount: 500,
      type: 'egreso',
      date: '2026-01-01',
      creditCardId: cardId,
      paymentMethod: 'credit_card',
    });

    const result = await txRepo.createCreditCardPayment({
      tillId,
      creditCardId: cardId,
      capitalAmount: 300,
      interestAmount: 20,
      date: '2026-02-01',
      paymentItems: [{ purchaseTransactionId: purchaseId, amountPaid: 300 }],
    });

    expect(result.capitalTransactionId).toBeTruthy();
    expect(result.interestTransactionId).toBeTruthy();

    const db = await getDb();
    const items = await db.getAllAsync('SELECT * FROM credit_card_payment_items');
    expect(items).toHaveLength(1);
    expect(items[0].purchase_transaction_id).toBe(purchaseId);
    expect(items[0].payment_transaction_id).toBe(result.capitalTransactionId);
    expect(items[0].amount_paid).toBe(300);
  });

  it('throws on invalid credit card payment data', async () => {
    await expect(
      txRepo.createCreditCardPayment({
        tillId: 1,
        creditCardId: 1,
        capitalAmount: 0,
        date: '2026-02-01',
      })
    ).rejects.toThrow('Datos inválidos');
  });
});
