import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const withEmulatorNetwork = require('../../../plugins/with-emulator-network');
const appConfig = require('../../../app.config');
const { parseStringPromise } = require('xml2js');

// Capture the plugin's real mod actions without generating an entire app fixture.
jest.mock('expo/config-plugins', () => ({
  ...jest.requireActual('expo/config-plugins'),
  withAndroidManifest: (config: object, action: unknown) => ({ ...config, manifestAction: action }),
  withDangerousMod: (config: object, [, action]: [string, unknown]) => ({ ...config, resourceAction: action }),
}));

let project: string;
const originalFlag = process.env.APP_ANDROID_EMULATOR_HTTP;
const resourcePath = () => path.join(project, 'app/src/main/res/xml/buildapc_emulator_network.xml');

beforeEach(async () => { project = await mkdtemp(path.join(tmpdir(), 'buildapc-network-')); });
afterEach(async () => {
  await rm(project, { recursive: true, force: true });
  if (originalFlag === undefined) delete process.env.APP_ANDROID_EMULATOR_HTTP;
  else process.env.APP_ANDROID_EMULATOR_HTTP = originalFlag;
});

function manifest(attributes: Record<string, string> = {}) {
  return { modResults: { manifest: { application: [{ $: { 'android:name': '.MainApplication', ...attributes } as Record<string, string> }] } } };
}

test('enabled build permits exactly the emulator host and forbids other HTTP', async () => {
  const plugin = withEmulatorNetwork({}, { enabled: true });
  const mod = manifest();
  plugin.manifestAction(mod);
  expect(mod.modResults.manifest.application[0].$).toMatchObject({
    'android:networkSecurityConfig': '@xml/buildapc_emulator_network',
  });
  await plugin.resourceAction({ modRequest: { platformProjectRoot: project } });
  const xml = await parseStringPromise(await readFile(resourcePath(), 'utf8'));
  const network = xml['network-security-config'];
  expect(network['base-config'][0].$.cleartextTrafficPermitted).toBe('false');
  expect(network['domain-config']).toHaveLength(1);
  expect(network['domain-config'][0].$.cleartextTrafficPermitted).toBe('true');
  expect(network['domain-config'][0].domain).toEqual([{ _: '10.0.2.2', $: { includeSubdomains: 'false' } }]);
});

test('disabled build removes the exception without changing existing debug HTTP policy', async () => {
  const enabled = withEmulatorNetwork({}, { enabled: true });
  const mod = manifest({ 'android:usesCleartextTraffic': 'true' });
  enabled.manifestAction(mod);
  await enabled.resourceAction({ modRequest: { platformProjectRoot: project } });
  const disabled = withEmulatorNetwork({}, { enabled: false });
  disabled.manifestAction(mod);
  await disabled.resourceAction({ modRequest: { platformProjectRoot: project } });
  expect(mod.modResults.manifest.application[0].$).toEqual({ 'android:name': '.MainApplication', 'android:usesCleartextTraffic': 'true' });
  await expect(access(resourcePath())).rejects.toMatchObject({ code: 'ENOENT' });
});

test('default configuration adds no network override and preserves unrelated resources', async () => {
  const plugin = withEmulatorNetwork({});
  const mod = manifest({ 'android:networkSecurityConfig': '@xml/another_policy' });
  plugin.manifestAction(mod);
  const directory = path.dirname(resourcePath());
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'another_policy.xml'), 'existing');
  await plugin.resourceAction({ modRequest: { platformProjectRoot: project } });
  expect(mod.modResults.manifest.application[0].$['android:networkSecurityConfig']).toBe('@xml/another_policy');
  expect(await readFile(path.join(directory, 'another_policy.xml'), 'utf8')).toBe('existing');
});

test('enabled configuration refuses to overwrite another network policy', () => {
  const plugin = withEmulatorNetwork({}, { enabled: true });
  expect(() => plugin.manifestAction(manifest({ 'android:networkSecurityConfig': '@xml/another_policy' })))
    .toThrow('Cannot replace');
});

test('app config enables the exception only for an explicit local-build flag', () => {
  const base = { name: 'client', plugins: ['expo-router'] };
  delete process.env.APP_ANDROID_EMULATOR_HTTP;
  expect(appConfig({ config: base }).plugins.at(-1)[1].enabled).toBe(false);
  process.env.APP_ANDROID_EMULATOR_HTTP = '1';
  const enabled = appConfig({ config: base });
  expect(enabled.plugins.at(-1)[1].enabled).toBe(true);
  expect(enabled.plugins[0]).toBe('expo-router');
  expect(base.plugins).toEqual(['expo-router']);
  process.env.APP_ANDROID_EMULATOR_HTTP = '0';
  expect(appConfig({ config: base }).plugins.at(-1)[1].enabled).toBe(false);
});
