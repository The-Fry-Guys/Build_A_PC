import { tokenStore } from '../tokenStore.web';

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

let values: Map<string, string>;

beforeEach(() => {
  values = new Map();

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
      },
    },
  });
});

afterEach(() => {
  if (originalWindow) {
    Object.defineProperty(globalThis, 'window', originalWindow);
  } else {
    Reflect.deleteProperty(globalThis, 'window');
  }
});

test('missing token returns null', async () => {
  await expect(tokenStore.get()).resolves.toBeNull();
});

test('token can be saved, retrieved, and cleared', async () => {
  await tokenStore.set('fake-app-jwt');
  await expect(tokenStore.get()).resolves.toBe('fake-app-jwt');

  await tokenStore.clear();
  await expect(tokenStore.get()).resolves.toBeNull();
});

test('server rendering reads safely but cannot save a token', async () => {
  Reflect.deleteProperty(globalThis, 'window');

  await expect(tokenStore.get()).resolves.toBeNull();
  await expect(tokenStore.clear()).resolves.toBeUndefined();
  await expect(tokenStore.set('fake-app-jwt')).rejects.toThrow(
    'Token storage requires a browser.',
  );
});

test('browser storage failures propagate to the caller', async () => {
  const failure = new Error('Storage unavailable');

  jest.spyOn(window.sessionStorage, 'setItem').mockImplementation(() => {
    throw failure;
  });

  await expect(tokenStore.set('fake-app-jwt')).rejects.toBe(failure);
});
