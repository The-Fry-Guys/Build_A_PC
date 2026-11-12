import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { useSession } from '@/auth/session-provider';
import { ApiError, getAdminUsers, getCatalogParts, type AppUser } from '@/lib/api';

import { clearAdminQueries } from '../query-provider';
import { useAdminDirectory } from '../use-admin-directory';

jest.mock('@/auth/session-provider', () => ({ useSession: jest.fn() }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), getAdminUsers: jest.fn(), getCatalogParts: jest.fn() }));

const admin: AppUser = { id: 'admin-id', email: 'admin@example.test', display_name: null, role: 'ADMIN', created_at: '2026-01-01T00:00:00Z' };
const expire = jest.fn().mockResolvedValue(undefined);
const refresh = jest.fn().mockResolvedValue(undefined);
const data = { content: [admin], page: 0, size: 10, totalElements: 21, totalPages: 3 };
let client: QueryClient;

/** Provides a fresh non-retrying cache so each test observes only its own requests. */
function Wrapper({ children }: PropsWithChildren) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  jest.mocked(useSession).mockReturnValue({ user: admin, loading: false, error: null, login: jest.fn(), retry: refresh, refresh, expire, logout: jest.fn() });
  jest.mocked(getAdminUsers).mockResolvedValue(data);
  jest.mocked(getCatalogParts).mockResolvedValue({ ...data, content: [] });
});

afterEach(() => { client.clear(); jest.useRealTimers(); });

test('search is debounced, pagination resets, and queries include cancellation signals', async () => {
  const { result } = await renderHook(() => useAdminDirectory('users', true), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(() => { result.current.setPage(1); });
  await waitFor(() => expect(getAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
  jest.useFakeTimers();
  await act(() => { result.current.setText('  new name  '); });
  expect(getAdminUsers).not.toHaveBeenCalledWith(expect.objectContaining({ q: 'new name' }));
  await act(async () => { jest.advanceTimersByTime(300); });
  await waitFor(() => expect(getAdminUsers).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'new name', page: 0, signal: expect.anything() })));
});

test('regular users and disabled screens never fetch directories', async () => {
  jest.mocked(useSession).mockReturnValue({ ...useSession(), user: { ...admin, role: 'USER' } });
  await renderHook(() => useAdminDirectory('users', true), { wrapper: Wrapper });
  expect(getAdminUsers).not.toHaveBeenCalled();
  await renderHook(() => useAdminDirectory('parts', false), { wrapper: Wrapper });
  expect(getCatalogParts).not.toHaveBeenCalled();
});

test.each([401, 403])('permission failure %s clears private results and updates the session', async (status) => {
  client.setQueryData(['admin', admin.id, 'old'], { private: true });
  jest.mocked(getAdminUsers).mockRejectedValue(new ApiError(status, 'Access ended'));
  await renderHook(() => useAdminDirectory('users', true), { wrapper: Wrapper });
  await waitFor(() => expect(status === 401 ? expire : refresh).toHaveBeenCalled());
  expect(client.getQueryData(['admin', admin.id, 'old'])).toBeUndefined();
});

test('parts use public catalog reads and reject out-of-range page changes', async () => {
  const { result } = await renderHook(() => useAdminDirectory('parts', true), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(() => { result.current.setPage(-1); result.current.setPage(50); });
  expect(result.current.page).toBe(0);
  expect(getAdminUsers).not.toHaveBeenCalled();
});

test('unmount cancels an obsolete request so it cannot populate a later account cache', async () => {
  let signal: AbortSignal | undefined;
  jest.mocked(getAdminUsers).mockImplementation((input) => {
    signal = input.signal;
    return new Promise(() => undefined);
  });
  const { unmount } = await renderHook(() => useAdminDirectory('users', true), { wrapper: Wrapper });
  expect(signal).toBeDefined();
  await unmount();
  expect(signal?.aborted).toBe(true);
});

test('clearing one account retains another account cache', async () => {
  client.setQueryData(['admin', admin.id, 'users'], data);
  client.setQueryData(['admin', 'other-account', 'users'], data);
  await clearAdminQueries(client, admin.id);
  expect(client.getQueryData(['admin', admin.id, 'users'])).toBeUndefined();
  expect(client.getQueryData(['admin', 'other-account', 'users'])).toEqual(data);
});
