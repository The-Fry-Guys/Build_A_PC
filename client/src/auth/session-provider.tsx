import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';

import { exchangeGitHubCode, getMe } from '@/lib/api';
import { Session } from '@/lib/session';
import { tokenStore } from '@/lib/tokenStore';

const SessionContext = createContext<Session | null>(null);

/** Restores one shared session for every platform and route. */
export function SessionProvider({ children }: PropsWithChildren) {
  const [session] = useState(() => new Session({ store: tokenStore, getMe, exchange: exchangeGitHubCode }));
  useEffect(() => { void session.restore(); }, [session]);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

/** Exposes the current account and guarded session operations. */
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is missing.');
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
  return { ...state, login: session.login, retry: session.restore, refresh: session.refresh, expire: session.expire, logout: session.logout };
}
