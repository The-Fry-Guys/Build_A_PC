import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useSession } from '@/auth/session-provider';
import { ApiError, createAdminPart, deleteAdminPart, deleteAdminUser, getAdminUsers, getCatalogParts, updateAdminPart, updateAdminUser, type AdminPartInput, type AppUser, type CatalogPart, type DirectoryPage, type UpdateAdminUserInput } from '@/lib/api';

import { clearAdminQueries } from './query-provider';

/** Directory sections use the same UI, pagination, and permission lifecycle. */
export type DirectoryKind = 'users' | 'parts';

/** A read-only record containing only fields approved by the API contract. */
export type DirectoryRecord = AppUser | CatalogPart;

/** Debounces full-database search and prevents expired sessions from retaining private results. */
export function useAdminDirectory(kind: DirectoryKind, enabled: boolean) {
  const { user, expire, refresh } = useSession();
  const accountId = user?.id;
  const client = useQueryClient();
  const [text, setText] = useState('');
  const [search, setSearch] = useState({ q: '', page: 0 });
  const pendingSearch = text.trim() !== search.q;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch((previous) => previous.q === text.trim() ? previous : { q: text.trim(), page: 0 });
    }, 300);
    return () => clearTimeout(timer);
  }, [text]);

  const query = useQuery<DirectoryPage<DirectoryRecord>>({
    queryKey: ['admin', user?.id, kind, search.q, search.page],
    enabled: enabled && !pendingSearch && user?.role === 'ADMIN',
    queryFn: ({ signal }) => kind === 'users'
      ? getAdminUsers({ ...search, signal })
      : getCatalogParts({ ...search, signal }),
  });

  const afterMutation = async () => {
    setSearch((current) => current.page === 0 ? current : { ...current, page: 0 });
    if (accountId) await client.invalidateQueries({ queryKey: ['admin', accountId] });
  };
  const mutationError = async (error: unknown) => {
    if (!(error instanceof ApiError) || ![401, 403].includes(error.status) || !accountId) return;
    await clearAdminQueries(client, accountId);
    if (error.status === 401) await expire();
    else await refresh();
  };
  const userUpdate = useMutation({ mutationFn: ({ id, input }: { id: string; input: UpdateAdminUserInput }) => updateAdminUser(id, input), onSuccess: afterMutation, onError: mutationError });
  const userDelete = useMutation({ mutationFn: deleteAdminUser, onSuccess: afterMutation, onError: mutationError });
  const partCreate = useMutation({ mutationFn: createAdminPart, onSuccess: afterMutation, onError: mutationError });
  const partUpdate = useMutation({ mutationFn: ({ id, input }: { id: string; input: AdminPartInput }) => updateAdminPart(id, input), onSuccess: afterMutation, onError: mutationError });
  const partDelete = useMutation({ mutationFn: deleteAdminPart, onSuccess: afterMutation, onError: mutationError });

  useEffect(() => {
    if (!(query.error instanceof ApiError) || ![401, 403].includes(query.error.status) || !accountId) return;
    void clearAdminQueries(client, accountId);
    if (query.error.status === 401) void expire();
    else void refresh();
  }, [client, query.error, accountId, expire, refresh]);

  /** Changes pages only within the current result range. */
  const setPage = (page: number) => {
    if (page >= 0 && query.data && page < query.data.totalPages) setSearch((current) => ({ ...current, page }));
  };

  return { ...query, text, setText, page: search.page, setPage, pendingSearch,
    mutations: { userUpdate, userDelete, partCreate, partUpdate, partDelete } };
}
