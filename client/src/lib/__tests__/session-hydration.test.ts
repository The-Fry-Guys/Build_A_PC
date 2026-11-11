import { act, createElement } from 'react';
import { SessionProvider, useSession } from '../../auth/session-provider';
import { Session } from '../session';
import type { AppUser } from '../api';

const { JSDOM } = require('jsdom');
const RealSession = jest.requireActual('../session').Session as typeof Session;

jest.mock('../session', () => ({ Session: jest.fn() }));
jest.mock('../tokenStore', () => ({ tokenStore: { get: jest.fn(), set: jest.fn(), clear: jest.fn() } }));

const user: AppUser = { id: 'user-1', email: 'user@example.test', display_name: 'User', role: 'USER', created_at: '2026-11-10T00:00:00Z' };

function SessionLabel() {
  const { loading, user } = useSession();
  return createElement('p', null, loading ? 'Loading session' : user ? user.email : 'Sign in');
}

test.each([false, true])('a route hydrating after restoration has matching HTML (signed in: %s)', async (signedIn) => {
  const session = new RealSession({
    store: { get: async () => signedIn ? 'jwt' : null, set: async () => {}, clear: async () => {} },
    getMe: async () => user,
    exchange: jest.fn(),
  });
  jest.mocked(Session).mockImplementation(() => session);
  const tree = createElement(SessionProvider, null, createElement(SessionLabel));
  const { renderToString } = require('react-dom/server');
  const html = renderToString(tree);
  expect(html).toContain('Loading session');

  // Expo can restore the provider before a Suspense-wrapped route hydrates.
  await session.restore();
  expect(session.getSnapshot().loading).toBe(false);

  const dom = new JSDOM(`<!doctype html><html><body><main>${html}</main></body></html>`, { url: 'http://localhost:8081' });
  const names = ['window', 'document', 'navigator'] as const;
  const originals = names.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));
  const oldActEnvironment = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  let root: { unmount: () => void } | undefined;
  const errors: unknown[] = [];
  try {
    for (const name of names) {
      Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? dom.window : dom.window[name] });
    }
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.querySelector('main')!;
    await act(async () => {
      root = require('react-dom/client').hydrateRoot(container, tree, {
        onRecoverableError: (error: unknown) => errors.push(error),
      });
    });
    expect(errors).toEqual([]);
    expect(container.textContent).toBe(signedIn ? user.email : 'Sign in');
  } finally {
    await act(async () => root?.unmount());
    dom.window.close();
    names.forEach((name, index) => {
      const descriptor = originals[index];
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    });
    if (oldActEnvironment) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', oldActEnvironment);
    else Reflect.deleteProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  }
});
