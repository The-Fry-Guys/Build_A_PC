import { expect, test } from '@playwright/test';

test('GitHub sign-in opens an authorization popup with PKCE and can be cancelled', async ({ page, context }) => {
  const exchanges: string[] = [];
  context.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/auth/github') {
      exchanges.push(request.url());
    }
  });

  // Context routing catches the popup's first request without contacting GitHub.
  await context.route('https://github.com/login/oauth/authorize**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<!doctype html><html lang="en"><head><title>Authorization captured</title></head><body>OAuth test</body></html>',
  }));
  await page.goto('/');
  const signIn = page.getByRole('button', { name: 'Sign in with GitHub', exact: true });
  await expect(signIn).toBeEnabled();
  const opened = page.waitForEvent('popup');
  await signIn.click();
  const popup = await opened;

  try {
    await expect(popup).toHaveURL(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    const authorization = new URL(popup.url());
    expect(authorization.searchParams.get('client_id')).toBe('e2e-public-github-client');
    expect(authorization.searchParams.get('redirect_uri')).toBe('http://localhost:8081/auth');
    expect(authorization.searchParams.get('response_type')).toBe('code');
    expect(authorization.searchParams.get('code_challenge_method')).toBe('S256');
    expect(authorization.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorization.searchParams.get('state')).toBeTruthy();
    expect(authorization.searchParams.get('scope')?.split(/\s+/)).toContain('user:email');
  } finally {
    await popup.close();
  }

  await expect(signIn).toBeEnabled();
  expect(exchanges).toEqual([]);
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
});
