const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

/** Applies an explicitly selected local development keystore after prebuild. */
module.exports = function withLocalDebugKeystore(
  config,
  { keystorePath } = {},
) {
  if (!keystorePath) return config;

  return withDangerousMod(config, ['android', async (mod) => {
    const source = path.resolve(mod.modRequest.projectRoot, keystorePath);
    const destination = path.join(
      mod.modRequest.platformProjectRoot,
      'app',
      'debug.keystore',
    );

    await fs.access(source);
    await fs.copyFile(source, destination);
    await fs.chmod(destination, 0o600);

    return mod;
  }]);
};
