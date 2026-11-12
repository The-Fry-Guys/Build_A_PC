import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const api = 'http://127.0.0.1:8080/api/v1';

test.beforeEach(async ({ request }) => {
  await expect.poll(async () => {
    try { return (await request.get('http://127.0.0.1:8080/actuator/health')).status(); }
    catch { return 0; }
  }, { timeout: 90_000 }).toBe(200);
});

test('admin searches real user and part records and logs out', async ({ page, request }) => {
  const response = await request.post(`${api}/test/token?email=e2e-admin@example.test`);
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  await page.addInitScript((value) => {
    if (sessionStorage.getItem('e2e.initialized')) return;
    sessionStorage.setItem('buildapc.appJwt', value);
    sessionStorage.setItem('e2e.initialized', '1');
  }, token);
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin tools' })).toBeVisible();
  await expect(page).toHaveTitle('Admin tools | Build A PC');
  await page.getByRole('textbox', { name: 'Search users' }).fill('e2e-user');
  await page.getByRole('button', { name: 'View details for Demo Member', exact: true }).click();
  await expect(page.getByText('Role: USER', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide details for Demo Member', exact: true })).toBeVisible();
  const userAccessibility = await new AxeBuilder({ page }).analyze();
  expect(userAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  await page.getByRole('button', { name: 'Parts', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search parts' }).fill('memory');
  await expect(page.getByRole('button', { name: 'View details for Demo Memory', exact: true })).toBeVisible();
  await expect(page.getByText('Price not available', { exact: true })).toBeVisible();
  const partAccessibility = await new AxeBuilder({ page }).analyze();
  expect(partAccessibility.violations.filter(({ impact }) => impact === 'serious' || impact === 'critical')).toEqual([]);
  await page.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Signed in as Demo Administrator', { exact: true })).toBeVisible();
  // Inactive tabs stay mounted; select the visible Home control after navigation settles.
  const logout = page.getByRole('button', { name: 'Log out', exact: true }).filter({ visible: true });
  await expect(logout).toBeVisible();
  await logout.click({ timeout: 10_000 });
  await expect(page.getByText('Signed in as Demo Administrator', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Admin tools' })).toHaveCount(0);
});

test('Admin navigation is hidden for regular users on Home and Explore', async ({ page, request }) => {
  const response = await request.post(`${api}/test/token?email=e2e-user@example.test`);
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  await page.addInitScript((value) => sessionStorage.setItem('buildapc.appJwt', value), token);

  await page.goto('/');
  await expect(page.getByText('Signed in as Demo Member', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
  await expect(page.locator('a[href="/admin"]')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);

  await page.getByRole('link', { name: 'Explore', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.locator('a[href="/admin"]')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
});

test('regular accounts cannot enter the admin page or read users', async ({ page, request }) => {
  const response = await request.post(`${api}/test/token?email=e2e-user@example.test`);
  expect(response.ok()).toBeTruthy();
  const { token } = await response.json();
  expect((await request.get(`${api}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(403);
  await page.addInitScript((value) => sessionStorage.setItem('buildapc.appJwt', value), token);
  await page.goto('/admin');
  await expect(page.getByText('Signed in as Demo Member', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Admin tools' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
});
