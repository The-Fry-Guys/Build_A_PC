/** Tests client logic without starting Expo or contacting external services. */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/src/**/*.test.ts', '**/src/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  clearMocks: true,
  collectCoverageFrom: [
    'src/lib/api.ts',
    'src/lib/tokenStore.web.ts',
    'src/lib/tokenStore.ts',
    'src/lib/session.ts',
    'src/lib/github-flow.ts',
    'src/admin/use-admin-directory.ts',
    'src/admin/query-provider.tsx',
    'src/hooks/useBuild.ts',
    'src/utils/compatibility.ts',
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
