import { ApiError, type AppUser } from '../api';
import { Session } from '../session';

const user: AppUser = { id: 'user-1', email: 'user@example.test', display_name: 'User', role: 'USER', created_at: '2026-11-10T00:00:00Z' };
const input = { code: 'code', codeVerifier: 'v'.repeat(43), redirectUri: 'http://localhost:8081/auth' };

function setup(token: string | null = 'jwt') {
  const store = { get: jest.fn(async () => token), set: jest.fn(async (value: string) => { token = value; }), clear: jest.fn(async () => { token = null; }) };
  const getMe = jest.fn(async () => user);
  const exchange = jest.fn(async () => ({ token: 'new-jwt', user }));
  return { session: new Session({ store, getMe, exchange }), store, getMe, exchange };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test('restores a stored session using the protected profile endpoint', async () => {
  const { session, getMe } = setup();
  const listener = jest.fn();
  const unsubscribe = session.subscribe(listener);
  await session.restore();
  expect(getMe).toHaveBeenCalledTimes(1);
  expect(session.getSnapshot()).toEqual({ user, loading: false, error: null });
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});

test('no stored token leaves the user signed out without fetching', async () => {
  const { session, getMe } = setup(null);
  await session.restore();
  expect(getMe).not.toHaveBeenCalled();
  expect(session.getSnapshot()).toEqual({ user: null, loading: false, error: null });
});

test('login saves the app token before checking me', async () => {
  const { session, store, getMe, exchange } = setup(null);
  getMe.mockImplementation(async () => {
    expect(await store.get()).toBe('new-jwt');
    return user;
  });
  await session.login(input);
  expect(exchange).toHaveBeenCalledWith(input);
  expect(session.getSnapshot().user).toEqual(user);
});

test('invalid or expired token is cleared on 401', async () => {
  const { session, store, getMe } = setup();
  getMe.mockRejectedValue(new ApiError(401, 'Unauthorized'));
  await session.restore();
  expect(store.clear).toHaveBeenCalledTimes(1);
  expect(session.getSnapshot()).toMatchObject({ user: null, loading: false });
  expect(session.getSnapshot().error).toContain('Sign in again');
});

test('network failure preserves token and retry can restore the session', async () => {
  const { session, store, getMe } = setup();
  getMe.mockRejectedValueOnce(new Error('API unavailable'));
  await session.restore();
  expect(session.getSnapshot().error).toBe('API unavailable');
  expect(store.clear).not.toHaveBeenCalled();
  await session.restore();
  expect(session.getSnapshot().user).toEqual(user);
});

test('provider conflict is shown without persisting a new token', async () => {
  const { session, exchange, store } = setup(null);
  exchange.mockRejectedValue(new ApiError(409, 'Sign in with Google.'));
  await session.login(input);
  expect(session.getSnapshot().error).toBe('Sign in with Google.');
  expect(store.set).not.toHaveBeenCalled();
});

test('logout clears the saved token and user', async () => {
  const { session, store } = setup();
  await session.restore();
  await session.logout();
  expect(await store.get()).toBeNull();
  expect(session.getSnapshot()).toEqual({ user: null, loading: false, error: null });
});

test('pending restoration cannot undo logout', async () => {
  const { session, getMe } = setup();
  const pending = deferred<AppUser>();
  const started = deferred<void>();
  getMe.mockImplementation(() => { started.resolve(); return pending.promise; });
  const restoration = session.restore();
  await started.promise;
  await session.logout();
  pending.resolve(user);
  await restoration;
  expect(session.getSnapshot().user).toBeNull();
});

test('pending code exchange cannot persist a token after logout', async () => {
  const { session, exchange, store } = setup(null);
  const pending = deferred<{ token: string; user: AppUser }>();
  exchange.mockReturnValue(pending.promise);
  const login = session.login(input);
  await session.logout();
  pending.resolve({ token: 'late-token', user });
  await login;
  expect(store.set).not.toHaveBeenCalled();
  expect(session.getSnapshot().user).toBeNull();
});

test('logout waits for a pending token write then clears it', async () => {
  const { session, store } = setup(null);
  const written = deferred<void>();
  const started = deferred<void>();
  store.set.mockImplementation(async () => { started.resolve(); await written.promise; });
  const login = session.login(input);
  await started.promise;
  const logout = session.logout();
  written.resolve();
  await Promise.all([login, logout]);
  expect(store.clear).toHaveBeenCalledTimes(1);
  expect(session.getSnapshot().user).toBeNull();
});

test('storage read failures are displayed', async () => {
  const { session, store } = setup();
  store.get.mockRejectedValue(new Error('Storage unavailable'));
  await session.restore();
  expect(session.getSnapshot().error).toBe('Storage unavailable');
});

test('logout storage failures allow retry', async () => {
  const { session, store } = setup();
  store.clear.mockRejectedValueOnce(new Error('Blocked'));
  await session.logout();
  expect(session.getSnapshot().error).toContain('Retry logout');
  await session.logout();
  expect(session.getSnapshot().error).toBeNull();
});

test('a rejected session with blocked storage reports cleanup failure', async () => {
  const { session, store, getMe } = setup();
  getMe.mockRejectedValue(new ApiError(401, 'Unauthorized'));
  store.clear.mockRejectedValueOnce(new Error('Blocked'));
  await session.restore();
  expect(session.getSnapshot().error).toContain('could not be cleared');
  expect(session.getSnapshot().loading).toBe(false);
});
