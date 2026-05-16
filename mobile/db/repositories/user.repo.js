import * as Crypto from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';
import { getDb } from '../index';
import { bootstrapMasterKeyForSession, createWrappedMasterKey } from '@/services/master-key.service';

const PASSWORD_ALGORITHM = 'PBKDF2-SHA256';
const LEGACY_ALGORITHM = 'legacy-sha256';
const PASSWORD_ITERATIONS = 2100;
const PASSWORD_KEY_LENGTH = 32;
const SALT_SIZE_BYTES = 5;

const LOCK_DELAYS_SECONDS = [0, 0, 0, 1, 2, 4, 8];
const MAX_LOCK_DELAY_SECONDS = 30;

let _securityColumnsReady = false;

const ensureUserSecurityColumns = async (db) => {
  if (_securityColumnsReady) return;

  const cols = await db.getAllAsync('PRAGMA table_info(users)');
  const existing = new Set(cols.map((c) => c.name));

  const alterStatements = [];
  if (!existing.has('password_salt')) {
    alterStatements.push('ALTER TABLE users ADD COLUMN password_salt TEXT;');
  }
  if (!existing.has('password_iterations')) {
    alterStatements.push('ALTER TABLE users ADD COLUMN password_iterations INTEGER;');
  }
  if (!existing.has('password_algorithm')) {
    alterStatements.push('ALTER TABLE users ADD COLUMN password_algorithm TEXT;');
  }
  if (!existing.has('failed_attempts')) {
    alterStatements.push('ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;');
  }
  if (!existing.has('locked_until')) {
    alterStatements.push('ALTER TABLE users ADD COLUMN locked_until INTEGER;');
  }

  for (const sql of alterStatements) {
    try {
      await db.execAsync(sql);
    } catch (_err) {
      // Ignore if another path altered the table first.
    }
  }

  await db.runAsync(
    `UPDATE users
     SET password_algorithm = ?
     WHERE password IS NOT NULL
       AND (password_algorithm IS NULL OR password_algorithm = '')`,
    [LEGACY_ALGORITHM]
  );

  await db.runAsync(
    `UPDATE users
     SET failed_attempts = 0
     WHERE failed_attempts IS NULL`
  );

  _securityColumnsReady = true;
};

const hashLegacyPassword = (password) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);

const createSaltHex = () => bytesToHex(Crypto.getRandomBytes(SALT_SIZE_BYTES));

const derivePasswordHash = async (password, saltHex, iterations = PASSWORD_ITERATIONS) => {
  const key = await pbkdf2Async(sha256, utf8ToBytes(password), hexToBytes(saltHex), {
    c: iterations,
    dkLen: PASSWORD_KEY_LENGTH,
    asyncTick: 1,
  });
  return bytesToHex(key);
};

const getDelaySecondsForAttempts = (attempts) => {
  if (attempts <= 0) return 0;
  if (attempts <= LOCK_DELAYS_SECONDS.length) {
    return LOCK_DELAYS_SECONDS[attempts - 1];
  }
  return MAX_LOCK_DELAY_SECONDS;
};

const getRemainingMs = (lockedUntil) => {
  if (!lockedUntil) return 0;
  return Math.max(0, lockedUntil - Date.now());
};

const resetLockState = async (db) => {
  await db.runAsync(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
    ['local-user']
  );
};

/** Returns the current lock state for login UI. */
export const getLoginLockStatus = async () => {
  const db = await getDb();
  await ensureUserSecurityColumns(db);
  const row = await db.getFirstAsync(
    `SELECT failed_attempts, locked_until
     FROM users
     WHERE id = ?`,
    ['local-user']
  );

  const failedAttempts = row?.failed_attempts ?? 0;
  const lockedUntil = row?.locked_until ?? null;
  const remainingMs = getRemainingMs(lockedUntil);

  return {
    failedAttempts,
    lockedUntil,
    remainingMs,
    isLocked: remainingMs > 0,
  };
};

/** Returns true if a local user record exists (i.e. not a first-run). */
export const hasUser = async () => {
  const db = await getDb();
  await ensureUserSecurityColumns(db);
  const row = await db.getFirstAsync('SELECT id FROM users WHERE id = ?', ['local-user']);
  return !!row;
};

