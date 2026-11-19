import { expect, test } from '@playwright/test';

test('guests can browse and search parts, return to sign-in, and cannot access account routes', async ({ page }) => {
  test.setTimeout(240_000);
  const authorizationHeaders: (string | undefined)[] = [];
  await page.route('**/api/v1/parts**', async (route) => {
    authorizationHeaders.push(route.request().headers().authorization);
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/price-range')) {
      await route.fulfill({ json: { min_price: 89.99, max_price: 249.99 } });
      return;
    }
    const parts = [
      { part_id: 'cpu-1', category: 'cpu', name: 'Example CPU 123', price: 249.99 },
      { part_id: 'memory-1', category: 'memory', name: 'Example Memory', price: 89.99 },
    ].filter((part) => part.name.toLowerCase().includes((url.searchParams.get('q') ?? '').toLowerCase()));
    await route.fulfill({ json: { content: parts, page: 0, size: 20, totalElements: parts.length, totalPages: 1 } });
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign in with GitHub' })).toBeVisible({ timeout: 60_000 });
  await page.getByRole('link', { name: 'Browse parts as a guest' }).click();
  await expect(page).toHaveURL(/\/parts$/);
  await expect(page.getByText('Example CPU 123')).toBeVisible();
  await expect(page.getByText('Example CPU 123').locator('..').getByText('$249.99', { exact: true })).toBeVisible();
  await page.getByLabel('Search parts').fill('memory');
  await expect(page.getByText('Example Memory')).toBeVisible();
  await expect(page.getByText('Example CPU 123')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add to Build' })).toHaveCount(0);
  for (const name of ['My Build', 'Builds', 'Profile', 'Admin']) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
  expect(authorizationHeaders.length).toBeGreaterThan(0);
  expect(authorizationHeaders.every((header) => header === undefined)).toBe(true);

  await page.reload();
  await expect(page.getByText('Example CPU 123')).toBeVisible();
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign in with GitHub' })).toBeVisible();

  for (const path of ['/alex-pc', '/builds', '/profile', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Sign in with GitHub' })).toBeVisible();
  }
});

test('signed-in users retain build controls in the catalog', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => sessionStorage.setItem('buildapc.appJwt', 'test-token'));
  await page.route('**/api/v1/me', (route) => route.fulfill({
    json: { id: 'user-1', email: 'member@example.test', display_name: 'Member', role: 'USER', created_at: '2026-01-01T00:00:00Z' },
  }));
  await page.route('**/api/v1/parts**', (route) => route.fulfill({
    json: new URL(route.request().url()).pathname.endsWith('/price-range')
      ? { min_price: 249.99, max_price: 249.99 }
      : { content: [{ part_id: 'cpu-1', category: 'cpu', name: 'Example CPU 123', price: 249.99 }], page: 0, size: 20, totalElements: 1, totalPages: 1 },
  }));

  await page.goto('/');
  await expect(page.getByText('Example CPU 123')).toBeVisible({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/parts$/);
  await expect(page.getByRole('link', { name: 'My Build', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add to Build' }).click();
  await expect(page.getByRole('button', { name: 'Added to Build' })).toBeVisible();
  await page.getByRole('link', { name: 'My Build', exact: true }).click();
  await expect(page.getByText('Example CPU 123').filter({ visible: true })).toBeVisible();
});
