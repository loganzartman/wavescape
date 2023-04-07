import {test, expect} from '@playwright/test';

test('benchmark', async ({page}) => {
  await page.goto('/benchmark.html');

  await expect(page).toHaveTitle(/TEST HARNESS/);
  const messagePromise = page.waitForEvent('console');
  await page.getByText('start').click();
  const time = await messagePromise;
  console.log('step time', time, 'ms');
});
