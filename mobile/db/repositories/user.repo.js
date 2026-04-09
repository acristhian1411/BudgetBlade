import * as Crypto from 'expo-crypto';
import { getDb } from '../index';

const hashPassword = (password) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);

/** Returns true if a local user record exists (i.e. not a first-run). */
export const hasUser = async () => {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT id FROM users WHERE id = ?', ['local-user']);
  return !!row;
};

/** Creates the single local-user with a hashed password. */
export const register = async (password) => {
  const db = await getDb();
  const hashed = await hashPassword(password);
  await db.runAsync(
    'INSERT INTO users (id, password) VALUES (?, ?)',
    ['local-user', hashed]
  );
};

/** Returns true if the given password matches the stored hash. */
export const login = async (password) => {
  const db = await getDb();
  const hashed = await hashPassword(password);
  const row = await db.getFirstAsync(
    'SELECT id FROM users WHERE id = ? AND password = ?',
    ['local-user', hashed]
  );
  return !!row;
};