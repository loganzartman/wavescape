import './reset.css';
import './index.css';
import {makeDamBreak} from './scene';
import {State, allocateState, GPUState, allocateGPUState} from './state';
import {Params, makeDefaultParams} from './params';
import {updateSimulation} from './simulation';
import {initPointer, updatePointer} from './pointer';
import {createUi} from './tweaks';
import {enableFloatTexture} from './gl';
import {testSort} from './sortGPU';
import {copyStateToGPU} from './simulationGPU';
import {renderCanvas2D} from './renderCanvas2D';

let running = true;
let step = false;

const glCanvas = document.createElement('canvas');
const gl = glCanvas.getContext('webgl2');
if (!gl) {
  throw new Error('Failed to get WebGL2 context');
}
if (!enableFloatTexture(gl)) {
  throw new Error('Device does not support rendering to float texture');
}

// testSort(gl);

const n = 500;
const state: State = allocateState({n});
const gpuState: GPUState = allocateGPUState({gl, n});
const params: Params = makeDefaultParams();

const reset = () => {
  makeDamBreak(state, params);
  copyStateToGPU(gl, state, gpuState);
};

reset();
initPointer();
createUi(params);

const canvas = document.createElement('canvas');
const resize = () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
};
resize();
addEventListener('resize', resize, false);

addEventListener(
  'keydown',
  (event) => {
    if (event.code == 'Space') {
      running = !running;
    }
    if (event.code == 'KeyR') {
      reset();
    }
    if (event.code == 'KeyS') {
      step = true;
    }
  },
  false
);

let tLast = Date.now();
const simulate = () => {
  const dt = 0.02;
  const realDt = (Date.now() - tLast) / 1000;
  tLast = Date.now();

  updatePointer(realDt);
  updateSimulation(state, gl, gpuState, params, dt);
};

const frame = () => {
  if (running || step) {
    simulate();
    step = false;
  }

  const ctx = canvas.getContext('2d')!;
  renderCanvas2D(ctx, state, params);

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

document.getElementById('container')!.appendChild(canvas);
