import { initDB } from '../db/migrations';
import * as entityRepo from '../db/repositories/entity.repo';

beforeEach(async () => {
  await initDB();
});

describe('entity.repo', () => {
  it('creates, lists, updates and deletes an entity', async () => {
    const id = await entityRepo.createEntity('Proveedor A', 'provider', 'a@x.com');
    expect(id).toBe(1);

    let list = await entityRepo.getAllEntities();
    expect(list).toHaveLength(1);

    await entityRepo.updateEntity(id, 'Proveedor B', 'both', 'b@x.com');
    const found = await entityRepo.getEntityById(id);
    expect(found.name).toBe('Proveedor B');
    expect(found.type).toBe('both');
    expect(found.contact).toBe('b@x.com');

    await entityRepo.deleteEntity(id);
    list = await entityRepo.getAllEntities();
    expect(list).toHaveLength(0);
  });

  it('returns null for a missing entity id', async () => {
    expect(await entityRepo.getEntityById(99999)).toBeNull();
  });
});
