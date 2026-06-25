import { expect, test } from '@playwright/test';

test('mobile browse, search, save, and detail flow works', async ({ page }) => {
  await page.goto('/tattoo-finder/');
  const results = page.getByRole('region', { name: /browse results/i });

  await expect(page.getByRole('heading', { name: /tattoo finder/i })).toBeVisible();
  await expect(results.getByRole('heading', { name: /showing 471/i })).toBeVisible();

  await page.getByRole('searchbox', { name: /search artists, studios, cities, styles/i }).fill('Ritual Tattoo');
  await page.getByRole('button', { name: /^save ritual tattoo/i }).click();
  await expect(results.getByText(/1 saved/i)).toBeVisible();

  await page.getByRole('button', { name: /open ritual tattoo details/i }).click();

  const detail = page.getByRole('dialog', { name: /ritual tattoo/i });
  await expect(detail).toBeVisible();
  await expect(detail.getByRole('link', { name: /visit official site/i })).toBeVisible();
});

test('map surface is reachable and keeps OSM attribution visible', async ({ page }) => {
  await page.goto('/tattoo-finder/');

  const showMap = page.getByRole('button', { name: /show map/i });
  if (await showMap.isVisible()) {
    await showMap.click();
  }

  await expect(page.getByRole('region', { name: /bay area map/i })).toBeVisible();
  await expect.poll(async () => page.locator('img.leaflet-tile').count()).toBeGreaterThan(3);
  await expect.poll(async () => page.locator('.leaflet-marker-icon').count()).toBeGreaterThan(200);
  await expect(page.getByText(/openstreetmap/i).first()).toBeVisible();
});
