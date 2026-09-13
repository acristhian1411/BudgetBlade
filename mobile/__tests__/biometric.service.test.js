import * as SecureStore from 'expo-secure-store';
import * as masterKey from '../services/master-key.service';
import * as biometric from '../services/biometric.service';

const MASTER_KEY_HEX = 'ab'.repeat(32);

beforeEach(() => {
  SecureStore.__setBiometrics(true);
  masterKey.setSessionMasterKeyHex(MASTER_KEY_HEX);
});

describe('biometric.service', () => {
  it('enables quick unlock and unlocks via biometrics', async () => {
    await biometric.enableQuickUnlock();
    expect(await biometric.isQuickUnlockEnabled()).toBe(true);

    masterKey.clearSessionMasterKey();
    expect(masterKey.getSessionMasterKeyHex()).toBeNull();

    const result = await biometric.unlockWithBiometrics();
    expect(result.status).toBe('success');
    expect(masterKey.getSessionMasterKeyHex()).toBe(MASTER_KEY_HEX);
  });

  it('returns unavailable when quick unlock was declined', async () => {
    await biometric.declineQuickUnlock();
    expect(await biometric.isQuickUnlockEnabled()).toBe(false);

    masterKey.clearSessionMasterKey();
    const result = await biometric.unlockWithBiometrics();
    expect(result.status).toBe('unavailable');
  });

  it('returns unavailable when quick unlock was never decided', async () => {
    masterKey.clearSessionMasterKey();
    const result = await biometric.unlockWithBiometrics();
    expect(result.status).toBe('unavailable');
  });

  it('tracks the quick-unlock decision', async () => {
    expect(await biometric.isQuickUnlockDecided()).toBe(false);
    await biometric.enableQuickUnlock();
    expect(await biometric.isQuickUnlockDecided()).toBe(true);
  });
});
