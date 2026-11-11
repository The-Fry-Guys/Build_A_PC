/** Tests client logic without starting Expo or contacting external services. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/lib/api.ts',
    'src/lib/tokenStore.web.ts',
    'src/lib/tokenStore.ts',
    'src/lib/session.ts',
    'src/lib/github-flow.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};
