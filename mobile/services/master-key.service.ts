import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { gcm } from '@noble/ciphers/aes';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/hashes/utils';

const MASTER_KEY_RECORD = 'security.master_key.v1';
const WRAP_VERSION = 1;
const WRAP_ALGORITHM = 'AES-256-GCM';
const WRAP_KDF = 'PBKDF2-SHA256';
// Pragmatic tradeoff: dev=fast testing, prod=strong protection
// In prod (1-2s delay is acceptable for security-critical operations)
const WRAP_ITERATIONS = __DEV__ ? 5000 : 10000;
const WRAP_SALT_SIZE = 16;
const WRAP_NONCE_SIZE = 12;
const MASTER_KEY_SIZE = 32;
const GCM_TAG_SIZE = 16;
const WRAP_AAD = utf8ToBytes('NativeBudgetBlade:MEK:wrap:v1');

let _sessionMasterKeyHex: string | null = null;

type WrappedMasterKeyPayload = {
  version: number;
  algorithm: string;
  kdf: string;
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
  authTag: string;
};

const deriveWrappingKey = async (password: string, saltHex: string, iterations = WRAP_ITERATIONS) => {
  return pbkdf2Async(sha256, utf8ToBytes(password), hexToBytes(saltHex), {
    c: iterations,
    dkLen: MASTER_KEY_SIZE,
    // Yield control more frequently to avoid freezing the UI on low-end devices.
    asyncTick: 1,
  });
};

const parsePayload = (raw: string | null): WrappedMasterKeyPayload | null => {
  if (!raw) return null;
  const parsed = JSON.parse(raw);

  if (
    parsed?.version !== WRAP_VERSION ||
    parsed?.algorithm !== WRAP_ALGORITHM ||
    parsed?.kdf !== WRAP_KDF ||
    typeof parsed?.iterations !== 'number' ||
    typeof parsed?.salt !== 'string' ||
    typeof parsed?.nonce !== 'string' ||
    typeof parsed?.ciphertext !== 'string' ||
    typeof parsed?.authTag !== 'string'
  ) {
    throw new Error('Formato de clave maestra inválido.');
  }

  return parsed as WrappedMasterKeyPayload;
};

const persistPayload = async (payload: WrappedMasterKeyPayload) => {
  await SecureStore.setItemAsync(MASTER_KEY_RECORD, JSON.stringify(payload));
};

const unwrapIntoSession = async (password: string, payload: WrappedMasterKeyPayload) => {
  const wrappingKey = await deriveWrappingKey(password, payload.salt, payload.iterations);
  const nonce = hexToBytes(payload.nonce);
  const ciphertext = hexToBytes(payload.ciphertext);
  const authTag = hexToBytes(payload.authTag);

  const encrypted = new Uint8Array(ciphertext.length + authTag.length);
  encrypted.set(ciphertext);
  encrypted.set(authTag, ciphertext.length);

  const plaintext = gcm(wrappingKey, nonce, WRAP_AAD).decrypt(encrypted);
  if (plaintext.length !== MASTER_KEY_SIZE) {
    throw new Error('Clave maestra inválida.');
  }

  _sessionMasterKeyHex = bytesToHex(plaintext);
};

export const hasWrappedMasterKey = async () => {
  const raw = await SecureStore.getItemAsync(MASTER_KEY_RECORD);
  return !!raw;
};

export const getWrappedMasterKeyPayload = async () => {
  const raw = await SecureStore.getItemAsync(MASTER_KEY_RECORD);
  return parsePayload(raw);
};

export const createWrappedMasterKey = async (password: string) => {
  const salt = Crypto.getRandomBytes(WRAP_SALT_SIZE);
  const nonce = Crypto.getRandomBytes(WRAP_NONCE_SIZE);
  const masterKey = Crypto.getRandomBytes(MASTER_KEY_SIZE);
  const wrappingKey = await deriveWrappingKey(password, bytesToHex(salt));

  const encrypted = gcm(wrappingKey, nonce, WRAP_AAD).encrypt(masterKey);
  const ciphertext = encrypted.subarray(0, encrypted.length - GCM_TAG_SIZE);
  const authTag = encrypted.subarray(encrypted.length - GCM_TAG_SIZE);

  const payload: WrappedMasterKeyPayload = {
    version: WRAP_VERSION,
    algorithm: WRAP_ALGORITHM,
    kdf: WRAP_KDF,
    iterations: WRAP_ITERATIONS,
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    authTag: bytesToHex(authTag),
  };

  await persistPayload(payload);
  _sessionMasterKeyHex = bytesToHex(masterKey);
};

