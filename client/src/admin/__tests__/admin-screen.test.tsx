import { Alert } from 'react-native';
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
const mutations = {
  userUpdate: { mutateAsync: jest.fn().mockResolvedValue(admin), isPending: false, error: null },
  userDelete: { mutateAsync: jest.fn().mockResolvedValue(undefined), isPending: false, error: null },
  partCreate: { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false, error: null },
  partUpdate: { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false, error: null },
  partDelete: { mutateAsync: jest.fn().mockResolvedValue(undefined), isPending: false, error: null },
};
const directory = {
  data: { content: [admin], page: 0, size: 10, totalElements: 1, totalPages: 1 },
  text: '', setText: jest.fn(), page: 0, setPage: jest.fn(), pendingSearch: false,
  isFetching: false, error: null, refetch, mutations,
} as unknown as ReturnType<typeof useAdminDirectory>;

/** Supplies the query states relevant to a screen scenario without starting real requests. */
function directoryState(overrides: Partial<ReturnType<typeof useAdminDirectory>>) {
  return { ...directory, ...overrides } as ReturnType<typeof useAdminDirectory>;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mutations).forEach((mutation) => { mutation.isPending = false; mutation.error = null; });
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

test('user edit saves profile fields and does not expose role editing', async () => {
  await render(<AdminScreen />);
  expect(screen.queryByRole('button', { name: 'Delete Administrator' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Edit Administrator' }));
  expect(screen.getByLabelText('Email')).toBeOnTheScreen();
  expect(screen.getByLabelText('Display name')).toBeOnTheScreen();
  expect(screen.queryByLabelText(/role/i)).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Display name'), 'Updated Admin');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(mutations.userUpdate.mutateAsync).toHaveBeenCalledWith({ id: 'admin-id', input: { email: admin.email, displayName: 'Updated Admin' } }));
});

test('part form validates required fields and then creates a part', async () => {
  jest.mocked(useAdminDirectory).mockReturnValue(directoryState({ data: { ...directory.data!, content: [] } }));
  await render(<AdminScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Parts' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Create part' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  expect(screen.getByText('Part name and category are required.')).toBeOnTheScreen();
  await fireEvent.changeText(screen.getByLabelText('Part name'), 'DDR5');
  await fireEvent.changeText(screen.getByLabelText('Category'), 'memory');
  await fireEvent.changeText(screen.getByLabelText('Price'), '42.50');
  await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(mutations.partCreate.mutateAsync).toHaveBeenCalledWith({ name: 'DDR5', category: 'memory', price: 42.5 }));
});

test('part deletion asks for destructive confirmation before calling the API', async () => {
  jest.mocked(useAdminDirectory).mockReturnValue(directoryState({ data: { ...directory.data!, content: [{ part_id: 'part-id', name: 'DDR5', category: 'memory', price: 42, created_at: admin.created_at }] } }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await render(<AdminScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Parts' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Delete DDR5' }));
  expect(alert).toHaveBeenCalledWith('Delete part?', expect.any(String), expect.arrayContaining([expect.objectContaining({ text: 'Cancel' }), expect.objectContaining({ text: 'Delete', style: 'destructive', onPress: expect.any(Function) })]));
  const actions = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  actions.find((action) => action.text === 'Delete')?.onPress?.();
  expect(mutations.partDelete.mutateAsync).toHaveBeenCalledWith('part-id');
  alert.mockRestore();
});

test('user deletion confirmation describes cascading data removal', async () => {
  const target: AppUser = { id: 'member-id', email: 'member@example.test', display_name: 'Member', role: 'USER', created_at: admin.created_at };
  jest.mocked(useAdminDirectory).mockReturnValue(directoryState({ data: { ...directory.data!, content: [target] } }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await render(<AdminScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Delete Member' }));
  expect(alert).toHaveBeenCalledWith('Delete user?', expect.stringContaining("saved builds and linked sign-in identities"), expect.any(Array));
  const actions = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  actions.find((action) => action.text === 'Delete')?.onPress?.();
  expect(mutations.userDelete.mutateAsync).toHaveBeenCalledWith('member-id');
  alert.mockRestore();
});
