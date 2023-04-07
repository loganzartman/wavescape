import {
  allocateDisplayTextures,
  DisplayTextures,
  resizeDisplayTextures,
} from './displayTextures';
import {enableFloatTexture, profileWrapper} from './gl/gl';
import {UniformContext} from './gl/UniformContext';
import {makeDefaultParams, Params} from './params';
import {initPointer, updatePointer} from './pointer';
import {renderCanvas2D} from './renderCanvas2D';
import {renderWebGL} from './renderWebGL';
import {Scene, setStateFromScene} from './scene';
import {updateSimulation} from './simulation';
import {updateSimulationGPU} from './simulationGPU';
import {createState, State} from './state';
import {resetUniforms} from './uniforms';

export type EngineState = {
  running: boolean;
  step: boolean;
  tLast: number;

  canvas: HTMLCanvasElement;
  state: State;
  params: Params;
  displayTextures: DisplayTextures;
  uniforms: UniformContext;
};

const resize = (engine: EngineState) => {
  const {canvas, displayTextures, params} = engine;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (params.mode === 'webgl') {
    const gl = canvas.getContext('webgl2');
    resizeDisplayTextures(gl, displayTextures, {
      width: canvas.width,
      height: canvas.height,
    });
  }
};

export const engineInit = ({
  containerSelector,
  clockMs,
}: {
  containerSelector: string;
  clockMs: number;
}): EngineState => {
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

  const state: State = createState();
  const displayTextures: DisplayTextures = allocateDisplayTextures();
  const uniforms: UniformContext = new UniformContext();

  document.querySelector(containerSelector)!.appendChild(canvas);
  addEventListener('resize', () => resize(engine), false);

  initPointer();

  const engine = {
    running: true,
    step: false,
    tLast: clockMs,

    canvas,
    state,
    params,
    displayTextures,
    uniforms,
  };

  resize(engine);
  console.log('wavescape initialized');
  return engine;
};

export const engineResetScene = (engineState: EngineState, scene: Scene) => {
  const {params, state, canvas} = engineState;
  const gl = params.mode === 'webgl' ? canvas.getContext('webgl2') : null;
  setStateFromScene({scene, state, params, gl});
};

export const engineStep = (
  engineState: EngineState,
  {clockMs}: {clockMs: number}
) => {
  const {state, params, canvas, uniforms, displayTextures} = engineState;
  const dt = 10 ** params.logTimestep;
  const realDt = (clockMs - engineState.tLast) / 1000;
  engineState.tLast = clockMs;

  updatePointer(realDt);

  uniforms.clear();
  if (params.mode === 'webgl') {
    const gl = profileWrapper(canvas.getContext('webgl2'));
    resetUniforms({uniforms, gl, state, displayTextures, params, dt});
  }

  if (engineState.running || engineState.step) {
    if (params.mode === 'cpu') {
      updateSimulation(state, params, dt);
    } else {
      const gl = profileWrapper(canvas.getContext('webgl2'));
      updateSimulationGPU({gl, state, params, dt, uniforms});
    }
    engineState.step = false;
  }
};

export const engineDraw = (engineState: EngineState) => {
  const {state, params, canvas, displayTextures, uniforms} = engineState;
  if (params.mode === 'cpu') {
    const ctx = canvas.getContext('2d');
    renderCanvas2D(ctx, state, params);
  } else {
    const gl = profileWrapper(canvas.getContext('webgl2'));
    renderWebGL({gl, displayTextures, state, uniforms, params});
  }
};
