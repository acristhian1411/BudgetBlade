import { initDB } from '../db/migrations';
import * as userRepo from '../db/repositories/user.repo';

beforeEach(async () => {
  await initDB();
});

describe('user.repo', () => {
  it('has no user on first run', async () => {
    expect(await userRepo.hasUser()).toBe(false);
  });

  it('registers a local user and logs in with the correct password', async () => {
    await userRepo.register('correct horse');
    expect(await userRepo.hasUser()).toBe(true);

    const result = await userRepo.login('correct horse');
    expect(result.ok).toBe(true);
  });

  it('rejects a wrong password', async () => {
    await userRepo.register('secret');

    const result = await userRepo.login('wrong');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid-password');
  });

  it('returns missing-user when there is no user record', async () => {
    const result = await userRepo.login('anything');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing-user');
  });

  it('applies lockout after repeated failures', async () => {
    await userRepo.register('secret');

    expect((await userRepo.login('bad')).reason).toBe('invalid-password');
    expect((await userRepo.login('bad')).reason).toBe('invalid-password');
    expect((await userRepo.login('bad')).reason).toBe('invalid-password');

    const locked = await userRepo.login('bad');
    expect(locked.ok).toBe(false);
    expect(locked.reason).toBe('locked');
  });

  it('reports lock status', async () => {
    await userRepo.register('secret');

    const initial = await userRepo.getLoginLockStatus();
    expect(initial.isLocked).toBe(false);
    expect(initial.failedAttempts).toBe(0);

    await userRepo.login('bad');
    await userRepo.login('bad');
    await userRepo.login('bad');
    await userRepo.login('bad');

    const status = await userRepo.getLoginLockStatus();
    expect(status.isLocked).toBe(true);
    expect(status.failedAttempts).toBe(4);
  });
});
