import {createTexture2D, PingPongTexture, RenderTexture} from './gl';
import {nextPowerOf2} from './util';

export type PrimaryState = {
  n: number;
  position: Float32Array;
  velocity: Float32Array;
  mass: Float32Array;
};

export type PrimaryGPUState = {
  n: number;
  position: PingPongTexture;
  velocity: PingPongTexture;
  mass: PingPongTexture;
};

export type DerivedState = {
  density: Float32Array;
  velocityGuess: Float32Array;
  fPressure: Float32Array;
};

export type DerivedGPUState = {
  density: PingPongTexture;
  velocityGuess: PingPongTexture;
  fPressure: PingPongTexture;
};

export type NeighborGPUState = {
  keyIndexPairs: PingPongTexture;
  neighborsTable: RenderTexture;
};

export type State = PrimaryState & DerivedState;
export type GPUState = PrimaryGPUState & DerivedGPUState & NeighborGPUState;

export const allocateState = ({n}: {n: number}): State => ({
  n,
  position: new Float32Array(n * 2).map(() => 0),
  velocity: new Float32Array(n * 2).map(() => 0),
  mass: new Float32Array(n).map(() => 0),
  density: new Float32Array(n).map(() => 0),
  velocityGuess: new Float32Array(n * 2).map(() => 0),
  fPressure: new Float32Array(n * 2).map(() => 0),
});

export const allocateGPUState = ({
  n,
  gl,
}: {
  n: number;
  gl: WebGL2RenderingContext;
}): GPUState => {
  const base = {width: nextPowerOf2(n), height: 1};

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

  const keyIndexPairs = new PingPongTexture(gl, () =>
    createTexture2D(gl, {...base, internalFormat: gl.RG32I})
  );
  const neighborsTable = new RenderTexture(gl, () =>
    // this has to be a float texture to support blending
    createTexture2D(gl, {...base, internalFormat: gl.RG32F})
  );

  return {
    n,
    position,
    velocity,
    mass,
    density,
    velocityGuess,
    fPressure,
    keyIndexPairs,
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
