const { test, expect } = require('@playwright/test');

test('browser pipeline smoke flow', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));

  const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await expect(page.getByText('Seamless')).toBeVisible();

  await page.locator('[data-screen-label="Raw Atlas Input"]').click();
  await page.locator('input[type="file"]').setInputFiles('tests/fixtures/sample-atlas.png');
  await expect(page.getByText(/sample-atlas\.png/)).toBeVisible({ timeout: 5000 });

  await page.locator('[data-screen-label="Clean Tileset"]').click();
  await page.getByRole('button', { name: 'Run node' }).click();
  await expect(page.getByRole('button', { name: 'Run node' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Artifacts' }).last().click();
  await expect(page.getByText('cleaned-atlas.png')).toBeVisible({ timeout: 5000 });

  await page.locator('[data-screen-label="Tile Classification"]').click();
  await page.getByRole('button', { name: 'Run node' }).click();
  await expect(page.getByRole('button', { name: 'Run node' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Artifacts' }).last().click();
  await expect(page.getByText('tile-class-map.json')).toBeVisible({ timeout: 5000 });

  await page.locator('[data-screen-label="Seam Report"]').click();
  await page.getByRole('button', { name: 'Run node' }).click();
  await expect(page.getByRole('button', { name: 'Run node' })).toBeEnabled({ timeout: 15000 });
  await page.getByRole('button', { name: 'Artifacts' }).last().click();
  await expect(page.getByText('seam-report.md')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('seam-report.csv')).toBeVisible({ timeout: 5000 });

  if (errors.length) throw new Error('Browser errors: ' + errors.join('\n'));
});
