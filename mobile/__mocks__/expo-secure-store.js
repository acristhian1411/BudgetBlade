/**
 * Manual mock of `expo-secure-store` backed by an in-memory Map.
 *
 * Test helpers:
 *   - __setBiometrics(enabled)     -> controls canUseBiometricAuthentication()
 *   - __setRequireAuthThrows(bool) -> simulate the biometric write prompt
 *                                     failing/cancelling when requireAuthentication
 *                                     is true.
 *   - __reset()                    -> clears all stored values + flags.
 */
const store = new Map();

let biometricsEnabled = false;
let requireAuthThrows = false;

const canUseBiometricAuthentication = () => biometricsEnabled;

const getItemAsync = async (key) => {
  const entry = store.get(key);
  return entry === undefined ? null : entry;
};

const setItemAsync = async (key, value, options = {}) => {
  if (options && options.requireAuthentication && requireAuthThrows) {
    const err = new Error('User canceled the authentication prompt.');
    err.name = 'AuthenticationError';
    throw err;
  }
  store.set(key, value);
};

const deleteItemAsync = async (key) => {
  store.delete(key);
};

const __setBiometrics = (enabled) => {
  biometricsEnabled = Boolean(enabled);
};

const __setRequireAuthThrows = (throws) => {
  requireAuthThrows = Boolean(throws);
};

const __reset = () => {
  store.clear();
  biometricsEnabled = false;
  requireAuthThrows = false;
};

module.exports = {
  canUseBiometricAuthentication,
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  __setBiometrics,
  __setRequireAuthThrows,
  __reset,
};
