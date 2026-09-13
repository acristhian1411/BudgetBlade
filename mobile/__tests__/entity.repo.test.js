import { initDB } from '../db/migrations';
import * as entityRepo from '../db/repositories/entity.repo';
import { getPending } from '../db/repositories/sync-queue.repo';
import { getDb } from '../db/index';

beforeEach(async () => {
  await initDB();
});

describe('entity.repo', () => {
  it('creates, lists, updates and deletes an entity (stamping + enqueue)', async () => {
    const id = await entityRepo.createEntity('Proveedor A', 'provider', 'a@x.com');
    expect(id).toBe(1);

    let list = await entityRepo.getAllEntities();
    expect(list).toHaveLength(1);
    expect(list[0].uuid).toBeTruthy();
    expect(list[0].updated_at).toBeTruthy();

    await entityRepo.updateEntity(id, 'Proveedor B', 'both', 'b@x.com');
    const found = await entityRepo.getEntityById(id);
    expect(found.name).toBe('Proveedor B');
    expect(found.type).toBe('both');
    expect(found.contact).toBe('b@x.com');

    await entityRepo.deleteEntity(id);
    list = await entityRepo.getAllEntities();
    expect(list).toHaveLength(0);

    // create + update + delete are enqueued.
    const pending = await getPending();
    expect(pending.map((p) => p.operation)).toEqual(['create', 'update', 'delete']);
  });

  it('soft-deletes an entity (row is preserved)', async () => {
    const id = await entityRepo.createEntity('Proveedor', 'provider', null);
    await entityRepo.deleteEntity(id);

    const db = await getDb();
    const row = await db.getFirstAsync('SELECT deleted_at FROM entities WHERE id = ?', [id]);
    expect(row.deleted_at).toBeTruthy();
  });

  it('returns null for a missing entity id', async () => {
    expect(await entityRepo.getEntityById(99999)).toBeNull();
  });
});
