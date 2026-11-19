import type { AuthCodeInput } from './api';

type Result = {
  type: string;
  params?: Record<string, string>;
};

/** Uses each prepared OAuth request once, including cancelled attempts. */
export function createGoogleAttempt(
  request: { codeVerifier?: string; state: string },
  redirectUri: string,
  prompt: () => Promise<Result>,
  login: (input: AuthCodeInput) => Promise<void>,
) {
  let used = false;

  return async () => {
    if (used) return;
    used = true;

    try {
      const result = await prompt();

      if (result.type === 'cancel' || result.type === 'dismiss') return;

      if (result.type !== 'success' || !result.params?.code) {
        throw new Error('Google sign-in was rejected. Please try again.');
      }

      if (
        !request.state ||
        result.params.state !== request.state ||
        !request.codeVerifier
      ) {
        throw new Error('Could not verify the Google response. Please try again.');
      }

      await login({
        code: result.params.code,
        codeVerifier: request.codeVerifier,
        redirectUri,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ERR_WEB_BROWSER_BLOCKED'
      ) {
        throw new Error('Allow popups for this site, then try signing in again.');
      }

      throw error;
    }
  };
}
