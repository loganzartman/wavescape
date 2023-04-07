import '../../src/index.css';
import '../../src/reset.css';
import {
  engineDraw,
  engineInit,
  engineResetScene,
  engineStep,
} from '../../src/engine';
import {createScene, fillRect, makeWalls} from '../../src/scene';
import {PHASE_FLUID} from '../../src/constants';
import {copyStateFromGPU} from '../../src/copyState';
import {makeDefaultParams} from '../../src/params';

const tolerance = 1e-6;

const init = () => {
  const cpuEngine = engineInit({
    containerSelector: '#containerCPU',
    clockMs: 0,
    params: makeDefaultParams({mode: 'cpu'}),
  });
  const gpuEngine = engineInit({
    containerSelector: '#containerGPU',
    clockMs: 0,
    params: makeDefaultParams({mode: 'webgl'}),
  });

  const {params} = cpuEngine;
  const scene = createScene();
  makeWalls({scene, params});
  fillRect({
    scene,
    params,
    phase: PHASE_FLUID,
    x0: 0.01,
    y0: 0.5,
    x1: 0.2,
    y1: 0.99,
  });
  engineResetScene(cpuEngine, scene);
  engineResetScene(gpuEngine, scene);

  let clockMs = 0;

  (window as any)._CHECK_CPU_NAN = () => {
    const cpuPositions = Array.from(cpuEngine.state.cpu!.position);
    return cpuPositions.some((value) => Number.isNaN(value));
  };

  (window as any)._CHECK_GPU_NAN = () => {
    // copy GPU state to CPU buffers
    {
      const {state, params, canvas} = gpuEngine;
      const gl = canvas.getContext('webgl2')!;
      copyStateFromGPU(gl, state, params);
    }

    const gpuPositions = Array.from(gpuEngine.state.cpu!.position);
    return gpuPositions.some((value) => Number.isNaN(value));
  };

  (window as any)._CHECK_AGREEMENT = () => {
    // copy GPU state to CPU buffers
    {
      const {state, params, canvas} = gpuEngine;
      const gl = canvas.getContext('webgl2')!;
      copyStateFromGPU(gl, state, params);
    }

    // compare CPU and GPU state
    const cpuPositions = Array.from(cpuEngine.state.cpu!.position);
    const gpuPositions = Array.from(gpuEngine.state.cpu!.position);
    return cpuPositions.every(
      (expected, i) => Math.abs(expected - gpuPositions[i]) < tolerance
    );
  };

  (window as any)._RUN_STEP = () => {
    ++clockMs;
    engineStep(cpuEngine, {clockMs});
    engineStep(gpuEngine, {clockMs});
    engineDraw(cpuEngine);
    engineDraw(gpuEngine);
  };
};
init();
