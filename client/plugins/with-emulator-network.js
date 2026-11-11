const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const RESOURCE = 'buildapc_emulator_network';
const REFERENCE = `@xml/${RESOURCE}`;
const NETWORK_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

/** Opt-in local APK networking. Disabled prebuilds remove only our own exception. */
module.exports = function withEmulatorNetwork(config, { enabled = false } = {}) {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    const current = application.$['android:networkSecurityConfig'];
    if (enabled) {
      if (current && current !== REFERENCE) {
        throw new Error('Cannot replace an existing Android network security configuration.');
      }
      application.$['android:networkSecurityConfig'] = REFERENCE;
    } else if (current === REFERENCE) {
      delete application.$['android:networkSecurityConfig'];
    }
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const directory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    const filename = path.join(directory, `${RESOURCE}.xml`);
    if (enabled) {
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(filename, NETWORK_XML, 'utf8');
    } else {
      await fs.rm(filename, { force: true });
    }
    return mod;
  }]);
};
