import type { GitHubLoginInput } from './api';

type Result = { type: string; params?: Record<string, string> };

/** One prepared request is used once; a new request is needed for each retry. */
export function createGitHubAttempt(
  request: { codeVerifier?: string; state: string },
  redirectUri: string,
  prompt: () => Promise<Result>,
  login: (input: GitHubLoginInput) => Promise<void>,
) {
  let used = false;
  return async () => {
    if (used) return;
    used = true;
    try {
      const result = await prompt();
      if (result.type === 'cancel' || result.type === 'dismiss') return;
      if (result.type !== 'success' || !result.params?.code) {
        throw new Error('GitHub sign-in was rejected. Please try again.');
      }
      if (result.params.state !== request.state || !request.codeVerifier) {
        throw new Error('Could not verify the GitHub response. Please try again.');
      }
      await login({ code: result.params.code, codeVerifier: request.codeVerifier, redirectUri });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ERR_WEB_BROWSER_BLOCKED') {
        throw new Error('Allow popups for this site, then try signing in again.');
      }
      throw error;
    }
  };
}
