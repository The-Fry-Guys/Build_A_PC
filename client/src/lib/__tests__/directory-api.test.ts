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

test('user fetch returns API records and pagination without replacing nullable profile fields', async () => {
  const result = {
    content: [{ id: 'user-from-api', email: 'member@example.test', display_name: null, role: 'USER', created_at: '2026-11-11T12:00:00Z' }],
    page: 2, size: 1, totalElements: 4, totalPages: 4,
  };
  fetchMock.mockResolvedValue({ ok: true, json: async () => result });

  await expect(getAdminUsers({ q: 'member', page: 2, size: 1 })).resolves.toEqual(result);

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(new URL(url).searchParams.get('size')).toBe('1');
  expect(options.method).toBe('GET');
  expect(options.credentials).toBe('omit');
  expect(new Headers(options.headers).get('Accept')).toBe('application/json');
});

test('part fetch preserves database IDs, numeric prices, and unavailable prices', async () => {
  const result = {
    content: [
      { part_id: 'priced-part', category: 'cpu', name: 'API CPU', price: 249.99, created_at: '2026-11-11T12:00:00Z' },
      { part_id: 'unpriced-part', category: 'memory', name: 'API Memory', price: null, created_at: '2026-11-11T12:00:00Z' },
    ],
    page: 0, size: 10, totalElements: 2, totalPages: 1,
  };
  fetchMock.mockResolvedValue({ ok: true, json: async () => result });

  await expect(getCatalogParts({ q: '', page: 0 })).resolves.toEqual(result);
  expect(tokenStore.get).not.toHaveBeenCalled();
});

test.each(['users', 'parts'] as const)('%s fetch returns empty pages without inventing records', async (kind) => {
  const load = kind === 'users' ? getAdminUsers : getCatalogParts;
  await expect(load({ q: 'no matching record', page: 0 })).resolves.toEqual(page);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test.each(['users', 'parts'] as const)('%s fetch normalizes the API prefix and forwards cancellation', async (kind) => {
  process.env.EXPO_PUBLIC_API_URL = '  http://localhost:8080/api/v1///  ';
  const controller = new AbortController();
  const load = kind === 'users' ? getAdminUsers : getCatalogParts;
  await load({ q: '  Mémoire + 100%_ & DDR5  ', page: 1, size: 25, signal: controller.signal });

  const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
  const parsed = new URL(url);
  expect(parsed.pathname).toBe(`/api/v1/${kind === 'users' ? 'admin/users' : 'parts'}`);
  expect(parsed.searchParams.get('q')).toBe('Mémoire + 100%_ & DDR5');
  expect(parsed.searchParams.get('page')).toBe('1');
  expect(parsed.searchParams.get('size')).toBe('25');
  expect([...parsed.searchParams.keys()]).toEqual(['q', 'page', 'size']);
  expect(options.signal).toBe(controller.signal);
});

test.each([401, 403, 500])('private fetch retains HTTP %s and the API error detail', async (status) => {
  fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ title: 'Request rejected', detail: 'Directory access failed.' }) });

  await expect(getAdminUsers({ q: '', page: 0 })).rejects.toMatchObject({
    name: 'ApiError', status, message: 'Directory access failed.',
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('public fetch retains the pagination validation error returned by the API', async () => {
  fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ detail: 'Page size must not exceed 100.' }) });
  await expect(getCatalogParts({ q: '', page: 0, size: 101 })).rejects.toMatchObject({
    status: 400, message: 'Page size must not exceed 100.',
  });
});

test.each(['users', 'parts'] as const)('%s fetch reports connection failures without exposing internal details', async (kind) => {
  fetchMock.mockRejectedValue(new Error('Internal host and network details'));
  const load = kind === 'users' ? getAdminUsers : getCatalogParts;
  await expect(load({ q: '', page: 0 })).rejects.toThrow('Could not reach the API. Check your connection and try again.');
});

test.each(['users', 'parts'] as const)('%s fetch rejects an unreadable successful response', async (kind) => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } });
  const load = kind === 'users' ? getAdminUsers : getCatalogParts;
  await expect(load({ q: '', page: 0 })).rejects.toMatchObject({
    name: 'ApiError', status: 502, message: 'The API returned an invalid JSON response.',
  });
});

test.each(['users', 'parts'] as const)('%s fetch preserves cancellation while reading the response body', async (kind) => {
  const controller = new AbortController();
  const abort = new Error('Body reading cancelled');
  abort.name = 'AbortError';
  fetchMock.mockResolvedValue({ ok: true, json: async () => {
    controller.abort();
    throw abort;
  } });
  const load = kind === 'users' ? getAdminUsers : getCatalogParts;
  await expect(load({ q: '', page: 0, signal: controller.signal })).rejects.toBe(abort);
});
