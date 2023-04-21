import {test, expect} from '@playwright/test';
import {CPUState} from '../../src/state';

// cpu is operating with 64 bit floats, GPU with 32 bit
const FLOAT_TOLERANCE = 1e-2;
const steps = 20;

type DeserializedCPUState = {[key in keyof CPUState]: Array<number>};

const getCPUState = async (page): Promise<DeserializedCPUState> =>
  await page.evaluate('window._getCPUState()');
const getGPUState = async (page): Promise<DeserializedCPUState> =>
  await page.evaluate('window._getGPUState()');

const expectArrayNotNaN = (arr: Array<number>, message: string = '') => {
  for (let i = 0; i < arr.length; ++i) {
    if (Number.isNaN(arr[i])) {
      expect(false, `encountered NaN at index ${i};\n${message}`).toBe(true);
    }
  }
};

const floatMatches = (a: number, b: number) =>
  Math.abs(a - b) < FLOAT_TOLERANCE;

const expectArrayMatchesFloat = (
  expected: Array<number>,
  actual: Array<number>,
  message: string = ''
) => {
  expect(
    expected.length,
    `Array lengths do not match: ${expected.length} and ${actual.length};\n${message}`
  ).toBe(actual.length);

  for (let i = 0; i < expected.length; ++i) {
    if (!floatMatches(expected[i], actual[i])) {
      expect(
        false,
        `Mismatch at position ${i}: expected ${expected[i]}, actual ${actual[i]};\n${message}`
      ).toBe(true);
    }
  }
};

const expectNotNaN = (state: DeserializedCPUState, message?: string) => {
  // check in the order that these arrays are updated
  expectArrayNotNaN(state.density, `density: ${message}`);
  expectArrayNotNaN(state.velocityGuess, `velocityGuess: ${message}`);
  expectArrayNotNaN(state.pressure, `pressure: ${message}`);
  expectArrayNotNaN(state.fPressure, `fPressure: ${message}`);
  expectArrayNotNaN(state.velocity, `velocity: ${message}`);
  expectArrayNotNaN(state.position, `position: ${message}`);
};

const expectStateMatches = (
  cpuState: DeserializedCPUState,
  gpuState: DeserializedCPUState,
  message?: string
) => {
  expectArrayMatchesFloat(
    cpuState.density,
    gpuState.density,
    `density: ${message}`
  );
  expectArrayMatchesFloat(
    cpuState.velocityGuess,
    gpuState.velocityGuess,
    `velocityGuess: ${message}`
  );
  expectArrayMatchesFloat(
    cpuState.pressure,
    gpuState.pressure,
    `pressure: ${message}`
  );
  expectArrayMatchesFloat(
    cpuState.fPressure,
    gpuState.fPressure,
    `fPressure: ${message}`
  );
  expectArrayMatchesFloat(
    cpuState.velocity,
    gpuState.velocity,
    `velocity: ${message}`
  );
  expectArrayMatchesFloat(
    cpuState.position,
    gpuState.position,
    `position: ${message}`
  );
};

test('agreement', async ({page}) => {
  await page.goto('/CPUGPUAgreement.html');

  await expect(page).toHaveTitle(/TEST HARNESS/);
  await expect(page.locator('#containerCPU canvas')).toBeVisible();
  await expect(page.locator('#containerGPU canvas')).toBeVisible();

  {
    const cpuState = await getCPUState(page);
    const gpuState = await getGPUState(page);
    expectNotNaN(cpuState, 'CPU had NaN values before stepping');
    expectNotNaN(gpuState, 'GPU had NaN values before stepping');
    expectStateMatches(
      cpuState,
      gpuState,
      'Disagreement between CPU and GPU state before stepping'
    );
  }

  for (let i = 0; i < steps; ++i) {
    await page.evaluate('window._runStep()');

    const cpuState = await getCPUState(page);
    const gpuState = await getGPUState(page);

    expectNotNaN(cpuState, `CPU had NaN values after step ${i}`);
    expectNotNaN(gpuState, `GPU had NaN values after step ${i}`);
    expectStateMatches(
      cpuState,
      gpuState,
      `Disagreement between CPU and GPU state after step ${i}`
    );
  }
});
