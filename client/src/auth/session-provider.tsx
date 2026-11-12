import { createContext, useContext, useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';

import { exchangeGitHubCode, getMe } from '@/lib/api';
import { Session } from '@/lib/session';
import { tokenStore } from '@/lib/tokenStore';

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session] = useState(() => new Session({ store: tokenStore, getMe, exchange: exchangeGitHubCode }));
  useEffect(() => { void session.restore(); }, [session]);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('SessionProvider is missing.');
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getServerSnapshot);
  return { ...state, login: session.login, retry: session.restore, logout: session.logout };
}
