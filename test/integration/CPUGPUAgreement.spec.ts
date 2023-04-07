import {test, expect} from '@playwright/test';

const steps = 100;

test('agreement', async ({page}) => {
  await page.goto('/CPUGPUAgreement.html');

  await expect(page).toHaveTitle(/TEST HARNESS/);
  await expect(page.locator('#containerCPU canvas')).toBeVisible();
  await expect(page.locator('#containerGPU canvas')).toBeVisible();

  expect(
    await page.evaluate('window._CHECK_CPU_NAN()'),
    'CPU had NaN values before stepping'
  ).toBe(false);
  expect(
    await page.evaluate('window._CHECK_GPU_NAN()'),
    'GPU had NaN values before stepping'
  ).toBe(false);
  expect(
    await page.evaluate('window._CHECK_AGREEMENT()'),
    'Disagreement between CPU and GPU state before stepping'
  ).toBe(true);

  for (let i = 0; i < steps; ++i) {
    await page.evaluate('window._RUN_STEP()');

    expect(
      await page.evaluate('window._CHECK_CPU_NAN()'),
      `CPU had NaN values after step ${i}`
    ).toBe(false);
    expect(
      await page.evaluate('window._CHECK_GPU_NAN()'),
      `GPU had NaN values after step ${i}`
    ).toBe(false);
    expect(
      await page.evaluate('window._CHECK_AGREEMENT()'),
      `Disagreement between CPU and GPU state after step ${i}`
    ).toBe(true);
  }
});
