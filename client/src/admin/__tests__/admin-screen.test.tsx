import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useSession } from '@/auth/session-provider';
import type { AppUser } from '@/lib/api';

import AdminScreen from '../admin-screen';
import { useAdminDirectory } from '../use-admin-directory';

jest.mock('@/auth/session-provider', () => ({ useSession: jest.fn() }));
jest.mock('../use-admin-directory', () => ({ useAdminDirectory: jest.fn() }));
jest.mock('@/hooks/use-theme', () => ({ useTheme: () => ({ text: '#000', textSecondary: '#444', background: '#fff', backgroundElement: '#eee', backgroundSelected: '#ddd' }) }));
jest.mock('@/components/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@/components/themed-view', () => ({ ThemedView: jest.requireActual('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: jest.requireActual('react-native').View }));
jest.mock('expo-router/head', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-router', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Redirect: ({ href }: { href: string }) => React.createElement(Text, null, `Redirect ${href}`),
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
  };
});

const admin: AppUser = { id: 'admin-id', email: 'admin@example.test', display_name: 'Administrator', role: 'ADMIN', created_at: '2026-01-01T00:00:00Z' };
const refresh = jest.fn().mockResolvedValue(undefined);
const refetch = jest.fn();
const directory = {
  data: { content: [admin], page: 0, size: 10, totalElements: 1, totalPages: 1 },
  text: '', setText: jest.fn(), page: 0, setPage: jest.fn(), pendingSearch: false,
  isFetching: false, error: null, refetch,
} as unknown as ReturnType<typeof useAdminDirectory>;

/** Supplies the query states relevant to a screen scenario without starting real requests. */
function directoryState(overrides: Partial<ReturnType<typeof useAdminDirectory>>) {
  return { ...directory, ...overrides } as ReturnType<typeof useAdminDirectory>;
}

beforeEach(() => {
  jest.mocked(useSession).mockReturnValue({ user: admin, loading: false, error: null, refresh, expire: jest.fn(), retry: refresh, login: jest.fn(), logout: jest.fn() });
  jest.mocked(useAdminDirectory).mockReturnValue(directory);
});

test('an admin can inspect approved record fields and page boundaries', async () => {
  await render(<AdminScreen />);
  await waitFor(() => expect(screen.getByText('Admin tools')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'View details for Administrator' }));
  expect(screen.getByRole('button', { name: 'Hide details for Administrator' })).toBeExpanded();
  expect(screen.getByText('Role: ADMIN')).toBeOnTheScreen();
  expect(screen.getByText('ID: admin-id')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('a restored regular account is redirected without mounting a directory', async () => {
  jest.mocked(useSession).mockReturnValue({ ...useSession(), user: { ...admin, role: 'USER' } });
  await render(<AdminScreen />);
  await waitFor(() => expect(screen.getByText('Redirect /')).toBeOnTheScreen());
  expect(useAdminDirectory).not.toHaveBeenCalled();
});

test('restoration shows a loading state before deciding whether access is allowed', async () => {
  jest.mocked(useSession).mockReturnValue({ ...useSession(), user: null, loading: true });
  await render(<AdminScreen />);
  expect(screen.getByLabelText('Checking admin access')).toBeOnTheScreen();
  expect(useAdminDirectory).not.toHaveBeenCalled();
});

test('empty and failed requests expose useful feedback and a retry action', async () => {
  jest.mocked(useAdminDirectory).mockReturnValue(directoryState({ data: { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } }));
  const view = await render(<AdminScreen />);
  await waitFor(() => expect(screen.getByText('No users found. Try another search.')).toBeOnTheScreen());
  jest.mocked(useAdminDirectory).mockReturnValue(directoryState({ error: new Error('API unavailable') }));
  await view.rerender(<AdminScreen />);
  expect(screen.getByText('API unavailable')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Retry results' }));
  expect(refetch).toHaveBeenCalled();
});

test('parts with no price remain visible and show an unavailable label', async () => {
  jest.mocked(useAdminDirectory).mockReturnValue(directoryState({ data: {
    ...directory.data!, content: [{ part_id: 'part-id', name: 'Test Memory', category: 'memory', price: null, created_at: admin.created_at }],
  } }));
  await render(<AdminScreen />);
  await waitFor(() => expect(screen.getByText('Admin tools')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Parts' }));
  expect(screen.getByLabelText('Search parts')).toBeOnTheScreen();
  expect(screen.getByText('Price not available')).toBeOnTheScreen();
});