export const wrapSessionMasterKeyWithPassword = async (password: string): Promise<WrappedMasterKeyPayload> => {
  const masterKey = getSessionMasterKey();
  const salt = Crypto.getRandomBytes(WRAP_SALT_SIZE);
  const nonce = Crypto.getRandomBytes(WRAP_NONCE_SIZE);
  const wrappingKey = await deriveWrappingKey(password, bytesToHex(salt));

  const encrypted = gcm(wrappingKey, nonce, WRAP_AAD).encrypt(masterKey);
  const ciphertext = encrypted.subarray(0, encrypted.length - GCM_TAG_SIZE);
  const authTag = encrypted.subarray(encrypted.length - GCM_TAG_SIZE);

  return {
    version: WRAP_VERSION,
    algorithm: WRAP_ALGORITHM,
    kdf: WRAP_KDF,
    iterations: WRAP_ITERATIONS,
    salt: bytesToHex(salt),
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    authTag: bytesToHex(authTag),
  };
};

export const unlockMasterKey = async (password: string) => {
  const payload = parsePayload(await SecureStore.getItemAsync(MASTER_KEY_RECORD));
  if (!payload) {
    throw new Error('No existe una clave maestra registrada.');
  }
  await unwrapIntoSession(password, payload);
};

export const bootstrapMasterKeyForSession = async (password: string) => {
  const raw = await SecureStore.getItemAsync(MASTER_KEY_RECORD);
  if (!raw) {
    await createWrappedMasterKey(password);
    return;
  }

  const payload = parsePayload(raw);
  if (!payload) {
    throw new Error('No se pudo cargar la clave maestra.');
  }

  await unwrapIntoSession(password, payload);
};

export const clearSessionMasterKey = () => {
  _sessionMasterKeyHex = null;
};

export const getSessionMasterKey = () => {
  if (!_sessionMasterKeyHex) {
    throw new Error('Sesión no desbloqueada. Inicia sesión nuevamente.');
  }
  return hexToBytes(_sessionMasterKeyHex);
};

export const getSessionMasterKeyFingerprint = () => {
  if (!_sessionMasterKeyHex) return null;
  return _sessionMasterKeyHex.slice(0, 16);
};

export const serializeEncryptedJson = (json: object) => {
  const masterKey = getSessionMasterKey();
  const nonce = Crypto.getRandomBytes(WRAP_NONCE_SIZE);
  const encrypted = gcm(masterKey, nonce, WRAP_AAD).encrypt(utf8ToBytes(JSON.stringify(json)));
  const ciphertext = encrypted.subarray(0, encrypted.length - GCM_TAG_SIZE);
  const authTag = encrypted.subarray(encrypted.length - GCM_TAG_SIZE);

  return {
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
    authTag: bytesToHex(authTag),
  };
};

export const decryptEncryptedJson = (payload: { nonce: string; ciphertext: string; authTag: string }) => {
  const masterKey = getSessionMasterKey();
  const nonce = hexToBytes(payload.nonce);
  const ciphertext = hexToBytes(payload.ciphertext);
  const authTag = hexToBytes(payload.authTag);

  const encrypted = new Uint8Array(ciphertext.length + authTag.length);
  encrypted.set(ciphertext);
  encrypted.set(authTag, ciphertext.length);

  const plainBytes = gcm(masterKey, nonce, WRAP_AAD).decrypt(encrypted);
  const text = bytesToUtf8(plainBytes);
  return JSON.parse(text);
};

export const decryptEncryptedJsonWithPassword = async (
  password: string,
  payload: { nonce: string; ciphertext: string; authTag: string },
  wrappedKeyPayload?: WrappedMasterKeyPayload
) => {
  let masterKeyHex: string;

  if (wrappedKeyPayload) {
    // Use the provided wrapped key (useful for portable backups)
    const wrappingKey = await deriveWrappingKey(password, wrappedKeyPayload.salt, wrappedKeyPayload.iterations);
    const nonce = hexToBytes(wrappedKeyPayload.nonce);
    const ciphertext = hexToBytes(wrappedKeyPayload.ciphertext);
    const authTag = hexToBytes(wrappedKeyPayload.authTag);

    const encrypted = new Uint8Array(ciphertext.length + authTag.length);
    encrypted.set(ciphertext);
    encrypted.set(authTag, ciphertext.length);

    const plaintext = gcm(wrappingKey, nonce, WRAP_AAD).decrypt(encrypted);
    if (plaintext.length !== MASTER_KEY_SIZE) {
      throw new Error('Contraseña incorrecta o clave maestra corrupta.');
    }
    masterKeyHex = bytesToHex(plaintext);
  } else {
    throw new Error('El respaldo no incluye wrappedMasterKey; no se puede derivar la clave maestra desde contraseña.');
  }

  // Now decrypt the backup content with the derived master key
  const nonce = hexToBytes(payload.nonce);
  const ciphertext = hexToBytes(payload.ciphertext);
  const authTag = hexToBytes(payload.authTag);

  const encrypted = new Uint8Array(ciphertext.length + authTag.length);
  encrypted.set(ciphertext);
  encrypted.set(authTag, ciphertext.length);

  const plainBytes = gcm(hexToBytes(masterKeyHex), nonce, WRAP_AAD).decrypt(encrypted);
  const text = bytesToUtf8(plainBytes);
  return JSON.parse(text);
};
