/**
 * Manual mock of `expo-crypto` backed by Node's `crypto` module.
 */
const nodeCrypto = require('crypto');

const CryptoDigestAlgorithm = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
  MD5: 'MD5',
};

const digestStringAsync = async (algorithm, data) => {
  const nodeAlgo = CryptoDigestAlgorithm[algorithm] || algorithm;
  return nodeCrypto.createHash(nodeAlgo).update(data).digest('hex');
};

const getRandomBytes = (byteCount) => {
  const bytes = nodeCrypto.randomBytes(byteCount);
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
};

const getRandomBytesAsync = async (byteCount) => getRandomBytes(byteCount);

const randomUUID = () => nodeCrypto.randomUUID();

module.exports = {
  CryptoDigestAlgorithm,
  digestStringAsync,
  getRandomBytes,
  getRandomBytesAsync,
  randomUUID,
};
