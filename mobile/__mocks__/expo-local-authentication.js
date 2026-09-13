/**
 * Manual mock of `expo-local-authentication`.
 *
 * Test helpers:
 *   - __setEnrolledLevel(level) -> controls getEnrolledLevelAsync() result
 *   - __setAuthenticateResult(result) -> controls authenticateAsync() result
 *   - __reset()
 */
const SecurityLevel = {
  NONE: 0,
  SECRET: 1,
  BIOMETRIC: 2,
};

let enrolledLevel = SecurityLevel.NONE;
let authenticateResult = { success: false, error: 'not_enrolled' };

const getEnrolledLevelAsync = async () => enrolledLevel;

const authenticateAsync = async () => authenticateResult;

const hasHardwareAsync = async () => true;

const isEnrolledAsync = async () => enrolledLevel !== SecurityLevel.NONE;

const __setEnrolledLevel = (level) => {
  enrolledLevel = level;
};

const __setAuthenticateResult = (result) => {
  authenticateResult = result;
};

const __reset = () => {
  enrolledLevel = SecurityLevel.NONE;
  authenticateResult = { success: false, error: 'not_enrolled' };
};

module.exports = {
  SecurityLevel,
  getEnrolledLevelAsync,
  authenticateAsync,
  hasHardwareAsync,
  isEnrolledAsync,
  __setEnrolledLevel,
  __setAuthenticateResult,
  __reset,
};
