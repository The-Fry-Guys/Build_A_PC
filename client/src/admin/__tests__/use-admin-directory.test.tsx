import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { useSession } from '@/auth/session-provider';
import { ApiError, createAdminPart, deleteAdminPart, deleteAdminUser, getAdminUsers, getCatalogParts, updateAdminPart, updateAdminUser, type AppUser } from '@/lib/api';

import { clearAdminQueries } from '../query-provider';
import { useAdminDirectory } from '../use-admin-directory';

jest.mock('@/auth/session-provider', () => ({ useSession: jest.fn() }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), getAdminUsers: jest.fn(), getCatalogParts: jest.fn(), createAdminPart: jest.fn(), deleteAdminPart: jest.fn(), deleteAdminUser: jest.fn(), updateAdminPart: jest.fn(), updateAdminUser: jest.fn() }));

const admin: AppUser = { id: 'admin-id', email: 'admin@example.test', display_name: null, role: 'ADMIN', created_at: '2026-01-01T00:00:00Z' };
const expire = jest.fn().mockResolvedValue(undefined);
const refresh = jest.fn().mockResolvedValue(undefined);
const data = { content: [admin], page: 0, size: 10, totalElements: 21, totalPages: 3 };
let client: QueryClient;

/** Provides a fresh non-retrying cache so each test observes only its own requests. */
function Wrapper({ children }: PropsWithChildren) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
  jest.mocked(useSession).mockReturnValue({ user: admin, loading: false, error: null, login: jest.fn(), loginGoogle: jest.fn(), loginGoogleAndroid: jest.fn(), retry: refresh, refresh, expire, logout: jest.fn() });
  jest.mocked(getAdminUsers).mockResolvedValue(data);
  jest.mocked(getCatalogParts).mockResolvedValue({ ...data, content: [] });
  jest.mocked(createAdminPart).mockResolvedValue({ part_id: 'new-part', name: 'New part', category: 'memory', price: 12, created_at: admin.created_at });
  jest.mocked(updateAdminPart).mockResolvedValue({ part_id: 'part-id', name: 'Updated part', category: 'memory', price: 12, created_at: admin.created_at });
  jest.mocked(updateAdminUser).mockResolvedValue(admin);
  jest.mocked(deleteAdminPart).mockResolvedValue(undefined);
  jest.mocked(deleteAdminUser).mockResolvedValue(undefined);
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

test('admin mutations call APIs and invalidate only the signed-in account directory', async () => {
  client.setQueryData(['admin', admin.id, 'users', '', 0], data);
  client.setQueryData(['admin', 'other-account', 'users'], data);
  const { result } = await renderHook(() => useAdminDirectory('parts', true), { wrapper: Wrapper });
  await act(async () => {
    await result.current.mutations.userUpdate.mutateAsync({ id: 'user-id', input: { email: 'ada@example.test', displayName: 'Ada' } });
    await result.current.mutations.partCreate.mutateAsync({ name: 'New part', category: 'memory', price: 12 });
    await result.current.mutations.partUpdate.mutateAsync({ id: 'part-id', input: { name: 'Updated part', category: 'memory', price: 12 } });
    await result.current.mutations.userDelete.mutateAsync('user-id');
    await result.current.mutations.partDelete.mutateAsync('part-id');
  });
  expect(updateAdminUser).toHaveBeenCalledWith('user-id', { email: 'ada@example.test', displayName: 'Ada' });
  expect(createAdminPart).toHaveBeenCalledWith({ name: 'New part', category: 'memory', price: 12 });
  expect(updateAdminPart).toHaveBeenCalledWith('part-id', { name: 'Updated part', category: 'memory', price: 12 });
  expect(deleteAdminUser).toHaveBeenCalledWith('user-id');
  expect(deleteAdminPart).toHaveBeenCalledWith('part-id');
  expect(client.getQueryData(['admin', 'other-account', 'users'])).toEqual(data);
});

test('mutation permission failures clear the current account cache and refresh access', async () => {
  jest.mocked(deleteAdminPart).mockRejectedValueOnce(new ApiError(403, 'Access ended'));
  client.setQueryData(['admin', admin.id, 'users'], data);
  const { result } = await renderHook(() => useAdminDirectory('parts', true), { wrapper: Wrapper });
  await act(async () => { await expect(result.current.mutations.partDelete.mutateAsync('part-id')).rejects.toThrow('Access ended'); });
  await waitFor(() => expect(refresh).toHaveBeenCalled());
  expect(client.getQueryData(['admin', admin.id, 'users'])).toBeUndefined();
});
