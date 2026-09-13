import { initDB } from '../db/migrations';
import * as tillRepo from '../db/repositories/till.repo';
import { createTransaction } from '../db/repositories/transaction.repo';
import { getDb } from '../db/index';

beforeEach(async () => {
  await initDB();
});

describe('till.repo', () => {
  it('creates a till and returns its id', async () => {
    const id = await tillRepo.createTill('Efectivo', null);
    expect(id).toBe(1);

    const tills = await tillRepo.getAllTills();
    expect(tills).toHaveLength(1);
    expect(tills[0].name).toBe('Efectivo');
  });

  it('updates a till name and account_number', async () => {
    const id = await tillRepo.createTill('Efectivo', null);
    await tillRepo.updateTill(id, 'Banco', '123456');

    const tills = await tillRepo.getAllTills();
    expect(tills[0].name).toBe('Banco');
    expect(tills[0].account_number).toBe('123456');
  });

  it('computes balances per till (ingreso +, egreso -)', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    await createTransaction({ tillId, amount: 100, type: 'ingreso', date: '2026-01-01' });
    await createTransaction({ tillId, amount: 40, type: 'egreso', date: '2026-01-02' });

    const tills = await tillRepo.getTillsWithBalances();
    expect(tills).toHaveLength(1);
    expect(tills[0].balance).toBe(60);
  });

  it('deletes a till and all its transactions', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);
    await createTransaction({ tillId, amount: 100, type: 'ingreso', date: '2026-01-01' });

    await tillRepo.deleteTill(tillId);

    expect(await tillRepo.getAllTills()).toHaveLength(0);

    const db = await getDb();
    const tx = await db.getFirstAsync('SELECT COUNT(*) AS c FROM transactions');
    expect(tx.c).toBe(0);
  });
});
