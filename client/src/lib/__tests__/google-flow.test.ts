import { createGoogleAttempt } from '../google-flow';

const request = {
  state: 'test-state',
  codeVerifier: 'v'.repeat(43),
};
const redirectUri = 'http://localhost:8081/auth';

test('opens the popup immediately and exchanges matching values only once', async () => {
  const prompt = jest.fn(async () => ({
    type: 'success',
    params: { code: 'google-code', state: request.state },
  }));
  const login = jest.fn(async () => undefined);
  const run = createGoogleAttempt(request, redirectUri, prompt, login);

  const first = run();
  expect(prompt).toHaveBeenCalledTimes(1);

  await Promise.all([first, run()]);
  await run();

  expect(prompt).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledWith({
    code: 'google-code',
    codeVerifier: request.codeVerifier,
    redirectUri,
  });
});

test.each(['cancel', 'dismiss'])('%s does not exchange a code', async (type) => {
  const login = jest.fn();

  await createGoogleAttempt(request, redirectUri, async () => ({ type }), login)();

  expect(login).not.toHaveBeenCalled();
});

const invalidResults: { type: string; params?: Record<string, string> }[] = [
  { type: 'error' },
  { type: 'success', params: { state: request.state } },
  { type: 'success', params: { code: 'code', state: 'wrong-state' } },
  { type: 'success', params: { code: 'code' } },
];

test.each(invalidResults)('rejects unusable callback results: %j', async (result) => {
  const login = jest.fn();

  await expect(
    createGoogleAttempt(request, redirectUri, async () => result, login)(),
  ).rejects.toThrow();

  expect(login).not.toHaveBeenCalled();
});

test('missing PKCE verifier prevents exchange', async () => {
  const login = jest.fn();

  await expect(
    createGoogleAttempt(
      { state: request.state },
      redirectUri,
      async () => ({
        type: 'success',
        params: { code: 'code', state: request.state },
      }),
      login,
    )(),
  ).rejects.toThrow('Could not verify the Google response.');

  expect(login).not.toHaveBeenCalled();
});

test('blocked popup errors provide readable guidance', async () => {
  const prompt = jest.fn().mockRejectedValue(
    Object.assign(new Error('blocked'), { code: 'ERR_WEB_BROWSER_BLOCKED' }),
  );

  await expect(
    createGoogleAttempt(request, redirectUri, prompt, jest.fn())(),
  ).rejects.toThrow('Allow popups for this site');
});

test('a failed attempt cannot be reused, but a fresh request can retry', async () => {
  const prompt = jest.fn()
    .mockRejectedValueOnce(new Error('browser failed'))
    .mockResolvedValue({
      type: 'success',
      params: { code: 'retry-code', state: 'fresh-state' },
    });
  const login = jest.fn(async () => undefined);
  const run = createGoogleAttempt(request, redirectUri, prompt, login);

  await expect(run()).rejects.toThrow('browser failed');
  await run();

  expect(prompt).toHaveBeenCalledTimes(1);

  await createGoogleAttempt(
    { state: 'fresh-state', codeVerifier: 'n'.repeat(43) },
    redirectUri,
    prompt,
    login,
  )();

  expect(login).toHaveBeenCalledWith({
    code: 'retry-code',
    codeVerifier: 'n'.repeat(43),
    redirectUri,
  });
});
