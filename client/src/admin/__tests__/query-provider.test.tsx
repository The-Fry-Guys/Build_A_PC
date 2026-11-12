import { useQueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSession } from '@/auth/session-provider';
import type { AppUser } from '@/lib/api';

import { AdminQueryProvider } from '../query-provider';

jest.mock('@/auth/session-provider', () => ({ useSession: jest.fn() }));
const account: AppUser = { id: 'admin', email: 'admin@example.test', display_name: null, role: 'ADMIN', created_at: '2026-01-01T00:00:00Z' };
const refresh = jest.fn().mockResolvedValue(undefined);

/** Exercises cache ownership under the same provider used by the app. */
function Wrapper({ children }: PropsWithChildren) { return <AdminQueryProvider>{children}</AdminQueryProvider>; }

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue({ user: account, loading: false, error: null, refresh, retry: refresh, expire: jest.fn(), login: jest.fn(), logout: jest.fn() });
});
afterEach(() => { jest.restoreAllMocks(); });

test('logout and demotion discard the old account cache', async () => {
  const { result, rerender, unmount } = await renderHook(() => useQueryClient(), { wrapper: Wrapper });
  result.current.setQueryDefaults(['admin'], { gcTime: Infinity });
  await act(() => { result.current.setQueryData(['admin', account.id, 'users'], { private: true }); });
  jest.mocked(useSession).mockReturnValue({ ...useSession(), user: { ...account, role: 'USER' } });
  await rerender(undefined);
  await waitFor(() => expect(result.current.getQueryData(['admin', account.id, 'users'])).toBeUndefined());
  await unmount();
});

test('foregrounding a native app rechecks permissions and cleans up its listener', async () => {
  let onChange: (state: AppStateStatus) => void = () => undefined;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    onChange = listener;
    return { remove };
  });
  const { unmount } = await renderHook(() => useQueryClient(), { wrapper: Wrapper });
  await act(() => { onChange('background'); });
  expect(refresh).not.toHaveBeenCalled();
  await act(() => { onChange('active'); });
  expect(refresh).toHaveBeenCalledTimes(1);
  await unmount();
  expect(remove).toHaveBeenCalled();
});
