import {PHASE_FLUID, PHASE_WALL} from './constants';
import {createTexture2D, PingPongTexture, RenderTexture} from './gl/gl';
import {Params} from './params';
import {dataTextureSize} from './util';

export type PrimaryState = {
  n: number;
  phase: Int8Array;
  position: Float32Array;
  velocity: Float32Array;
  mass: Float32Array;
};

export type PrimaryGPUState = {
  n: number;
  phase: RenderTexture;
  position: PingPongTexture;
  velocity: PingPongTexture;
  mass: PingPongTexture;
};

export type NeighborState = {
  keyParticlePairs: Int32Array;
  neighborsTable: Float32Array;
};

export type DerivedState = {
  density: Float32Array;
  velocityGuess: Float32Array;
  fPressure: Float32Array;
};

export type DerivedGPUState = {
  dataW: number;
  dataH: number;
  density: PingPongTexture;
  velocityGuess: PingPongTexture;
  fPressure: PingPongTexture;
};

export type NeighborGPUState = {
  keyParticlePairs: PingPongTexture;
  neighborsTable: RenderTexture;
};

export type State = PrimaryState & DerivedState & NeighborState;
export type GPUState = PrimaryGPUState & DerivedGPUState & NeighborGPUState;

export const allocateState = (params: Params): State => {
  const n = params.n;
  const size = dataTextureSize(n) ** 2;
  return {
    n,
    phase: new Int8Array(size).map(() => PHASE_FLUID),
    position: new Float32Array(size * 2).map(() => 0),
    velocity: new Float32Array(size * 2).map(() => 0),
    mass: new Float32Array(size).map(() => 0),
    density: new Float32Array(size).map(() => 0),
    velocityGuess: new Float32Array(size * 2).map(() => 0),
    fPressure: new Float32Array(size * 2).map(() => 0),
    keyParticlePairs: new Int32Array(size * 2).map(() => 0),
    neighborsTable: new Float32Array(
      params.cellResolutionX * params.cellResolutionY * 2
    ).map(() => 0),
  };
};

export const allocateGPUState = ({
  gl,
  params,
}: {
  gl: WebGL2RenderingContext;
  params: Params;
}): GPUState => {
  const n = params.n;
  const dataW = dataTextureSize(n);
  const dataH = dataTextureSize(n);
  const base = {width: dataW, height: dataH};

  const phase = new RenderTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.R8I})
  );
  const position = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32F})
  );
  const velocity = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32F})
  );
  const mass = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.R32F})
  );
  const density = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.R32F})
  );
  const velocityGuess = new PingPongTexture(gl, () =>
    createTexture2D(gl, {
      ...base,
      internalFormat: gl.RG32F,
    })
  );
  const fPressure = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32F})
  );

  const keyParticlePairs = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32I})
  );
  const neighborsTable = new RenderTexture(gl, () =>
    // this has to be a float texture to support blending
    createTexture2D(gl, {
      width: params.cellResolutionX,
      height: params.cellResolutionY,
      internalFormat: gl.RG32F,
    })
  );

  return {
    n,
    dataW,
    dataH,
    phase,
    position,
    velocity,
    mass,
    density,
    velocityGuess,
    fPressure,
    keyParticlePairs,
    neighborsTable,
  };
};

export const clearState = (state: State) => {
  for (let i = 0; i < state.n; ++i) {
    state.position[i * 2 + 0] = 0;
    state.position[i * 2 + 1] = 0;
    state.velocity[i * 2 + 0] = 0;
    state.velocity[i * 2 + 1] = 0;
    state.mass[i] = 0;
    state.density[i] = 0;
    state.velocityGuess[i * 2 + 0] = 0;
    state.velocityGuess[i * 2 + 1] = 0;
    state.fPressure[i * 2 + 0] = 0;
    state.fPressure[i * 2 + 1] = 0;
  }
};
