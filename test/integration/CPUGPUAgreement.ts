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

const replaceTypedArrays = (o: object | null) =>
  o === null
    ? null
    : Object.fromEntries(
        Object.entries(o).map(([k, v]) => [
          k,
          'length' in v ? Array.from(v) : v,
        ])
      );

const init = () => {
  const cpuEngine = engineInit({
    containerSelector: '#containerCPU',
    clockMs: 0,
    params: makeDefaultParams({mode: 'cpu'}),
  });
  const gpuEngine = engineInit({
    containerSelector: '#containerGPU',
    clockMs: 0,
    params: makeDefaultParams({mode: 'webgl', renderMode: 'simple'}),
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

  (window as any)._getCPUState = () => {
    return replaceTypedArrays(cpuEngine.state.cpu);
  };
  (window as any)._getGPUState = () => {
    // copy GPU state to CPU buffers
    const {state, params, canvas} = gpuEngine;
    const gl = canvas.getContext('webgl2')!;
    copyStateFromGPU(gl, state, params);
    return replaceTypedArrays(gpuEngine.state.cpu);
  };

  (window as any)._runStep = () => {
    ++clockMs;
    engineStep(cpuEngine, {clockMs});
    engineStep(gpuEngine, {clockMs});
    engineDraw(cpuEngine);
    engineDraw(gpuEngine);
  };
};
init();
