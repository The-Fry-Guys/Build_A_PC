import { act, createElement } from 'react';

import GitHubLogin from '../../components/github-login.web';
import AuthCallback from '../../app/auth';

// DOM rendering exercises the real button/hook wiring without contacting GitHub.
const { JSDOM } = require('jsdom');
const mockLogin = jest.fn(async () => undefined);
const mockPrompt = jest.fn();
const mockRequest = { state: 'test-state', codeVerifier: 'v'.repeat(43) };
const mockUseAuthRequest = jest.fn();
const mockComplete = jest.fn();

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'http://localhost:8081/auth',
  ResponseType: { Code: 'code' },
  CodeChallengeMethod: { S256: 'S256' },
  useAuthRequest: (...args: unknown[]) => mockUseAuthRequest(...args),
}), { virtual: true });
jest.mock('../../auth/session-provider', () => ({ useSession: () => ({ login: mockLogin }) }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: () => mockComplete() }));
jest.mock('expo-router', () => ({
  Link: ({ children, href }: { children: unknown; href: string }) =>
    require('react').createElement('a', { href }, children),
}));
jest.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: { OS: 'web' },
    View: ({ children }: { children: unknown }) => React.createElement('div', null, children),
    Button: ({ title, disabled, onPress }: { title: string; disabled: boolean; onPress: () => void }) =>
      React.createElement('button', { disabled, onClick: onPress }, title),
  };
});
jest.mock('../../components/themed-text', () => ({
  ThemedText: ({ children }: { children: unknown }) => require('react').createElement('span', null, children),
}));

let container: HTMLDivElement;
let dom: { window: Window & { close: () => void } };
let root: { render: (element: ReturnType<typeof createElement>) => void; unmount: () => void };
const originalClientId = process.env.EXPO_PUBLIC_GITHUB_WEB_CLIENT_ID;
const originalGlobals = Object.fromEntries(['window', 'document', 'navigator'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  // Keep Expo's Node preset; its setup conflicts with Jest's jsdom environment.
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:8081' });
  for (const name of ['window', 'document', 'navigator'] as const) {
    const value = name === 'window' ? dom.window : dom.window[name];
    Object.defineProperty(globalThis, name, { configurable: true, value });
  }
  process.env.EXPO_PUBLIC_GITHUB_WEB_CLIENT_ID = 'public-client-id';
  mockPrompt.mockReset().mockResolvedValue({ type: 'cancel' });
  mockLogin.mockClear();
  mockComplete.mockClear();
  mockUseAuthRequest.mockReset().mockReturnValue([mockRequest, null, mockPrompt]);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = require('react-dom/client').createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  dom.window.close();
  for (const [name, descriptor] of Object.entries(originalGlobals)) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  if (originalClientId === undefined) delete process.env.EXPO_PUBLIC_GITHUB_WEB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GITHUB_WEB_CLIENT_ID = originalClientId;
});

test('button requests GitHub authorization with code flow, state handling, and S256 PKCE', async () => {
  mockPrompt.mockResolvedValue({ type: 'success', params: { code: 'github-code', state: mockRequest.state } });
  await act(async () => root.render(createElement(GitHubLogin)));
  expect(mockUseAuthRequest).toHaveBeenCalledWith(expect.objectContaining({
    clientId: 'public-client-id', redirectUri: 'http://localhost:8081/auth',
    responseType: 'code', usePKCE: true, codeChallengeMethod: 'S256', scopes: ['user:email'],
  }), { authorizationEndpoint: 'https://github.com/login/oauth/authorize' });
  await act(async () => container.querySelector('button')!.click());
  expect(mockPrompt).toHaveBeenCalledTimes(1);
  expect(mockLogin).toHaveBeenCalledWith({ code: 'github-code', codeVerifier: mockRequest.codeVerifier, redirectUri: 'http://localhost:8081/auth' });
});

test('canceling leaves login available for a fresh attempt', async () => {
  await act(async () => root.render(createElement(GitHubLogin)));
  await act(async () => container.querySelector('button')!.click());
  expect(mockLogin).not.toHaveBeenCalled();
  expect(container.querySelector('button')!.disabled).toBe(false);
  expect(container.textContent).toBe('Sign in with GitHub');
});

test('not-ready requests cannot open a popup', async () => {
  mockUseAuthRequest.mockReturnValue([null, null, mockPrompt]);
  await act(async () => root.render(createElement(GitHubLogin)));
  expect(container.querySelector('button')!.disabled).toBe(true);
  expect(mockPrompt).not.toHaveBeenCalled();
});

test('missing client ID displays configuration guidance', async () => {
  delete process.env.EXPO_PUBLIC_GITHUB_WEB_CLIENT_ID;
  await act(async () => root.render(createElement(GitHubLogin)));
  expect(container.textContent).toContain('not configured');
  expect(container.querySelector('button')).toBeNull();
});

test('popup failure is shown and a retry is available', async () => {
  mockPrompt.mockRejectedValue(Object.assign(new Error('blocked'), { code: 'ERR_WEB_BROWSER_BLOCKED' }));
  await act(async () => root.render(createElement(GitHubLogin)));
  await act(async () => container.querySelector('button')!.click());
  expect(container.textContent).toContain('Allow popups');
  expect(container.querySelector('button')!.disabled).toBe(false);
});

test('callback route completes the popup and offers a direct-visit fallback', async () => {
  await act(async () => root.render(createElement(AuthCallback)));
  expect(mockComplete).toHaveBeenCalledTimes(1);
  expect(container.querySelector('a')!.getAttribute('href')).toBe('/');
  expect(mockLogin).not.toHaveBeenCalled();
});
