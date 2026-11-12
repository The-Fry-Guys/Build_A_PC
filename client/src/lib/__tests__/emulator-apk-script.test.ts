import { spawnSync } from 'node:child_process';

jest.mock('node:child_process', () => ({ spawnSync: jest.fn() }));

const spawn = jest.mocked(spawnSync);
let exit: jest.SpiedFunction<typeof process.exit>;

beforeEach(() => {
  spawn.mockReset();
  exit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('script exit'); });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); });

function run() {
  expect(() => jest.isolateModules(() => require('../../../scripts/android-emulator-apk')))
    .toThrow('script exit');
}

test('generates local policy, builds Pixel release APK, and restores normal policy', () => {
  spawn.mockReturnValue({ status: 0 } as ReturnType<typeof spawnSync>);
  run();
  expect(spawn).toHaveBeenCalledTimes(3);
  const [, prebuildArgs, prebuildOptions] = spawn.mock.calls[0];
  expect(prebuildArgs).toEqual(expect.arrayContaining(['prebuild', '--platform', 'android', '--no-install', '--no-clean']));
  expect(prebuildOptions?.env).toMatchObject({
    APP_ANDROID_EMULATOR_HTTP: '1', EXPO_PUBLIC_API_URL: 'http://10.0.2.2:8080/api/v1',
  });
  expect(spawn.mock.calls[1][1]).toEqual(expect.arrayContaining([
    'run:android', '--variant', 'release', '--device', 'Pixel_9', '--no-build-cache',
  ]));
  expect(spawn.mock.calls[2][1]).toEqual(prebuildArgs);
  expect(spawn.mock.calls[2][2]?.env?.APP_ANDROID_EMULATOR_HTTP).toBe('0');
  expect(exit).toHaveBeenCalledWith(0);
});

test('failed build still restores policy and preserves the build failure', () => {
  spawn.mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>)
    .mockReturnValueOnce({ status: 7 } as ReturnType<typeof spawnSync>)
    .mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>);
  run();
  expect(spawn.mock.calls[2][2]?.env?.APP_ANDROID_EMULATOR_HTTP).toBe('0');
  expect(exit).toHaveBeenCalledWith(7);
});

test('failed prebuild skips compilation but still attempts cleanup', () => {
  spawn.mockReturnValueOnce({ status: 2 } as ReturnType<typeof spawnSync>)
    .mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>);
  run();
  expect(spawn).toHaveBeenCalledTimes(2);
  expect(spawn.mock.calls[1][2]?.env?.APP_ANDROID_EMULATOR_HTTP).toBe('0');
  expect(exit).toHaveBeenCalledWith(2);
});

test('failed cleanup reports failure instead of claiming a normal configuration', () => {
  spawn.mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>)
    .mockReturnValueOnce({ status: 0 } as ReturnType<typeof spawnSync>)
    .mockReturnValueOnce({ status: 3 } as ReturnType<typeof spawnSync>);
  run();
  expect(console.error).toHaveBeenCalledWith(expect.stringContaining('cleanup failed'));
  expect(exit).toHaveBeenCalledWith(3);
});
