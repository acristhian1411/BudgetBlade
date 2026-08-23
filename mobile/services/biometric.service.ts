import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { getSessionMasterKeyHex, setSessionMasterKeyHex } from './master-key.service';

const BIOMETRIC_KEY_RECORD = 'security.master_key.biometric.v1';
const DEVICE_KEY_RECORD = 'security.master_key.device.v1';
const QUICK_UNLOCK_FLAG = 'security.quick_unlock';

const BIOMETRIC_KEYCHAIN_SERVICE = 'budgetblade.biometric';
const DEVICE_KEYCHAIN_SERVICE = 'budgetblade.device';

const AUTH_PROMPT = 'Desbloquear BudgetBlade';

export type QuickUnlockResult =
  | { status: 'success' }
  | { status: 'canceled' }
  | { status: 'unavailable' }
  | { status: 'error'; error?: string };

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err ?? ''));

const isCancellation = (message: string) => /cancel|canceled|cancelled|negative|abort/i.test(message);

/** Whether a strong biometric (fingerprint/face) is available and enrolled. */
export const canUseBiometrics = () => SecureStore.canUseBiometricAuthentication();

/** Whether the device has any enrolled authenticator (biometric or PIN/pattern). */
export const canUseDeviceAuth = async () => {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE; // SECRET o BIOMETRIC
  } catch {
    return false;
  }
};

const getQuickUnlockFlag = async (): Promise<'enabled' | 'declined' | null> => {
  const value = await SecureStore.getItemAsync(QUICK_UNLOCK_FLAG);
  return value === 'enabled' || value === 'declined' ? value : null;
};

export const isQuickUnlockEnabled = async () => (await getQuickUnlockFlag()) === 'enabled';

export const isQuickUnlockDecided = async () => (await getQuickUnlockFlag()) !== null;

/** Writes both unlock records. The biometric write triggers a native confirmation prompt. */
export const enableQuickUnlock = async (): Promise<void> => {
  const masterKeyHex = getSessionMasterKeyHex();
  if (!masterKeyHex) throw new Error('Sesión no desbloqueada.');

  // Device-credential record (silent) — enables the PIN/pattern path.
  await SecureStore.setItemAsync(DEVICE_KEY_RECORD, masterKeyHex, {
    keychainService: DEVICE_KEYCHAIN_SERVICE,
  });

  // Biometric record — Keystore-bound, prompts to confirm on write.
  if (canUseBiometrics()) {
    try {
      await SecureStore.setItemAsync(BIOMETRIC_KEY_RECORD, masterKeyHex, {
        keychainService: BIOMETRIC_KEYCHAIN_SERVICE,
        requireAuthentication: true,
        authenticationPrompt: AUTH_PROMPT,
      });
    } catch {
      // Biometric write cancelled/failed — the device-credential path still works.
    }
  }

  await SecureStore.setItemAsync(QUICK_UNLOCK_FLAG, 'enabled');
};

export const declineQuickUnlock = async (): Promise<void> => {
  await SecureStore.setItemAsync(QUICK_UNLOCK_FLAG, 'declined');
};

export const clearQuickUnlock = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(BIOMETRIC_KEY_RECORD, { keychainService: BIOMETRIC_KEYCHAIN_SERVICE });
  await SecureStore.deleteItemAsync(DEVICE_KEY_RECORD, { keychainService: DEVICE_KEYCHAIN_SERVICE });
  await SecureStore.deleteItemAsync(QUICK_UNLOCK_FLAG);
};

export const unlockWithBiometrics = async (): Promise<QuickUnlockResult> => {
  if (getSessionMasterKeyHex()) return { status: 'success' };

  if (!(await isQuickUnlockEnabled())) return { status: 'unavailable' };

  // 1) Biometric path (cryptographically bound to the Keystore).
  if (canUseBiometrics()) {
    try {
      const hex = await SecureStore.getItemAsync(BIOMETRIC_KEY_RECORD, {
        keychainService: BIOMETRIC_KEYCHAIN_SERVICE,
        authenticationPrompt: AUTH_PROMPT,
      });
      if (hex) {
        setSessionMasterKeyHex(hex);
        return { status: 'success' };
      }
      // null => record missing or invalidated (biometrics changed); fall through.
    } catch (err) {
      if (isCancellation(errorMessage(err))) return { status: 'canceled' };
      // No hardware / not enrolled / other — fall through to device credential.
    }
  }

  // 2) Device-credential path (PIN/pattern gate).
  if (await canUseDeviceAuth()) {
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: AUTH_PROMPT,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
    });

    if (auth.success) {
      const hex = await SecureStore.getItemAsync(DEVICE_KEY_RECORD, {
        keychainService: DEVICE_KEYCHAIN_SERVICE,
      });
      if (hex) {
        setSessionMasterKeyHex(hex);
        return { status: 'success' };
      }
      return { status: 'unavailable' };
    }

    if (auth.error === 'user_cancel' || auth.error === 'app_cancel' || auth.error === 'system_cancel') {
      return { status: 'canceled' };
    }
    return { status: 'error', error: auth.error };
  }

  return { status: 'unavailable' };
};
