import { initDB } from '../db/migrations';
import * as backupRepo from '../db/repositories/backup.repo';
import * as tillRepo from '../db/repositories/till.repo';
import * as txRepo from '../db/repositories/transaction.repo';
import * as masterKey from '../services/master-key.service';
import { getDb } from '../db/index';

const seedData = async () => {
  const tillId = await tillRepo.createTill('Efectivo', null);
  await txRepo.createTransaction({ tillId, amount: 100, type: 'ingreso', date: '2026-01-01' });
};

describe('backup.repo', () => {
  it('exports a JSON backup containing all tables', async () => {
    await initDB();
    await seedData();

    const backup = await backupRepo.exportDatabaseBackup('json');
    expect(backup.format).toBe('json');

    const parsed = JSON.parse(backup.content);
    expect(parsed.tables.tills).toHaveLength(1);
    expect(parsed.tables.transactions).toHaveLength(1);
    expect(parsed.tables.categories).toHaveLength(22);
  });

  it('exports a CSV backup with a header comment', async () => {
    await initDB();
    await seedData();

    const backup = await backupRepo.exportDatabaseBackup('csv');
    expect(backup.format).toBe('csv');
    expect(backup.content).toContain('# NativeBudgetBlade backup');
    expect(backup.content).toContain('## table:tills');
  });

  it('round-trips a JSON backup (export -> wipe -> import)', async () => {
    await initDB();
    await seedData();

    const backup = await backupRepo.exportDatabaseBackup('json');
    await backupRepo.importDatabaseBackup(backup.content, 'json', null);

    const tills = await tillRepo.getAllTills();
    expect(tills).toHaveLength(1);
    expect(tills[0].name).toBe('Efectivo');

    const db = await getDb();
    const tx = await db.getFirstAsync('SELECT COUNT(*) AS c FROM transactions');
    expect(tx.c).toBe(1);
  });

  it('round-trips an encrypted .nbb backup with a password', async () => {
    await initDB();
    await masterKey.createWrappedMasterKey('password');
    await seedData();

    const backup = await backupRepo.exportDatabaseBackup('nbb', 'password');
    expect(backup.format).toBe('nbb');

    await backupRepo.importDatabaseBackup(backup.content, 'nbb', 'password');

    const tills = await tillRepo.getAllTills();
    expect(tills).toHaveLength(1);
  });

  it('requires a password to export .nbb', async () => {
    await initDB();
    await masterKey.createWrappedMasterKey('password');

    await expect(backupRepo.exportDatabaseBackup('nbb', '')).rejects.toThrow();
  });

  it('allows legacy import in dev', async () => {
    const policy = backupRepo.getBackupImportPolicy();
    expect(policy.allowLegacyImport).toBe(true);
  });
});
