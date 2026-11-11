import { ApiError, exchangeGitHubCode, getMe } from '../api';
import { tokenStore } from '../tokenStore';

jest.mock('../tokenStore', () => ({
  tokenStore: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },
}));

const fetchMock = jest.fn();
const originalFetch = globalThis.fetch;
const originalUrl = process.env.EXPO_PUBLIC_API_URL;

const input = {
  code: 'fake-code',
  codeVerifier: 'a'.repeat(43),
  redirectUri: 'http://localhost:8081/auth',
};

const user = {
  id: 'test-user-id',
  email: 'user@example.com',
  display_name: 'Test User',
  role: 'USER' as const,
  created_at: '2026-01-01T00:00:00Z',
};

function response(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080/api/v1/';
  jest.mocked(tokenStore.get).mockResolvedValue(null);
});

afterEach(() => {
  globalThis.fetch = originalFetch;

  if (originalUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

test('login sends JSON without an existing app token', async () => {
  fetchMock.mockResolvedValue(response(200, { token: 'new-app-jwt', user }));

  await expect(exchangeGitHubCode(input)).resolves.toEqual({
    token: 'new-app-jwt',
    user,
  });

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  const headers = new Headers(options.headers);

  expect(url).toBe('http://localhost:8080/api/v1/auth/github');
  expect(options.method).toBe('POST');
  expect(options.credentials).toBe('omit');
  expect(JSON.parse(options.body as string)).toEqual(input);
  expect(headers.get('Content-Type')).toBe('application/json');
  expect(headers.get('Accept')).toBe('application/json');
  expect(headers.has('Authorization')).toBe(false);
  expect(tokenStore.get).not.toHaveBeenCalled();
  expect(tokenStore.set).not.toHaveBeenCalled();
});

test('me sends the stored app JWT', async () => {
  jest.mocked(tokenStore.get).mockResolvedValue('stored-app-jwt');
  fetchMock.mockResolvedValue(response(200, user));

  await expect(getMe()).resolves.toEqual(user);

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

  expect(url).toBe('http://localhost:8080/api/v1/me');
  expect(options.method).toBe('GET');
  expect(new Headers(options.headers).get('Authorization')).toBe(
    'Bearer stored-app-jwt',
  );
});

test('missing token rejects me before making a request', async () => {
  await expect(getMe()).rejects.toMatchObject({
    status: 401,
    message: 'Sign in to continue.',
  });

  expect(fetchMock).not.toHaveBeenCalled();
});

test('missing API configuration fails before making a request', async () => {
  delete process.env.EXPO_PUBLIC_API_URL;

  await expect(exchangeGitHubCode(input)).rejects.toThrow(
    'EXPO_PUBLIC_API_URL is not configured.',
  );

  expect(fetchMock).not.toHaveBeenCalled();
});

test('Problem Details errors retain their status and detail', async () => {
  fetchMock.mockResolvedValue(
    response(409, { title: 'Conflict', detail: 'Sign in with Google.' }),
  );

  await expect(exchangeGitHubCode(input)).rejects.toMatchObject({
    name: 'ApiError',
    status: 409,
    message: 'Sign in with Google.',
  });
});

test('errors fall back to the Problem Details title', async () => {
  fetchMock.mockResolvedValue(response(403, { title: 'Forbidden' }));

  await expect(exchangeGitHubCode(input)).rejects.toMatchObject({
    status: 403,
    message: 'Forbidden',
  });
});

test('non-JSON errors have a safe generic message', async () => {
  const result = response(502, null);
  jest.spyOn(result, 'json').mockRejectedValue(
    new Error('Private response content'),
  );
  fetchMock.mockResolvedValue(result);

  await expect(exchangeGitHubCode(input)).rejects.toMatchObject({
    status: 502,
    message: 'Request failed (HTTP 502).',
  });
});

test('JSON errors without readable details use the HTTP status', async () => {
  fetchMock.mockResolvedValue(response(500, null));

  await expect(exchangeGitHubCode(input)).rejects.toMatchObject({
    status: 500,
    message: 'Request failed (HTTP 500).',
  });
});

test('successful responses with invalid JSON are rejected', async () => {
  const result = response(200, null);
  jest.spyOn(result, 'json').mockRejectedValue(new Error('Invalid JSON'));
  fetchMock.mockResolvedValue(result);

  await expect(exchangeGitHubCode(input)).rejects.toBeInstanceOf(ApiError);
});

test('network failures produce a readable error', async () => {
  fetchMock.mockRejectedValue(new Error('Internal network details'));

  await expect(exchangeGitHubCode(input)).rejects.toThrow(
    'Could not reach the API. Check your connection and try again.',
  );
});
