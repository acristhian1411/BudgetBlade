import { initDB } from '../db/migrations';
import {
  enqueue,
  enqueueEntityWrite,
  getPending,
  getQueueById,
  markProcessed,
  markFailed,
  newUuid,
  nowIso,
} from '../db/repositories/sync-queue.repo';
import * as tillRepo from '../db/repositories/till.repo';

beforeEach(async () => {
  await initDB();
});

describe('sync-queue.repo', () => {
  it('enqueues an operation and returns a queue id', async () => {
    const id = await enqueue({
      entityType: 'tills',
      entityId: 'uuid-1',
      operation: 'create',
      payload: JSON.stringify({ uuid: 'uuid-1', name: 'Efectivo' }),
    });

    expect(id).toBeTruthy();

    const entry = await getQueueById(id);
    expect(entry.entity_type).toBe('tills');
    expect(entry.entity_id).toBe('uuid-1');
    expect(entry.operation).toBe('create');
    expect(entry.status).toBe('pending');
    expect(entry.attempts).toBe(0);
    expect(entry.created_at).toBeTruthy();
  });

  it('returns pending entries in FIFO order', async () => {
    await enqueue({ entityType: 'tills', entityId: 'u1', operation: 'create' });
    await enqueue({ entityType: 'tills', entityId: 'u2', operation: 'create' });
    await enqueue({ entityType: 'tills', entityId: 'u3', operation: 'create' });

    const pending = await getPending();
    expect(pending.map((p) => p.entity_id)).toEqual(['u1', 'u2', 'u3']);
  });

  it('marks an entry processed', async () => {
    const id = await enqueue({ entityType: 'tills', entityId: 'u1', operation: 'create' });

    await markProcessed(id);
    const entry = await getQueueById(id);
    expect(entry.status).toBe('processed');
  });

  it('marks an entry failed and increments attempts', async () => {
    const id = await enqueue({ entityType: 'tills', entityId: 'u1', operation: 'create' });

    await markFailed(id);
    await markFailed(id);

    const entry = await getQueueById(id);
    expect(entry.status).toBe('failed');
    expect(entry.attempts).toBe(2);
  });

  it('snapshots an entity row as the payload via enqueueEntityWrite', async () => {
    const tillId = await tillRepo.createTill('Efectivo', null);

    const tills = await tillRepo.getAllTills();
    const uuid = tills[0].uuid;
    expect(uuid).toBeTruthy();

    const entry = await getQueueById(await getPending().then((p) => p[0]?.id));
    expect(entry).toBeTruthy();
    expect(entry.entity_type).toBe('tills');
    expect(entry.entity_id).toBe(uuid);
    expect(entry.operation).toBe('create');
    expect(JSON.parse(entry.payload).name).toBe('Efectivo');
  });

  it('generates valid v4 uuids and ISO timestamps', () => {
    const uuid = newUuid();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(new Date(nowIso()).toISOString()).toBe(nowIso());
  });
});
