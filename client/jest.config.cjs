/** Tests client logic without starting Expo or contacting external services. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/lib/api.ts',
    'src/lib/tokenStore.web.ts',
    'src/lib/session.ts',
    'src/lib/github-flow.ts',
    'src/admin/use-admin-directory.ts',
    'src/admin/query-provider.tsx',
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
