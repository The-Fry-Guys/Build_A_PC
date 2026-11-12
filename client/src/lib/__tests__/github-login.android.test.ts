import { act, createElement } from 'react';
import GitHubProvider from '../../auth/github-provider.android';
import GitHubLogin from '../../components/github-login.android';
import AuthCallback from '../../app/auth';

const { JSDOM } = require('jsdom');
const mockLogin = jest.fn(async () => undefined);
const mockPrompt = jest.fn();
const mockReplace = jest.fn();
const mockComplete = jest.fn();
const mockMakeRedirectUri = jest.fn();
const mockConfiguration = jest.fn();
let mockRequests = 0;
let mockCurrentRequest: { state: string; codeVerifier: string };

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: (...args: unknown[]) => mockMakeRedirectUri(...args),
  ResponseType: { Code: 'code' },
  CodeChallengeMethod: { S256: 'S256' },
  useAuthRequest: (...args: unknown[]) => {
    mockConfiguration(...args);
    const request = require('react').useMemo(() => {
      mockRequests += 1;
      return { state: `state-${mockRequests}`, codeVerifier: String(mockRequests).repeat(43) };
    }, []);
    mockCurrentRequest = request;
    return [request, null, mockPrompt];
  },
}));
jest.mock('../../auth/session-provider', () => ({ useSession: () => ({ login: mockLogin }) }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: () => mockComplete() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Link: ({ children, href }: { children: unknown; href: string }) => require('react').createElement('a', { href }, children),
}));
jest.mock('react-native', () => {
  const React = require('react');
  return {
    Platform: { OS: 'android' },
    View: ({ children }: { children: unknown }) => React.createElement('div', null, children),
    ActivityIndicator: () => React.createElement('span', { role: 'progressbar' }),
    Button: ({ title, disabled, onPress }: { title: string; disabled: boolean; onPress: () => void }) =>
      React.createElement('button', { disabled, onClick: onPress }, title),
  };
});
jest.mock('../../components/themed-text', () => ({
  ThemedText: ({ children }: { children: unknown }) => require('react').createElement('span', null, children),
}));

let dom: { window: Window & { close: () => void } };
let container: HTMLDivElement;
let root: { render: (element: ReturnType<typeof createElement>) => void; unmount: () => void };
const originalClientId = process.env.EXPO_PUBLIC_GITHUB_ANDROID_CLIENT_ID;
const originalGlobals = Object.fromEntries(['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));

beforeEach(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
  for (const name of ['window', 'document', 'navigator'] as const) {
    Object.defineProperty(globalThis, name, { configurable: true, value: name === 'window' ? dom.window : dom.window[name] });
  }
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  process.env.EXPO_PUBLIC_GITHUB_ANDROID_CLIENT_ID = 'android-public-client';
  mockRequests = 0;
  mockMakeRedirectUri.mockReset().mockReturnValue('client://auth');
  mockPrompt.mockReset().mockResolvedValue({ type: 'cancel' });
  mockLogin.mockReset().mockResolvedValue(undefined);
  mockReplace.mockClear();
  mockComplete.mockClear();
  mockConfiguration.mockClear();
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
  if (originalClientId === undefined) delete process.env.EXPO_PUBLIC_GITHUB_ANDROID_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GITHUB_ANDROID_CLIENT_ID = originalClientId;
});

const tree = (callback = false) => createElement(GitHubProvider, null,
  createElement(callback ? AuthCallback : GitHubLogin));

test('Android requests code flow with S256, Android client ID, and exact native callback', async () => {
  mockPrompt.mockImplementation(async () => ({ type: 'success', params: { code: 'github-code', state: mockCurrentRequest.state } }));
  await act(async () => root.render(tree()));
  expect(mockMakeRedirectUri).toHaveBeenCalledWith({ native: 'client://auth', scheme: 'client', path: 'auth' });
  expect(mockConfiguration).toHaveBeenCalledWith(expect.objectContaining({
    clientId: 'android-public-client', redirectUri: 'client://auth',
    usePKCE: true, codeChallengeMethod: 'S256', responseType: 'code', scopes: ['user:email'],
  }), { authorizationEndpoint: 'https://github.com/login/oauth/authorize' });
  const verifier = mockCurrentRequest.codeVerifier;
  await act(async () => container.querySelector('button')!.click());
  expect(mockLogin).toHaveBeenCalledWith({ code: 'github-code', codeVerifier: verifier, redirectUri: 'client://auth' });
  expect(mockReplace).toHaveBeenCalledWith('/');
});

test('callback navigation preserves the pending request and prevents repeated starts', async () => {
  let finish!: (value: unknown) => void;
  mockPrompt.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  await act(async () => root.render(tree()));
  const request = mockCurrentRequest;
  await act(async () => {
    const button = container.querySelector('button')!;
    button.click();
    button.click();
  });
  expect(mockPrompt).toHaveBeenCalledTimes(1);
  await act(async () => root.render(tree(true)));
  expect(mockCurrentRequest).toBe(request);
  expect(container.textContent).toContain('Completing GitHub sign-in');
  expect(mockComplete).not.toHaveBeenCalled();
  await act(async () => finish({ type: 'success', params: { code: 'code', state: request.state } }));
  expect(mockLogin).toHaveBeenCalledTimes(1);
  expect(mockLogin).toHaveBeenCalledWith({ code: 'code', codeVerifier: request.codeVerifier, redirectUri: 'client://auth' });
  expect(mockReplace).toHaveBeenCalledTimes(1);
});

test('cancellation prepares fresh state and verifier for retry', async () => {
  await act(async () => root.render(tree()));
  const firstRequest = mockCurrentRequest;
  await act(async () => container.querySelector('button')!.click());
  expect(mockLogin).not.toHaveBeenCalled();
  expect(mockCurrentRequest.state).not.toBe(firstRequest.state);
  expect(mockCurrentRequest.codeVerifier).not.toBe(firstRequest.codeVerifier);
  expect(container.querySelector('button')!.disabled).toBe(false);
});

test('mismatched state is rejected and a fresh attempt remains available', async () => {
  mockPrompt.mockResolvedValue({ type: 'success', params: { code: 'code', state: 'wrong' } });
  await act(async () => root.render(tree()));
  await act(async () => container.querySelector('button')!.click());
  expect(mockLogin).not.toHaveBeenCalled();
  expect(container.textContent).toContain('Could not verify');
  expect(container.querySelector('button')!.disabled).toBe(false);
});

test('opening a callback without a request does not exchange or complete a web popup', async () => {
  await act(async () => root.render(tree(true)));
  expect(container.textContent).toContain('No sign-in is in progress');
  expect(container.querySelector('a')!.getAttribute('href')).toBe('/');
  expect(mockLogin).not.toHaveBeenCalled();
  expect(mockPrompt).not.toHaveBeenCalled();
  expect(mockComplete).not.toHaveBeenCalled();
});

test('missing Android registration disables sign-in with configuration guidance', async () => {
  delete process.env.EXPO_PUBLIC_GITHUB_ANDROID_CLIENT_ID;
  await act(async () => root.render(tree()));
  expect(container.textContent).toContain('Android client ID is not configured');
  expect(container.querySelector('button')!.disabled).toBe(true);
  expect(mockConfiguration).not.toHaveBeenCalled();
});

test('browser failures are shown and do not exchange a code', async () => {
  mockPrompt.mockRejectedValue(new Error('Browser unavailable'));
  await act(async () => root.render(tree()));
  await act(async () => container.querySelector('button')!.click());
  expect(container.textContent).toContain('Browser unavailable');
  expect(mockLogin).not.toHaveBeenCalled();
});
