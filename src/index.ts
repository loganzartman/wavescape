import './reset.css';
import './index.css';
import {createScene, makeDamBreak, setStateFromScene} from './scene';
import {State, createState} from './state';
import {Params, makeDefaultParams} from './params';
import {updateSimulation} from './simulation';
import {initPointer, updatePointer} from './pointer';
import {autoSetGraphRange, createTweaks} from './tweaks';
import {profileWrapper, enableFloatTexture} from './gl/gl';
import {testSort} from './sortGPU';
import {updateSimulationGPU} from './simulationGPU';
import {renderCanvas2D} from './renderCanvas2D';
import {renderWebGL} from './renderWebGL';
import {UniformContext} from './gl/UniformContext';
import {resetUniforms} from './uniforms';
import {
  allocateDisplayTextures,
  DisplayTextures,
  resizeDisplayTextures,
} from './displayTextures';

type RunnerState = {
  running: boolean;
  step: boolean;
  tLast: number;
};

const resize = (
  canvas: HTMLCanvasElement,
  gl: WebGL2RenderingContext | null,
  displayTextures: DisplayTextures | null
) => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (gl) {
    resizeDisplayTextures(gl, displayTextures, {
      width: canvas.width,
      height: canvas.height,
    });
  }
};

const reset = ({
  state,
  params,
  canvas,
}: {
  state: State;
  params: Params;
  canvas: HTMLCanvasElement;
}) => {
  const scene = createScene();
  makeDamBreak({params, scene});
  const gl = params.mode === 'webgl' ? canvas.getContext('webgl2') : null;
  setStateFromScene({scene, state, params, gl});
};

const initKeybinds = ({
  canvas,
  runnerState,
  state,
  params,
}: {
  canvas: HTMLCanvasElement;
  runnerState: RunnerState;
  state: State;
  params: Params;
}) => {
  addEventListener(
    'keydown',
    (event) => {
      if (event.code == 'Space') {
        runnerState.running = !runnerState.running;
      }
      if (event.code == 'KeyR') {
        reset({state, params, canvas});
      }
      if (event.code == 'KeyS') {
        runnerState.step = true;
      }
    },
    false
  );
};

const frame = ({
  canvas,
  runnerState,
  state,
  params,
  displayTextures,
}: {
  canvas: HTMLCanvasElement;
  runnerState: RunnerState;
  state: State;
  params: Params;
  displayTextures: DisplayTextures;
}) => {
  const dt = 10 ** params.logTimestep;
  const realDt = (Date.now() - runnerState.tLast) / 1000;
  runnerState.tLast = Date.now();

  updatePointer(realDt);

  const uniforms = new UniformContext();
  if (params.mode === 'webgl') {
    const gl = profileWrapper(canvas.getContext('webgl2'));
    resetUniforms({uniforms, gl, state, displayTextures, params, dt});
  }

  if (runnerState.running || runnerState.step) {
    if (params.mode === 'cpu') {
      updateSimulation(state, params, dt);
    } else {
      const gl = profileWrapper(canvas.getContext('webgl2'));
      updateSimulationGPU({gl, state, params, dt, uniforms});
    }
    runnerState.step = false;
  }

  if (params.mode === 'cpu') {
    const ctx = canvas.getContext('2d');
    renderCanvas2D(ctx, state, params);
  } else {
    const gl = profileWrapper(canvas.getContext('webgl2'));
    renderWebGL({gl, displayTextures, state, uniforms, params});
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

  const state: State = createState();
  const displayTextures: DisplayTextures = allocateDisplayTextures();

  document.getElementById('container')!.appendChild(canvas);
  addEventListener('resize', () => resize(canvas, gl, displayTextures), false);

  resize(canvas, gl, displayTextures);
  reset({state, params, canvas});
  initPointer();
  initKeybinds({canvas, runnerState, state, params});
  const {fpsGraph} = createTweaks({
    params,
    state,
    onReset: () => {
      reset({state, params, canvas});
    },
  });

  const runFrame = () => {
    fpsGraph.begin();
    frame({canvas, runnerState, state, params, displayTextures});
    fpsGraph.end();
    autoSetGraphRange(fpsGraph);
    requestAnimationFrame(runFrame);
  };
  requestAnimationFrame(runFrame);
};

init();
