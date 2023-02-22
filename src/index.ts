import './reset.css';
import './index.css';
import {makeDamBreak} from './scene';
import {State, allocateState, GPUState, allocateGPUState} from './state';
import {Params, makeDefaultParams} from './params';
import {updateSimulation} from './simulation';
import {initPointer, updatePointer} from './pointer';
import {createUi} from './tweaks';
import {enableFloatTexture} from './gl/gl';
import {testSort} from './sortGPU';
import {copyStateToGPU, updateSimulationGPU} from './simulationGPU';
import {renderCanvas2D} from './renderCanvas2D';
import {renderWebGL} from './renderWebGL';

type RunnerState = {
  running: boolean;
  step: boolean;
  tLast: number;
};

const resize = (canvas: HTMLCanvasElement) => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};

const reset = (
  canvas: HTMLCanvasElement,
  state: State,
  gpuState: GPUState | null,
  params: Params
) => {
  makeDamBreak(state, params);
  if (gpuState) {
    const gl = canvas.getContext('webgl2');
    copyStateToGPU(gl, state, gpuState);
  }
};

const initKeybinds = (
  canvas: HTMLCanvasElement,
  runnerState: RunnerState,
  state: State,
  gpuState: GPUState | null,
  params: Params
) => {
  addEventListener(
    'keydown',
    (event) => {
      if (event.code == 'Space') {
        runnerState.running = !runnerState.running;
      }
      if (event.code == 'KeyR') {
        reset(canvas, state, gpuState, params);
      }
      if (event.code == 'KeyS') {
        runnerState.step = true;
      }
    },
    false
  );
};

const frame = (
  canvas: HTMLCanvasElement,
  runnerState: RunnerState,
  state: State,
  gpuState: GPUState,
  params: Params
) => {
  const dt = 0.02;
  const realDt = (Date.now() - runnerState.tLast) / 1000;
  runnerState.tLast = Date.now();

  updatePointer(realDt);

  if (runnerState.running || runnerState.step) {
    if (params.mode === 'cpu') {
      updateSimulation(state, params, dt);
    } else {
      const gl = canvas.getContext('webgl2');
      updateSimulationGPU(gl, gpuState, params, dt);
    }
    runnerState.step = false;
  }

  if (params.mode === 'cpu') {
    const ctx = canvas.getContext('2d');
    renderCanvas2D(ctx, state, params);
  } else {
    const gl = canvas.getContext('webgl2');
    renderWebGL(gl, gpuState, params);
  }
};

const init = () => {
  const params: Params = makeDefaultParams();
  const canvas = document.createElement('canvas');

  let gl: WebGL2RenderingContext | null = null;
  if (params.mode === 'webgl') {
    gl = canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('Failed to get WebGL2 context');
    }
    if (!enableFloatTexture(gl)) {
      throw new Error('Device does not support rendering to float texture');
    }
    // testSort(gl);
  }

  const runnerState: RunnerState = {
    running: true,
    step: false,
    tLast: Date.now(),
  };

  const state: State = allocateState({n: params.n});
  const gpuState: GPUState | null = gl
    ? allocateGPUState({gl, n: params.n, params})
    : null;

  document.getElementById('container')!.appendChild(canvas);
  addEventListener('resize', () => resize(canvas), false);

  resize(canvas);
  reset(canvas, state, gpuState, params);
  initPointer();
  initKeybinds(canvas, runnerState, state, gpuState, params);
  createUi(params);

  const runFrame = () => {
    frame(canvas, runnerState, state, gpuState, params);
    requestAnimationFrame(runFrame);
  };
  requestAnimationFrame(runFrame);
};

init();