/** Creates the single local-user with a hashed password. */
export const register = async (password) => {
  const db = await getDb();
  await ensureUserSecurityColumns(db);
  const saltHex = createSaltHex();
  const hashed = await derivePasswordHash(password, saltHex, PASSWORD_ITERATIONS);

  await db.runAsync(
    `INSERT INTO users
      (id, password, password_salt, password_iterations, password_algorithm, failed_attempts, locked_until)
     VALUES (?, ?, ?, ?, ?, 0, NULL)`,
    ['local-user', hashed, saltHex, PASSWORD_ITERATIONS, PASSWORD_ALGORITHM]
  );

  // First-run setup should always create a fresh wrapped master key.
  // Reusing an older SecureStore payload can break fresh installs or DB resets.
  await createWrappedMasterKey(password);
};

/** Validates password while applying persistent lockout controls. */
export const login = async (password) => {
  const db = await getDb();
  await ensureUserSecurityColumns(db);

  const row = await db.getFirstAsync(
    `SELECT
       id,
       password,
       password_salt,
       password_iterations,
       password_algorithm,
       failed_attempts,
       locked_until
     FROM users
     WHERE id = ?`,
    ['local-user']
  );

  if (!row) {
    return {
      ok: false,
      reason: 'missing-user',
      remainingMs: 0,
      failedAttempts: 0,
    };
  }

  const remainingMs = getRemainingMs(row?.locked_until ?? null);
  if (remainingMs > 0) {
    return {
      ok: false,
      reason: 'locked',
      lockedUntil: row?.locked_until ?? null,
      remainingMs,
      failedAttempts: row?.failed_attempts ?? 0,
    };
  }

  const storedAlgorithm = row?.password_algorithm || LEGACY_ALGORITHM;
  let isValid = false;
  let shouldUpgradeHash = false;

  if (storedAlgorithm === PASSWORD_ALGORITHM && row?.password_salt && row?.password_iterations) {
    const derived = await derivePasswordHash(password, row.password_salt, row.password_iterations);
    isValid = derived === row.password;
  } else {
    const legacy = await hashLegacyPassword(password);
    isValid = legacy === row.password;
    shouldUpgradeHash = isValid;
  }

  if (isValid) {
    try {
      await bootstrapMasterKeyForSession(password);
    } catch (_err) {
      return {
        ok: false,
        reason: 'key-unlock-failed',
        remainingMs: 0,
        failedAttempts: row?.failed_attempts ?? 0,
      };
    }

    if (shouldUpgradeHash) {
      const saltHex = createSaltHex();
      const upgradedHash = await derivePasswordHash(password, saltHex, PASSWORD_ITERATIONS);
      await db.runAsync(
        `UPDATE users
         SET password = ?,
             password_salt = ?,
             password_iterations = ?,
             password_algorithm = ?,
             failed_attempts = 0,
             locked_until = NULL
         WHERE id = ?`,
        [upgradedHash, saltHex, PASSWORD_ITERATIONS, PASSWORD_ALGORITHM, 'local-user']
      );
    } else {
      await resetLockState(db);
    }

    return {
      ok: true,
      remainingMs: 0,
      failedAttempts: 0,
    };
  }

  const failedAttempts = (row?.failed_attempts ?? 0) + 1;
  const delaySeconds = getDelaySecondsForAttempts(failedAttempts);
  const lockedUntil = delaySeconds > 0 ? Date.now() + (delaySeconds * 1000) : null;
  const nextRemainingMs = lockedUntil ? Math.max(0, lockedUntil - Date.now()) : 0;

  await db.runAsync(
    `UPDATE users
     SET failed_attempts = ?,
         locked_until = ?
     WHERE id = ?`,
    [failedAttempts, lockedUntil, 'local-user']
  );

  return {
    ok: false,
    reason: delaySeconds > 0 ? 'locked' : 'invalid-password',
    lockedUntil,
    remainingMs: nextRemainingMs,
    failedAttempts,
  };
};