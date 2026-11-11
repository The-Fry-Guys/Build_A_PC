module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ['./plugins/with-emulator-network', {
      enabled: process.env.APP_ANDROID_EMULATOR_HTTP === '1',
    }],
  ],
});
