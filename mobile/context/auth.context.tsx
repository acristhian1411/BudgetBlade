import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  hasUser,
  getLoginLockStatus,
  login as dbLogin,
  register as dbRegister,
} from '@/db/repositories/user.repo';
import { clearSessionMasterKey } from '@/services/master-key.service';

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
