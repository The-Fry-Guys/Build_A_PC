import { createGitHubAttempt } from '../github-flow';

const request = { state: 'random-state', codeVerifier: 'v'.repeat(43) };
const redirectUri = 'http://localhost:8081/auth';

test('opens the prepared popup immediately and exchanges matching PKCE values once', async () => {
  const prompt = jest.fn(async () => ({ type: 'success', params: { code: 'github-code', state: request.state } }));
  const login = jest.fn(async () => undefined);
  const run = createGitHubAttempt(request, redirectUri, prompt, login);
  const first = run();
  expect(prompt).toHaveBeenCalledTimes(1);
  await Promise.all([first, run()]);
  expect(login).toHaveBeenCalledTimes(1);
  expect(login).toHaveBeenCalledWith({ code: 'github-code', codeVerifier: request.codeVerifier, redirectUri });
});

test.each(['cancel', 'dismiss'])('%s does not exchange or report an error', async (type) => {
  const login = jest.fn();
  await createGitHubAttempt(request, redirectUri, async () => ({ type }), login)();
  expect(login).not.toHaveBeenCalled();
});

test.each([
  { type: 'error' },
  { type: 'success', params: { code: 'code', state: 'wrong' } },
  { type: 'success', params: { code: '', state: request.state } },
])('rejects unusable or mismatched OAuth responses: %j', async (result) => {
  const login = jest.fn();
  await expect(createGitHubAttempt(request, redirectUri, async () => result, login)()).rejects.toThrow();
  expect(login).not.toHaveBeenCalled();
});

test('blocked popups produce actionable guidance', async () => {
  const prompt = jest.fn().mockRejectedValue(Object.assign(new Error('blocked'), { code: 'ERR_WEB_BROWSER_BLOCKED' }));
  await expect(createGitHubAttempt(request, redirectUri, prompt, jest.fn())()).rejects.toThrow('Allow popups');
});

test('a failed request is never reused; a fresh attempt can retry', async () => {
  const prompt = jest.fn().mockRejectedValueOnce(new Error('browser failed')).mockResolvedValue({ type: 'cancel' });
  const run = createGitHubAttempt(request, redirectUri, prompt, jest.fn());
  await expect(run()).rejects.toThrow('browser failed');
  await run();
  expect(prompt).toHaveBeenCalledTimes(1);
  await createGitHubAttempt({ ...request, state: 'fresh-state' }, redirectUri, prompt, jest.fn())();
  expect(prompt).toHaveBeenCalledTimes(2);
});
