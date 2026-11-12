import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { ApiError } from '@/lib/api';

/** Cancels private requests before discarding their account-specific in-memory results. */
export async function clearAdminQueries(client: QueryClient, accountId: string) {
  await client.cancelQueries({ queryKey: ['admin', accountId] });
  client.removeQueries({ queryKey: ['admin', accountId] });
}

/** Owns transient directory data and removes it when identity or permissions change. */
export function AdminQueryProvider({ children }: PropsWithChildren) {
  const { user, refresh } = useSession();
  const previousAccount = useRef(user?.id);
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: {
      staleTime: 30_000,
      gcTime: 0,
      retry: (count, error) => !(error instanceof ApiError && [401, 403].includes(error.status)) && count < 1,
      refetchOnWindowFocus: false,
    } },
  }));

  useEffect(() => {
    const oldId = previousAccount.current;
    previousAccount.current = user?.id;
    if (oldId && (oldId !== user?.id || user?.role !== 'ADMIN')) void clearAdminQueries(client, oldId);
  }, [client, user?.id, user?.role]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const onFocus = () => { void refresh(); };
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
