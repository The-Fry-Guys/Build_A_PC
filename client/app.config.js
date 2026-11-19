module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    'expo-status-bar',
    'expo-web-browser',
    ['./plugins/with-local-debug-keystore', {
      keystorePath: process.env.APP_ANDROID_DEBUG_KEYSTORE,
    }],
    ['./plugins/with-emulator-network', {
      enabled: process.env.APP_ANDROID_EMULATOR_HTTP === '1',
    }],
  ],
});
