require('../../scripts/load-env').loadEnv();

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.integration.test.ts'],
  // Same rationale as packages/sdk-node/jest.integration.config.js — this
  // suite drives several sequential authenticated calls through the real
  // apps/api app, and authenticateTenant's bcrypt scan gets slower as the
  // shared test DB's tenant count grows.
  testTimeout: 15000,
};
