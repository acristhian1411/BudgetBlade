import { initDB } from '../db/migrations';
import * as tillRepo from '../db/repositories/till.repo';
import { createTransaction } from '../db/repositories/transaction.repo';
import { getPending } from '../db/repositories/sync-queue.repo';
import { getDb } from '../db/index';

beforeEach(async () => {
  await initDB();
});

describe('till.repo', () => {
  it('creates a till with a uuid and enqueues a create operation', async () => {
    const id = await tillRepo.createTill('Efectivo', null);
    expect(id).toBe(1);

    const tills = await tillRepo.getAllTills();
    expect(tills).toHaveLength(1);
    expect(tills[0].name).toBe('Efectivo');
    expect(tills[0].uuid).toBeTruthy();
    expect(tills[0].updated_at).toBeTruthy();

    const pending = await getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].entity_type).toBe('tills');
    expect(pending[0].entity_id).toBe(tills[0].uuid);
    expect(pending[0].operation).toBe('create');
  });

  it('updates a till and enqueues an update operation', async () => {
    const id = await tillRepo.createTill('Efectivo', null);
    await tillRepo.updateTill(id, 'Banco', '123456');

    const tills = await tillRepo.getAllTills();
    expect(tills[0].name).toBe('Banco');
    expect(tills[0].account_number).toBe('123456');

    const pending = await getPending();
    expect(pending.map((p) => p.operation)).toEqual(['create', 'update']);
  });

  it('computes balances per till (ingreso +, egreso -)', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    await createTransaction({ tillId, amount: 100, type: 'ingreso', date: '2026-01-01' });
    await createTransaction({ tillId, amount: 40, type: 'egreso', date: '2026-01-02' });

    const tills = await tillRepo.getTillsWithBalances();
    expect(tills).toHaveLength(1);
    expect(tills[0].balance).toBe(60);
  });

  it('soft-deletes a till and its transactions (data is preserved)', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    await createTransaction({ tillId, amount: 100, type: 'ingreso', date: '2026-01-01' });

    await tillRepo.deleteTill(tillId);

    // Logical deletion: the till is no longer listed...
    expect(await tillRepo.getAllTills()).toHaveLength(0);

    // ...but the rows remain in the DB as tombstones.
    const db = await getDb();
    const till = await db.getFirstAsync('SELECT deleted_at FROM tills WHERE id = ?', [tillId]);
    const tx = await db.getFirstAsync('SELECT deleted_at FROM transactions WHERE till_id = ?', [tillId]);
    expect(till.deleted_at).toBeTruthy();
    expect(tx.deleted_at).toBeTruthy();

    // Deletes are enqueued (till + its transactions).
    const pending = await getPending();
    const deleteOps = pending.filter((p) => p.operation === 'delete');
    expect(deleteOps).toHaveLength(2);
  });
});
