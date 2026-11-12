const { spawnSync } = require('node:child_process');
const path = require('node:path');

const expoCli = require.resolve('expo/bin/cli');
const cwd = path.resolve(__dirname, '..');
const environment = {
  ...process.env,
  EXPO_PUBLIC_API_URL: 'http://10.0.2.2:8080/api/v1',
  APP_ANDROID_EMULATOR_HTTP: '1',
};

function expo(args, env) {
  const result = spawnSync(process.execPath, [expoCli, ...args], {
    cwd,
    stdio: 'inherit',
    env,
  });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}

let status = 1;
try {
  status = expo(['prebuild', '--platform', 'android', '--no-install', '--no-clean'], environment);
  if (status === 0) {
    status = expo([
      'run:android', '--variant', 'release', '--device', 'Pixel_9', '--no-build-cache',
    ], environment);
  }
} finally {
  // Leave generated sources ready for normal releases even if compilation fails.
  console.log('Restoring the normal Android network configuration…');
  const restored = expo(['prebuild', '--platform', 'android', '--no-install', '--no-clean'], {
    ...environment,
    APP_ANDROID_EMULATOR_HTTP: '0',
  });
  if (restored !== 0) {
    console.error('Network configuration cleanup failed. Run Expo prebuild without APP_ANDROID_EMULATOR_HTTP before a normal build.');
    status = restored;
  }
}
process.exit(status);
