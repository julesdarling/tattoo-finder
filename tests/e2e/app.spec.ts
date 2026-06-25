import { expect, test } from '@playwright/test';

test('mobile home search, save, and detail flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /find tattoo work nearby/i })).toBeVisible();
  await page.getByPlaceholder('Fine line, Oakland, Ritual').fill('cyclops');
  await page.locator('form[aria-label="Search tattoo artists"]').first().getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/#\/search/);
  await expect(page.getByText(/results/i).first()).toBeVisible();
  await page.getByLabel(/save/i).first().click();
  await page.locator('.listing-copy').first().click();
  await expect(page.getByText(/verify before booking/i)).toBeVisible();
});

test('desktop results show split map and filters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto('./#/search?where=SF');
  await expect(page.getByLabel('Filters')).toBeVisible();
  await expect(page.getByTestId('map-panel')).toBeVisible();
  await expect(page.getByRole('link', { name: 'OpenStreetMap' }).first()).toBeVisible();
  await expect(page.locator('.listing-card').first()).toBeVisible();
});

test('mobile map toggle reveals map', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./#/search?where=SF');
  await page.locator('.mobile-actions').getByRole('button', { name: 'Map', exact: true }).click();
  await expect(page.getByTestId('map-panel')).toBeVisible();
  await expect(page.getByRole('link', { name: 'OpenStreetMap' }).first()).toBeVisible();
});
