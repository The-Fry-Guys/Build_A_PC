import { fireEvent, render, screen } from '@testing-library/react-native';
import { useSession } from '@/auth/session-provider';
import GoogleLogin from '../../components/google-login.android';

jest.mock('@/auth/session-provider', () => ({ useSession: jest.fn() }));
jest.mock('@/components/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
const login = jest.fn(async () => undefined);
const originalClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
beforeEach(() => {
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-client';
  jest.mocked(useSession).mockReturnValue({ loginGoogleAndroid: login, loading: false } as unknown as ReturnType<typeof useSession>);
});
afterEach(() => {
  if (originalClientId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalClientId;
});
test('button starts the guarded native login', async () => {
  await render(<GoogleLogin />);
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in with Google' }));
  expect(login).toHaveBeenCalledTimes(1);
});
test('another pending provider disables Google', async () => {
  await render(<GoogleLogin disabled />);
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeDisabled();
});
test('a pending session disables Google', async () => {
  jest.mocked(useSession).mockReturnValue({ loginGoogleAndroid: login, loading: true } as unknown as ReturnType<typeof useSession>);
  await render(<GoogleLogin />);
  expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeDisabled();
});
test('missing client configuration explains the unavailable login', async () => {
  delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  await render(<GoogleLogin />);
  expect(screen.getByText('Google web client ID is not configured.')).toBeOnTheScreen();
  expect(screen.queryByRole('button')).toBeNull();
});
