import { createNativeGoogleAuth } from '../google-native-flow';

const codes = { SIGN_IN_CANCELLED: 'cancel', IN_PROGRESS: 'busy', PLAY_SERVICES_NOT_AVAILABLE: 'play-services' };
function setup() {
  const sdk = {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async (): Promise<{ type: string; data?: { idToken: string | null } }> => ({ type: 'success', data: { idToken: 'google-id-token' } })),
    signOut: jest.fn(async () => undefined),
  };
  const clientId = jest.fn((): string | undefined => 'web-client-id');
  return { sdk, clientId, auth: createNativeGoogleAuth(sdk, clientId, codes) };
}

test('requests ID tokens for the Web client with offline access disabled', async () => {
  const { auth, sdk } = setup();
  await expect(auth.signIn()).resolves.toBe('google-id-token');
  await auth.signIn();
  expect(sdk.configure).toHaveBeenCalledTimes(1);
  expect(sdk.configure).toHaveBeenCalledWith({ webClientId: 'web-client-id', offlineAccess: false });
  expect(sdk.hasPlayServices).toHaveBeenCalledWith({ showPlayServicesUpdateDialog: true });
});

test('missing configuration never opens Google', async () => {
  const { auth, sdk, clientId } = setup();
  clientId.mockReturnValue(' ');
  await expect(auth.signIn()).rejects.toThrow('client ID is not configured');
  expect(sdk.signIn).not.toHaveBeenCalled();
});

test('unavailable Play Services never opens the account picker', async () => {
  const { auth, sdk } = setup();
  sdk.hasPlayServices.mockResolvedValue(false);
  await expect(auth.signIn()).rejects.toThrow('Google Play Services is unavailable');
  expect(sdk.signIn).not.toHaveBeenCalled();
});

test('both cancellation forms return no credential', async () => {
  const { auth, sdk } = setup();
  sdk.signIn.mockResolvedValueOnce({ type: 'cancelled' });
  await expect(auth.signIn()).resolves.toBeNull();
  sdk.signIn.mockRejectedValueOnce({ code: codes.SIGN_IN_CANCELLED });
  await expect(auth.signIn()).resolves.toBeNull();
});

test.each([
  ['10', 'signing SHA-1'], ['DEVELOPER_ERROR', 'signing SHA-1'],
  [codes.IN_PROGRESS, 'already in progress'], [codes.PLAY_SERVICES_NOT_AVAILABLE, 'Play Services'],
  ['unknown', 'could not start'],
])('SDK error %s is safe and actionable', async (code, message) => {
  const { auth, sdk } = setup();
  sdk.signIn.mockRejectedValue({ code, message: 'private-provider-token' });
  const result = auth.signIn();
  await expect(result).rejects.toThrow(message);
  await expect(result).rejects.not.toThrow('private-provider-token');
});

test('missing ID token never becomes a successful credential', async () => {
  const { auth, sdk } = setup();
  sdk.signIn.mockResolvedValue({ type: 'success', data: { idToken: null } });
  await expect(auth.signIn()).rejects.toThrow('did not return an ID token');
});

test('logout initializes the SDK after app restart and clears its cached session', async () => {
  const { auth, sdk } = setup();
  await auth.signOut();
  expect(sdk.configure).toHaveBeenCalledTimes(1);
  expect(sdk.signOut).toHaveBeenCalledTimes(1);
});

test('logout waits for the picker, and a second picker cannot open', async () => {
  const { auth, sdk } = setup();
  let finish!: (value: { type: string }) => void;
  sdk.signIn.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const login = auth.signIn();
  await expect(auth.signIn()).rejects.toThrow('already in progress');
  // Let configuration and the Play Services await finish.
  await Promise.resolve();
  const logout = auth.signOut();
  expect(sdk.signOut).not.toHaveBeenCalled();
  finish({ type: 'cancelled' });
  await Promise.all([login, logout]);
  expect(sdk.signOut).toHaveBeenCalledTimes(1);
});

test('an SDK cleanup failure does not poison later sign-in', async () => {
  const { auth, sdk } = setup();
  sdk.signOut.mockRejectedValueOnce(new Error('failed'));
  await expect(auth.signOut()).rejects.toThrow('failed');
  await expect(auth.signIn()).resolves.toBe('google-id-token');
});
