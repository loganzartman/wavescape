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

let running = false;
let step = false;

const glCanvas = document.createElement('canvas');
const gl = glCanvas.getContext('webgl2');
if (!gl) {
  throw new Error('Failed to get WebGL2 context');
}
if (!enableFloatTexture(gl)) {
  throw new Error('Device does not support rendering to float texture');
}

testSort(gl);

const n = 500;
const state: State = allocateState({n});
const gpuState: GPUState = allocateGPUState({gl, n});
const params: Params = makeDefaultParams();

const reset = () => {
  makeDamBreak(state, params);
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  const dim = Math.min(window.innerWidth, window.innerHeight);
  ctx.scale(dim, dim);
  ctx.translate(
    ((window.innerWidth - dim) / dim) * 0.5,
    ((window.innerHeight - dim) / dim) * 0.5
  );

  ctx.beginPath();
  ctx.rect(0, 0, 1, 1);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 0.01;
  ctx.stroke();

  let maxdens = 0,
    maxpresx = 0,
    maxpresy = 0;
  for (let i = 0; i < state.n; ++i) {
    maxdens = Math.max(maxdens, Math.abs(state.density[i]));
    maxpresx = Math.max(maxpresx, Math.abs(state.fPressure[i * 2 + 0]));
    maxpresy = Math.max(maxpresy, Math.abs(state.fPressure[i * 2 + 1]));
  }

  // render
  for (let i = 0; i < state.n; ++i) {
    ctx.beginPath();
    ctx.ellipse(
      state.position[i * 2 + 0],
      state.position[i * 2 + 1],
      params.particleRadius,
      params.particleRadius,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = `rgb(${((state.density[i] / maxdens) * 0.5 + 0.5) * 255}, ${
      ((state.fPressure[i * 2 + 0] / maxpresx) * 0.5 + 0.5) * 255
    }, ${((state.fPressure[i * 2 + 1] / maxpresy) * 0.5 + 0.5) * 255})`;
    ctx.fill();
  }

  ctx.restore();

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

document.getElementById('container')!.appendChild(canvas);
