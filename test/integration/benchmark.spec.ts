import {test, expect} from '@playwright/test';

test('benchmark', async ({page}) => {
  await page.goto('/benchmark.html');

  await expect(page).toHaveTitle(/TEST HARNESS/);
  const time = await page.evaluate('runBenchmark()');
  console.log('step time', time, 'ms');
});
