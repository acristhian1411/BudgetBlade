/* eslint-env jest */
global.__DEV__ = true;

const sqlite = require('expo-sqlite');
const secureStore = require('expo-secure-store');
const localAuth = require('expo-local-authentication');

beforeEach(() => {
  sqlite.__resetDb();
  secureStore.__reset();
  localAuth.__reset();
});

afterAll(() => {
  sqlite.__closeDb();
});
