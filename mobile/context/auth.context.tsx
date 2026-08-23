import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Alert } from 'react-native';
import {
  hasUser,
  getLoginLockStatus,
  login as dbLogin,
  register as dbRegister,
} from '@/db/repositories/user.repo';
import { clearSessionMasterKey } from '@/services/master-key.service';
import {
  unlockWithBiometrics as biometricUnlock,
  enableQuickUnlock,
  declineQuickUnlock,
  canUseBiometrics,
  canUseDeviceAuth,
  isQuickUnlockDecided,
} from '@/services/biometric.service';
import type { QuickUnlockResult } from '@/services/biometric.service';

export type LoginResult = {
  ok: boolean;
  reason?: 'missing-user' | 'locked' | 'invalid-password' | 'key-unlock-failed';
  lockedUntil?: number | null;
  remainingMs?: number;
  failedAttempts?: number;
};

export type LoginLockStatus = {
  isLocked: boolean;
  lockedUntil: number | null;
  remainingMs: number;
  failedAttempts: number;
};

const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

type AuthState = {
  isLoggedIn: boolean;
  /** null while the DB is still being checked on startup */
  isFirstRun: boolean | null;
  markActivity: () => void;
  login: (password: string) => Promise<LoginResult>;
  getLockStatus: () => Promise<LoginLockStatus>;
  logout: () => void;
  register: (password: string) => Promise<void>;
  setFirstRun: (val: boolean) => void;
  unlockWithBiometrics: () => Promise<QuickUnlockResult>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastActivityAtRef = useRef<number>(Date.now());

  const markActivity = () => {
    lastActivityAtRef.current = Date.now();
  };

  const isSessionExpired = () => Date.now() - lastActivityAtRef.current >= SESSION_IDLE_TIMEOUT_MS;

  const login = async (password: string): Promise<LoginResult> => {
    const result = (await dbLogin(password)) as LoginResult;
    if (result.ok) {
      markActivity();
      setIsLoggedIn(true);
      void maybeOfferQuickUnlock();
    }
    return result;
  };

  const getLockStatus = async (): Promise<LoginLockStatus> => getLoginLockStatus();

  const logout = () => {
    clearSessionMasterKey();
    setIsLoggedIn(false);
  };

  const register = async (password: string) => {
    await dbRegister(password);
    markActivity();
    setIsFirstRun(false);
    setIsLoggedIn(true);
    void maybeOfferQuickUnlock();
  };

  const unlockWithBiometrics = async (): Promise<QuickUnlockResult> => {
    const result = await biometricUnlock();
    if (result.status === 'success') {
      markActivity();
      setIsLoggedIn(true);
    }
    return result;
  };

  // One-time prompt to enable quick unlock after the first password login/register.
  const maybeOfferQuickUnlock = async () => {
    try {
      if (await isQuickUnlockDecided()) return;
      const biometry = canUseBiometrics();
      const deviceAuth = await canUseDeviceAuth();
      if (!biometry && !deviceAuth) return;

      Alert.alert(
        'Desbloqueo rápido',
        biometry
          ? '¿Activar el desbloqueo con huella o PIN para entrar más rápido?'
          : '¿Activar el desbloqueo con el PIN/patrón del dispositivo?',
        [
          { text: 'Ahora no', style: 'cancel', onPress: () => void declineQuickUnlock() },
          { text: 'Activar', onPress: () => void enableQuickUnlock() },
        ]
      );
    } catch {
      // Non-critical: leave quick unlock undecided and offer again next time.
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    const onAppStateChange = (nextAppState: AppStateStatus) => {
      const prevAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (prevAppState.match(/inactive|background/) && nextAppState === 'active') {
        if (isSessionExpired()) {
          logout();
          return;
        }
        markActivity();
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    const intervalId = setInterval(() => {
      if (isSessionExpired()) {
        logout();
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [isLoggedIn]);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isFirstRun,
        markActivity,
        login,
        getLockStatus,
        logout,
        register,
        setFirstRun: setIsFirstRun,
        unlockWithBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthState => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
