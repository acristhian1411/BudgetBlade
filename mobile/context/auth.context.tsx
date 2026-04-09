import React, { createContext, useContext, useState } from 'react';
import {
  hasUser,
  login as dbLogin,
  register as dbRegister,
} from '@/db/repositories/user.repo';

type AuthState = {
  isLoggedIn: boolean;
  /** null while the DB is still being checked on startup */
  isFirstRun: boolean | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  register: (password: string) => Promise<void>;
  setFirstRun: (val: boolean) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);

  const login = async (password: string): Promise<boolean> => {
    const ok = await dbLogin(password);
    if (ok) setIsLoggedIn(true);
    return ok;
  };

  const logout = () => setIsLoggedIn(false);

  const register = async (password: string) => {
    await dbRegister(password);
    setIsFirstRun(false);
    setIsLoggedIn(true);
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, isFirstRun, login, logout, register, setFirstRun: setIsFirstRun }}
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
