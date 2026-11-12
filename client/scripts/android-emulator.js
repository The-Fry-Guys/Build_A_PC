const { spawnSync } = require('node:child_process');
const path = require('node:path');

// The emulator reaches the host through 10.0.2.2. Never rewrite client/.env.
const expoCli = require.resolve('expo/bin/cli');
const result = spawnSync(process.execPath, [expoCli, ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_PUBLIC_API_URL: 'http://10.0.2.2:8080/api/v1',
  },
});
if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
