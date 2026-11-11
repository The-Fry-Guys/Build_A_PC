import { ApiError, getAdminUsers, getCatalogParts } from '../api';
import { tokenStore } from '../tokenStore';

jest.mock('../tokenStore', () => ({ tokenStore: { get: jest.fn() } }));

const originalFetch = globalThis.fetch;
const originalUrl = process.env.EXPO_PUBLIC_API_URL;
const fetchMock = jest.fn();
const page = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8080/api/v1';
  globalThis.fetch = fetchMock;
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => page });
  jest.mocked(tokenStore.get).mockResolvedValue('app-token');
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalUrl;
});

test('private search uses the shared API prefix, encoded query, bearer token, and no-store', async () => {
  await getAdminUsers({ q: '  test+person&name@example.test  ', page: 2 });
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  const parsed = new URL(url);
  expect(parsed.pathname).toBe('/api/v1/admin/users');
  expect(parsed.searchParams.get('q')).toBe('test+person&name@example.test');
  expect(parsed.searchParams.get('page')).toBe('2');
  expect(parsed.searchParams.get('size')).toBe('10');
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer app-token');
  expect(options.cache).toBe('no-store');
});

test('catalog search stays public even when a token exists', async () => {
  await getCatalogParts({ q: '100%_Memory', page: 0, size: 25 });
  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(new URL(url).pathname).toBe('/api/v1/parts');
  expect(new Headers(options.headers).has('Authorization')).toBe(false);
  expect(tokenStore.get).not.toHaveBeenCalled();
});

test('missing credentials fail before a private request', async () => {
  jest.mocked(tokenStore.get).mockResolvedValue(null);
  await expect(getAdminUsers({ q: '', page: 0 })).rejects.toBeInstanceOf(ApiError);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('cancellation remains an abort instead of becoming a connection error', async () => {
  const controller = new AbortController();
  const abort = new Error('cancelled');
  abort.name = 'AbortError';
  controller.abort();
  fetchMock.mockRejectedValue(abort);
  await expect(getCatalogParts({ q: '', page: 0, signal: controller.signal })).rejects.toBe(abort);
});
